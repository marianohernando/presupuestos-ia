import { z } from 'zod';

// ============================================
// Clientes
// ============================================

export const createClientSchema = z.object({
  name: z.string().min(1, 'El nombre es obligatorio').max(100),
  company: z.string().max(100).optional(),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  phone: z.string().max(20).optional(),
  notes: z.string().max(5000).optional(),
});

export const updateClientSchema = createClientSchema.partial().extend({
  flowType: z.enum(['CONSULTORIA', 'DIAGNOSTICO']).optional(),
  status: z.enum(['NUEVO', 'EN_PROCESO', 'PRESUPUESTADO', 'CERRADO', 'ARCHIVADO']).optional(),
});

export type CreateClientInput = z.infer<typeof createClientSchema>;
export type UpdateClientInput = z.infer<typeof updateClientSchema>;

// ============================================
// Productos
// ============================================

export const createProductSchema = z.object({
  name: z.string().min(1, 'El nombre es obligatorio').max(200),
  internalReference: z.string().max(50).optional().nullable(),
  category: z.string().max(100).optional().nullable(),
  descriptionPublic: z.string().max(2000).optional().nullable(),
  description: z.string().max(2000).optional().nullable(), // Alias para descriptionPublic
  descriptionInternal: z.string().max(2000).optional().nullable(),
  price: z.number().min(0, 'El precio debe ser positivo'),
  cost: z.number().min(0).optional().nullable(),
  estimatedHours: z.number().min(0).optional().nullable(),
  hoursMin: z.number().min(0).optional().nullable(), // Alias para estimatedHours
  hoursMax: z.number().min(0).optional().nullable(),
  tags: z.array(z.string()).default([]),
  isActive: z.boolean().default(true),
});

export const updateProductSchema = createProductSchema.partial();

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;

// ============================================
// Items de Presupuesto
// ============================================

export const createBudgetItemSchema = z.object({
  productId: z.string().optional(),
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  quantity: z.number().int().min(1).default(1),
  unitPrice: z.number().min(0),
  hoursMin: z.number().min(0).optional(),
  hoursMed: z.number().min(0).optional(),
  hoursMax: z.number().min(0).optional(),
  assumptions: z.string().max(2000).optional(),
  risks: z.string().max(2000).optional(),
  aiGenerated: z.boolean().default(false),
  aiReasoning: z.string().optional(),
});

export type CreateBudgetItemInput = z.infer<typeof createBudgetItemSchema>;

// ============================================
// Presupuestos
// ============================================

export const createBudgetSchema = z.object({
  clientId: z.string().min(1),
  summary: z.string().max(5000).optional(),
  scope: z.string().max(5000).optional(),
  assumptions: z.string().max(5000).optional(),
  risks: z.string().max(5000).optional(),
  validUntil: z.string().datetime().optional(),
  maintenanceTokens: z.number().int().min(0).optional(),
  maintenanceHours: z.number().min(0).optional(),
  maintenanceMonthly: z.number().min(0).optional(),
});

export const updateBudgetSchema = createBudgetSchema.partial().extend({
  status: z.enum(['BORRADOR', 'ENVIADO', 'ACEPTADO', 'RECHAZADO', 'EXPIRADO']).optional(),
});

export type CreateBudgetInput = z.infer<typeof createBudgetSchema>;
export type UpdateBudgetInput = z.infer<typeof updateBudgetSchema>;

// ============================================
// CSV Import (formato Odoo/Aigents)
// ============================================

export const csvProductRowSchema = z.object({
  '. Product #': z.string().optional(),
  'Name': z.string().min(1, 'El nombre es obligatorio'),
  'Internal Reference': z.string().optional(),
  'Product Category': z.string().optional(),
  'Product Type': z.string().optional(),
  'Sales Price': z.string().optional(),
  'Sales Price (raw)': z.string().optional(),
  'Cost': z.string().optional(),
  'Cost (raw)': z.string().optional(),
  'Can be Sold': z.string().optional(),
  'Can be Purchased': z.string().optional(),
  'Sales Taxes': z.string().optional(),
  'Invoicing Policy': z.string().optional(),
  'Unit of Measure': z.string().optional(),
  'Sales Description': z.string().optional(),
  'Internal Description': z.string().optional(),
});

