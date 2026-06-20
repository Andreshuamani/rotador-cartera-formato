-- Migración 004: Reemplazar grupos destino por PEGASUS, MAGA y ECE
-- Los grupos destino anteriores (ESTUDIO 01-05) se eliminan y se reemplazan
-- con los grupos reales de destino para BITEL.

DELETE FROM public.grupos;

INSERT INTO public.grupos (nombre) VALUES
    ('PEGASUS'),
    ('MAGA'),
    ('ECE');
