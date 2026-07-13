SELECT 
d.id,
--' ' as Tipo,
--' ' as Destino,
--' ' as Localidad,
--' ' as Departamento,
--' ' as CP,
--' ' as Verif,
--' ' as Comentario
e.nombre as Estado
,rg.nombre as Resultado
,d.Sub_Cartera as SubCartera
,d.segmento as Segmento
,m.nombre as Moneda
,d.monto as Monto
,d.monto_maximo as MontoMaximo
,d.monto_minimo as MontoMinimo
--,m2.nombre as MonedaSaldo
--,d.saldo as Saldo
--,d.plazo_maximo_gestion as Plazo_Gestion
--,d.id_externo as Abonado  -- no existe en public.deudas del schema actual
,p.documento
--,d.fecha_ingreso as Ingreso
--,d.gestiones_automaticas as GA
--,d.gestiones_humanas as GH
,em.nombre as Empresa
,p.nombre as Nombre
,d.fecha_atraso as Atraso
,d.fecha_promesa as Fecha_Promesa
--,d.moneda_id_promesa as MonedaPromesa  -- no existe en public.deudas del schema actual
--,d.monto_promesa as MontoPromesa       -- no existe en public.deudas del schema actual
--,d.created_at as Fecha_creado
,d.fecha_ultimo_pago as Ult_Pago
--,d.fecha_ultima_gestion_automatica
--,d.fecha_ultima_gestion_humana
--,big.ultima_carta  -- no existe en public.bigfish del schema actual
,
  --big.email,
  big.tel_id_1,
  big.tel_verif_1,
  big.tel_lugar_1,
  big.tel_numero_1,
  -- tel_2 a tel_6: public.bigfish del schema actual solo tiene el teléfono 1
  --big.tel_id_2,
  --big.tel_verif_2,
  --big.tel_lugar_2,
  --big.tel_numero_2,
  --big.tel_id_3,
  --big.tel_verif_3,
  --big.tel_lugar_3,
  --big.tel_numero_3,
  --big.tel_id_4,
  --big.tel_verif_4,
  --big.tel_lugar_4,
  --big.tel_numero_4,
  --big.tel_id_5,
  --big.tel_verif_5,
  --big.tel_lugar_5,
  --big.tel_numero_5,
  --big.tel_id_6,
  --big.tel_verif_6,
  --big.tel_lugar_6,
  --big.tel_numero_6,
  gr.nombre as Grupo

FROM
deudas d
inner join estados e on (d.estado_id = e.id)
inner join monedas m on (d.moneda_id = m.id)
inner join monedas m2 on (d.moneda_id = m2.id)
inner join personas p on (p.id = d.persona_id)
inner join empresas em on (d.empresa_id = em.id)
inner join grupos gr on (gr.id = d.grupo_id)
left join bigfish big on (big.id = d.id)
full outer join resultado_gestiones rg on (d.resultado_ultima_gestion_id = rg.id)
WHERE

--em.nombre LIKE 'MERCURIUS - ASI IV' or em.nombre like 'MERCURIUS - CICLOCUOTAS V' --OR em.nombre like 'CREDITIA - NBC'
--AND d.fecha_ingreso between '2016-08-16' and '2016-08-18' 
--OR EXTRACT (YEAR FROM d.fecha_ingreso) = 2014 OR EXTRACT (YEAR FROM d.fecha_ingreso) = 2015)
--OR EXTRACT (YEAR FROM d.fecha_ingreso) = 2015
--OR EXTRACT (YEAR FROM d.fecha_ingreso) = 2011
--OR EXTRACT (YEAR FROM d.fecha_ingreso) = 2012
--gr.nombre like 'MAGA' --or gr.nombre LIKE 'FL'
--AND e.nombre LIKE 'Tercerizado GESTCOM'
d.id = ANY(%s)
--limit 1000