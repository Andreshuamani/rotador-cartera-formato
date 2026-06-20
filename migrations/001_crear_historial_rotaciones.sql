-- Migración 001: Tabla de historial de ejecuciones de rotaciones
-- Ejecutar una sola vez en la base de datos (réplica y producción)

CREATE TABLE IF NOT EXISTS public.historial_rotaciones (
    id               SERIAL PRIMARY KEY,
    id_empresa       INT          NOT NULL,
    nombre_empresa   VARCHAR(255) NOT NULL,
    grupo_origen     VARCHAR(255) NOT NULL,
    grupo_destino    VARCHAR(255) NOT NULL,
    cantidad_movida  INT          NOT NULL DEFAULT 0,
    fecha_ejecucion  TIMESTAMP    NOT NULL DEFAULT NOW(),
    mes              INT          NOT NULL,
    anio             INT          NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_historial_empresa
    ON public.historial_rotaciones (id_empresa);

CREATE INDEX IF NOT EXISTS idx_historial_mes_anio
    ON public.historial_rotaciones (mes, anio);

COMMENT ON TABLE public.historial_rotaciones IS
    'Registro de cada ejecución de rotación: qué se movió, a dónde y cuánto.';
