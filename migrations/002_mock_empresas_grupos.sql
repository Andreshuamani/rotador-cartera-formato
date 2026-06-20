-- Migración 002: Tablas mock de empresas y grupos (simula producción)

CREATE TABLE IF NOT EXISTS public.empresas (
    id     SERIAL PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL
);

INSERT INTO public.empresas (nombre) VALUES
    ('MERCURIUS - CLARO'),
    ('MERCURIUS - MOVISTAR'),
    ('MERCURIUS - ENTEL'),
    ('MERCURIUS - BITEL'),
    ('MERCURIUS - DIRECTV')
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS public.grupos (
    id     SERIAL PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL
);

INSERT INTO public.grupos (nombre) VALUES
    ('ESTUDIO 01'),
    ('ESTUDIO 02'),
    ('ESTUDIO 03'),
    ('ESTUDIO 04'),
    ('ESTUDIO 05')
ON CONFLICT DO NOTHING;
