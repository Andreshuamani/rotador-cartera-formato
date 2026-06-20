from datetime import date

from fastapi import APIRouter, HTTPException, Query
from infrastructure.database import obtener_conexion
from pydantic import BaseModel
from typing import List, Optional

router = APIRouter()


class MovimientoCreate(BaseModel):
    id_empresa: str
    nombre_empresa: str
    grupo_origen: str
    grupos_destino: List[str]
    cantidad_movimiento: int
    mueve_cgmsv: bool = False
    mueve_mercurius: bool = False
    reparte_varios: bool = False
    fecha_rotacion: Optional[date] = None


@router.get("")
def get_movimientos(
    estado: Optional[str] = Query(None, description="Pendiente | Procesado"),
    empresa: Optional[str] = Query(None),
):
    conn = obtener_conexion()
    cursor = conn.cursor()

    conditions = []
    params = []

    if estado:
        conditions.append("estado_rotacion = %s")
        params.append(estado)
    if empresa:
        conditions.append("nombre_empresa ILIKE %s")
        params.append(f"%{empresa}%")

    where = f"WHERE {' AND '.join(conditions)}" if conditions else ""

    query = f"""
        SELECT id, id_empresa, nombre_empresa, grupo_origen, grupo_destino,
               cantidad_movimiento, mueve_cgmsv, mueve_mercurius, reparte_varios,
               estado_rotacion, fecha_rotacion, fecha_creacion
        FROM public.ordenes_rotacion
        {where}
        ORDER BY fecha_creacion DESC;
    """

    cursor.execute(query, params)
    rows = cursor.fetchall()
    columns = [desc[0] for desc in cursor.description]
    cursor.close()
    conn.close()

    movimientos = []
    for row in rows:
        item = dict(zip(columns, row))
        for key in ("fecha_rotacion", "fecha_creacion"):
            if item.get(key):
                item[key] = item[key].isoformat()
        movimientos.append(item)

    return {"total": len(movimientos), "movimientos": movimientos}


@router.post("")
def crear_movimiento(body: MovimientoCreate):
    if not body.grupos_destino:
        raise HTTPException(status_code=400, detail="Debe seleccionar al menos un grupo destino.")

    conn = obtener_conexion()
    cursor = conn.cursor()

    fecha = body.fecha_rotacion or date.today()

    if body.reparte_varios:
        grupo_destino_str = ", ".join(body.grupos_destino)
        cursor.execute(
            """
            INSERT INTO public.ordenes_rotacion
                (id_empresa, nombre_empresa, grupo_origen, grupo_destino,
                 cantidad_movimiento, mueve_cgmsv, mueve_mercurius, reparte_varios,
                 estado_rotacion, fecha_rotacion, fecha_creacion)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, 'Pendiente', %s, NOW())
            RETURNING id
            """,
            [
                body.id_empresa, body.nombre_empresa, body.grupo_origen,
                grupo_destino_str, body.cantidad_movimiento,
                body.mueve_cgmsv, body.mueve_mercurius, body.reparte_varios, fecha,
            ],
        )
        ids = [cursor.fetchone()[0]]
    else:
        ids = []
        for destino in body.grupos_destino:
            cursor.execute(
                """
                INSERT INTO public.ordenes_rotacion
                    (id_empresa, nombre_empresa, grupo_origen, grupo_destino,
                     cantidad_movimiento, mueve_cgmsv, mueve_mercurius, reparte_varios,
                     estado_rotacion, fecha_rotacion, fecha_creacion)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, 'Pendiente', %s, NOW())
                RETURNING id
                """,
                [
                    body.id_empresa, body.nombre_empresa, body.grupo_origen,
                    destino, body.cantidad_movimiento,
                    body.mueve_cgmsv, body.mueve_mercurius, body.reparte_varios, fecha,
                ],
            )
            ids.append(cursor.fetchone()[0])

    conn.commit()
    cursor.close()
    conn.close()

    return {"ok": True, "ids_creados": ids}
