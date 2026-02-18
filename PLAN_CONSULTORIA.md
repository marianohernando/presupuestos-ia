# 📋 PLAN: Sistema de Consultoría y Diagnóstico v2

## Visión General

Dashboard dinámico para comerciales que permite gestionar todo el proceso de consultoría/diagnóstico de forma no lineal, con versionado completo y actualizaciones manuales.

---

## 🎯 Flujo Principal

### CONSULTORÍA
```
1. Primera reunión → Notas iniciales → Puntos clave
2. Organigrama → IA sugiere reuniones por departamento/persona
3. Panel de reuniones (tarjetas):
   - Cada reunión tiene: guión pre-reunión, notas versionadas, puntos extraídos
   - Añadir/eliminar reuniones manualmente
   - Múltiples sesiones con misma persona (v1, v2, v3...)
4. Puntos clave globales (se actualizan con cada reunión)
5. Productos sugeridos (matching dinámico ML + IA)
6. Guiones no técnicos para el comercial
7. Generar presupuesto (cuando todo esté listo)
```

### DIAGNÓSTICO
```
1. Reunión inicial → Notas → Puntos clave
2. Panel simplificado (1-3 reuniones típicamente)
3. Productos sugeridos
4. Generar presupuesto
```

---

## 🗄️ Estructura de Base de Datos

### Modelos Nuevos

| Modelo | Descripción |
|--------|-------------|
| `Consultation` | Proyecto/proceso completo (agrupa todo) |
| `Meeting` | Reunión con estado, guión, asistentes |
| `NoteVersion` | Versión de notas de una reunión |
| `KeyPoint` | Punto clave (global o de reunión) |
| `SuggestedProduct` | Producto sugerido con matching |

### Modelos Existentes a Reutilizar

| Modelo | Uso |
|--------|-----|
| `Client` | Cliente (sin cambios) |
| `Product` | Catálogo de productos |
| `Budget` | Presupuesto final |
| `BudgetItem` | Items del presupuesto |
| `AIAction` | Trazabilidad |

### Modelos a Deprecar (mantener pero no usar)

| Modelo | Razón |
|--------|-------|
| `MeetingVersion` | Reemplazado por `Meeting` + `NoteVersion` |
| `NormalizedPoint` | Reemplazado por `KeyPoint` |
| `ProductMatch` | Reemplazado por `SuggestedProduct` |
| `UnknownItem` | Integrado en `KeyPoint` |
| `ThreadContext` | Simplificado en `Consultation` |

---

## 🖥️ Estructura de UI

### Dashboard Principal (`/clients/[id]/consultation`)

```
┌─────────────────────────────────────────────────────────────────┐
│  HEADER: Cliente + Tipo + Estado + [Botón Actualizar IA]       │
├──────────┬──────────────────────────────────────────────────────┤
│ SIDEBAR  │  CONTENIDO PRINCIPAL                                 │
│          │                                                      │
│ Resumen  │  TABS:                                               │
│ rápido   │  [Organigrama] [Reuniones] [Puntos] [Productos]      │
│          │  [Guiones] [Presupuesto]                             │
│ • Reun.  │                                                      │
│ • Puntos │  Contenido del tab activo...                         │
│ • Prods  │                                                      │
│          │                                                      │
│ Guión    │                                                      │
│ general  │                                                      │
└──────────┴──────────────────────────────────────────────────────┘
```

### Tabs del Dashboard

| Tab | Contenido |
|-----|-----------|
| **Organigrama** | Subir PDF/imagen, ver estructura extraída, personas detectadas |
| **Reuniones** | Tarjetas de reuniones, añadir/eliminar, estados, notas |
| **Puntos Clave** | Por departamento, globales, prioridad, estado |
| **Productos** | Matching actual, validar/rechazar, gaps identificados |
| **Guiones** | Guión general + guiones por reunión |
| **Presupuesto** | Generar cuando esté listo, configurar mantenimiento |

---

## 📁 Archivos del Proyecto

### Base de Datos
- `prisma/schema.prisma` - Modelos de datos

### Páginas
- `src/app/clients/[id]/consultation/page.tsx` - Dashboard principal

