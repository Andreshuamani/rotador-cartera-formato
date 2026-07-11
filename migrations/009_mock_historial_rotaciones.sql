-- Migración 009: Datos mock de historial_rotaciones (solo entorno local de pruebas)
-- Simula ejecuciones ya procesadas del mes actual para poder visualizar el
-- Dashboard sin depender del proceso externo que aún no llena esta tabla.

INSERT INTO public.historial_rotaciones
    (id_empresa, nombre_empresa, grupo_origen, grupo_destino, cantidad_movida, monto_movido, fecha_ejecucion, mes, anio)
SELECT
    mock.id_empresa, mock.nombre_empresa, mock.grupo_origen, mock.grupo_destino,
    mock.cantidad_movida, mock.monto_movido, mock.fecha_ejecucion,
    EXTRACT(MONTH FROM mock.fecha_ejecucion)::int, EXTRACT(YEAR FROM mock.fecha_ejecucion)::int
FROM (VALUES
    (1, 'BITEL',    'ESTUDIO A', 'PEGASUS', 87,  29400::numeric, (date_trunc('month', CURRENT_DATE) + interval '0 day')::timestamp),
    (1, 'BITEL',    'ESTUDIO B', 'MAGA',    64,  21100::numeric, (date_trunc('month', CURRENT_DATE) + interval '2 day')::timestamp),
    (2, 'CLARO',    'ESTUDIO A', 'PEGASUS', 312, 54200::numeric, (date_trunc('month', CURRENT_DATE) + interval '1 day')::timestamp),
    (2, 'CLARO',    'ESTUDIO C', 'ECE',     145, 19800::numeric, (date_trunc('month', CURRENT_DATE) + interval '3 day')::timestamp),
    (3, 'MOVISTAR', 'ESTUDIO B', 'MAGA',    210, 41300::numeric, (date_trunc('month', CURRENT_DATE) + interval '0 day')::timestamp),
    (3, 'MOVISTAR', 'ESTUDIO D', 'ECE',     77,  15600::numeric, (date_trunc('month', CURRENT_DATE) + interval '4 day')::timestamp),
    (4, 'ENTEL',    'ESTUDIO A', 'PEGASUS', 40,  9800::numeric,  (date_trunc('month', CURRENT_DATE) + interval '1 day')::timestamp),
    (5, 'DIRECTV',  'ESTUDIO B', 'MAGA',    38,  12200::numeric, (date_trunc('month', CURRENT_DATE) + interval '2 day')::timestamp)
) AS mock(id_empresa, nombre_empresa, grupo_origen, grupo_destino, cantidad_movida, monto_movido, fecha_ejecucion)
WHERE NOT EXISTS (
    SELECT 1 FROM public.historial_rotaciones
    WHERE mes = EXTRACT(MONTH FROM CURRENT_DATE)::int
      AND anio = EXTRACT(YEAR FROM CURRENT_DATE)::int
);
