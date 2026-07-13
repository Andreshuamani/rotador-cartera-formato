from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from infrastructure.repository import SQLRepository
from services.motor_service import MotorService

router = APIRouter()

meta_repo = SQLRepository()
motor_service = MotorService()


@router.get("/pendientes")
def get_pendientes():
    """Carteras con órdenes 'Pendiente', con el detalle de cada orden para revisar antes de ejecutar."""
    carteras = meta_repo.listar_carteras_pendientes()
    for cartera in carteras:
        cartera["ordenes"] = meta_repo.obtener_movimientos_de_cartera(cartera["id_empresa"])

    return {"total_carteras": len(carteras), "carteras": carteras}


class EjecutarRequest(BaseModel):
    id_empresa: int


@router.post("/ejecutar")
def ejecutar(body: EjecutarRequest):
    """
    Dispara el motor sobre todas las órdenes pendientes de una cartera:
    reclasifica sobre datos reales, mueve los casos en public.deudas y
    registra el resultado en historial_rotaciones.
    """
    try:
        return motor_service.ejecutar_cartera(body.id_empresa)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
