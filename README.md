# 📋 PresupuestosIA - Sistema de Consultoría y Presupuestos con IA

Plataforma integral para gestión de clientes, consultoría y generación automática de presupuestos asistida por Inteligencia Artificial.

## 🚀 Características Principales

### 🤖 Flujo de Consultoría Inteligente
- **Análisis automático de notas**: La IA analiza las notas de reunión y recomienda entre Consultoría o Diagnóstico
- **Extracción de puntos clave**: Identifica automáticamente necesidades, departamentos y prioridades
- **Matching inteligente de productos**: Asocia productos del catálogo con los puntos clave detectados
- **Sistema de clarificación**: Genera preguntas para resolver dudas antes del presupuesto
- **Investigación de incógnitas**: Busca y estima precios de productos no catalogados

### 📊 Gestión Completa
- Gestión de clientes y empresas
- Historial de reuniones con versionado de notas
- Catálogo de productos y servicios
- Generación de presupuestos con cálculo automático
- Opciones de mantenimiento (tokens, horas, SLA)
- Exportación a PDF

### 🎯 Flujo de Trabajo

```
Cliente → Notas Iniciales → Análisis IA → Tipo de Proyecto
                                              ↓
                                         Consultoría
                                              ↓
                                         Reuniones
                                              ↓
                                       Puntos Clave
                                              ↓
                                         Productos
                                              ↓
                                       Clarificación ← Preguntas + Incógnitas
                                              ↓
                                        Presupuesto
```

## 🛠️ Stack Tecnológico

### Frontend
- **Next.js 14** (App Router)
- **React 18** + TypeScript
- **TailwindCSS** + shadcn/ui
- **Lucide Icons**

### Backend
- **Next.js API Routes**
- **Prisma ORM**
- **PostgreSQL**

### IA
- **OpenAI GPT-4o-mini** para análisis y recomendaciones
- **GPT-4o** para investigación de incógnitas

## 📦 Instalación

### Prerrequisitos
- Node.js 18+
- PostgreSQL
- Cuenta de OpenAI con API Key

### Pasos

1. **Clonar el repositorio**
```bash
git clone <repo-url>
cd prueba-presupuestos/presupuestos-app
```

2. **Instalar dependencias**
```bash
npm install
```

3. **Configurar variables de entorno**

Crea un archivo `.env` en `presupuestos-app/`:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/presupuestos_app"
DIRECT_DATABASE_URL="postgresql://user:password@localhost:5432/presupuestos_app"

# OpenAI
OPENAI_API_KEY="tu-api-key"

# Next.js
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

4. **Configurar base de datos**
```bash
npx prisma db push
npx prisma generate
```

5. **Iniciar servidor de desarrollo**
```bash
npm run dev
```

La aplicación estará disponible en `http://localhost:3000`

## 📁 Estructura del Proyecto

```
presupuestos-app/
├── src/
│   ├── app/                    # App Router de Next.js
│   │   ├── api/               # API Routes
│   │   │   ├── clients/       # Gestión de clientes
│   │   │   ├── products/      # Gestión de productos
│   │   │   └── consultation/  # Sistema de consultoría
│   │   ├── clients/           # Páginas de clientes
│   │   └── products/          # Páginas de productos
│   ├── components/            # Componentes React
│   │   └── ui/               # Componentes shadcn/ui
│   ├── lib/                   # Utilidades
│   │   ├── prisma.ts         # Cliente Prisma
│   │   └── openai.ts         # Cliente OpenAI
│   └── types/                 # Tipos TypeScript
├── prisma/
│   └── schema.prisma          # Schema de base de datos
└── public/                    # Archivos estáticos
```

## 🎯 Uso

### 1. Crear un Cliente
- Ve a "Clientes" → "Nuevo Cliente"
- Completa la información básica

### 2. Iniciar Consultoría
- Desde la página del cliente, añade notas de la reunión inicial
- La IA analizará y recomendará el tipo de proyecto
- Crea la consultoría

### 3. Gestionar Reuniones
- Añade reuniones con notas
- Extrae puntos clave automáticamente
- Valida o ajusta los puntos detectados

### 4. Matching de Productos
- Ejecuta el matching automático
- Revisa y valida productos sugeridos

### 5. Clarificación
- Genera preguntas de clarificación
- Responde usando opciones predefinidas o texto libre
- Investiga incógnitas para estimar precios

### 6. Generar Presupuesto
- Configura tipo de mantenimiento
- Genera el presupuesto final
- Exporta a PDF

## 🔑 Características Clave del Sistema

### Sistema de Clarificación
- Preguntas generadas por IA basadas en puntos clave
- Respuestas predefinidas para agilizar el proceso
- Priorización automática (Alta/Media/Baja)
- Áreas de impacto identificadas

### Investigación de Incógnitas
- Detecta productos no catalogados
- Busca información en internet
- Estima precios de mercado
- Proporciona razonamiento de la estimación

### Versionado de Notas
- Historial completo de cambios
- Comparación entre versiones
- Trazabilidad de modificaciones

## 📝 Modelos de Datos Principales

- **Client**: Información del cliente
- **Consultation**: Proceso de consultoría completo
- **Meeting**: Reuniones con el cliente
- **KeyPoint**: Puntos clave extraídos
- **SuggestedProduct**: Productos recomendados
- **ClarificationQuestion**: Preguntas de clarificación
- **UnknownInvestigation**: Investigaciones de incógnitas
- **Budget**: Presupuesto final

## 🤝 Contribuir

Este es un proyecto interno. Para sugerencias o mejoras, contacta al equipo de desarrollo.

## 📄 Licencia

Uso interno - Todos los derechos reservados

## 🔧 Mantenimiento

### Actualizar Schema de Base de Datos
```bash
npx prisma db push
npx prisma generate
```

### Build de Producción
```bash
npm run build
npm start
```

## 📞 Soporte

Para soporte técnico, contacta al equipo de desarrollo interno.

---

**Versión**: 1.0.0  
**Última actualización**: Febrero 2026
