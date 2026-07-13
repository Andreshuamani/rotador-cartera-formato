# services/motor_service.py
from datetime import date

import pandas as pd

from core.entities import ReglasEjecucion
from infrastructure.deuda_repository import DeudaRepository
from infrastructure.repository import SQLRepository
from services.rotacion_service import RotacionService

COLUMNAS_SEGMENTO = ["id_deuda", "monto", "grupo", "grupo_asignado", "orden_id"]


class MotorService:
    """
    El motor de movimiento: toma las órdenes 'Pendiente' de una cartera,
    reaplica la clasificación/reparto de RotacionService sobre el universo
    real (no confía en los conteos guardados al crear la orden), mueve los
    casos en public.deudas y deja constancia en historial_rotaciones.
    """

    def __init__(self):
        self.meta_repo = SQLRepository()
        self.deuda_repo = DeudaRepository()
        self.rotacion_service = RotacionService()

    def ejecutar_cartera(self, id_empresa: int) -> dict:
        movimientos = self.meta_repo.obtener_movimientos_de_cartera(id_empresa)
        if not movimientos:
            raise ValueError("No hay órdenes pendientes para esta cartera.")

        nombre_emp = movimientos[0]["nombre_empresa"]

        segmentos = []
        pool_aptos, destinos_pool, ids_pool = [], set(), []

        # Varias órdenes pendientes de esta cartera pueden compartir el mismo
        # grupo origen (ej. dos solicitudes que sacan de PEGASUS hacia
        # destinos distintos). Se extrae ese universo UNA sola vez y cada
        # orden consume del remanente, en el orden en que se crearon, para
        # que ninguna deuda quede asignada a dos destinos a la vez.
        universos_por_origen: dict = {}

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

            if reglas.grupo_origen not in universos_por_origen:
                universos_por_origen[reglas.grupo_origen] = self.deuda_repo.extraer_universo_cuentas(
                    nombre_emp, reglas.grupo_origen
                )
            df_universo_restante = universos_por_origen[reglas.grupo_origen]

            df_merc, df_cg, df_aptos, _ = self.rotacion_service.clasificar_y_segmentar_cartera(
                df_universo_restante, reglas
            )
            df_aptos_limitado = df_aptos.head(reglas.cantidad_movimiento).copy()

            ids_consumidos = []
            for df in (df_merc, df_cg):
                if not df.empty:
                    ids_consumidos.extend(df["id_deuda"].tolist())
                    df = df.copy()
                    df["orden_id"] = mov["id"]
                    segmentos.append(df[COLUMNAS_SEGMENTO])

            if reglas.reparte_varios:
                ids_consumidos.extend(df_aptos_limitado["id_deuda"].tolist())
                df_aptos_limitado["orden_id"] = mov["id"]
                pool_aptos.append(df_aptos_limitado)
                ids_pool.append(mov["id"])
                destinos_pool.update(reglas.obtener_destinos_como_lista())
            else:
                df_rotado = self.rotacion_service.aplicar_rotacion_directa(df_aptos_limitado, reglas)
                if not df_rotado.empty:
                    ids_consumidos.extend(df_rotado["id_deuda"].tolist())
                    df_rotado = df_rotado.copy()
                    df_rotado["orden_id"] = mov["id"]
                    segmentos.append(df_rotado[COLUMNAS_SEGMENTO])

            if ids_consumidos:
                universos_por_origen[reglas.grupo_origen] = df_universo_restante[
                    ~df_universo_restante["id_deuda"].isin(ids_consumidos)
                ]

        if pool_aptos:
            df_pool = pd.concat(pool_aptos, ignore_index=True)
            df_pool_rotado = self.rotacion_service.aplicar_rotacion_equitativa(
                df_pool, sorted(destinos_pool)
            )
            segmentos.append(df_pool_rotado[COLUMNAS_SEGMENTO])

        df_total = pd.concat(segmentos, ignore_index=True) if segmentos else pd.DataFrame(
            columns=COLUMNAS_SEGMENTO
        )

        if not df_total.empty:
            # Ningún caso se mueve hasta confirmar que TODOS los grupos destino
            # involucrados (incluidos MERCURIUS/CGMSV) existen de verdad.
            destinos_usados = sorted(df_total["grupo_asignado"].unique())
            ids_grupos = self.deuda_repo.obtener_ids_grupos(destinos_usados)
            faltantes = [d for d in destinos_usados if d.strip().upper() not in ids_grupos]
            if faltantes:
                raise ValueError(
                    f"Los siguientes grupos destino no existen en public.grupos: {', '.join(faltantes)}"
                )

            for grupo_destino, grupo_df in df_total.groupby("grupo_asignado"):
                ids = grupo_df["id_deuda"].astype(int).tolist()
                self.deuda_repo.actualizar_grupos_masivo(ids, ids_grupos[grupo_destino.strip().upper()])

        hoy = date.today()
        detalle = []
        for (grupo_origen, grupo_destino), grupo_df in df_total.groupby(["grupo", "grupo_asignado"]):
            cantidad = len(grupo_df)
            monto = float(grupo_df["monto"].sum())
            self.meta_repo.insertar_historial(
                id_empresa, nombre_emp, grupo_origen, grupo_destino, cantidad, monto, hoy
            )
            detalle.append(
                {
                    "grupo_origen": grupo_origen,
                    "grupo_destino": grupo_destino,
                    "casos_movidos": cantidad,
                    "monto_movido": monto,
                }
            )

        # Recién acá, con el traspaso y el historial ya confirmados, se cierra
        # cada orden — así una orden nunca queda en 'Procesado' si algo falló antes.
        for mov in movimientos:
            cantidad_orden = int((df_total["orden_id"] == mov["id"]).sum()) if not df_total.empty else 0
            self.meta_repo.registrar_ejecucion_movimiento(mov["id"], cantidad_orden)

        return {
            "id_empresa": id_empresa,
            "nombre_empresa": nombre_emp,
            "casos_movidos": len(df_total),
            "monto_movido": float(df_total["monto"].sum()) if not df_total.empty else 0.0,
            "detalle": detalle,
        }