export type CSVProductRow = z.infer<typeof csvProductRowSchema>;

// Transformador de CSV a Product
export function transformCSVToProduct(row: CSVProductRow) {
  // Parsear precio - maneja formatos españoles y varios casos especiales
  const parsePrice = (value: string | undefined, fallback: string | undefined): number => {
    // Intentar primero con el valor numérico limpio (ej: "4500.0")
    if (fallback) {
      const numericFallback = parseFloat(fallback.replace(',', '.'));
      if (!isNaN(numericFallback) && numericFallback > 0) {
        return numericFallback;
      }
    }
    
    if (!value) return 0;
    
    // Quitar texto como "desde", "aprox", etc.
    let cleaned = value.replace(/^(desde|aprox\.?|a partir de|~)\s*/i, '');
    
    // Quitar símbolos de moneda y espacios
    cleaned = cleaned.replace(/[€$\s]/g, '');
    
    // Detectar formato español (4.500 = 4500) vs formato decimal (45.00)
    // Si tiene punto y después 3 dígitos, es separador de miles
    if (/\.\d{3}/.test(cleaned)) {
      // Formato español: 4.500 -> 4500
      cleaned = cleaned.replace(/\./g, '');
    }
    
    // Reemplazar coma decimal por punto
    cleaned = cleaned.replace(',', '.');
    
    return parseFloat(cleaned) || 0;
  };

  // Extraer horas estimadas del texto de descripción
  const extractHours = (description: string | undefined): number | null => {
    if (!description) return null;
    const match = description.match(/Tiempo\s*(?:real|estimado)?:?\s*([\d.,]+)\s*(?:h|hora|horas|min|minutos)/i);
    if (match) {
      const value = parseFloat(match[1].replace(',', '.'));
      // Si es en minutos, convertir a horas
      if (description.toLowerCase().includes('min')) {
        return Math.round((value / 60) * 100) / 100;
      }
      return value;
    }
    return null;
  };

  // Extraer tags de la categoría
  const extractTags = (category: string | undefined, reference: string | undefined): string[] => {
    const tags: string[] = [];
    
    if (category) {
      // "Services > Integraciones" -> ["services", "integraciones"]
      category.split('>').forEach(part => {
        const tag = part.trim().toLowerCase();
        if (tag && !tags.includes(tag)) tags.push(tag);
      });
    }
    
    if (reference) {
      // "INT-TYPEFORM" -> inferir tag
      const prefix = reference.split('-')[0]?.toLowerCase();
      const prefixMap: Record<string, string> = {
        'int': 'integración',
        'ia': 'ia',
        'flow': 'flujo',
        'notif': 'notificación',
        'srv': 'servicio',
        'pkg': 'paquete',
        'mkt': 'marketing',
      };
      if (prefix && prefixMap[prefix] && !tags.includes(prefixMap[prefix])) {
        tags.push(prefixMap[prefix]);
      }
    }
    
    return tags;
  };

  return {
    name: row['Name'],
    internalReference: row['Internal Reference'] || null,
    category: row['Product Category'] || null,
    descriptionPublic: row['Sales Description'] || null,
    descriptionInternal: row['Internal Description'] || null,
    price: parsePrice(row['Sales Price (raw)'], row['Sales Price']),
    cost: parsePrice(row['Cost (raw)'], row['Cost']) || null,
    estimatedHours: extractHours(row['Internal Description']) || extractHours(row['Sales Description']),
    tags: extractTags(row['Product Category'], row['Internal Reference']),
    unitOfMeasure: row['Unit of Measure'] || null,
    canBeSold: row['Can be Sold']?.toLowerCase() === 'true',
  };
}

export type TransformedProduct = ReturnType<typeof transformCSVToProduct>;
