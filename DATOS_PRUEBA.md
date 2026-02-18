# Datos de Prueba - PresupuestosIA

Este documento contiene los datos de prueba que se crearon durante el desarrollo y testing de la plataforma.

## 📅 Fecha de generación
10 de febrero de 2026, 17:14 UTC+1

---

## 👥 Clientes de Prueba

### Cliente 1: TechCorp Solutions
- **ID**: `cmlgsbp510000wx14bhlbec42`
- **Nombre**: TechCorp Solutions
- **Empresa**: TechCorp S.L.
- **Email**: contacto@techcorp.es
- **Teléfono**: +34 612 345 678
- **Estado**: NUEVO
- **Flujo**: No asignado
- **Notas**: "Interesados en automatizar su proceso de ventas con IA. Tienen un equipo de 15 personas y usan Odoo como CRM."
- **Creado**: 2026-02-10 15:57:53

---

## 📦 Productos de Prueba

### Producto 1: Setup WhatsApp Business API
- **ID**: `cmlgsc1xh0001wx14eouv3r00`
- **Nombre**: Setup WhatsApp Business API
- **Precio**: 450€
- **Coste**: 210€
- **Horas estimadas**: 3h
- **Tags**: ["integración", "whatsapp"]
- **Descripción pública**: "Configuración completa de WhatsApp Business API"
- **Activo**: Sí
- **Creado**: 2026-02-10 15:58:09

---

## 🤖 Acciones de IA Registradas

### Acción 1: Normalización de Notas
- **ID**: `cmlgsckhy0002wx14g7s5ea7i`
- **Tipo**: normalize_notes
- **Modelo**: gpt-4-turbo-preview
- **Tokens consumidos**: 765
- **Duración**: 14.751ms
- **Cliente asociado**: TechCorp Solutions
- **Fecha**: 2026-02-10 15:58:33

**Input (notas en bruto)**:
```
El cliente necesita automatizar su proceso de ventas. 
Usan Odoo como CRM. 
Quieren integrar WhatsApp para notificaciones a leads calientes. 
Presupuesto aproximado 5000-8000 euros. 
Plazo 4 semanas.
```

**Output (brief estructurado)**:
```json
{
  "resumen": "TechCorp Solutions busca automatizar su proceso de ventas integrando WhatsApp con su CRM Odoo para enviar notificaciones a leads calientes.",
  "objetivos": [
    "Automatizar el proceso de ventas",
    "Integrar WhatsApp con Odoo para enviar notificaciones a leads calientes"
  ],
  "requisitos_tecnicos": [
    "Integración de WhatsApp con Odoo",
    "Automatización de notificaciones para leads calientes"
  ],
  "integraciones_mencionadas": ["Odoo", "WhatsApp"],
  "restricciones": ["Presupuesto limitado a 5000-8000 euros"],
  "presupuesto_estimado": "5000-8000 euros",
  "plazo_deseado": "4 semanas",
  "informacion_faltante": [
    "¿Cuál es el volumen actual de leads calientes que se gestionan mensualmente?",
    "¿Existen flujos de trabajo específicos que deben ser automatizados como parte de la integración?",
    "¿Se requiere alguna funcionalidad específica en las notificaciones enviadas a través de WhatsApp?",
    "¿Hay alguna preferencia o requisito específico para la selección de la plataforma o servicio de integración entre WhatsApp y Odoo?"
  ],
  "nivel_complejidad": "medio",
  "notas_adicionales": "El cliente no ha proporcionado detalles sobre el volumen de leads ni sobre flujos de trabajo específicos que necesitan automatización, lo cual es crucial para definir la complejidad y el alcance del proyecto."
}
```

---

## 📊 Resumen de Testing Realizado

### APIs Probadas ✅
- `POST /api/clients` - Creación de cliente
- `GET /api/clients` - Listado de clientes
- `POST /api/products` - Creación de producto
- `GET /api/products` - Listado de productos
- `POST /api/ai/normalize-notes` - Normalización con GPT-4

### Funcionalidades Validadas ✅
- Conexión a base de datos PostgreSQL (Prisma)
- Integración con OpenAI GPT-4
- Trazabilidad de acciones de IA
- Parseo de CSV con PapaParse
- Validación de datos con Zod
- UI responsive con TailwindCSS
- Componentes shadcn/ui

### Pendiente de Testing
- Importación masiva de productos desde CSV
- Flujo completo de presupuestos (wizard)
- Generación de PDFs
- Sugerencia de productos por IA
- Estimación de items custom
- Análisis de diagnóstico

---

## 🗑️ Comandos para Limpiar la BD

```bash
# Conectar a la BD
cd /Users/marianohernandomarcos/Desktop/AIAGENTS/prueba-presupuestos/presupuestos-app
psql "postgres://postgres:postgres@localhost:51214/template1?sslmode=disable"

# Limpiar todas las tablas (en orden por dependencias)
DELETE FROM ai_actions;
DELETE FROM budget_items;
DELETE FROM budget_versions;
DELETE FROM budgets;
DELETE FROM consultations;
DELETE FROM diagnostics;
DELETE FROM products;
DELETE FROM clients;

# Verificar que todo está limpio
SELECT 'clients' as tabla, COUNT(*) as registros FROM clients
UNION ALL
SELECT 'products', COUNT(*) FROM products
UNION ALL
SELECT 'budgets', COUNT(*) FROM budgets
UNION ALL
SELECT 'ai_actions', COUNT(*) FROM ai_actions;
```

O desde la terminal directamente:
```bash
psql "postgres://postgres:postgres@localhost:51214/template1?sslmode=disable" -c "
DELETE FROM ai_actions;
DELETE FROM budget_items;
DELETE FROM budget_versions;
DELETE FROM budgets;
DELETE FROM consultations;
DELETE FROM diagnostics;
DELETE FROM products;
DELETE FROM clients;
SELECT 'Limpieza completada' as status;
"
```

---

## 📝 Notas de Desarrollo

- **Base de datos**: PostgreSQL local vía Prisma Postgres (puertos 51213-51215)
- **Servidor Next.js**: http://localhost:3000
- **OpenAI API Key**: Configurada en `.env`
- **Prisma Client**: v7.3.0 con adapter PostgreSQL

### Archivos de Configuración
- `.env` - Variables de entorno (DATABASE_URL, OPENAI_API_KEY)
- `prisma/schema.prisma` - Schema de base de datos
- `prisma.config.ts` - Configuración de Prisma

### Estructura de Datos
- Clientes con flujos (Consultoría/Diagnóstico)
- Productos con embeddings para búsqueda semántica
- Presupuestos con items y versionado
- Trazabilidad completa de acciones de IA
