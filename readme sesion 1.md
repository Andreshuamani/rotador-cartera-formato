# Sesión 1 — Motor de Rotación Mercurius: Dashboard y API

## Contexto del proyecto

**Motor de Rotación Automática — Mercurius** es un sistema de redistribución de carteras de cobranza. Antes de esta sesión existía únicamente un motor batch en Python que:

- Leía órdenes desde PostgreSQL (`ordenes_rotacion`)
- Clasificaba deudas en tres categorías: MERCURIUS, CGMSV y aptos para rotar
- Distribuía casos entre estudios de cobranza mediante round-robin
- Se ejecutaba desde línea de comandos (`ejecutar.bat`)

No había interfaz visual ni API.

---

## Qué se construyó

### 1. API REST — FastAPI

Se agregó una capa API en la carpeta `api/` que expone los datos del motor al dashboard.

**Cómo levantar:**
```bash
venv\Scripts\uvicorn api.main:app --reload --port 8000
```

**Endpoints disponibles:**

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/health` | Estado del servidor |
| GET | `/api/empresas` | Lista de empresas (con búsqueda `?search=`) |
| GET | `/api/empresas/{id}/grupos-origen` | Grupos con cantidad de casos por empresa |
| GET | `/api/empresas/grupos/destino` | Lista de grupos destino disponibles |
| GET | `/api/movimientos` | Órdenes de rotación registradas |
| POST | `/api/movimientos` | Crear nueva orden de rotación |
| GET | `/api/dashboard/estudios` | Distribución de casos por portafolio y estudio |
| GET | `/api/historico` | Historial de ejecuciones de rotaciones |
| GET | `/api/movimientos-mes` | Resumen y totales del mes actual |

---

### 2. Dashboard — Next.js 16 + TypeScript + Tailwind

Se creó un dashboard web en la carpeta `dashboard/` con 4 secciones navegables desde un menú lateral.

**Cómo levantar:**
```bash
cd dashboard
npm run dev
# Abrir: http://localhost:3000
```

#### Secciones

**Dashboard** (`/dashboard`)
- Muestra todas las carteras (portafolios) de forma horizontal
- Cada cartera lista sus estudios/grupos con cantidad de casos actuales
- Incluye casos asignados en el mes actual (desde `historial_rotaciones`)

**Movimientos** (`/movimientos`)
- Formulario para ingresar nuevas órdenes de rotación
- Flujo en 4 pasos:
  1. Combobox con búsqueda para seleccionar empresa
  2. Botón **Buscar** → lista los grupos de esa empresa con cantidad de casos
  3. Por cada grupo se elige un grupo destino o se deja en **NO ROTA** (no se mueve)
  4. **Agregar movimiento** → acumula en memoria y resetea el formulario para poder agregar otra empresa
- Botón **Movimientos ingresados** (verde, con contador) → abre modal de validación
- Modal muestra todas las carteras acumuladas con desglose colapsable por empresa:
  - Grupo Origen | Grupo Destino | Cantidad aprox.
- Botón **Cargar Rotaciones** dentro del modal → recién aquí guarda en `ordenes_rotacion` con estado `Pendiente`

**Histórico** (`/historico`)
- Tabla completa de ejecuciones pasadas desde `historial_rotaciones`
- Columnas: Empresa, Origen, Destino, Casos movidos, Periodo, Fecha de ejecución

**Movimientos del mes** (`/movimientos-mes`)
- 3 tarjetas KPI: total casos movidos, empresas procesadas, cantidad de ejecuciones
- Tabla detallada del mes actual con totales por empresa y por flujo origen→destino

---

### 3. Migraciones SQL

Ejecutar en orden desde pgAdmin:

#### `migrations/001_crear_historial_rotaciones.sql`
Crea la tabla `public.historial_rotaciones` para registrar cada ejecución del motor:
```sql
id, id_empresa, nombre_empresa, grupo_origen, grupo_destino,
cantidad_movida, fecha_ejecucion, mes, anio
```

#### `migrations/002_mock_empresas_grupos.sql`
Crea las tablas mock para simular producción:
- `public.empresas` — 5 carteras MERCURIUS (CLARO, MOVISTAR, ENTEL, BITEL, DIRECTV)
- `public.grupos` — 5 estudios destino (ESTUDIO 01 al 05)

#### `migrations/003_empresa_grupos_mock.sql`
Crea `public.empresa_grupos_mock` para definir grupos específicos por empresa.
MERCURIUS - BITEL queda con solo 3 grupos (ESTUDIO A: 87, ESTUDIO B: 64, ESTUDIO C: 41).
Usa subquery para ser robusto ante reinicios de secuencia.

---

## Estructura de archivos creados

```
rotador-cartera-formato/
├── api/
│   ├── main.py                      ← FastAPI app + CORS
│   └── routers/
│       ├── dashboard.py             ← Distribución por portafolio/estudio
│       ├── movimientos.py           ← GET + POST ordenes_rotacion
│       ├── historico.py             ← Historial de ejecuciones
│       ├── movimientos_mes.py       ← KPIs y detalle del mes
│       └── empresas.py              ← Empresas, grupos origen y destino
├── migrations/
│   ├── 001_crear_historial_rotaciones.sql
│   ├── 002_mock_empresas_grupos.sql
│   └── 003_empresa_grupos_mock.sql
├── dashboard/
│   ├── app/
│   │   ├── layout.tsx               ← Layout raíz con sidebar
│   │   ├── page.tsx                 ← Redirect a /dashboard
│   │   ├── dashboard/page.tsx
│   │   ├── movimientos/page.tsx
│   │   ├── historico/page.tsx
│   │   └── movimientos-mes/page.tsx
│   ├── components/
│   │   ├── Sidebar.tsx              ← Navegación lateral
│   │   ├── EmpresaCombobox.tsx      ← Combobox con búsqueda en tiempo real
│   │   └── MovimientosModal.tsx     ← Modal de validación y carga
│   └── lib/
│       ├── api.ts                   ← Helper fetch con cache: no-store
│       └── types.ts                 ← Interfaces TypeScript
├── requirements.txt                 ← Ahora incluye fastapi + uvicorn
└── ejecutar_api.bat                 ← Atajo para levantar la API
```

---

## Tablas de base de datos relevantes

| Tabla | Descripción |
|-------|-------------|
| `ordenes_rotacion` | Órdenes de rotación (antes llamada `tabla_rotaciones` en el código) |
| `movimientos` | Historial real de movimientos (`agencia_de` → `agencia_a`) |
| `portafolios` | Carteras/portafolios reales de la empresa |
| `deudores` | Deudores individuales |
| `condiciones` | Condiciones de elegibilidad |
| `historial_rotaciones` | _(nueva)_ Registro de ejecuciones del motor |
| `empresas` | _(mock)_ Empresas para simulación |
| `grupos` | _(mock)_ Grupos destino para simulación |
| `empresa_grupos_mock` | _(mock)_ Grupos específicos por empresa (ej. BITEL con 3 grupos) |

---

## Cómo ejecutar el proyecto completo

Abrir **dos terminales** en VS Code:

**Terminal 1 — API:**
```bash
cd c:\Users\ahuam\OneDrive\Documentos\GitHub\rotador-cartera-formato
venv\Scripts\uvicorn api.main:app --reload --port 8000
```

**Terminal 2 — Dashboard:**
```bash
cd c:\Users\ahuam\OneDrive\Documentos\GitHub\rotador-cartera-formato\dashboard
npm run dev
```

Abrir en el navegador: **http://localhost:3000**

---

## Decisiones técnicas relevantes

- **FastAPI sobre Flask** — se reutiliza el código Python existente de infraestructura sin reescribirlo
- **Next.js App Router con Server Components** — dashboard y histórico usan Server Components; movimientos usa Client Component por la interactividad
- **`ordenes_rotacion` como tabla de órdenes** — el código original usaba el nombre `tabla_rotaciones` que fue corregido a lo que existe realmente en la BD
- **`movimientos.agencia_a`** como fuente de grupos actuales — la BD no tiene un campo `grupo` en `deudores`; el grupo actual de cada deudor se deduce del último registro en `movimientos`
- **Grupos por empresa via mock** — `empresa_grupos_mock` permite definir grupos específicos por empresa para la simulación sin tocar datos reales
- **Flujo de validación antes de guardar** — "Agregar movimiento" solo acumula en memoria; "Cargar Rotaciones" es el único punto que escribe en la BD
