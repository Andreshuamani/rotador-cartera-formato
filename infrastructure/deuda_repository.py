# infrastructure/deuda_repository.py
import os
import warnings

import pandas as pd
from psycopg2.extras import execute_values

from infrastructure.database import obtener_conexion

# Silenciar la advertencia de Pandas sobre SQLAlchemy
warnings.filterwarnings("ignore", category=UserWarning)

QUERYS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "Querys")


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

    def obtener_ids_grupos(self, nombres):
        """
        Resuelve nombre de grupo -> id real en public.grupos (comparación
        insensible a mayúsculas/espacios). Las claves del dict devuelto vienen
        en UPPER(TRIM(...)) para poder cruzarlas directo contra grupo_asignado.
        """
        if not nombres:
            return {}
        conn = obtener_conexion()
        cursor = conn.cursor()
        try:
            claves = [n.strip().upper() for n in nombres]
            cursor.execute(
                "SELECT UPPER(TRIM(nombre)), id FROM public.grupos WHERE UPPER(TRIM(nombre)) = ANY(%s)",
                [claves],
            )
            return dict(cursor.fetchall())
        finally:
            cursor.close()
            conn.close()

    def actualizar_grupos_masivo(self, ids_deuda, grupo_id_destino):
        """Mueve físicamente los casos: apunta su grupo_id al destino resuelto."""
        if not ids_deuda:
            return 0
        conn = obtener_conexion()
        cursor = conn.cursor()
        try:
            cursor.execute(
                "UPDATE public.deudas SET grupo_id = %s WHERE id = ANY(%s)",
                [grupo_id_destino, ids_deuda],
            )
            conn.commit()
            return cursor.rowcount
        finally:
            cursor.close()
            conn.close()

    def obtener_ids_elegibles_carteras_formato(self):
        """
        Corre Querys/Query_carteras_formato_principal.sql completo (retención
        vía dblink, consolidados, estados, posibles activos, CSP) y devuelve
        el set de ids que quedaron habilitados para rotar (aptos + los que
        van a CGMSV/MERCURIUS). Requiere que la conexión tenga la extensión
        dblink y acceso a mercurius_db — no corre contra una base sin esos
        objetos (ej. la réplica local de pruebas).
        """
        ruta = os.path.join(QUERYS_DIR, "Query_carteras_formato_principal.sql")
        with open(ruta, encoding="utf-8-sig") as f:
            script = f.read()

        conn = obtener_conexion()
        cursor = conn.cursor()
        try:
            cursor.execute(script)
            cursor.execute(
                "SELECT id FROM tmp_datos_finales UNION SELECT id FROM Casos_CGMSV_MERCURIUS"
            )
            return {row[0] for row in cursor.fetchall()}
        finally:
            cursor.close()
            conn.close()

    def obtener_stock_por_ids(self, ids_deuda):
        """Detalle (con teléfonos) de un conjunto de deudas, para el reporte de stock post-rotación."""
        if not ids_deuda:
            return pd.DataFrame()

        ruta = os.path.join(
            QUERYS_DIR, "STOCK para Estudios por GRUPO - Con datos de Mail y TELS.sql"
        )
        with open(ruta, encoding="utf-8-sig") as f:
            query = f.read()

        conn = obtener_conexion()
        try:
            return pd.read_sql_query(query, conn, params=[ids_deuda])
        finally:
            conn.close()

    def cargar_y_ejecutar_lote_cgma(self, filas):
        """
        filas: lista de tuplas (deuda_id, grupo_destino). Replica el patrón
        manual (04_Proceso_rotacion_y_stock.sql): vacía
        cgma.deudas_rotacion_mercurius, carga el lote y llama a la función
        real de rotación.
        """
        if not filas:
            return
        conn = obtener_conexion()
        cursor = conn.cursor()
        try:
            cursor.execute("DELETE FROM cgma.deudas_rotacion_mercurius")
            execute_values(
                cursor,
                "INSERT INTO cgma.deudas_rotacion_mercurius (deuda_id, grupo) VALUES %s",
                filas,
            )
            cursor.execute("SELECT cgma.fn_rotaciones_mercurius()")
            conn.commit()
        finally:
            cursor.close()
            conn.close()
