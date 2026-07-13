from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from services.carteras_formato_service import CarterasFormatoService

router = APIRouter()

service = CarterasFormatoService()


@router.post("/obtener-casos")
def obtener_casos():
    """
    Corre la query real de elegibilidad (retención, consolidados, posibles
    activos, CSP, estados) más el reparto por orden, y congela el resultado
    en un lote para que "Ejecutar rotación" mueva exactamente estos números.
    """
    try:
        return service.obtener_casos()
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        # No se puede probar este flujo (dblink + schema cgma) contra una BD
        # sin esos objetos, así que el error real de Postgres se propaga tal
        # cual en vez de perderse como "Internal Server Error" genérico.
        raise HTTPException(status_code=500, detail=str(e))


class EjecutarLoteRequest(BaseModel):
    lote_id: str


@router.post("/ejecutar")
def ejecutar(body: EjecutarLoteRequest):
    """Mueve el lote congelado por /obtener-casos: cgma.fn_rotaciones_mercurius + historial + cierre de órdenes."""
    try:
        return service.ejecutar_lote(body.lote_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