### Componentes
- `src/components/consultation/ConsultationHeader.tsx`
- `src/components/consultation/ConsultationSidebar.tsx`
- `src/components/consultation/tabs/OrgChartTab.tsx`
- `src/components/consultation/tabs/MeetingsTab.tsx`
- `src/components/consultation/tabs/KeyPointsTab.tsx`
- `src/components/consultation/tabs/ProductsTab.tsx`
- `src/components/consultation/tabs/ScriptsTab.tsx`
- `src/components/consultation/tabs/BudgetTab.tsx`
- `src/components/consultation/MeetingCard.tsx`
- `src/components/consultation/NoteEditor.tsx`

### Agentes IA
- `src/lib/agents/organigram-extractor.ts` - Extrae estructura de organigrama
- `src/lib/agents/script-generator.ts` - Genera guiones no técnicos
- `src/lib/agents/meeting-suggester.ts` - Sugiere reuniones basado en organigrama
- `src/lib/agents/key-point-extractor.ts` - Extrae puntos clave de notas
- `src/lib/agents/product-matcher.ts` - Matching de productos (ML + IA)

### APIs
- `src/app/api/consultation/route.ts` - CRUD de consultas
- `src/app/api/consultation/[id]/meetings/route.ts` - CRUD de reuniones
- `src/app/api/consultation/[id]/notes/route.ts` - Versiones de notas
- `src/app/api/consultation/[id]/keypoints/route.ts` - Puntos clave
- `src/app/api/consultation/[id]/products/route.ts` - Productos sugeridos
- `src/app/api/consultation/[id]/scripts/route.ts` - Guiones
- `src/app/api/consultation/[id]/orgchart/route.ts` - Organigrama

---

## 🔄 Fases de Implementación

### FASE 1: Base de Datos ✅ COMPLETADA
- [x] Crear nuevos modelos en schema.prisma
- [x] Crear enums nuevos (ConsultationStatus, MeetingStatus)
- [x] Ejecutar migración (20260213160533_add_consultation_system_v2)
- [x] Verificar que compila

**Modelos creados:**
- `Consultation` - Proceso completo (consultoría/diagnóstico)
- `Meeting` - Reunión con estado, guión, asistentes
- `NoteVersion` - Historial de notas de reunión
- `KeyPoint` - Punto clave (global o de reunión)
- `SuggestedProduct` - Producto sugerido con matching

### FASE 2: Dashboard Básico ✅ COMPLETADA
- [x] Crear página `/clients/[id]/consultation`
- [x] Layout con header, sidebar, tabs
- [x] Navegación entre tabs (con contenido placeholder)
- [x] Conexión con datos existentes del cliente
- [x] API `/api/consultation` (GET, POST, PATCH)
- [x] Creación de nueva consulta con notas iniciales

**Archivos creados:**
- `src/app/clients/[id]/consultation/page.tsx` - Dashboard completo
- `src/app/api/consultation/route.ts` - API CRUD

### FASE 3: Sistema de Reuniones ✅ COMPLETADA
- [x] Tab de Reuniones con tarjetas
- [x] Crear/editar/eliminar reuniones
- [x] Sistema de notas versionadas
- [x] Extracción de puntos clave con IA
- [x] Estados de reuniones

**APIs creadas:**
- `POST /api/consultation/[id]/meetings` - Crear reunión
- `GET /api/consultation/[id]/meetings` - Listar reuniones
- `PATCH /api/consultation/[id]/meetings/[meetingId]` - Actualizar
- `DELETE /api/consultation/[id]/meetings/[meetingId]` - Eliminar
- `POST /api/consultation/[id]/meetings/[meetingId]/notes` - Añadir notas
- `POST /api/consultation/[id]/keypoints` - Extraer con IA

### FASE 4: Organigrama y Sugerencias ✅ COMPLETADA
- [x] Descripción textual del organigrama
- [x] Extracción de estructura con IA (gpt-4o-mini)
- [x] Sugerencia automática de reuniones
- [x] Visualización de departamentos y personas clave

