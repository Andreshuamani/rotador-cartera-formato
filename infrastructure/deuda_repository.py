# infrastructure/deuda_repository.py
import warnings

import pandas as pd

from infrastructure.database import obtener_conexion

# Silenciar la advertencia de Pandas sobre SQLAlchemy
warnings.filterwarnings("ignore", category=UserWarning)


class DeudaRepository:
    def extraer_universo_cuentas(self, empresa, grupo_origen):
        """
        Trae el 100% de los casos de una cartera y grupo origen específico.
        La segmentación y descarte se procesarán en la capa de negocio.
        """
        query = """
            SELECT id_deuda, nombre, telefono_verificado, monto, empresa, grupo, estado
            FROM public.deudas
            WHERE TRIM(empresa) ILIKE TRIM(%s) 
              AND TRIM(grupo) ILIKE TRIM(%s);
        """
        conn = obtener_conexion()
        try:
            df = pd.read_sql_query(query, conn, params=[empresa, grupo_origen])
            return df
        finally:
            conn.close()
