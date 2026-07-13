
--Esto para cargar los datos en la tabla de deudas a repartir // RECORDAR VACIARLA antes de cargar nueva data


DO $$
BEGIN

RAISE NOTICE 'Se limpia la tabla deudas_rotacion_mercurius';
DELETE FROM cgma.deudas_rotacion_mercurius;

insert into cgma.deudas_rotacion_mercurius(deuda_id, grupo)
values


;

RAISE NOTICE 'Se insertaron los nuevos casos a deudas_rotacion_mercurius.';

PERFORM cgma.fn_rotaciones_mercurius();
--PERFORM cgma.fn_rotaciones_mercurius_bolsas('ahuamani','SVGM FEBRERO2026');


RAISE NOTICE 'Se asignaron los casos con éxito.';

RAISE NOTICE 'Generando reporte...';

END$$;

SELECT * FROM cgma.fn_stock_estudios_rota(ARRAY(select deuda_id from cgma.deudas_rotacion_mercurius))

--SELECT count(*) FROM cgma.deudas_rotacion_mercurius