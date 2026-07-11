SET work_mem = '512MB';
-- creado: no recuerdo ... je
-- Modificado: 06-09-23
-- Autor: Andres Huamani
-- Actualizaciones: 07-09-23
-- Modificado: 22-07-2025
-- Autor: Martín Prandini
--1. Conectar si no existe
-- ==============================
DO $$
BEGIN
    -- 1. Intentar desconectar la conexión de forma segura (limpiar)
    BEGIN
        PERFORM dblink_disconnect('mercurius_db');
    EXCEPTION
        WHEN SQLSTATE '08003' THEN 
            -- '08003' es el SQLSTATE para "connection_does_not_exist" (no disponible).
            -- Capturamos el error específico y no hacemos nada, permitiendo que el script continúe.
            NULL; 
        WHEN OTHERS THEN
            -- Capturar otros posibles errores de dblink (ej: problemas de red) y relanzarlos si es necesario.
            RAISE EXCEPTION 'Error al intentar desconectar dblink: %', SQLERRM;
    END;

    -- 2. Conectar (ya que la conexión anterior se limpió o nunca existió)
    -- Simplificamos la lógica: no es necesario verificar dblink_get_connections()
    -- porque el objetivo es asegurar que exista, y dblink_connect lo hace.
    PERFORM dblink_connect(
        'mercurius_db',
        'host=mercurius-db.postgres.database.azure.com dbname=TicketeraProd user=MercuriusAdmin password=M3rcur1usDevOps'
    );
END;
$$ LANGUAGE plpgsql;


--2.
DROP TABLE IF EXISTS
datos_rota,
EmpresasAConsiderar,
GruposaConsiderar,
EstadosNOconsiderar,
posibles_activos,
CSP_NO_ROTA_POSIBLEACTIVOS,
Casos_a_retener,
DeudasConsolidadas,
tmp_datos_finales;
--casos_rotacion_final;

--****************** IMPORTANTE!!!... COLOCAR LOS CASOS A RETENER **************************
--3. Datos remotos
-- ==============================
CREATE TEMP TABLE Casos_a_retener AS
SELECT *
FROM dblink(
    'mercurius_db',
    'SELECT "DebtId" FROM public."DebtsRetains" 
     WHERE 
         "DebtsRetainStatus" = 1 
         AND (
             DATE_TRUNC(''month'', "CreationDate") = DATE_TRUNC(''month'', CURRENT_DATE) 
             OR DATE_TRUNC(''month'', "UpdateDate") = DATE_TRUNC(''month'', CURRENT_DATE)
         )'
) AS t(debtid integer);



------------------------
-- PASO 4
create temp table DeudasConsolidadas as (
		select d.id deuda_id
	  from deudas d
	  join empresas e ON e.id = d.empresa_id
	 where e.nombre ilike 'MERCURIUS%'
	   and d.notas like '%CONSOLIDA%'
	);

-- PASO 1
create temp table EmpresasAConsiderar as(
select id, NOMBRE
from Empresas 
where nombre IN ('MERCURIUS - CREDITEL XI',
'MERCURIUS - PAIGO IV',
'MERCURIUS - RETOP VIII',
'MERCURIUS - BBVA XIV',
'MERCURIUS - CREDITO YA II'
)
);

-- PASO 2		
create temp table GruposaConsiderar as(
select id, nombre
from grupos --ORDER BY NOMBRE
where id NOT IN (49)
);

-- PASO 3
create temp table EstadosNOconsiderar as(
select id, NOMBRE
from estados 
where id NOT IN(
	select id from estados 
	where (nombre ilike '%CONVEN%' or nombre IN ('Cancelado','Pago a Cuenta','Devuelto','Promesa','Pendiente','Transaccion','REMITIDO')) 
	  OR ID IN (396,397) order by nombre
	)
);

CREATE TEMP TABLE datos_rota AS(

	--EXPLAIN (ANALYZE, BUFFERS, COSTS)
	SELECT 
	d.id
	,e.nombre as Estado
	,case when (e.nombre in ('Baja','Fallecido') or big.tel_verif_1 is null) then 'PARA MERCURIUS' end as Para_Mercurius
	,rg.nombre as Resultado
	,d.Sub_Cartera as SubCartera
	,d.segmento as Segmento
	,m.nombre as Moneda
	,d.monto as Monto
	,d.monto_maximo as MontoMaximo
	,d.monto_minimo as MontoMinimo
	,p.documento
	,em.nombre as Empresa
	,p.nombre as Nombre
	,d.fecha_atraso as Atraso
	,d.fecha_promesa as Fecha_Promesa
	,d.fecha_ultimo_pago as Ult_Pago
	,d.fecha_ultima_gestion_humana
	,big.tel_id_1
	,big.tel_verif_1 as telfverif 
	,big.tel_lugar_1 
	,big.tel_numero_1
	,d.notas
	,gr.nombre as Grupo
	
	FROM
	deudas d
	join estados e on d.estado_id = e.id
	join monedas m on d.moneda_id = m.id
	join personas p on p.id = d.persona_id
	join empresas em on d.empresa_id = em.id
	join grupos gr on gr.id = d.grupo_id
	join bigfish big on big.id = d.id
	join EmpresasAConsiderar eac ON eac.id = em.id
	join EstadosNOconsiderar enc ON enc.id = e.id
	join GruposaConsiderar gc ON gc.id = gr.id
	left join resultado_gestiones rg on d.resultado_ultima_gestion_id = rg.id
	WHERE d.id not in (
		  SELECT deuda_id
		  FROM DeudasConsolidadas
		)
	and rg.nombre not like 'Intención de pago%'
);

create temp table posibles_activos as(
	select * from datos_rota 
	where
	Fecha_promesa > current_date or 
	Ult_Pago > current_date - 31
);

CREATE TEMP TABLE CSP_NO_ROTA_POSIBLEACTIVOS AS (
	SELECT * FROM datos_rota ec
	WHERE

	--// FILTRO POR SOLICITA SER LLAMADO A LA BREVEDAD EN CSP
	ec.id in ( select a.id 
			     from datos_rota a 
			    where a.estado like 'Cont. sin promesa%'
   			      and a.resultado ilike 'Solicita ser llamado a la brevedad'
			      and (a.fecha_ultima_gestion_humana >= current_date - 30) 
			    --order by a.fecha_ultima_gestion_automatica,a.fecha_ultima_gestion_humana desc
			 )
	      --ORDER BY ec.fecha_ultima_gestion_humana desc
);


create temp table tmp_datos_finales as (
select * from datos_rota
	where 
	id not in (select id from posibles_activos)
	and
	id not in (select id from CSP_NO_ROTA_POSIBLEACTIVOS)
	and
	id not in (select * from Casos_a_retener)
	--and Para_Mercurius is null;
);


SELECT * FROM tmp_datos_finales;
