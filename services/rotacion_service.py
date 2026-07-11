# Services/rotacion_service.py
import pandas as pd

from core.entities import ReglasEjecucion


class RotacionService:
    def clasificar_y_segmentar_cartera(
        self, df_universo: pd.DataFrame, reglas: ReglasEjecucion
    ):
        if df_universo.empty:
            return pd.DataFrame(), pd.DataFrame(), pd.DataFrame(), {"fallecido": 0, "sin_telefono": 0}

        # REGLA 1: MERCURIUS (Estado Fallecido/Baja y/o sin teléfono, cada una
        # habilitable de forma independiente por el usuario en la solicitud)
        estado_clean = df_universo["estado"].astype(str).str.strip().str.lower()
        tel_clean = (
            df_universo["telefono_verificado"].astype(str).str.strip().str.lower()
        )

        sin_filtro = pd.Series(False, index=df_universo.index)

        filtro_fallecido = (
            estado_clean.isin(["baja", "fallecido"])
            if reglas.excluye_fallecido
            else sin_filtro
        )
        filtro_sin_telefono = (
            (
                df_universo["telefono_verificado"].isna()
                | (df_universo["telefono_verificado"] == "")
                | (tel_clean == "none")
            )
            if reglas.excluye_sin_telefono
            else sin_filtro
        )

        filtro_mercurius = filtro_fallecido | filtro_sin_telefono
        df_mercurius = df_universo[filtro_mercurius].copy()
        df_mercurius["grupo_asignado"] = "MERCURIUS"

        df_sobrevivientes = df_universo[~filtro_mercurius].copy()

        # REGLA 2: CGMSV
        if reglas.mueve_cgmsv:
            tel_sobrevivientes = (
                df_sobrevivientes["telefono_verificado"]
                .astype(str)
                .str.strip()
                .str.lower()
            )
            filtro_cgmsv = tel_sobrevivientes == "n"
            df_cgmsv = df_sobrevivientes[filtro_cgmsv].copy()
            df_cgmsv["grupo_asignado"] = "CGMSV"
            df_aptos_final = df_sobrevivientes[~filtro_cgmsv].copy()
        else:
            df_cgmsv = pd.DataFrame()
            df_aptos_final = df_sobrevivientes.copy()

        desglose_mercurius = {
            "fallecido": int(filtro_fallecido.sum()),
            "sin_telefono": int(filtro_sin_telefono.sum()),
        }

        return df_mercurius, df_cgmsv, df_aptos_final, desglose_mercurius

    def aplicar_rotacion_directa(
        self, df_aptos: pd.DataFrame, reglas: ReglasEjecucion
    ) -> pd.DataFrame:
        """Asignación 1 a 1. Se ignora si es un pool."""
        if df_aptos.empty or reglas.reparte_varios:
            return pd.DataFrame()

        df_ordenado = df_aptos.sort_values(by="monto", ascending=True).reset_index(
            drop=True
        )
        df_a_repartir = df_ordenado.head(reglas.cantidad_movimiento).copy()
        df_a_repartir["grupo_asignado"] = reglas.grupo_destino
        return df_a_repartir

    def aplicar_rotacion_equitativa(
        self, df_compilado_global: pd.DataFrame, lista_destinos_unicos: list
    ) -> pd.DataFrame:
        """Asignación Round-Robin al gran pozo (Pool) de deudas."""
        if df_compilado_global.empty or not lista_destinos_unicos:
            return df_compilado_global

        # El gran ordenamiento matemático: garantiza la equidad entre carteras combinadas
        df_ordenado = df_compilado_global.sort_values(
            by="monto", ascending=True
        ).reset_index(drop=True)

        num_destinos = len(lista_destinos_unicos)
        asignaciones = [
            lista_destinos_unicos[idx % num_destinos] for idx in range(len(df_ordenado))
        ]

        df_ordenado["grupo_asignado"] = asignaciones
        return df_ordenado
