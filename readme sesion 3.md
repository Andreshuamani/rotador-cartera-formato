# Sesión 3 — Exclusiones a nivel cartera y vista previa

## Contexto

Punto de partida: el informe `docs/Informe_Mercurius_Rotacion_Cartera.docx` describe el flujo "Solicitud de rotación a nivel cartera" (5.2) → "Vista previa y envío a TI" (5.3). El motor de exclusión (MERCURIUS / CGMSV) ya existía en `services/rotacion_service.py`, pero solo se usaba desde el script batch de consola (`main.py`); la API insertaba movimientos directo en `ordenes_rotacion` sin calcular ninguna exclusión real, y el front solo armaba un carrito en memoria sin esos números.

Esta sesión conecta el motor existente a la capa web (sin reemplazarlo, tal como pide el informe) y agrega control real de las exclusiones desde la solicitud.

---

## 1. Exclusiones a nivel cartera: de fijas a configurables

### 1.1 `core/entities.py`

`ReglasEjecucion` pasó de un flag combinado `mueve_mercurius` a dos flags independientes:

```python
mueve_cgmsv: bool
excluye_fallecido: bool       # antes: mueve_mercurius (combinado)
excluye_sin_telefono: bool    # nueva sub-regla independiente
```

### 1.2 `services/rotacion_service.py` — `clasificar_y_segmentar_cartera`

Antes, el filtro MERCURIUS era incondicional (Fallecido/Baja **y** sin teléfono, siempre juntos). Ahora cada sub-regla se aplica solo si su flag está activo, y el método devuelve además un desglose para poder mostrar cada regla por separado en la vista previa:

```python
filtro_fallecido = estado_clean.isin(["baja", "fallecido"]) if reglas.excluye_fallecido else sin_filtro
filtro_sin_telefono = (...) if reglas.excluye_sin_telefono else sin_filtro
filtro_mercurius = filtro_fallecido | filtro_sin_telefono
...
return df_mercurius, df_cgmsv, df_aptos_final, desglose_mercurius
```

> **Nota:** el estado que manda a MERCURIUS es **Fallecido o Baja** (ambos, `estado_clean.isin(["baja", "fallecido"])`) — ya estaba así en el motor original. Lo único que cambió en esta sesión fue el *label* en pantalla, que decía solo "Estado Fallecido" y ahora dice **"Estado Fallecido/Baja"** para que quede claro que cubre ambos estados.

Como cambió la forma (3 valores → 4), se actualizó el único otro llamador, `main.py` (el batch de TI), para ignorar el desglose y seguir aplicando ambas sub-reglas juntas a partir del flag combinado que ya persiste `ordenes_rotacion`:

```python
excluye_fallecido=mov["mueve_mercurius"],
excluye_sin_telefono=mov["mueve_mercurius"],
```

### 1.3 Migración `007_exclusiones_cartera.sql`

```sql
ALTER TABLE public.ordenes_rotacion
    ADD COLUMN IF NOT EXISTS casos_evaluados INT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS casos_excluidos_cgmsv INT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS casos_excluidos_mercurius INT NOT NULL DEFAULT 0;
```

`cantidad_movimiento` pasa a representar los **casos a rotar** (ya descontadas las exclusiones) en vez del conteo crudo del grupo origen.

---

## 2. API — `api/routers/movimientos.py`

### 2.1 `POST /api/movimientos/previsualizar` (nuevo)

Calcula, **sin persistir nada**, cuántos casos se evalúan/excluyen/rotan por cada grupo origen, según los 3 checkboxes que mandó el front (`mueve_cgmsv`, `excluye_fallecido`, `excluye_sin_telefono`):

```json
POST /api/movimientos/previsualizar
{
  "id_empresa": "1",
  "nombre_empresa": "MERCURIUS - CREDITEL XI",
  "filas": [
    { "grupo_origen": "CREDIFAMA", "grupo_destino": "PEGASUS",
      "mueve_cgmsv": false, "excluye_fallecido": true, "excluye_sin_telefono": true }
  ]
}
```

Devuelve por fila `casos_evaluados`, `casos_excluidos_cgmsv`, `casos_excluidos_mercurius` (+ el desglose `casos_excluidos_fallecido` / `casos_excluidos_sin_telefono` para mostrar cada regla por separado) y `casos_a_rotar`, más los totales de la cartera.

