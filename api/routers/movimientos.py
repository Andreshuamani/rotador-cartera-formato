from datetime import date

from fastapi import APIRouter, HTTPException, Query
from infrastructure.database import obtener_conexion
from infrastructure.deuda_repository import DeudaRepository
from pydantic import BaseModel
from typing import List, Optional

from core.entities import ReglasEjecucion
from services.rotacion_service import RotacionService

router = APIRouter()

deuda_repo = DeudaRepository()
rotacion_service = RotacionService()


class MovimientoCreate(BaseModel):
    id_empresa: str
    nombre_empresa: str
    grupo_origen: str
    grupos_destino: List[str]
    mueve_cgmsv: bool = False
    excluye_fallecido: bool = True
    excluye_sin_telefono: bool = True
    reparte_varios: bool = False
    fecha_rotacion: Optional[date] = None


class FilaPrevisualizar(BaseModel):
    grupo_origen: str
    grupo_destino: str
    mueve_cgmsv: bool = False
    excluye_fallecido: bool = True
    excluye_sin_telefono: bool = True


class PrevisualizarRequest(BaseModel):
    id_empresa: str
    nombre_empresa: str
    filas: List[FilaPrevisualizar]


def _calcular_exclusiones(
    nombre_empresa: str,
    grupo_origen: str,
    mueve_cgmsv: bool,
    excluye_fallecido: bool,
    excluye_sin_telefono: bool,
) -> dict:
    """
    Exclusiones a nivel cartera (services.RotacionService, sobre el universo real
    del grupo origen), cada una habilitable de forma independiente por Operaciones:
    teléfonos no verificados -> CGMSV; Estado Fallecido/Baja y/o sin teléfono -> MERCURIUS.
    El resto queda apto para rotar al destino elegido.
    """
    df_universo = deuda_repo.extraer_universo_cuentas(nombre_empresa, grupo_origen)

    reglas = ReglasEjecucion(
        grupo_origen=grupo_origen,
        grupo_destino="",
        cantidad_movimiento=0,
        mueve_cgmsv=mueve_cgmsv,
        excluye_fallecido=excluye_fallecido,
        excluye_sin_telefono=excluye_sin_telefono,
        reparte_varios=False,
    )
    df_mercurius, df_cgmsv, df_aptos, desglose_mercurius = (
        rotacion_service.clasificar_y_segmentar_cartera(df_universo, reglas)
    )

    return {
        "casos_evaluados": len(df_universo),
        "casos_excluidos_cgmsv": len(df_cgmsv),
        "casos_excluidos_mercurius": len(df_mercurius),
        "casos_excluidos_fallecido": desglose_mercurius["fallecido"],
        "casos_excluidos_sin_telefono": desglose_mercurius["sin_telefono"],
        "casos_a_rotar": len(df_aptos),
    }


@router.post("/previsualizar")
def previsualizar(body: PrevisualizarRequest):
    """
    Vista previa (informe 5.3): calcula, sin persistir nada, cuántos casos se
    evalúan, cuántos se excluyen (CGMSV / MERCURIUS) y cuántos finalmente
    rotarían para cada grupo origen, según las exclusiones que Operaciones
    haya marcado en la solicitud.
    """
    filas = []
    total_evaluados = total_cgmsv = total_mercurius = total_a_rotar = 0

    for fila in body.filas:
        exclusiones = _calcular_exclusiones(
            body.nombre_empresa,
            fila.grupo_origen,
            fila.mueve_cgmsv,
            fila.excluye_fallecido,
            fila.excluye_sin_telefono,
        )
        filas.append(
            {
                "grupo_origen": fila.grupo_origen,
                "grupo_destino": fila.grupo_destino,
                "mueve_cgmsv": fila.mueve_cgmsv,
                "excluye_fallecido": fila.excluye_fallecido,
                "excluye_sin_telefono": fila.excluye_sin_telefono,
                **exclusiones,
            }
        )
        total_evaluados += exclusiones["casos_evaluados"]
        total_cgmsv += exclusiones["casos_excluidos_cgmsv"]
        total_mercurius += exclusiones["casos_excluidos_mercurius"]
        total_a_rotar += exclusiones["casos_a_rotar"]

    return {
        "filas": filas,
        "totales": {
            "casos_evaluados": total_evaluados,
            "casos_excluidos_cgmsv": total_cgmsv,
            "casos_excluidos_mercurius": total_mercurius,
            "casos_a_rotar": total_a_rotar,
        },
    }


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
               casos_evaluados, casos_excluidos_cgmsv, casos_excluidos_mercurius,
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

    # Los casos evaluados/excluidos se recalculan en el servidor (no confiamos
    # en números que mande el cliente); las 3 reglas en sí (qué exclusiones
    # aplicar) sí vienen del checkbox que marcó Operaciones en la solicitud.
    exclusiones = _calcular_exclusiones(
        body.nombre_empresa,
        body.grupo_origen,
        body.mueve_cgmsv,
        body.excluye_fallecido,
        body.excluye_sin_telefono,
    )
    mueve_mercurius = body.excluye_fallecido or body.excluye_sin_telefono

    conn = obtener_conexion()
    cursor = conn.cursor()

    fecha = body.fecha_rotacion or date.today()

    columnas_exclusion = [
        exclusiones["casos_evaluados"],
        exclusiones["casos_excluidos_cgmsv"],
        exclusiones["casos_excluidos_mercurius"],
    ]

    if body.reparte_varios:
        grupo_destino_str = ", ".join(body.grupos_destino)
        cursor.execute(
            """
            INSERT INTO public.ordenes_rotacion
                (id_empresa, nombre_empresa, grupo_origen, grupo_destino,
                 cantidad_movimiento, mueve_cgmsv, mueve_mercurius, reparte_varios,
                 casos_evaluados, casos_excluidos_cgmsv, casos_excluidos_mercurius,
                 estado_rotacion, fecha_rotacion, fecha_creacion)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 'Pendiente', %s, NOW())
            RETURNING id
            """,
            [
                body.id_empresa, body.nombre_empresa, body.grupo_origen,
                grupo_destino_str, exclusiones["casos_a_rotar"],
                body.mueve_cgmsv, mueve_mercurius, body.reparte_varios,
                *columnas_exclusion, fecha,
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
                     casos_evaluados, casos_excluidos_cgmsv, casos_excluidos_mercurius,
                     estado_rotacion, fecha_rotacion, fecha_creacion)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 'Pendiente', %s, NOW())
                RETURNING id
                """,
                [
                    body.id_empresa, body.nombre_empresa, body.grupo_origen,
                    destino, exclusiones["casos_a_rotar"],
                    body.mueve_cgmsv, mueve_mercurius, body.reparte_varios,
                    *columnas_exclusion, fecha,
                ],
            )
            ids.append(cursor.fetchone()[0])

    conn.commit()
    cursor.close()
    conn.close()

    return {"ok": True, "ids_creados": ids, **exclusiones}
