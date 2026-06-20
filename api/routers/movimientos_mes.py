from fastapi import APIRouter
from infrastructure.database import obtener_conexion
from datetime import date

router = APIRouter()


@router.get("")
def get_movimientos_mes():
    """
    Resumen de movimientos del mes actual: totales por empresa y por estudio destino.
    """
    hoy = date.today()
    mes = hoy.month
    anio = hoy.year

    conn = obtener_conexion()
    cursor = conn.cursor()

    # Resumen general del mes
    query_resumen = """
        SELECT
            nombre_empresa,
            grupo_origen,
            grupo_destino,
            SUM(cantidad_movida) AS total_movidos,
            COUNT(*) AS cantidad_ejecuciones
        FROM public.historial_rotaciones
        WHERE mes = %s AND anio = %s
        GROUP BY nombre_empresa, grupo_origen, grupo_destino
        ORDER BY nombre_empresa, total_movidos DESC;
    """
    cursor.execute(query_resumen, [mes, anio])
    rows = cursor.fetchall()
    columns = [desc[0] for desc in cursor.description]

    # Totales globales del mes
    query_totales = """
        SELECT
            SUM(cantidad_movida) AS total_casos_movidos,
            COUNT(DISTINCT nombre_empresa) AS empresas_procesadas,
            COUNT(*) AS total_ejecuciones
        FROM public.historial_rotaciones
        WHERE mes = %s AND anio = %s;
    """
    cursor.execute(query_totales, [mes, anio])
    totales_row = cursor.fetchone()

    cursor.close()
    conn.close()

    detalle = [dict(zip(columns, row)) for row in rows]

    totales = {
        "total_casos_movidos": totales_row[0] or 0,
        "empresas_procesadas": totales_row[1] or 0,
        "total_ejecuciones": totales_row[2] or 0,
    }

    return {
        "mes": mes,
        "anio": anio,
        "totales": totales,
        "detalle": detalle,
    }
