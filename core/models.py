from dataclasses import dataclass


@dataclass
class Rotacion:
    id_empresa: int
    nombre_empresa: str
    grupo_origen: str
    grupo_destino: str
    mueve_cgmsv: bool = False
    mueve_mercurius: bool = True
    reparte_varios: bool = False
    estado: str = "PENDIENTE"
