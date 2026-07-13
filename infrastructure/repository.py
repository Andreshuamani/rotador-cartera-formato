# infrastructure/repository.py
from psycopg2.extras import execute_values

from infrastructure.database import obtener_conexion


class SQLRepository:
    def obtener_siguiente_cartera_pendiente(self):
        """
        Busca el primer ID de empresa (cartera) que tenga al menos
        una instrucción en estado 'Pendiente'.
        """
        conn = obtener_conexion()
        cursor = conn.cursor()

        query = """
            SELECT id_empresa, nombre_empresa
            FROM public.ordenes_rotacion
            WHERE estado_rotacion = 'Pendiente'
            ORDER BY fecha_creacion ASC
            LIMIT 1;
        """

        cursor.execute(query)
        row = cursor.fetchone()
        cursor.close()
        conn.close()

        if row:
            return {"id_empresa": row[0], "nombre_empresa": row[1]}
        return None

    def obtener_movimientos_de_cartera(self, id_empresa):
        """
        Trae TODOS los movimientos configurados y pendientes (en orden de creación)
        exclusivamente para la cartera seleccionada.
        """
        conn = obtener_conexion()
        cursor = conn.cursor()

        query = """
            SELECT id, nombre_empresa, id_empresa, grupo_origen, grupo_destino,
                   cantidad_movimiento, mueve_cgmsv, mueve_mercurius, reparte_varios
            FROM public.ordenes_rotacion
            WHERE id_empresa = %s AND estado_rotacion = 'Pendiente'
            ORDER BY fecha_creacion ASC;
        """

        cursor.execute(query, [id_empresa])
        rows = cursor.fetchall()
        cursor.close()
        conn.close()

        movimientos = []
        for row in rows:
            movimientos.append(
                {
                    "id": row[0],
                    "nombre_empresa": row[1],
                    "id_empresa": row[2],
                    "grupo_origen": row[3],
                    "grupo_destino": row[4],
                    "cantidad_movimiento": row[5],
                    "mueve_cgmsv": row[6],
                    "mueve_mercurius": row[7],
                    "reparte_varios": row[8],
                }
            )
        return movimientos

    def listar_carteras_pendientes(self):
        """
        Agrupa las órdenes en estado 'Pendiente' por cartera, para que el
        Motor de movimiento muestre qué empresas están listas para ejecutar.
        """
        conn = obtener_conexion()
        cursor = conn.cursor()

        query = """
            SELECT id_empresa, nombre_empresa, COUNT(*) AS ordenes_pendientes,
                   COALESCE(SUM(cantidad_movimiento), 0) AS casos_estimados,
                   MIN(fecha_creacion) AS primera_solicitud
            FROM public.ordenes_rotacion
            WHERE estado_rotacion = 'Pendiente'
            GROUP BY id_empresa, nombre_empresa
            ORDER BY primera_solicitud ASC;
        """

        cursor.execute(query)
        rows = cursor.fetchall()
        cursor.close()
        conn.close()

        carteras = []
        for row in rows:
            carteras.append(
                {
                    "id_empresa": row[0],
                    "nombre_empresa": row[1],
                    "ordenes_pendientes": row[2],
                    "casos_estimados": row[3],
                    "primera_solicitud": row[4].isoformat() if row[4] else None,
                }
            )
        return carteras

    def insertar_historial(
        self,
        id_empresa,
        nombre_empresa,
        grupo_origen,
        grupo_destino,
        cantidad_movida,
        monto_movido,
        fecha,
    ):
        """Deja constancia de una ejecución real del motor en historial_rotaciones."""
        conn = obtener_conexion()
        cursor = conn.cursor()

        query = """
            INSERT INTO public.historial_rotaciones
                (id_empresa, nombre_empresa, grupo_origen, grupo_destino,
                 cantidad_movida, monto_movido, fecha_ejecucion, mes, anio)
            VALUES (%s, %s, %s, %s, %s, %s, NOW(), %s, %s);
        """

        cursor.execute(
            query,
            [
                id_empresa, nombre_empresa, grupo_origen, grupo_destino,
                cantidad_movida, monto_movido, fecha.month, fecha.year,
            ],
        )
        conn.commit()
        cursor.close()
        conn.close()

    def crear_lote_preview(self, lote_id, filas):
        """
        Congela el resultado de "Obtener casos" (Carteras formato). filas:
        lista de dicts con orden_id, id_empresa, nombre_empresa, deuda_id,
        grupo_origen, grupo_destino, monto.
        """
        if not filas:
            return
        conn = obtener_conexion()
        cursor = conn.cursor()
        try:
            execute_values(
                cursor,
                """
                INSERT INTO public.motor_preview_casos
                    (lote_id, orden_id, id_empresa, nombre_empresa, deuda_id,
                     grupo_origen, grupo_destino, monto)
                VALUES %s
                """,
                [
                    (
                        lote_id, f["orden_id"], f["id_empresa"], f["nombre_empresa"],
                        f["deuda_id"], f["grupo_origen"], f["grupo_destino"], f["monto"],
                    )
                    for f in filas
                ],
            )
            conn.commit()
        finally:
            cursor.close()
            conn.close()

    def obtener_lote_preview(self, lote_id):
        """Lee de vuelta el lote congelado (solo filas aún no ejecutadas)."""
        conn = obtener_conexion()
        cursor = conn.cursor()
        try:
            cursor.execute(
                """
                SELECT orden_id, id_empresa, nombre_empresa, deuda_id,
                       grupo_origen, grupo_destino, monto
                FROM public.motor_preview_casos
                WHERE lote_id = %s AND ejecutado = FALSE
                """,
                [lote_id],
            )
            columnas = [
                "orden_id", "id_empresa", "nombre_empresa", "deuda_id",
                "grupo_origen", "grupo_destino", "monto",
            ]
            return [dict(zip(columnas, row)) for row in cursor.fetchall()]
        finally:
            cursor.close()
            conn.close()

    def marcar_lote_ejecutado(self, lote_id):
        conn = obtener_conexion()
        cursor = conn.cursor()
        try:
            cursor.execute(
                "UPDATE public.motor_preview_casos SET ejecutado = TRUE WHERE lote_id = %s",
                [lote_id],
            )
            conn.commit()
        finally:
            cursor.close()
            conn.close()

    def listar_todos_los_movimientos_pendientes(self):
        """Todas las órdenes 'Pendiente' de todas las carteras, para Carteras formato."""
        conn = obtener_conexion()
        cursor = conn.cursor()
        query = """
            SELECT id, nombre_empresa, id_empresa, grupo_origen, grupo_destino,
                   cantidad_movimiento, mueve_cgmsv, mueve_mercurius, reparte_varios
            FROM public.ordenes_rotacion
            WHERE estado_rotacion = 'Pendiente'
            ORDER BY fecha_creacion ASC;
        """
        cursor.execute(query)
        rows = cursor.fetchall()
        cursor.close()
        conn.close()

        movimientos = []
        for row in rows:
            movimientos.append(
                {
                    "id": row[0],
                    "nombre_empresa": row[1],
                    "id_empresa": row[2],
                    "grupo_origen": row[3],
                    "grupo_destino": row[4],
                    "cantidad_movimiento": row[5],
                    "mueve_cgmsv": row[6],
                    "mueve_mercurius": row[7],
                    "reparte_varios": row[8],
                }
            )
        return movimientos

    def registrar_ejecucion_movimiento(self, id_movimiento, cantidad_realizada):
        """
        Actualiza la directiva específica en tabla_rotaciones:
        1. Guarda la cantidad real de casos que el script pudo mover.
        2. Cambia el estado a 'Procesado' para cerrarlo del bucle.
        """
        conn = obtener_conexion()
        cursor = conn.cursor()

        query = """
            UPDATE public.ordenes_rotacion
            SET estado_rotacion = 'Procesado',
                cantidad_movimiento = %s
            WHERE id = %s;
        """

        cursor.execute(query, (cantidad_realizada, id_movimiento))
        conn.commit()
        cursor.close()
        conn.close()
