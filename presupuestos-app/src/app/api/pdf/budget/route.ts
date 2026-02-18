import { NextRequest, NextResponse } from 'next/server';
import { renderToBuffer } from '@react-pdf/renderer';
import { BudgetPDF, type BudgetPDFData } from '@/lib/pdf/budget-template';
import { handleApiError, parseBody } from '@/lib/api-utils';
import prisma from '@/lib/prisma';
import { z } from 'zod';

const requestSchema = z.object({
  budgetId: z.string().optional(),
  // O datos directos para preview
  data: z
    .object({
      budgetNumber: z.string(),
      version: z.number(),
      date: z.string(),
      validUntil: z.string(),
      clientName: z.string(),
      clientCompany: z.string().optional(),
      clientEmail: z.string().optional(),
      summary: z.string(),
      scope: z.string().optional(),
      items: z.array(
        z.object({
          name: z.string(),
          description: z.string().optional(),
          quantity: z.number(),
          unitPrice: z.number(),
          hours: z.number().optional(),
          isCustom: z.boolean().optional(),
        })
      ),
      subtotal: z.number(),
      discount: z.number(),
      taxes: z.number(),
      total: z.number(),
      maintenance: z
        .object({
          tokens: z.number().optional(),
          hours: z.number().optional(),
          monthly: z.number().optional(),
        })
        .optional(),
      assumptions: z.array(z.string()).optional(),
      risks: z.array(z.string()).optional(),
      conditions: z.array(z.string()).optional(),
    })
    .optional(),
});

// POST /api/pdf/budget - Generar PDF de presupuesto
export async function POST(request: NextRequest) {
  try {
    const body = await parseBody<z.infer<typeof requestSchema>>(request);
    const { budgetId, data } = requestSchema.parse(body);

    let pdfData: BudgetPDFData;

    if (budgetId) {
      // Cargar datos del presupuesto desde la BD
      const budget = await prisma.budget.findUnique({
        where: { id: budgetId },
        include: {
          client: true,
          items: {
            orderBy: { order: 'asc' },
            include: { product: true },
          },
        },
      });

      if (!budget) {
        return NextResponse.json(
          { success: false, error: 'Presupuesto no encontrado' },
          { status: 404 }
        );
      }

      pdfData = {
        budgetNumber: `PRE-${budget.id.substring(0, 8).toUpperCase()}`,
        version: budget.version,
        date: new Date(budget.createdAt).toLocaleDateString('es-ES'),
        validUntil: budget.validUntil
          ? new Date(budget.validUntil).toLocaleDateString('es-ES')
          : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('es-ES'),
        clientName: budget.client.name,
        clientCompany: budget.client.company || undefined,
        clientEmail: budget.client.email || undefined,
        summary: budget.summary || 'Sin resumen',
        scope: budget.scope || undefined,
        items: budget.items.map((item: { name: string; description: string | null; quantity: number; unitPrice: unknown; hoursMed: unknown; productId: string | null }) => ({
          name: item.name,
          description: item.description || undefined,
          quantity: item.quantity,
          unitPrice: Number(item.unitPrice),
          hours: item.hoursMed ? Number(item.hoursMed) : undefined,
          isCustom: !item.productId,
        })),
        subtotal: Number(budget.subtotal),
        discount: Number(budget.discount),
        taxes: Number(budget.taxes),
        total: Number(budget.total),
        maintenance: budget.maintenanceMonthly
          ? {
              tokens: budget.maintenanceTokens || undefined,
              hours: budget.maintenanceHours ? Number(budget.maintenanceHours) : undefined,
              monthly: Number(budget.maintenanceMonthly),
            }
          : undefined,
        assumptions: budget.assumptions?.split('\n').filter(Boolean),
        risks: budget.risks?.split('\n').filter(Boolean),
      };
    } else if (data) {
      // Usar datos proporcionados directamente (preview)
      pdfData = data;
    } else {
      return NextResponse.json(
        { success: false, error: 'Se requiere budgetId o data' },
        { status: 400 }
      );
    }

    // Generar PDF
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pdfBuffer = await renderToBuffer(BudgetPDF({ data: pdfData }) as any);

    // Retornar PDF como Uint8Array
    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="presupuesto-${pdfData.budgetNumber}.pdf"`,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
