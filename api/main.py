from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.routers import (
    dashboard,
    movimientos,
    historico,
    movimientos_mes,
    empresas,
    motor,
    carteras_formato,
)

app = FastAPI(title="Rotador Cartera API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(dashboard.router, prefix="/api/dashboard", tags=["dashboard"])
app.include_router(movimientos.router, prefix="/api/movimientos", tags=["movimientos"])
app.include_router(historico.router, prefix="/api/historico", tags=["historico"])
app.include_router(movimientos_mes.router, prefix="/api/movimientos-mes", tags=["movimientos-mes"])
app.include_router(empresas.router, prefix="/api/empresas", tags=["empresas"])
app.include_router(motor.router, prefix="/api/motor", tags=["motor"])
app.include_router(
    carteras_formato.router,
    prefix="/api/motor/carteras-formato",
    tags=["carteras-formato"],
)


@app.get("/api/health")
def health():
    return {"status": "ok"}
