-- Migración 005: Grupos mock para CLARO, MOVISTAR, ENTEL y DIRECTV
-- Cada empresa tiene entre 5 y 6 grupos origen con cantidades simuladas.
-- Se usa subquery para no hardcodear IDs, igual que en migración 003.

-- Limpiar datos previos de estas empresas para re-ejecución segura
DELETE FROM public.empresa_grupos_mock
WHERE empresa_id IN (
    SELECT id FROM public.empresas
    WHERE nombre IN (
        'MERCURIUS - CLARO',
        'MERCURIUS - MOVISTAR',
        'MERCURIUS - ENTEL',
        'MERCURIUS - DIRECTV'
    )
);

-- MERCURIUS - CLARO: 5 grupos
INSERT INTO public.empresa_grupos_mock (empresa_id, grupo_nombre, cantidad_simulada)
SELECT e.id, g.grupo_nombre, g.cantidad_simulada
FROM public.empresas e
CROSS JOIN (
    VALUES
        ('ESTUDIO A', 312),
        ('ESTUDIO B', 278),
        ('ESTUDIO C', 195),
        ('ESTUDIO D', 143),
        ('ESTUDIO E', 88)
) AS g(grupo_nombre, cantidad_simulada)
WHERE e.nombre = 'MERCURIUS - CLARO';

-- MERCURIUS - MOVISTAR: 6 grupos
INSERT INTO public.empresa_grupos_mock (empresa_id, grupo_nombre, cantidad_simulada)
SELECT e.id, g.grupo_nombre, g.cantidad_simulada
FROM public.empresas e
CROSS JOIN (
    VALUES
        ('ESTUDIO A', 421),
        ('ESTUDIO B', 374),
        ('ESTUDIO C', 256),
        ('ESTUDIO D', 198),
        ('ESTUDIO E', 132),
        ('ESTUDIO F', 77)
) AS g(grupo_nombre, cantidad_simulada)
WHERE e.nombre = 'MERCURIUS - MOVISTAR';

-- MERCURIUS - ENTEL: 5 grupos
INSERT INTO public.empresa_grupos_mock (empresa_id, grupo_nombre, cantidad_simulada)
SELECT e.id, g.grupo_nombre, g.cantidad_simulada
FROM public.empresas e
CROSS JOIN (
    VALUES
        ('ESTUDIO A', 183),
        ('ESTUDIO B', 157),
        ('ESTUDIO C', 112),
        ('ESTUDIO D', 89),
        ('ESTUDIO E', 54)
) AS g(grupo_nombre, cantidad_simulada)
WHERE e.nombre = 'MERCURIUS - ENTEL';

-- MERCURIUS - DIRECTV: 6 grupos
INSERT INTO public.empresa_grupos_mock (empresa_id, grupo_nombre, cantidad_simulada)
SELECT e.id, g.grupo_nombre, g.cantidad_simulada
FROM public.empresas e
CROSS JOIN (
    VALUES
        ('ESTUDIO A', 267),
        ('ESTUDIO B', 234),
        ('ESTUDIO C', 178),
        ('ESTUDIO D', 145),
        ('ESTUDIO E', 93),
        ('ESTUDIO F', 61)
) AS g(grupo_nombre, cantidad_simulada)
WHERE e.nombre = 'MERCURIUS - DIRECTV';
