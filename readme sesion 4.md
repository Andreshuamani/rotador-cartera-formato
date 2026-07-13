# Sesión 4 — Motor de movimiento: de la cola de solicitudes a la rotación real

## Contexto

Al cierre de la sesión 3, "Bandeja TI" era un stub ("Próximamente") y `main.py` (el batch de consola) se detenía justo antes de escribir en la base: `# Aquí iría la llamada a tu BD: deuda_repo.actualizar_grupos_masivo(...)`. Las solicitudes creadas en **Movimientos** quedaban en `ordenes_rotacion` en estado `Pendiente` para siempre — nada las ejecutaba.

Esta sesión construye esa pieza faltante: un motor que toma las órdenes pendientes, aplica las reglas de negocio reales (no solo MERCURIUS/CGMSV, también retención, consolidados, posibles activos y CSP) y mueve los casos de verdad.

---

## 1. "Bandeja TI" → "Motor de movimiento"

Se renombró la pestaña y se la reorganizó como un **hub de subtareas** (`/motor`), pensado para que en el futuro convivan varios motores. Hoy existe una sola subtarea:

### Rotación de carteras formato (`/motor/carteras-formato`)

Flujo de 3 pasos, deliberadamente separados para no mover nada "a ciegas":

1. **Lista de pendientes** — todas las órdenes `ordenes_rotacion` en estado `Pendiente`, de todas las carteras.
2. **"Obtener casos"** — corre la query real de elegibilidad y muestra un resumen de cantidades por cartera → grupo destino (incluyendo CGMSV y MERCURIUS). No escribe nada todavía.
3. **"Ejecutar rotación"** (con confirmación) — recién acá se mueven los casos. Usa **exactamente** la lista que se mostró en el paso 2 (no se vuelve a calcular), para que el número que vio Operaciones sea el que queda en el histórico.

---

## 2. Dos piezas de negocio que antes no existían

### 2.1 `Query_carteras_formato_principal.sql` — elegibilidad real

Query ya existente (uso manual en pgAdmin) que aplica retención (vía `dblink` a la BD de Ticketera), casos consolidados, estados no considerados, "posibles activos" (promesa futura o pago reciente) y CSP en curso. Se adaptó para este flujo:

- `EmpresasAConsiderar` / `GruposaConsiderar` (listas fijas hardcodeadas) → **`EmpresasAConsiderar_Local`** / **`GruposaConsiderar_Local`**: ahora salen de `ordenes_rotacion` en estado `Pendiente`, no de una lista escrita a mano.
- Nueva columna `Grupo_Exclusion` en `datos_rota` (misma prioridad que `services/rotacion_service.py`: primero MERCURIUS, después CGMSV) y el resultado se parte en dos tablas: `tmp_datos_finales` (aptos) y `Casos_CGMSV_MERCURIUS`.
- **`dblink` desactivado temporalmente** (comentado, no borrado): `Casos_a_retener` queda como tabla vacía hasta que se reactive la conexión a `mercurius_db`. Sin esto no se podía probar nada en el ambiente local, que no tiene la extensión `dblink` instalada.

`infrastructure/deuda_repository.py` → `obtener_ids_elegibles_carteras_formato()` ejecuta el archivo `.sql` completo tal cual (una sola fuente de verdad, sin duplicar la lógica en Python) y lee de vuelta el set de ids habilitados.

### 2.2 `cgma.fn_rotaciones_mercurius()` — el cambio real

Réplica del patrón manual que ya usa el equipo (`04_Proceso_rotacion_y_stock.sql`): se carga una tabla de staging y una función hace el `UPDATE`. Como no existía definición previa disponible, se escribió desde cero contra el schema actual:

```sql
-- migrations/011_cgma_rotacion_mercurius.sql
CREATE SCHEMA IF NOT EXISTS cgma;
CREATE TABLE cgma.deudas_rotacion_mercurius (deuda_id INT, grupo VARCHAR(255));

CREATE FUNCTION cgma.fn_rotaciones_mercurius() RETURNS void AS $$
BEGIN
    UPDATE public.deudas d
    SET grupo_id = g.id
    FROM cgma.deudas_rotacion_mercurius r
    JOIN public.grupos g ON UPPER(TRIM(g.nombre)) = UPPER(TRIM(r.grupo))
    WHERE d.id = r.deuda_id;
END;
$$ LANGUAGE plpgsql;
```

`DeudaRepository.cargar_y_ejecutar_lote_cgma()` hace `DELETE` + `INSERT` + `SELECT cgma.fn_rotaciones_mercurius()`, igual que el script manual.

### 2.3 Stock post-rotación

`STOCK para Estudios por GRUPO - Con datos de Mail y TELS.sql` se parametrizó (`d.id = ANY(%s)`) y se recortó a las columnas que existen en el schema actual (sin `id_externo`, `moneda_id_promesa`, `monto_promesa`, `ultima_carta`, teléfonos 2 a 6 — comentadas, no borradas, para reactivarlas si esas columnas aparecen más adelante). Se usa como `SELECT` plano — **no** se llama a ninguna función `fn_stock_estudios_rota`.

