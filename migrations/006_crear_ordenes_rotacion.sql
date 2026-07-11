-- Migración 006: Tabla de órdenes de rotación (cola de movimientos)
-- Tabla propia de la app (no proviene de Mercurius): aquí se encolan las
-- directivas creadas desde el dashboard y el batch (.bat) las procesa.
-- Ejecutar una sola vez en la base de datos (réplica y producción).

CREATE TABLE IF NOT EXISTS public.ordenes_rotacion (
    id                   SERIAL PRIMARY KEY,
    id_empresa           INT          NOT NULL,
    nombre_empresa       VARCHAR(255) NOT NULL,
    grupo_origen         VARCHAR(255) NOT NULL,
    grupo_destino        VARCHAR(255) NOT NULL,
    cantidad_movimiento  INT          NOT NULL DEFAULT 0,
    mueve_cgmsv          BOOLEAN      NOT NULL DEFAULT FALSE,
    mueve_mercurius      BOOLEAN      NOT NULL DEFAULT FALSE,
    reparte_varios       BOOLEAN      NOT NULL DEFAULT FALSE,
    estado_rotacion      VARCHAR(50)  NOT NULL DEFAULT 'Pendiente',
    fecha_rotacion       DATE,
    fecha_creacion       TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ordenes_estado
    ON public.ordenes_rotacion (estado_rotacion);

CREATE INDEX IF NOT EXISTS idx_ordenes_empresa
    ON public.ordenes_rotacion (id_empresa);

COMMENT ON TABLE public.ordenes_rotacion IS
    'Cola de órdenes de rotación creadas desde el dashboard; el batch (.bat) las procesa y las marca como Procesado.';
