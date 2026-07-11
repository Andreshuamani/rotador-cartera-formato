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
            SELECT d.id AS id_deuda, p.nombre AS nombre, big.tel_verif_1 AS telefono_verificado,
                   d.monto AS monto, em.nombre AS empresa, gr.nombre AS grupo, e.nombre AS estado
            FROM public.deudas d
            JOIN public.personas p ON p.id = d.persona_id
            JOIN public.empresas em ON em.id = d.empresa_id
            JOIN public.grupos gr ON gr.id = d.grupo_id
            JOIN public.estados e ON e.id = d.estado_id
            LEFT JOIN public.bigfish big ON big.id = d.id
            WHERE TRIM(em.nombre) ILIKE TRIM(%s)
              AND TRIM(gr.nombre) ILIKE TRIM(%s);
        """
        conn = obtener_conexion()
        try:
            df = pd.read_sql_query(query, conn, params=[empresa, grupo_origen])
            return df
        finally:
            conn.close()
