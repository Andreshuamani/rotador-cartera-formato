from infrastructure.database import get_connection


class SQLRepository:
    def obtener_siguiente_cartera(self):
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "SELECT id_empresa, nombre_empresa FROM tabla_rotaciones WHERE estado_rotacion = 'PENDIENTE' LIMIT 1"
        )
        row = cursor.fetchone()
        conn.close()
        return {"id_empresa": row[0], "nombre_empresa": row[1]} if row else None

    def actualizar_estado_log(self, id_log, nuevo_estado):
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE tabla_rotaciones SET estado_rotacion = %s WHERE id = %s",
            (nuevo_estado, id_log),
        )
        conn.commit()
        conn.close()
