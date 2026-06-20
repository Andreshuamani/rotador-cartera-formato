-- Migración 003: Grupos mock por empresa
-- Usar subquery para que el id de BITEL sea siempre correcto sin hardcodear.

CREATE TABLE IF NOT EXISTS public.empresa_grupos_mock (
    id                SERIAL PRIMARY KEY,
    empresa_id        INT          NOT NULL,
    grupo_nombre      VARCHAR(255) NOT NULL,
    cantidad_simulada INT          NOT NULL DEFAULT 0
);

-- Limpiar si ya existían datos para BITEL para poder re-ejecutar
DELETE FROM public.empresa_grupos_mock
WHERE empresa_id = (SELECT id FROM public.empresas WHERE nombre = 'MERCURIUS - BITEL');

-- MERCURIUS - BITEL: solo 3 grupos
INSERT INTO public.empresa_grupos_mock (empresa_id, grupo_nombre, cantidad_simulada)
SELECT e.id, g.grupo_nombre, g.cantidad_simulada
FROM public.empresas e
CROSS JOIN (
    VALUES
        ('ESTUDIO A', 87),
        ('ESTUDIO B', 64),
        ('ESTUDIO C', 41)
) AS g(grupo_nombre, cantidad_simulada)
WHERE e.nombre = 'MERCURIUS - BITEL';
