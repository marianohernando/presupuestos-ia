# 📋 Guía del Proyecto — Plataforma de Presupuestos con IA

## 1. Resumen Ejecutivo

**Nombre del producto:** PresupuestosIA  
**Versión:** 1.0.0  
**Objetivo:** Herramienta interna para gestión de clientes y generación de presupuestos asistidos por IA.

---

## 2. Stack Técnico Seleccionado

### Frontend
| Tecnología | Justificación |
|------------|---------------|
| **Next.js 14** | App Router, Server Components, API Routes integradas |
| **React 18** | Componentes, hooks, estado predecible |
| **TypeScript** | Tipado estricto, menos errores en runtime |
| **TailwindCSS** | Utilidades CSS, desarrollo rápido, consistencia |
| **shadcn/ui** | Componentes accesibles, customizables, profesionales |
| **Lucide Icons** | Iconografía coherente y ligera |

### Backend y Base de Datos
| Tecnología | Justificación |
|------------|---------------|
| **Supabase** | PostgreSQL gestionado, Auth, Storage, Realtime |
| **Prisma** | ORM tipado, migraciones, schema como código |
| **API Routes (Next.js)** | Backend integrado, sin servidor adicional |

### IA y Herramientas
| Tecnología | Justificación |
|------------|---------------|
| **OpenAI GPT-4** | Modelo principal para asistencia |
| **Function Calling** | IA como copiloto con tools definidos |
| **Embeddings** | Búsqueda semántica en catálogo de productos |

### Utilidades
| Tecnología | Uso |
|------------|-----|
| **@react-pdf/renderer** | Generación de PDFs desde React |
| **papaparse** | Parsing de CSV |
| **zustand** | Estado global ligero |
| **react-hook-form + zod** | Formularios con validación |

---

