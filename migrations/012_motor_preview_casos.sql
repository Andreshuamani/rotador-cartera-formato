-- Migración 012: staging de "Carteras formato" (preview → ejecución)
-- "Obtener casos" calcula y congela acá la lista final (deuda + destino);
-- "Ejecutar rotación" mueve exactamente esa misma lista (no recalcula), para
-- que el número que vio Operaciones en el preview sea el que queda en
-- historial_rotaciones / ordenes_rotacion.
-- Ejecutar una sola vez en la base de datos (réplica y producción).

CREATE TABLE IF NOT EXISTS public.motor_preview_casos (
    id             SERIAL PRIMARY KEY,
    lote_id        UUID         NOT NULL,
    orden_id       INT          NOT NULL,
    id_empresa     INT          NOT NULL,
    nombre_empresa VARCHAR(255) NOT NULL,
    deuda_id       INT          NOT NULL,
    grupo_origen   VARCHAR(255) NOT NULL,
    grupo_destino  VARCHAR(255) NOT NULL,
    monto          NUMERIC(14, 2) NOT NULL DEFAULT 0,
    fecha_creacion TIMESTAMP    NOT NULL DEFAULT NOW(),
    ejecutado      BOOLEAN      NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_motor_preview_lote
    ON public.motor_preview_casos (lote_id);

COMMENT ON TABLE public.motor_preview_casos IS
    'Lote congelado por "Obtener casos" en Carteras formato; "Ejecutar rotación" mueve exactamente estas filas.';
