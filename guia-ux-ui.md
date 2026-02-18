# 🎨 Guía de Estilo UI/UX – Plataforma de Clientes y Presupuestos con IA

## 0. Visión de Producto

Este producto no es un CRM genérico.
Es una **herramienta de decisión**.

La UI debe:
- Hacer sentir **control** al usuario
- Comunicar **inteligencia y fiabilidad**
- Convertir complejidad técnica en **acciones claras**
- Usar color y cards para **jerarquía, no decoración**

---

## 1. Principios UX Fundamentales

### 1.1 Regla de Oro
> “El usuario siempre debe saber qué está pasando, qué viene después y cuánto falta.”

### 1.2 Principios Clave
- **Guided UX**: la interfaz guía el proceso paso a paso
- **Progressive Disclosure**: mostrar solo lo necesario en cada momento
- **Visual Hierarchy First**: la jerarquía visual manda más que el texto
- **Confidence by Design**: nada parece improvisado
- **IA visible, pero contenida**

---

## 2. Identidad Visual

### 2.1 Estilo General
- Moderno
- Profesional
- Tecnológico
- Optimista (colores vivos, pero bien dosificados)

Inspiraciones:
- Linear (claridad)
- Stripe (confianza)
- Vercel (sensación tech)
- Notion (flexibilidad)

---

## 3. Color System (protagonista)

### 3.1 Paleta Base
- **Background principal**: Gris claro con matiz frío
- **Surface / Cards**: Blanco puro o gris muy suave
- **Texto principal**: Gris casi negro
- **Texto secundario**: Gris medio

---

### 3.2 Colores de Marca (usados con intención)

| Uso | Color | Intención UX |
|---|---|---|
| Acción primaria | Azul vibrante | Decisión |
| IA / sugerencias | Violeta | Inteligencia |
| Éxito | Verde | Seguridad |
| Warning | Ámbar | Atención |
| Error | Rojo | Corrección |
| Diagnóstico | Turquesa | Exploración |
| Consultoría | Azul oscuro | Profundidad |

> El color **siempre comunica estado o intención**, nunca es decorativo.

---

## 4. Tipografía

### 4.1 Fuente
- Inter / system-ui
- Muy legible
- Moderna

### 4.2 Jerarquía Tipográfica

| Nivel | Uso |
|---|---|
| H1 | Vista / Cliente |
| H2 | Sección |
| H3 | Sub-bloques |
| Body | Contenido |
| Meta | Ayuda, notas, timestamps |

- Headlines fuertes
- Texto base relajado
- Espaciado generoso

---

## 5. Layout & Composición

### 5.1 Estructura General
- Sidebar izquierda fija
- Área principal con scroll
- Barra superior contextual (acciones del momento)

### 5.2 Grid
- Sistema 8px
- Máx ancho 1400px
- Mucho espacio en blanco (respira)

---

## 6. Cards como Unidad Central

### 6.1 Filosofía de Cards
> “Todo lo importante vive en una card.”

Se usan para:
- Clientes
- Productos
- Presupuestos
- Pasos del proceso
- Sugerencias IA

---

### 6.2 Anatomía de una Card
- Header (título + badge)
- Body (info clave)
- Footer (acciones)

Opcional:
- Borde o sombra sutil
- Accent color lateral según tipo

---

### 6.3 Cards de Cliente
Incluyen:
- Nombre del cliente
- Estado (badge de color)
- Última acción
- CTA principal (Continuar)

---

## 7. Estados y Progreso (muy importante)

### 7.1 Pipeline Visual
- Progreso horizontal tipo stepper
- Colores según fase:
  - Diagnóstico
  - Consultoría
  - Presupuesto
  - Desarrollo
  - Mantenimiento

El usuario **ve dónde está** y **qué falta**.

---

## 8. IA en la UI (UX de alto nivel)

### 8.1 IA como copiloto
- Bloques diferenciados
- Fondo suave violeta / azul
- Iconografía propia

Texto tipo:
> “Propuesta inicial basada en proyectos similares”

---

### 8.2 Preguntas IA
- Cards individuales
- Agrupadas por impacto
- Respuestas rápidas (select, toggles)

Nunca formularios largos.

---

### 8.3 Transparencia
Siempre mostrar:
- Por qué sugiere algo
- En qué se basa
- Qué pasa si cambia

---

## 9. Presupuestos

### 9.1 Vista de Presupuesto
- Cards por bloque:
  - Catálogo
  - Custom
  - Mantenimiento
- Horas visibles
- Rangos claramente marcados
- Total siempre fijo y visible

---

### 9.2 Edición
- Inline
- Con feedback inmediato
- Undo disponible

---

## 10. Mantenimiento

### 10.1 Presentación
- Cards tipo “planes”
- Comparables
- Claros en valor

Ejemplos:
- Tokens
- Bolsa de horas
- SLA

---

## 11. Feedback & Estados del Sistema

### 11.1 Loading
- Skeletons elegantes
- Nunca pantallas en blanco

### 11.2 Éxito
- Confirmaciones visuales suaves
- No bloquear flujo

### 11.3 Error
- Claros
- Accionables
- Sin jerga técnica

---

## 12. Animaciones y Microinteracciones

- Transiciones suaves
- Hover states claros
- Expand/collapse fluido
- 150–200ms

Nada ornamental.

---

## 13. PDFs (Extensión de la UI)

El PDF debe:
- Parecer una extensión natural de la app
- Mantener colores de marca
- Jerarquía clara
- Lectura rápida

---

## 14. Anti-patrones (prohibidos)

- Interfaces grises sin personalidad
- Color sin significado
- IA que “habla mucho”
- Formularios interminables
- Flujos ocultos

---

## 15. Regla Final

> “Si el usuario confía en la interfaz, confiará en el presupuesto.”

Este producto debe **transmitir solvencia, orden e inteligencia** en cada píxel.



