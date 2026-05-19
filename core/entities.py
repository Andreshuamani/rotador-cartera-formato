# core/models.py
from dataclasses import dataclass
from datetime import date, datetime
from typing import List


@dataclass(frozen=True)
class ReglasEjecucion:
    """
    Clase independiente que encapsula EXCLUSIVAMENTE el comportamiento
    y las banderas lógicas del algoritmo de reparto.
    """

    grupo_origen: str
    grupo_destino: str
    cantidad_movimiento: int
    mueve_cgmsv: bool
    mueve_mercurius: bool
    reparte_varios: bool

    def obtener_destinos_como_lista(self) -> List[str]:
        """Parsea la cadena de texto de pgAdmin (ej: 'Estudio A, Estudio B') a una lista limpia."""
        if not self.grupo_destino:
            return []
        return [estudio.strip() for estudio in self.grupo_destino.split(",")]


@dataclass
class OrdenRotacion:
    """
    La Entidad principal de control. Maneja el estado transaccional
    y el ciclo de vida de la orden dentro del bucle del .bat
    """

    id: int
    id_empresa: int
    nombre_empresa: str
    fecha_rotacion: date
    fecha_creacion: datetime
    estado_rotacion: str

    # Aplicamos COMPOSICIÓN: La orden contiene sus reglas de forma aislada
    reglas: ReglasEjecucion

    def esta_lista_para_procesar(self) -> bool:
        return self.estado_rotacion.upper() == "PENDIENTE"


@dataclass
class Deuda:
    """
    Representa el modelo fuerte de un registro de deuda individual
    dentro de nuestro Core.
    """

    id_deuda: int
    nombre: str
    telefono_verificado: str
    monto: float
    empresa: str
    grupo: str
    estado: str