### 2.2 `POST /api/movimientos` (`crear_movimiento`)

Recalcula las exclusiones en el servidor (no confía en números del cliente) pero **sí usa los 3 booleans que vienen del body** — esas son decisiones del usuario, no algo que se pueda derivar. Al persistir:

```python
mueve_mercurius = body.excluye_fallecido or body.excluye_sin_telefono
```

`mueve_cgmsv` y `mueve_mercurius` quedan en `ordenes_rotacion` reflejando exactamente lo que Operaciones marcó — antes de esta sesión quedaban siempre en `TRUE`/`TRUE` fijo.

---

## 3. Front — `dashboard/app/movimientos/page.tsx`

- Encabezado alineado al informe: **"Nueva solicitud de rotación" / "Iniciada por Operaciones"**.
- Sección **"Exclusiones a nivel cartera"** con 3 checkboxes (mockup del informe, figura 3):

  | Checkbox | Destino | Default |
  |---|---|---|
  | Telefonos no verificados | CGMSV | **desmarcado** |
  | Estado Fallecido/Baja | MERCURIUS | **marcado** |
  | Sin numero de telefono | MERCURIUS | **marcado** |

- Al presionar **"Guardar y generar vista previa"**, el front llama a `/api/movimientos/previsualizar` con esos 3 flags y arma el carrito (`carteras`) con los números reales devueltos — ya no son cantidades aproximadas.

## 4. Front — `dashboard/components/MovimientosModal.tsx` (vista previa)

- Fondo del overlay claro (`bg-zinc-500/20`), ya no negro.
- Las exclusiones son de **solo lectura** acá: se lista "Exclusiones aplicadas" por cartera (regla → destino → cantidad, o "regla no aplicada" si no se marcó), sin poder tocarlas — eso solo se decide en la solicitud.
- Se puede **eliminar la cartera completa** (botón "Eliminar cartera") además de eliminar un movimiento puntual (por grupo).
- Resumen por cartera: "X casos a rotar · Y evaluados · Z excluidos".
- Botones renombrados a **"Cancelar"** / **"OK, enviar a TI"**, con el aviso de que se notifica a `tecnologia@mercurius.com.uy` (envío de correo real: pendiente, ver sección 6).

---

## 5. Verificación realizada

Contra la réplica real, alternando los 3 checkboxes sobre el mismo grupo origen (CREDIFAMA, 18 casos):

| CGMSV | Fallecido/Baja | Sin teléfono | Excl. CGMSV | Excl. MERCURIUS | A rotar |
|---|---|---|---|---|---|
| ❌ | ✅ | ✅ | 0 | 6 | 12 |
| ❌ | ❌ | ❌ | 0 | 0 | 18 |
| ✅ | ✅ | ❌ | 1 | 4 | 13 |

Y confirmé que `POST /api/movimientos` persiste esos mismos booleans en `ordenes_rotacion` (no un `TRUE`/`TRUE` fijo).

**Gotcha de esta sesión:** al levantar la API con `--reload` para probar, un worker de `multiprocessing` quedó huérfano ocupando el puerto 8000 después de matar el proceso padre, sirviendo código viejo silenciosamente (sin error visible). Si los números no cambian al tocar los checkboxes, verificar que no haya un proceso `python.exe` viejo colgado en el puerto antes de sospechar del código.

---

## 6. Próximos pasos (fuera de esta sesión)

- Envío real del correo de aviso a `tecnologia@mercurius.com.uy` al confirmar "OK, enviar a TI".
- Bandeja de solicitudes de TI (informe 5.5) y el botón "Ejecutar" que dispara el motor batch.
- Persistir el desglose fallecido/sin-teléfono por separado en `ordenes_rotacion` si en algún momento se necesita ese detalle en el histórico (hoy solo se persiste el combinado `mueve_mercurius`).

## 7. Cómo levantar el proyecto

**API (terminal 1):**
```
venv\Scripts\python.exe -m uvicorn api.main:app --host 127.0.0.1 --port 8000
```

**Dashboard (terminal 2, desde `dashboard/`):**
```
npm run dev
```
Corre en `http://localhost:3000/movimientos`

**Migraciones nuevas desde la sesión anterior:**
```
006_crear_ordenes_rotacion.sql
007_exclusiones_cartera.sql
```
