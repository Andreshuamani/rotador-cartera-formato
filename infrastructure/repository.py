# infrastructure/repository.py
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
            FROM public.tabla_rotaciones 
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
            FROM public.tabla_rotaciones 
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

    def registrar_ejecucion_movimiento(self, id_movimiento, cantidad_realizada):
        """
        Actualiza la directiva específica en tabla_rotaciones:
        1. Guarda la cantidad real de casos que el script pudo mover.
        2. Cambia el estado a 'Procesado' para cerrarlo del bucle.
        """
        conn = obtener_conexion()
        cursor = conn.cursor()

        query = """
            UPDATE public.tabla_rotaciones 
            SET estado_rotacion = 'Procesado',
                cantidad_movimiento = %s
            WHERE id = %s;
        """

        cursor.execute(query, (cantidad_realizada, id_movimiento))
        conn.commit()
        cursor.close()
        conn.close()
