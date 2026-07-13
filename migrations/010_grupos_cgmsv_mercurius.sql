-- Migración 010: Grupos especiales CGMSV y MERCURIUS
-- Los casos con teléfono no verificado (CGMSV) o en estado Baja/Fallecido/sin
-- teléfono (MERCURIUS) se mueven a estos grupos en vez de rotar a un estudio
-- real. El motor de movimiento (services/motor_service.py) exige que existan
-- en public.grupos antes de mover un solo caso.
-- Ejecutar una sola vez en la base de datos (réplica y producción).

INSERT INTO public.grupos (nombre)
SELECT 'CGMSV'
WHERE NOT EXISTS (
    SELECT 1 FROM public.grupos WHERE UPPER(TRIM(nombre)) = 'CGMSV'
);

INSERT INTO public.grupos (nombre)
SELECT 'MERCURIUS'
WHERE NOT EXISTS (
    SELECT 1 FROM public.grupos WHERE UPPER(TRIM(nombre)) = 'MERCURIUS'
);
