# Sesión 2 — Documentación de cambios

## Resumen general

En esta sesión trabajamos sobre el módulo de **Movimientos**, corrigiendo los datos que se mostraban, mejorando la interfaz y resolviendo una cadena de problemas de conectividad entre el front, la API y la base de datos local.

---

## 1. Cambios en la interfaz de Movimientos

### 1.1 Grupos destino: reemplazar ESTUDIO 01-05 por PEGASUS, MAGA, ECE

**Archivo:** `migrations/004_update_grupos_destino_bitel.sql`

La tabla `public.grupos` tenía los valores genéricos `ESTUDIO 01` a `ESTUDIO 05`. Se reemplazaron por los grupos reales de destino para BITEL.

```sql
DELETE FROM public.grupos;
INSERT INTO public.grupos (nombre) VALUES ('PEGASUS'), ('MAGA'), ('ECE');
```

### 1.2 Centrado del layout de la página

**Archivo:** `dashboard/app/movimientos/page.tsx`

Se agregó `mx-auto max-w-3xl` al contenedor principal para centrar el contenido en pantalla y evitar que se vea descuadrado en monitores anchos.

```tsx
<div className="mx-auto max-w-3xl space-y-6">
```

### 1.3 Edición y eliminación en "Movimientos ingresados"

**Archivo:** `dashboard/components/MovimientosModal.tsx`

En la vista parcial del modal, cada fila ahora tiene:

- Un `<select>` editable para cambiar el **Grupo destino** después de haberlo ingresado.
- Un botón **Eliminar** que quita la fila del carrito (y elimina la cartera completa si queda sin filas).

Se agregaron las props `gruposDestino`, `onUpdateFila` y `onDeleteFila` al componente, y los handlers correspondientes en `page.tsx`:

```tsx
function handleUpdateFila(empresa, index, nuevoDestino) { ... }
function handleDeleteFila(empresa, index) { ... }
```

---

## 2. Grupos origen mock por empresa

### 2.1 Diagnóstico del problema

Al buscar BITEL, la API devolvía decenas de grupos reales de producción (SB, GM, PEGASUS, SSA, etc.) en vez de los 3 grupos configurados. La causa: el endpoint `get_grupos_origen` tenía un **fallback** que, si no encontraba datos en `empresa_grupos_mock`, consultaba las tablas reales `public.movimientos` y `public.portafolios`.

### 2.2 Grupos mock para todas las empresas

**Archivo:** `migrations/005_mock_grupos_otras_carteras.sql`

Solo BITEL tenía datos en `empresa_grupos_mock`. Se agregaron 5–6 grupos por empresa para el resto:

| Empresa | Grupos | Rango de casos |
|---|---|---|
| BITEL | ESTUDIO A, B, C | 87 / 64 / 41 |
| CLARO | ESTUDIO A → E | 312 … 88 |
| MOVISTAR | ESTUDIO A → F | 421 … 77 |
| ENTEL | ESTUDIO A → E | 183 … 54 |
| DIRECTV | ESTUDIO A → F | 267 … 61 |

### 2.3 Eliminación del fallback en la API

**Archivo:** `api/routers/empresas.py`

Se simplificó `get_grupos_origen` para que **solo lea de `empresa_grupos_mock`**, sin ningún fallback a datos de producción. Si la empresa no tiene datos mock, devuelve lista vacía.

```python
# Antes: si empresa_grupos_mock estaba vacío → consultaba public.movimientos (datos reales)
# Ahora: solo lee empresa_grupos_mock, sin excepción
cursor.execute(
    "SELECT grupo_nombre, cantidad_simulada FROM public.empresa_grupos_mock WHERE empresa_id = %s ORDER BY cantidad_simulada DESC",
    [id_empresa],
)
```

**Tablas que alimentan el front de Movimientos (solo estas, nada más):**

| Tabla | Uso |
|---|---|
| `public.empresas` | Combobox de selección de empresa |
| `public.empresa_grupos_mock` | Grupos origen con cantidad de casos |
| `public.grupos` | Dropdown de grupos destino (PEGASUS, MAGA, ECE) |
| `public.ordenes_rotacion` | Guardado y consulta de movimientos |

---

## 3. Problemas de conectividad y resolución

### 3.1 La API estaba conectada a la réplica real (192.168.100.220)

