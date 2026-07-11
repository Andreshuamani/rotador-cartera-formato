from fastapi import APIRouter, Query
from infrastructure.database import obtener_conexion
from typing import Optional

router = APIRouter()


@router.get("")
def buscar_empresas(search: Optional[str] = Query(None)):
    conn = obtener_conexion()
    cursor = conn.cursor()

    if search:
        cursor.execute(
            "SELECT id, nombre FROM public.empresas WHERE nombre ILIKE %s ORDER BY nombre",
            [f"%{search}%"],
        )
    else:
        cursor.execute("SELECT id, nombre FROM public.empresas ORDER BY nombre")

    rows = cursor.fetchall()
    cursor.close()
    conn.close()

    return [{"id": str(r[0]), "nombre": r[1]} for r in rows]


@router.get("/grupos/destino")
def get_grupos_destino():
    conn = obtener_conexion()
    cursor = conn.cursor()
    cursor.execute("SELECT id, nombre FROM public.grupos ORDER BY nombre")
    rows = cursor.fetchall()
    cursor.close()
    conn.close()
    return [{"id": r[0], "nombre": r[1]} for r in rows]


@router.get("/{id_empresa}/grupos-origen")
def get_grupos_origen(id_empresa: str):
    conn = obtener_conexion()
    cursor = conn.cursor()

    cursor.execute("SELECT nombre FROM public.empresas WHERE id = %s", [id_empresa])
    row = cursor.fetchone()
    nombre_empresa = row[0] if row else f"EMPRESA {id_empresa}"

    cursor.execute(
        """
        SELECT gr.nombre, COUNT(*) AS cantidad
        FROM public.deudas d
        JOIN public.grupos gr ON gr.id = d.grupo_id
        WHERE d.empresa_id = %s
        GROUP BY gr.nombre
        ORDER BY cantidad DESC
        """,
        [id_empresa],
    )
    grupos = [{"grupo": r[0], "cantidad": r[1]} for r in cursor.fetchall()]

    cursor.close()
    conn.close()

    return {"empresa": nombre_empresa, "id_empresa": id_empresa, "grupos": grupos}
