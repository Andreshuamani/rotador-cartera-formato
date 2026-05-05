from infrastructure.repository import SQLRepository
from services.rotacion_service import RotacionService

if __name__ == "__main__":
    repo = SQLRepository()
    service = RotacionService(repo)

    print("--- Iniciando Motor de Rotación ---")
    resultado = service.procesar_cartera_actual()
    print(resultado)