## 3. Arquitectura del Sistema

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (Next.js)                        │
├─────────────────────────────────────────────────────────────────┤
│  Pages/Views          │  Components          │  State (Zustand)  │
│  - Dashboard          │  - ClientCard        │  - clients        │
│  - ClientDetail       │  - ProductCard       │  - products       │
│  - BudgetWizard       │  - BudgetItem        │  - currentBudget  │
│  - ProductsManager    │  - AIChat            │  - aiState        │
└─────────────────────────────────────────────────────────────────┘
                                │
                    ┌───────────┴───────────┐
                    │    API Routes         │
                    │  /api/clients         │
                    │  /api/products        │
                    │  /api/budgets         │
                    │  /api/ai/*            │
                    │  /api/pdf             │
                    └───────────┬───────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        │                       │                       │
┌───────┴───────┐       ┌───────┴───────┐       ┌───────┴───────┐
│   Supabase    │       │   OpenAI      │       │   Storage     │
│   PostgreSQL  │       │   GPT-4       │       │   (PDFs)      │
└───────────────┘       └───────────────┘       └───────────────┘
```

---

## 4. Modelo de Datos

### 4.1 Entidades Principales

```prisma
// Cliente
model Client {
  id            String    @id @default(cuid())
  name          String
  company       String?
  email         String?
  phone         String?
  notes         String?   @db.Text
  flowType      FlowType? // CONSULTORIA | DIAGNOSTICO
  status        ClientStatus @default(NUEVO)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  
  budgets       Budget[]
  consultations Consultation[]
  diagnostics   Diagnostic[]
}

enum FlowType {
  CONSULTORIA
  DIAGNOSTICO
}

enum ClientStatus {
  NUEVO
  EN_PROCESO
  PRESUPUESTADO
  CERRADO
  ARCHIVADO
}

// Producto del catálogo
model Product {
  id                  String   @id @default(cuid())
  name                String
  descriptionPublic   String?  @db.Text  // Descripción comercial
  descriptionInternal String?  @db.Text  // Descripción interna
  price               Decimal  @db.Decimal(10, 2)
  cost                Decimal? @db.Decimal(10, 2)
  estimatedHours      Decimal? @db.Decimal(6, 2)
  tags                String[] // Array de tags
  embedding           Float[]? // Vector para búsqueda semántica
  isActive            Boolean  @default(true)
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt
  
  budgetItems         BudgetItem[]
}

// Presupuesto
model Budget {
  id              String        @id @default(cuid())
  clientId        String
  client          Client        @relation(fields: [clientId], references: [id])
  version         Int           @default(1)
  status          BudgetStatus  @default(BORRADOR)
  
  // Contenido
  summary         String?       @db.Text
  scope           String?       @db.Text
  assumptions     String?       @db.Text
  risks           String?       @db.Text
  validUntil      DateTime?
  
  // Totales calculados
  subtotal        Decimal       @db.Decimal(10, 2) @default(0)
  discount        Decimal       @db.Decimal(10, 2) @default(0)
  taxes           Decimal       @db.Decimal(10, 2) @default(0)
  total           Decimal       @db.Decimal(10, 2) @default(0)
  
  // Mantenimiento
  maintenanceTokens   Int?
  maintenanceHours    Decimal?  @db.Decimal(6, 2)
  maintenanceMonthly  Decimal?  @db.Decimal(10, 2)
  
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt
  
  items           BudgetItem[]
  versions        BudgetVersion[]
}

enum BudgetStatus {
  BORRADOR
  ENVIADO
  ACEPTADO
  RECHAZADO
  EXPIRADO
}

// Item de presupuesto
model BudgetItem {
  id              String    @id @default(cuid())
  budgetId        String
  budget          Budget    @relation(fields: [budgetId], references: [id], onDelete: Cascade)
  
  // Puede ser producto existente o custom
  productId       String?
  product         Product?  @relation(fields: [productId], references: [id])
  
  // Datos del item (copiados o custom)
  name            String
  description     String?   @db.Text
  quantity        Int       @default(1)
  unitPrice       Decimal   @db.Decimal(10, 2)
  
  // Estimaciones (para items custom)
  hoursMin        Decimal?  @db.Decimal(6, 2)
  hoursMed        Decimal?  @db.Decimal(6, 2)
  hoursMax        Decimal?  @db.Decimal(6, 2)
  assumptions     String?   @db.Text
  risks           String?   @db.Text
  
  // Generado por IA
  aiGenerated     Boolean   @default(false)
  aiReasoning     String?   @db.Text
  
  order           Int       @default(0)
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
}

// Versionado de presupuestos
model BudgetVersion {
  id          String   @id @default(cuid())
  budgetId    String
  budget      Budget   @relation(fields: [budgetId], references: [id])
  version     Int
  snapshot    Json     // Copia completa del presupuesto
  createdAt   DateTime @default(now())
  createdBy   String?
}

// Consultoría
model Consultation {
  id              String   @id @default(cuid())
  clientId        String
  client          Client   @relation(fields: [clientId], references: [id])
  
  isCompleted     Boolean  @default(false)
  amount          Decimal? @db.Decimal(10, 2)
  invoiceGenerated Boolean @default(false)
  
  rawNotes        String?  @db.Text
  normalizedBrief String?  @db.Text  // Brief estructurado por IA
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

// Diagnóstico
model Diagnostic {
  id              String   @id @default(cuid())
  clientId        String
  client          Client   @relation(fields: [clientId], references: [id])
  
  isCompleted     Boolean  @default(false)
  rawNotes        String?  @db.Text
  
  // Decisión de la IA
  recommendation  DiagnosticRecommendation?
  aiAnalysis      String?  @db.Text
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

enum DiagnosticRecommendation {
  PILOTO
  DESARROLLO_COMPLETO
  PIVOTAR_CONSULTORIA
}

// Trazabilidad de acciones IA
model AIAction {
  id          String   @id @default(cuid())
  type        String   // normalize_notes, search_catalog, estimate_item, etc.
  input       Json
  output      Json
  model       String   // gpt-4, etc.
  tokens      Int?
  duration    Int?     // ms
  createdAt   DateTime @default(now())
  
  // Relaciones opcionales para trazabilidad
  clientId    String?
  budgetId    String?
}
```

---

## 5. API Endpoints

### Clientes
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/clients` | Listar clientes |
| POST | `/api/clients` | Crear cliente |
| GET | `/api/clients/[id]` | Obtener cliente |
| PATCH | `/api/clients/[id]` | Actualizar cliente |
| DELETE | `/api/clients/[id]` | Archivar cliente |

### Productos
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/products` | Listar productos |
| POST | `/api/products` | Crear producto |
| POST | `/api/products/import` | Importar CSV |
| PATCH | `/api/products/[id]` | Actualizar producto |

### Presupuestos
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/budgets` | Listar presupuestos |
| POST | `/api/budgets` | Crear presupuesto |
| GET | `/api/budgets/[id]` | Obtener presupuesto |
| PATCH | `/api/budgets/[id]` | Actualizar presupuesto |
| POST | `/api/budgets/[id]/version` | Crear nueva versión |
| POST | `/api/budgets/[id]/items` | Añadir item |

### IA
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/api/ai/normalize-notes` | Normalizar notas → brief |
| POST | `/api/ai/search-catalog` | Búsqueda semántica productos |
| POST | `/api/ai/estimate-custom` | Estimar item custom |
| POST | `/api/ai/suggest-products` | Sugerir productos para brief |
| POST | `/api/ai/generate-questions` | Generar preguntas si falta info |
| POST | `/api/ai/analyze-diagnostic` | Analizar diagnóstico |

### PDFs
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/api/pdf/budget` | Generar PDF presupuesto |
| POST | `/api/pdf/invoice` | Generar factura consultoría |

---

## 6. Flujos de Trabajo

### 6.1 Flujo Consultoría

```
┌─────────────────┐
│ Seleccionar     │
│ Cliente         │
└────────┬────────┘
         │
         ▼
┌─────────────────┐     No      ┌─────────────────┐
│ ¿Consultoría    │────────────►│ Introducir      │
│ hecha?          │             │ importe         │
└────────┬────────┘             └────────┬────────┘
         │ Sí                            │
         │                               ▼
         │                     ┌─────────────────┐
         │                     │ Generar factura │
         │                     │ PDF             │
         │                     └────────┬────────┘
         │                              │
         ▼◄─────────────────────────────┘
┌─────────────────┐
│ Introducir      │
│ notas           │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ IA normaliza    │
│ → Brief         │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ IA sugiere      │
│ productos       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Usuario valida  │
│ y edita         │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Definir         │
│ mantenimiento   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Generar PDF     │
│ versionado      │
└─────────────────┘
```

### 6.2 Flujo Diagnóstico

```
┌─────────────────┐
│ Seleccionar     │
│ Cliente         │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ ¿Diagnóstico    │
│ hecho?          │
└────────┬────────┘
         │ Sí
         ▼
┌─────────────────┐
│ Introducir      │
│ notas           │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│ IA analiza y recomienda:                │
│  • Piloto                               │
│  • Desarrollo completo                  │
│  • Pivotar a consultoría                │
└────────┬────────────────────────────────┘
         │
         ├──────────────────┐
         ▼                  ▼
┌─────────────────┐  ┌─────────────────┐
│ Continuar como  │  │ Redirigir a     │
│ presupuesto     │  │ flujo consultoría│
└────────┬────────┘  └─────────────────┘
         │
         ▼
┌─────────────────┐
│ Añadir items +  │
│ mantenimiento   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Exportar PDF    │
└─────────────────┘
```

---

## 7. IA como Copiloto — Definición de Tools

```typescript
const AI_TOOLS = {
  // Normalización de notas
  normalizeNotes: {
    description: "Convierte notas en bruto en un brief estructurado",
    parameters: {
      rawNotes: "string",
      clientContext: "object"
    },
    returns: {
      brief: "string",
      keyPoints: "array",
      missingInfo: "array"
    }
  },
  
  // Búsqueda semántica en catálogo
  searchCatalog: {
    description: "Busca productos similares en el catálogo",
    parameters: {
      query: "string",
      limit: "number"
    },
    returns: {
      products: "array"
    }
  },
  
  // Estimación de items custom
  estimateCustomItem: {
    description: "Estima horas y precio para un item personalizado",
    parameters: {
      description: "string",
      analogProducts: "array",
      complexity: "low|medium|high|very_high"
    },
    returns: {
      hoursMin: "number",
      hoursMed: "number", 
      hoursMax: "number",
      assumptions: "array",
      risks: "array",
      reasoning: "string"
    }
  },
  
  // Generar preguntas
  generateQuestions: {
    description: "Genera preguntas cuando falta información",
    parameters: {
      context: "string",
      missingInfo: "array"
    },
    returns: {
      questions: "array"
    }
  },
  
  // Analizar diagnóstico
  analyzeDiagnostic: {
    description: "Analiza notas de diagnóstico y recomienda acción",
    parameters: {
      notes: "string",
      clientHistory: "object"
    },
    returns: {
      recommendation: "PILOTO | DESARROLLO_COMPLETO | PIVOTAR_CONSULTORIA",
      reasoning: "string",
      considerations: "array"
    }
  }
};
```

---

## 8. Variables de Entorno Requeridas

```env
# Base de datos
DATABASE_URL="postgresql://..."

# Supabase
NEXT_PUBLIC_SUPABASE_URL="https://xxx.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="xxx"
SUPABASE_SERVICE_ROLE_KEY="xxx"

# OpenAI
OPENAI_API_KEY="sk-xxx"

# App
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

---

## 9. Estructura de Carpetas

```
/
├── prisma/
│   └── schema.prisma
├── public/
│   └── logo.svg
├── src/
│   ├── app/
│   │   ├── (dashboard)/
│   │   │   ├── page.tsx              # Dashboard principal
│   │   │   ├── clients/
│   │   │   │   ├── page.tsx          # Lista de clientes
│   │   │   │   └── [id]/
│   │   │   │       ├── page.tsx      # Detalle cliente
│   │   │   │       └── budget/
│   │   │   │           └── page.tsx  # Wizard presupuesto
│   │   │   └── products/
│   │   │       └── page.tsx          # Gestión productos
│   │   ├── api/
│   │   │   ├── clients/
│   │   │   ├── products/
│   │   │   ├── budgets/
│   │   │   ├── ai/
│   │   │   └── pdf/
│   │   ├── layout.tsx
│   │   └── globals.css
│   ├── components/
│   │   ├── ui/                       # shadcn/ui components
│   │   ├── clients/
│   │   ├── products/
│   │   ├── budgets/
│   │   └── ai/
│   ├── lib/
│   │   ├── prisma.ts
│   │   ├── supabase.ts
│   │   ├── openai.ts
│   │   └── utils.ts
│   ├── hooks/
│   ├── store/
│   │   └── index.ts                  # Zustand store
│   └── types/
│       └── index.ts
├── .env.local
├── package.json
├── tailwind.config.ts
└── tsconfig.json
```

---

## 10. Criterios de Calidad

- [ ] TypeScript estricto (`strict: true`)
- [ ] ESLint + Prettier configurados
- [ ] Componentes con props tipadas
- [ ] Manejo de errores consistente
- [ ] Loading states en todas las acciones async
- [ ] Formularios validados con Zod
- [ ] Acciones IA trazables y explicables
- [ ] PDFs fieles a la UI
- [ ] Responsive design (desktop-first)
- [ ] Accesibilidad básica (ARIA, keyboard nav)

---

## 11. Próximos Pasos (Extensibilidad)

1. **Multi-usuario**: Añadir auth con Supabase Auth
2. **Multi-empresa**: Tenant por organización
3. **Integraciones**: CRM, facturación, email
4. **Analytics**: Dashboard de métricas
5. **Templates**: Plantillas de presupuesto reutilizables
6. **Workflow automation**: Recordatorios, seguimiento
