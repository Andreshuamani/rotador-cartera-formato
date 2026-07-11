-- Migración 007: Exclusiones a nivel cartera en ordenes_rotacion
-- Guarda el desglose real (evaluados / excluidos CGMSV / excluidos MERCURIUS)
-- calculado por el motor (services/rotacion_service.py) al momento de crear
-- cada movimiento. cantidad_movimiento pasa a representar los casos a rotar
-- (ya descontadas las exclusiones), no el conteo crudo del grupo origen.
-- Ejecutar una sola vez en la base de datos (réplica y producción).

ALTER TABLE public.ordenes_rotacion
    ADD COLUMN IF NOT EXISTS casos_evaluados INT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS casos_excluidos_cgmsv INT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS casos_excluidos_mercurius INT NOT NULL DEFAULT 0;
