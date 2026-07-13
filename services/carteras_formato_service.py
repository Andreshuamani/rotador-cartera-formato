# services/carteras_formato_service.py
import uuid
from datetime import date

import pandas as pd

from core.entities import ReglasEjecucion
from infrastructure.deuda_repository import DeudaRepository
from infrastructure.repository import SQLRepository
from services.rotacion_service import RotacionService

COLUMNAS_SEGMENTO = [
    "id_deuda", "monto", "grupo", "grupo_asignado", "orden_id", "id_empresa", "nombre_empresa",
]


class CarterasFormatoService:
    """
    Subtarea "Rotación de carteras formato" del Motor de movimiento.

    Dos pasos separados a propósito:
    - obtener_casos(): recalcula todo sobre datos reales (incluida la
      elegibilidad real de Query_carteras_formato_principal.sql: retención,
      consolidados, estados, posibles activos, CSP) y CONGELA el resultado
      en public.motor_preview_casos bajo un lote_id.
    - ejecutar_lote(lote_id): mueve exactamente esas filas congeladas — no
      vuelve a calcular nada — para que el número que vio Operaciones en el
      preview sea el mismo que queda en historial_rotaciones.
    """

    def __init__(self):
        self.meta_repo = SQLRepository()
        self.deuda_repo = DeudaRepository()
        self.rotacion_service = RotacionService()

    def obtener_casos(self) -> dict:
        movimientos = self.meta_repo.listar_todos_los_movimientos_pendientes()
        if not movimientos:
            raise ValueError("No hay órdenes pendientes en ninguna cartera.")

        ids_elegibles = self.deuda_repo.obtener_ids_elegibles_carteras_formato()

        # Varias órdenes pendientes pueden compartir el mismo (empresa, grupo
        # origen) — ej. dos solicitudes que ambas sacan de PEGASUS hacia
        # destinos distintos. Extraemos ese universo UNA sola vez y cada
        # orden va consumiendo del remanente (en el orden en que se crearon,
        # ya viene así de listar_todos_los_movimientos_pendientes), para que
        # ninguna deuda quede asignada a dos destinos a la vez.
        universos_por_origen: dict = {}

        segmentos = []
        for mov in movimientos:
            reglas = ReglasEjecucion(
                grupo_origen=mov["grupo_origen"],
                grupo_destino=mov["grupo_destino"],
                cantidad_movimiento=mov["cantidad_movimiento"],
                mueve_cgmsv=mov["mueve_cgmsv"],
                excluye_fallecido=mov["mueve_mercurius"],
                excluye_sin_telefono=mov["mueve_mercurius"],
                reparte_varios=mov["reparte_varios"],
            )

            clave_origen = (mov["nombre_empresa"], reglas.grupo_origen)
            if clave_origen not in universos_por_origen:
                df_universo = self.deuda_repo.extraer_universo_cuentas(
                    mov["nombre_empresa"], reglas.grupo_origen
                )
                if not df_universo.empty:
                    df_universo = df_universo[df_universo["id_deuda"].isin(ids_elegibles)]
                universos_por_origen[clave_origen] = df_universo

            df_universo_restante = universos_por_origen[clave_origen]

            df_merc, df_cg, df_aptos, _ = self.rotacion_service.clasificar_y_segmentar_cartera(
                df_universo_restante, reglas
            )
            df_aptos_limitado = df_aptos.head(reglas.cantidad_movimiento).copy()
            df_rotado = self.rotacion_service.aplicar_rotacion_directa(df_aptos_limitado, reglas)

            ids_consumidos = []
            for df in (df_merc, df_cg, df_rotado):
                if df.empty:
                    continue
                ids_consumidos.extend(df["id_deuda"].tolist())
                df = df.copy()
                df["orden_id"] = mov["id"]
                df["id_empresa"] = mov["id_empresa"]
                df["nombre_empresa"] = mov["nombre_empresa"]
                segmentos.append(df[COLUMNAS_SEGMENTO])

            if ids_consumidos:
                universos_por_origen[clave_origen] = df_universo_restante[
                    ~df_universo_restante["id_deuda"].isin(ids_consumidos)
                ]

        if not segmentos:
            raise ValueError(
                "No quedaron casos elegibles tras aplicar retención, consolidados, "
                "posibles activos, CSP y estados."
            )

        df_total = pd.concat(segmentos, ignore_index=True)

        lote_id = str(uuid.uuid4())
        filas_staging = [
            {
                "orden_id": int(f["orden_id"]),
                "id_empresa": int(f["id_empresa"]),
                "nombre_empresa": f["nombre_empresa"],
                "deuda_id": int(f["id_deuda"]),
                "grupo_origen": f["grupo"],
                "grupo_destino": f["grupo_asignado"],
                "monto": float(f["monto"]),
            }
            for f in df_total.to_dict("records")
        ]
        self.meta_repo.crear_lote_preview(lote_id, filas_staging)

        resumen = []
        agrupado = df_total.groupby(["id_empresa", "nombre_empresa", "grupo", "grupo_asignado"])
        for (id_empresa, nombre_empresa, grupo_origen, grupo_destino), grupo_df in agrupado:
            resumen.append(
                {
                    "id_empresa": int(id_empresa),
                    "nombre_empresa": nombre_empresa,
                    "grupo_origen": grupo_origen,
                    "grupo_destino": grupo_destino,
                    "casos": len(grupo_df),
                    "monto": float(grupo_df["monto"].sum()),
                }
            )

        return {
            "lote_id": lote_id,
            "total_casos": len(df_total),
            "total_monto": float(df_total["monto"].sum()),
            "resumen": resumen,
        }

    def ejecutar_lote(self, lote_id: str) -> dict:
        filas = self.meta_repo.obtener_lote_preview(lote_id)
        if not filas:
            raise ValueError("El lote no existe o ya fue ejecutado.")

        # NUMERIC vuelve como Decimal desde psycopg2; se normaliza a float acá,
        # una sola vez, para poder acumular sin mezclar tipos más abajo.
        for f in filas:
            f["monto"] = float(f["monto"])

        destinos_usados = sorted({f["grupo_destino"] for f in filas})
        ids_grupos = self.deuda_repo.obtener_ids_grupos(destinos_usados)
        faltantes = [d for d in destinos_usados if d.strip().upper() not in ids_grupos]
        if faltantes:
            raise ValueError(
                f"Los siguientes grupos destino no existen en public.grupos: {', '.join(faltantes)}"
            )

        filas_cgma = [(f["deuda_id"], f["grupo_destino"]) for f in filas]
        self.deuda_repo.cargar_y_ejecutar_lote_cgma(filas_cgma)

        agrupado: dict = {}
        por_orden: dict = {}
        for f in filas:
            clave = (f["id_empresa"], f["nombre_empresa"], f["grupo_origen"], f["grupo_destino"])
            acumulado = agrupado.setdefault(clave, {"casos": 0, "monto": 0.0})
            acumulado["casos"] += 1
            acumulado["monto"] += f["monto"]
            por_orden[f["orden_id"]] = por_orden.get(f["orden_id"], 0) + 1

        hoy = date.today()
        detalle = []
        for (id_empresa, nombre_empresa, grupo_origen, grupo_destino), datos in agrupado.items():
            self.meta_repo.insertar_historial(
                id_empresa, nombre_empresa, grupo_origen, grupo_destino,
                datos["casos"], datos["monto"], hoy,
            )
            detalle.append(
                {
                    "id_empresa": id_empresa,
                    "nombre_empresa": nombre_empresa,
                    "grupo_origen": grupo_origen,
                    "grupo_destino": grupo_destino,
                    "casos_movidos": datos["casos"],
                    "monto_movido": datos["monto"],
                }
            )

        for orden_id, cantidad in por_orden.items():
            self.meta_repo.registrar_ejecucion_movimiento(orden_id, cantidad)

        self.meta_repo.marcar_lote_ejecutado(lote_id)

        ids_movidos = [f["deuda_id"] for f in filas]
        df_stock = self.deuda_repo.obtener_stock_por_ids(ids_movidos)
        if not df_stock.empty:
            # NaN (ej. sin fila en bigfish) no es JSON válido para FastAPI.
            df_stock = df_stock.astype(object).where(df_stock.notna(), None)

        return {
            "lote_id": lote_id,
            "casos_movidos": len(filas),
            "monto_movido": sum(f["monto"] for f in filas),
            "detalle": detalle,
            "stock": df_stock.to_dict("records") if not df_stock.empty else [],
        }
