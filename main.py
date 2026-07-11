# main.py
import pandas as pd

from core.entities import ReglasEjecucion
from infrastructure.deuda_repository import DeudaRepository
from infrastructure.repository import SQLRepository
from services.rotacion_service import RotacionService


def realizar_test_rotacion():
    meta_repo = SQLRepository()
    deuda_repo = DeudaRepository()
    servicio = RotacionService()

    print("=======================================================")
    print("🔬 SIMULACIÓN BATCH: EXTRACCIÓN, POOLING Y REPARTO")
    print("=======================================================\n")

    cartera_activa = meta_repo.obtener_siguiente_cartera_pendiente()
    if not cartera_activa:
        print("💤 No hay pendientes.")
        return

    id_emp = cartera_activa["id_empresa"]
    nombre_emp = cartera_activa["nombre_empresa"]
    movimientos = meta_repo.obtener_movimientos_de_cartera(id_emp)

    print(
        f"🎯 Carteras a procesar para {nombre_emp}: {len(movimientos)} directivas detectadas."
    )

    # --- CONTENEDORES PARA EL POOLING (reparte_varios = True) ---
    pool_aptos = []
    pool_mercurius = []
    pool_cgmsv = []
    destinos_globales = set()
    ids_procesados = []

    for mov in movimientos:
        reglas = ReglasEjecucion(
            grupo_origen=mov["grupo_origen"],
            grupo_destino=mov["grupo_destino"],
            cantidad_movimiento=mov["cantidad_movimiento"],
            mueve_cgmsv=mov["mueve_cgmsv"],
            # La orden solo guarda un flag combinado de MERCURIUS; ambas
            # sub-reglas se aplican juntas al ejecutar el batch.
            excluye_fallecido=mov["mueve_mercurius"],
            excluye_sin_telefono=mov["mueve_mercurius"],
            reparte_varios=mov["reparte_varios"],
        )

        # 1. Extraemos el universo de este origen particular
        df_universo = deuda_repo.extraer_universo_cuentas(
            nombre_emp, reglas.grupo_origen
        )

        # 2. Clasificamos
        df_merc, df_cg, df_aptos, _ = servicio.clasificar_y_segmentar_cartera(
            df_universo, reglas
        )

        # 3. Aplicamos límite de cantidad sobre los aptos a la orden actual
        df_aptos_limitado = df_aptos.head(reglas.cantidad_movimiento).copy()

        # Si reparte_varios es True, no impactamos, lo mandamos al POOL GLOBAL
        if reglas.reparte_varios:
            pool_mercurius.append(df_merc)
            pool_cgmsv.append(df_cg)
            pool_aptos.append(df_aptos_limitado)
            ids_procesados.append(mov["id"])

            # Recolectamos los destinos para el reparto final
            for d in reglas.obtener_destinos_como_lista():
                destinos_globales.add(d)
        else:
            # (Aquí iría la lógica directa 1 a 1 para los que no son pool)
            pass

    # --- EJECUCIÓN DEL POOL (FUERA DEL BUCLE DE ORÍGENES) ---
    if pool_aptos:
        print("\n🌪️ [BATCH POOLING] Compilando datos de múltiples orígenes...")

        # Concatenamos todos los orígenes
        df_gran_apto = (
            pd.concat(pool_aptos, ignore_index=True) if pool_aptos else pd.DataFrame()
        )
        df_gran_merc = (
            pd.concat(pool_mercurius, ignore_index=True)
            if pool_mercurius
            else pd.DataFrame()
        )
        df_gran_cg = (
            pd.concat(pool_cgmsv, ignore_index=True) if pool_cgmsv else pd.DataFrame()
        )

        lista_destinos = list(destinos_globales)
        lista_destinos.sort()  # Para tener un orden consistente (ej. Estudio X, Estudio Y)

        print(
            f"   => {len(df_gran_apto)} Casos Aptos consolidados para repartir a: {lista_destinos}"
        )
        print(f"   => {len(df_gran_merc)} Casos consolidados hacia MERCURIUS.")
        print(f"   => {len(df_gran_cg)} Casos consolidados hacia CGMSV.")

        # EL MOMENTO DE LA VERDAD: El reparto equitativo sobre el total
        df_rotados = servicio.aplicar_rotacion_equitativa(df_gran_apto, lista_destinos)

        print(
            "\n⚙️ VISTA PREVIA: CÓMO QUEDARÍA EL REPARTO (Corte de 10 casos ordenados por Monto)"
        )
        if not df_rotados.empty:
            print(df_rotados[["monto", "grupo", "grupo_asignado"]].head(10))

            # Simulando el conteo de equidad
            conteo = df_rotados["grupo_asignado"].value_counts()
            print("\n⚖️ EQUIDAD DE DISTRIBUCIÓN FINAL:")
            print(conteo)

        # (Aquí iría la llamada a tu BD: deuda_repo.actualizar_grupos_masivo(...))
        # (Aquí iría la actualización de tu log: meta_repo.registrar_ejecucion_movimiento(...))


if __name__ == "__main__":
    realizar_test_rotacion()
