class RotacionService:
    def __init__(self, repository):
        self.repository = repository

    def procesar_cartera_actual(self):
        # 1. Busca la siguiente cartera pendiente
        cartera = self.repository.obtener_siguiente_cartera()
        if not cartera:
            return "No hay tareas pendientes."

        # 2. Obtiene todos los movimientos (los 15 o 50 que mencionaste)
        movimientos = self.repository.obtener_movimientos(cartera["id_empresa"])

        for mov in movimientos:
            # Aquí vendrá la lógica del query de deudas mañana
            self.repository.ejecutar_movimiento_db(mov)
            self.repository.actualizar_estado_log(mov["id"], "PROCESADO")

        return f"Cartera {cartera['nombre_empresa']} procesada con éxito."
