from fastapi import APIRouter
from infrastructure.database import obtener_conexion
from datetime import date

router = APIRouter()

EMPRESAS_DESTACADAS = 3
MOVIMIENTOS_POR_EMPRESA = 2


@router.get("/resumen-mes")
def get_dashboard_resumen_mes():
    """
    Resumen del mes actual para el Dashboard: totales (casos movidos, monto
    movido, rotaciones) y el detalle de los movimientos más recientes por
    empresa, tal como los procesó el motor (historial_rotaciones).
    """
    hoy = date.today()
    mes = hoy.month
    anio = hoy.year

    conn = obtener_conexion()
    cursor = conn.cursor()

    cursor.execute(
        """
        SELECT
            COALESCE(SUM(cantidad_movida), 0) AS casos_movidos,
            COALESCE(SUM(monto_movido), 0) AS monto_movido,
            COUNT(*) AS rotaciones
        FROM public.historial_rotaciones
        WHERE mes = %s AND anio = %s
        """,
        [mes, anio],
    )
    casos_movidos, monto_movido, rotaciones = cursor.fetchone()

    cursor.execute(
        """
        SELECT nombre_empresa, grupo_origen, grupo_destino, cantidad_movida,
               monto_movido, fecha_ejecucion
        FROM public.historial_rotaciones
        WHERE mes = %s AND anio = %s
        ORDER BY nombre_empresa, fecha_ejecucion DESC
        """,
        [mes, anio],
    )
    rows = cursor.fetchall()

    cursor.close()
    conn.close()

    por_empresa: dict = {}
    for nombre_empresa, grupo_origen, grupo_destino, cantidad, monto, fecha in rows:
        por_empresa.setdefault(nombre_empresa, []).append(
            {
                "grupo_origen": grupo_origen,
                "grupo_destino": grupo_destino,
                "casos_movidos": cantidad,
                "monto_movido": float(monto),
                "fecha": fecha.isoformat(),
            }
        )

    nombres_empresas = sorted(por_empresa.keys())
    destacadas = nombres_empresas[:EMPRESAS_DESTACADAS]
    resto = nombres_empresas[EMPRESAS_DESTACADAS:]

    empresas = [
        {
            "nombre_empresa": nombre,
            "movimientos": por_empresa[nombre][:MOVIMIENTOS_POR_EMPRESA],
        }
        for nombre in destacadas
    ]

    return {
        "mes": mes,
        "anio": anio,
        "totales": {
            "casos_movidos": casos_movidos,
            "monto_movido": float(monto_movido),
            "rotaciones": rotaciones,
        },
        "empresas": empresas,
        "empresas_adicionales": resto,
    }
