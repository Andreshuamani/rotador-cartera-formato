# Motor de Rotación Automática - Mercurius

Sistema automatizado para la gestión y ejecución de rotaciones de carteras de cobranza, diseñado bajo **Onion Architecture** para asegurar escalabilidad y mantenibilidad.

## 🎯 Objetivo
Eliminar la revisión manual de matrices de rotación y automatizar la ejecución de cambios de grupo en la base de datos basándose en reglas de negocio (Teléfonos verificados, filtros por empresa, etc.).

## 🏗️ Arquitectura
El proyecto sigue el patrón de **Cebolla (Onion)**:
- **Core:** Entidades y lógica pura de negocio.
- **Services:** Orquestación de casos de uso.
- **Infrastructure:** Implementación de persistencia (PostgreSQL) y logs.

## 🚀 Próximos Pasos
- [ ] Integración de lógica de filtrado por estados y telefonía.
- [ ] Dashboards de control en Power BI.
- [ ] Implementación de logs auditables para cumplimiento de seguridad.