El proceso `uvicorn` que respondía en `localhost:8000` había sido iniciado cuando el `.env` apuntaba a la réplica de producción. El flag `--reload` recarga el código Python, pero **no recarga las variables de entorno**: las credenciales de BD se cargan una sola vez al iniciar el proceso.

**Diagnóstico:** se confirmó ejecutando directamente las mismas queries que usa la API contra la BD local (`mercurius_rotaciones`) y comparando los resultados.

**Estado del `.env` correcto:**
```
AMBIENTE_PRODUCCION=False
DB_REPLICA_HOST=localhost
DB_REPLICA_PORT=5432
DB_REPLICA_NAME=mercurius_rotaciones
DB_REPLICA_USER=AndresHM
DB_REPLICA_PASSWORD=and151530
```

Todas las referencias a las IPs de producción (`192.168.100.220`, `192.168.100.10`) están comentadas en el `.env` y no existe ninguna hardcodeada en el código.

### 3.2 Procesos zombie en el puerto 8000

Al intentar matar los procesos `uvicorn` viejos, quedaron workers Python (`python3.13`) huérfanos ocupando el puerto 8000 que no podían terminarse desde una sesión PowerShell sin privilegios de administrador.

**Solución:** cambiar el puerto de la API a **8001** para operar en un puerto limpio.

Archivos modificados:
- `ejecutar_api.bat` → puerto `8001`
- `dashboard/.env.local` → `NEXT_PUBLIC_API_URL=http://localhost:8001`

### 3.3 Warning de Next.js: múltiples lockfiles

Next.js detectaba dos `package-lock.json` (uno en la raíz del repo, uno en `dashboard/`) y mostraba un aviso sobre el workspace root. Se intentó corregir con `turbopack.root: __dirname` en `next.config.ts`, pero eso causó un error 500 en el renderizado. Se revirtió el cambio. **El aviso es inofensivo y se puede ignorar.**

### 3.4 CORS bloqueando el POST

Las peticiones GET no requieren preflight CORS, por lo que funcionaban. El POST con `Content-Type: application/json` sí requiere una petición `OPTIONS` previa. Para desarrollo local se cambió a:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### 3.5 Bug: `fecha_creacion` NOT NULL sin default

**Archivo:** `api/routers/movimientos.py`

La tabla `ordenes_rotacion` tiene `fecha_creacion NOT NULL` sin valor por defecto. El INSERT original no incluía esa columna, lo que causaba un error de constraint en PostgreSQL y la API devolvía 500 (que el navegador interpretaba como "Failed to fetch").

**Corrección:** se agregó `fecha_creacion` a ambos INSERTs con `NOW()`:

```sql
INSERT INTO public.ordenes_rotacion
    (id_empresa, nombre_empresa, grupo_origen, grupo_destino,
     cantidad_movimiento, mueve_cgmsv, mueve_mercurius, reparte_varios,
     estado_rotacion, fecha_rotacion, fecha_creacion)
VALUES (%s, %s, %s, %s, %s, %s, %s, %s, 'Pendiente', %s, NOW())
```

---

## 4. Estado final al cierre de sesión

| Componente | Estado |
|---|---|
| Front Movimientos | Centrado, con edición y eliminación en modal |
| Grupos destino | PEGASUS, MAGA, ECE |
| Grupos origen por empresa | Mock con 5–6 grupos cada una |
| API | Puerto 8001, solo lee tablas mock, sin fallback a producción |
| POST a ordenes_rotacion | Funcionando correctamente |
| Conexión a BD | localhost / mercurius_rotaciones |

## 5. Migraciones a ejecutar en orden (si se levanta desde cero)

```
001_crear_historial_rotaciones.sql
002_mock_empresas_grupos.sql
003_empresa_grupos_mock.sql          ← grupos origen BITEL
004_update_grupos_destino_bitel.sql  ← PEGASUS, MAGA, ECE como destino
005_mock_grupos_otras_carteras.sql   ← grupos origen CLARO, MOVISTAR, ENTEL, DIRECTV
```

## 6. Cómo levantar el proyecto

**API (terminal 1):**
```
ejecutar_api.bat
```
Corre en `http://localhost:8001`

**Dashboard (terminal 2, desde la carpeta `dashboard/`):**
```
npm run dev
```
Corre en `http://localhost:3000`
