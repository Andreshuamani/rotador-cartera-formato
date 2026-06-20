from fastapi import APIRouter, Query
from infrastructure.database import obtener_conexion
from typing import Optional

router = APIRouter()


@router.get("")
def get_historico(
    empresa: Optional[str] = Query(None),
    mes: Optional[int] = Query(None),
    anio: Optional[int] = Query(None),
    limit: int = Query(100, ge=1, le=500),
):
    """
    Retorna el historial de ejecuciones de rotaciones desde historial_rotaciones.
    """
    conn = obtener_conexion()
    cursor = conn.cursor()

    conditions = []
    params = []

    if empresa:
        conditions.append("nombre_empresa ILIKE %s")
        params.append(f"%{empresa}%")
    if mes:
        conditions.append("mes = %s")
        params.append(mes)
    if anio:
        conditions.append("anio = %s")
        params.append(anio)

    where = f"WHERE {' AND '.join(conditions)}" if conditions else ""

    query = f"""
        SELECT id, id_empresa, nombre_empresa, grupo_origen, grupo_destino,
               cantidad_movida, fecha_ejecucion, mes, anio
        FROM public.historial_rotaciones
        {where}
        ORDER BY fecha_ejecucion DESC
        LIMIT %s;
    """
    params.append(limit)

    cursor.execute(query, params)
    rows = cursor.fetchall()
    columns = [desc[0] for desc in cursor.description]
    cursor.close()
    conn.close()

    historico = []
    for row in rows:
        item = dict(zip(columns, row))
        if item.get("fecha_ejecucion"):
            item["fecha_ejecucion"] = item["fecha_ejecucion"].isoformat()
        historico.append(item)

    return {"total": len(historico), "historico": historico}