**APIs creadas:**
- `POST /api/consultation/[id]/orgchart` - Procesar con IA
- `GET /api/consultation/[id]/orgchart` - Obtener datos

---

## 🧪 TESTING FASES 1-4 ✅ COMPLETADO

**Fecha:** 2026-02-13

**Resultados:**
- ✅ FASE 1: DB con modelos Consultation, Meeting, NoteVersion, KeyPoint
- ✅ FASE 2: Dashboard con tabs, crear consultoría, notas iniciales
- ✅ FASE 3: Reuniones (crear, guardar notas v1, extraer 6 puntos clave con IA)
- ✅ FASE 4: Organigrama (describir estructura, IA detecta 3 deptos, 8 personas, sugiere 4 reuniones)

**Issues encontrados y resueltos:**
- API `/api/consultation` tarda ~20s (optimizar en futuro)
- Añadido botón "Guardar Notas" que faltaba en dialog de reunión

---

### FASE 5: Matching de Productos ✅ COMPLETADA
- [x] API POST `/api/consultation/[id]/products` - Matching con IA (gpt-4o-mini)
- [x] API PATCH `/api/consultation/[id]/products` - Validar/rechazar
- [x] UI tab Productos con:
  - Botón "Buscar Productos con IA"
  - Tarjetas de productos con confianza %
  - Botones validar/rechazar
  - Vista de keyPoints que resuelve cada producto

### FASE 6: Guiones ✅ COMPLETADA
- [x] API POST `/api/consultation/[id]/scripts` con tipos: general, meeting, all
- [x] Guión general de consultoría (conversacional, ~300 palabras)
- [x] Guiones pre-reunión con:
  - Objetivo y temas a tratar
  - 5-8 preguntas sugeridas por reunión
- [x] Botón "Regenerar Guiones" para actualizar tras añadir notas

### FASE 7: Generación de Presupuesto ✅ COMPLETADA
- [x] API POST `/api/consultation/[id]/budget` - Genera Budget desde productos validados
- [x] Calcula subtotal, IVA 21%, total
- [x] UI tab Presupuesto con:
  - Lista de productos validados con precios
  - Selector de tipo de mantenimiento (Sin/Horas/Tokens/SLA)
  - Botón "Generar Presupuesto"
  - Vista de presupuesto generado con desglose
- [x] Integración con sistema existente de Budget
- [x] Enlace a PDF y ver presupuesto completo

### FASE 8: Adaptación Diagnóstico ✅ COMPLETADA
- [x] Mismo dashboard simplificado (4 tabs: Reuniones, Puntos Clave, Productos, Presupuesto)
- [x] Sin tab Organigrama (no aplica)
- [x] Sin tab Guiones (flujo más directo)
- [x] Badge "DIAGNOSTICO" visible
- [x] Flujo más corto: Reunión → Puntos → Productos → Presupuesto

---

## 🔧 Código Reutilizable del Sistema Anterior

| Archivo | Qué reutilizar |
|---------|----------------|
| `src/lib/agents/base-agent.ts` | Clase base para agentes IA |
| `src/lib/agents/normalizer.ts` | Lógica de extracción de puntos |
| `src/lib/agents/matcher.ts` | Lógica de matching con productos |
| `src/lib/agents/generator.ts` | Generación de presupuesto |
| `src/components/ui/*` | Todos los componentes UI (shadcn) |
| `src/lib/prisma.ts` | Cliente Prisma |
| `budget-v2/page.tsx` | Lógica de pasos, estados, handlers |

---

## 📝 Notas de Implementación

### Actualización Manual
- No hay actualizaciones automáticas
- Botón "Actualizar con IA" en el header
- Cada acción de IA es explícita

### Versionado de Notas
- Cada vez que se guardan notas, se crea nueva versión
- Se puede ver historial de versiones
- Puntos extraídos se vinculan a versión específica

### Matching de Productos
- **Capa 1:** Embedding del punto clave vs embeddings de productos
- **Capa 2:** IA analiza contexto completo, elimina duplicados, identifica gaps

### Guiones No Técnicos
- Lenguaje simple para comerciales
- Sin jerga técnica de IA/desarrollo
- Enfocado en valor de negocio
