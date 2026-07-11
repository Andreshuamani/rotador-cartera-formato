from fastapi import APIRouter
from infrastructure.database import obtener_conexion
from datetime import date

router = APIRouter()


@router.get("/estudios")
def get_dashboard_estudios():
    """
    Para cada portafolio activo, muestra la distribución actual de deudores
    por agencia (grupo/estudio), más los casos asignados este mes desde historial.
    """
    hoy = date.today()
    mes = hoy.month
    anio = hoy.year

    conn = obtener_conexion()
    cursor = conn.cursor()

    # Casos actuales por empresa (portafolio) y grupo, desde el universo real de deudas
    cursor.execute(
        """
        SELECT em.nombre AS portafolio, gr.nombre AS grupo,
               COUNT(*) AS cantidad, COALESCE(SUM(d.monto), 0) AS total_monto
        FROM public.deudas d
        JOIN public.empresas em ON em.id = d.empresa_id
        JOIN public.grupos gr ON gr.id = d.grupo_id
        GROUP BY em.nombre, gr.nombre
        ORDER BY em.nombre, cantidad DESC
        """
    )
    rows_grupos = cursor.fetchall()

    # Casos asignados este mes desde historial
    cursor.execute(
        """
        SELECT nombre_empresa, grupo_destino, SUM(cantidad_movida) AS casos_asignados
        FROM public.historial_rotaciones
        WHERE mes = %s AND anio = %s
        GROUP BY nombre_empresa, grupo_destino
        """,
        [mes, anio],
    )
    rows_hist = cursor.fetchall()

    cursor.close()
    conn.close()

    # Índice de asignaciones del mes
    hist_idx: dict = {}
    for empresa, grupo, asignados in rows_hist:
        hist_idx.setdefault(empresa, {})[grupo] = asignados

    # Agrupar por portafolio
    carteras: dict = {}
    for portafolio, grupo, cantidad, total_monto in rows_grupos:
        if portafolio not in carteras:
            carteras[portafolio] = {}
        carteras[portafolio][grupo] = {
            "casos_actuales": cantidad,
            "total_monto": float(total_monto),
            "casos_asignados_mes": hist_idx.get(portafolio, {}).get(grupo, 0),
        }

    result = [
        {
            "empresa": portafolio,
            "estudios": [
                {
                    "grupo": grupo,
                    "casos_actuales": data["casos_actuales"],
                    "total_monto": data["total_monto"],
                    "casos_asignados_mes": data["casos_asignados_mes"],
                }
                for grupo, data in grupos.items()
            ],
        }
        for portafolio, grupos in sorted(carteras.items())
    ]

    return {"mes": mes, "anio": anio, "carteras": result}
