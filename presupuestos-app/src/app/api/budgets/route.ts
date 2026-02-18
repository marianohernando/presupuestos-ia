import { NextRequest } from 'next/server';
import { successResponse, handleApiError, parseBody } from '@/lib/api-utils';
import prisma from '@/lib/prisma';
import { z } from 'zod';

// GET /api/budgets - Listar todos los presupuestos
export async function GET() {
  try {
    const budgets = await prisma.budget.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            company: true,
          },
        },
        _count: {
          select: { items: true },
        },
      },
    });

    return successResponse(budgets);
  } catch (error) {
    return handleApiError(error);
  }
}

// POST /api/budgets - Crear nuevo presupuesto
const budgetItemSchema = z.object({
  productId: z.string().optional(),
  name: z.string().min(1, 'El nombre es obligatorio'),
  description: z.string().optional(),
  quantity: z.number().min(1).default(1),
  unitPrice: z.number().min(0),
  order: z.number().default(0),
});

const createBudgetSchema = z.object({
  clientId: z.string().min(1, 'El cliente es obligatorio'),
  flowType: z.enum(['CONSULTORIA', 'DIAGNOSTICO']).optional(), // Solo para UI, no se guarda en BD
  status: z.enum(['BORRADOR', 'ENVIADO', 'ACEPTADO', 'RECHAZADO', 'EXPIRADO']).default('BORRADOR'),
  summary: z.string().optional(),
  scope: z.string().optional(),
  assumptions: z.string().optional(),
  risks: z.string().optional(),
  subtotal: z.number().optional(),
  discount: z.number().default(0),
  taxes: z.number().optional(),
  total: z.number().optional(),
  maintenanceHours: z.number().nullable().optional(),
  maintenanceMonthly: z.number().nullable().optional(),
  validUntil: z.string().optional(),
  items: z.array(budgetItemSchema).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await parseBody<z.infer<typeof createBudgetSchema>>(request);
    const validated = createBudgetSchema.parse(body);

    // Verificar que el cliente existe
    const client = await prisma.client.findUnique({
      where: { id: validated.clientId },
    });

    if (!client) {
      return new Response(JSON.stringify({ success: false, error: 'Cliente no encontrado' }), { status: 404 });
    }

    // Obtener la versión más alta para este cliente
    const lastBudget = await prisma.budget.findFirst({
      where: { clientId: validated.clientId },
      orderBy: { version: 'desc' },
      select: { version: true },
    });

    const version = (lastBudget?.version || 0) + 1;

    // Extraer items y flowType (flowType no se guarda en BD)
    const { items, flowType: _flowType, ...budgetData } = validated;

    // Crear el presupuesto con items
    const budget = await prisma.budget.create({
      data: {
        clientId: budgetData.clientId,
        status: budgetData.status,
        version,
        summary: budgetData.summary,
        scope: budgetData.scope,
        assumptions: budgetData.assumptions,
        risks: budgetData.risks,
        subtotal: budgetData.subtotal || 0,
        discount: budgetData.discount,
        taxes: budgetData.taxes || 0,
        total: budgetData.total || 0,
        maintenanceHours: budgetData.maintenanceHours,
        maintenanceMonthly: budgetData.maintenanceMonthly,
        validUntil: budgetData.validUntil ? new Date(budgetData.validUntil) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        items: items && items.length > 0 ? {
          create: items.map((item, index) => ({
            productId: item.productId || null,
            name: item.name,
            description: item.description || null,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            order: item.order || index,
          })),
        } : undefined,
      },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            company: true,
          },
        },
        items: true,
      },
    });

    return successResponse(budget);
  } catch (error) {
    return handleApiError(error);
  }
}