---

## 3. Bugs reales encontrados probando contra la base — y por qué importan

Todos se encontraron ejecutando el flujo real contra la réplica local, no por inspección de código. Se dejan documentados porque el patrón puede repetirse si se toca esta lógica.

### 3.1 (El más serio) Doble asignación cuando dos órdenes comparten grupo origen

Una cartera puede tener **dos solicitudes pendientes que salen del mismo grupo** (ej. BBVA XIV: una orden PEGASUS → CREDIFAMA y otra PEGASUS → PEGASUS con CGMSV/MERCURIUS activado). Como cada orden volvía a extraer el 100% del universo del grupo origen sin descontar lo que la orden anterior ya se había llevado, la **misma deuda terminaba en la lista de dos destinos distintos** — se detectó porque `motor_preview_casos` mostraba ids duplicados con `grupo_destino` diferente.

**Corrección:** el universo de cada grupo origen se extrae una sola vez y cada orden consume del remanente (en orden de creación). Aplicado en `services/carteras_formato_service.py` **y** en `services/motor_service.py` (tenía el mismo defecto latente; no se había manifestado antes porque ningún caso de prueba anterior tenía dos órdenes con el mismo origen).

> Nota de diseño abierta: el criterio de prioridad hoy es FIFO por fecha de creación (la orden más vieja se queda con el cupo primero). Si el negocio necesita otro criterio (ej. las órdenes con exclusión CGMSV/MERCURIUS primero), hay que decidirlo explícitamente.

### 3.2 Órdenes marcadas `Procesado` antes de validar

En una versión intermedia, `registrar_ejecucion_movimiento` (que cierra la orden) se llamaba **dentro** del bucle de recolección, antes de confirmar que los grupos destino existieran. Una ejecución que fallaba después (ej. por CGMSV/MERCURIUS inexistentes) dejaba la orden en `Procesado` sin haber movido nada. Se movió el cierre de cada orden al final, después de que el `UPDATE` real y el historial ya se confirmaron.

### 3.3 `Decimal` vs `float` al sumar montos

Postgres devuelve columnas `NUMERIC` como `decimal.Decimal` vía `psycopg2`; el código acumulaba sobre `float`. `TypeError` al ejecutar. Se normaliza a `float` una sola vez al leer el lote congelado.

### 3.4 BOM de UTF-8 rompiendo el parseo SQL

`STOCK para Estudios...sql` (y `04_Proceso_rotacion_y_stock.sql`) están guardados con BOM. Leerlos con `encoding="utf-8"` deja el carácter invisible al principio del string y Postgres lo reporta como error de sintaxis. Se cambió a `encoding="utf-8-sig"`.

### 3.5 `NaN` no es JSON válido

Los casos sin fila en `bigfish` (`LEFT JOIN`) traen `NaN` en pandas; el `JSONResponse` de FastAPI usa `allow_nan=False` y rompe la serialización. Se sanea con `.where(df.notna(), None)` antes de devolver el stock.

### 3.6 (Recurrente, ya documentado en sesión 3) Procesos huérfanos en el puerto 8000

Volvió a pasar: dos procesos `uvicorn` escuchando a la vez (uno en `0.0.0.0:8000`, otro en `127.0.0.1:8000`) sirviendo código viejo sin error visible. Si los números no coinciden con el código actual, verificar `netstat -ano | grep 8000` antes de sospechar del código.

---

## 4. Migraciones nuevas de esta sesión

```
010_grupos_cgmsv_mercurius.sql   ← agrega CGMSV y MERCURIUS a public.grupos
011_cgma_rotacion_mercurius.sql  ← schema cgma + tabla + fn_rotaciones_mercurius()
012_motor_preview_casos.sql      ← staging del preview (lote_id, ejecutado)
```

## 5. Endpoints nuevos

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/motor/pendientes` | Carteras con órdenes pendientes, con detalle por orden |
| POST | `/api/motor/ejecutar` | Motor simple (sin la elegibilidad real) — quedó de la primera mitad de esta sesión |
| POST | `/api/motor/carteras-formato/obtener-casos` | Corre la elegibilidad real y congela el lote |
| POST | `/api/motor/carteras-formato/ejecutar` | Mueve el lote congelado, cierra historial y órdenes |

## 6. Pendiente para la próxima sesión

- Reactivar `dblink` en `Query_carteras_formato_principal.sql` y probar la retención real contra `mercurius_db` — no se pudo probar en este ambiente.
- Definir el criterio de prioridad cuando varias órdenes comparten grupo origen (hoy: FIFO por creación).
- La contraseña de `mercurius_db` sigue hardcodeada en texto plano dentro de `Querys/Query_carteras_formato_principal.sql` — pendiente de mover a variable de entorno.

## 7. Cómo levantar el proyecto

**API (terminal 1):**
```
venv\Scripts\python.exe -m uvicorn api.main:app --host 127.0.0.1 --port 8000
```

**Dashboard (terminal 2, desde `dashboard/`):**
```
npm run dev
```
Corre en `http://localhost:3000/motor`
