-- Migración 008: Monto movido en historial_rotaciones
-- Guarda el monto real (en soles) de los casos movidos en cada ejecución,
-- para que el Dashboard pueda mostrar "Monto movido" además de "Casos movidos".
-- Los registros existentes quedan en 0 porque ese dato no se capturaba antes;
-- el proceso que inserta en historial_rotaciones debe empezar a calcularlo y
-- enviarlo al crear cada fila nueva.
-- Ejecutar una sola vez en la base de datos (réplica y producción).

ALTER TABLE public.historial_rotaciones
    ADD COLUMN IF NOT EXISTS monto_movido NUMERIC(14, 2) NOT NULL DEFAULT 0;
