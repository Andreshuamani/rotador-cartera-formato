-- Migración 011: schema cgma con la función real de rotación
-- Réplica del patrón que ya usa el equipo manualmente (04_Proceso_rotacion_y_stock.sql):
-- se carga cgma.deudas_rotacion_mercurius(deuda_id, grupo) y se llama a
-- cgma.fn_rotaciones_mercurius() para que aplique el cambio. Se crea desde
-- cero en esta rama, contra las tablas actuales (public.deudas/public.grupos).
-- Ejecutar una sola vez en la base de datos (réplica y producción).

CREATE SCHEMA IF NOT EXISTS cgma;

CREATE TABLE IF NOT EXISTS cgma.deudas_rotacion_mercurius (
    deuda_id INT          NOT NULL,
    grupo    VARCHAR(255) NOT NULL
);

CREATE OR REPLACE FUNCTION cgma.fn_rotaciones_mercurius()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE public.deudas d
    SET grupo_id = g.id
    FROM cgma.deudas_rotacion_mercurius r
    JOIN public.grupos g ON UPPER(TRIM(g.nombre)) = UPPER(TRIM(r.grupo))
    WHERE d.id = r.deuda_id;
END;
$$;

COMMENT ON FUNCTION cgma.fn_rotaciones_mercurius() IS
    'Mueve cada deuda de cgma.deudas_rotacion_mercurius a su grupo destino (por nombre). Solo movimiento, sin historial ni validaciones — eso lo maneja la app antes de llamarla.';
