import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { z } from 'zod';

const generateBudgetSchema = z.object({
  maintenanceType: z.enum(['HORAS', 'TOKENS', 'INCIDENCIAS', 'SLA']).optional(),
  maintenanceTokens: z.number().optional(),
  maintenanceHours: z.number().optional(),
  maintenanceMonthly: z.number().optional(),
  maintenanceSLA: z.string().optional(),
  discount: z.number().optional(),
  validDays: z.number().optional(),
});

// POST /api/consultation/[id]/budget
// Genera un presupuesto desde la consultoría
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: consultationId } = await params;
    const body = await request.json();
    const input = generateBudgetSchema.parse(body);

    // Cargar consultoría con productos validados
    const consultation = await prisma.consultation.findUnique({
      where: { id: consultationId },
      include: {
        client: true,
        suggestedProducts: {
          where: { isValidated: true },
          include: { product: true },
        },
        keyPoints: true,
      },
    });

    if (!consultation) {
      return NextResponse.json(
        { success: false, error: 'Consultoría no encontrada' },
        { status: 404 }
      );
    }

    if (consultation.suggestedProducts.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No hay productos validados para presupuestar' },
        { status: 400 }
      );
    }

    // Calcular totales
    let subtotal = 0;
    interface SuggestedProductWithProduct {
      productId: string;
      matchReason: string | null;
      product: { name: string; price: unknown; descriptionPublic: string | null };
    }

    const budgetItems = consultation.suggestedProducts.map((sp: SuggestedProductWithProduct, index: number) => {
      const price = Number(sp.product.price);
      subtotal += price;
      return {
        productId: sp.productId,
        name: sp.product.name,
        description: sp.matchReason || sp.product.descriptionPublic || '',
        quantity: 1,
        unitPrice: price,
        order: index,
      };
    });

    const discount = input.discount || 0;
    const taxRate = 0.21; // 21% IVA
    const taxableAmount = subtotal - discount;
    const taxes = taxableAmount * taxRate;
    const total = taxableAmount + taxes;

    // Crear presupuesto
    const budget = await prisma.budget.create({
      data: {
        clientId: consultation.clientId,
        status: 'BORRADOR',
        summary: `Presupuesto generado desde consultoría para ${consultation.client.company || consultation.client.name}`,
        subtotal,
        discount,
        taxes,
        total,
        maintenanceType: input.maintenanceType,
        maintenanceTokens: input.maintenanceTokens,
        maintenanceHours: input.maintenanceHours,
        maintenanceMonthly: input.maintenanceMonthly,
        maintenanceSLA: input.maintenanceSLA,
        validUntil: input.validDays 
          ? new Date(Date.now() + input.validDays * 24 * 60 * 60 * 1000)
          : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 días por defecto
        items: {
          create: budgetItems,
        },
      },
      include: {
        items: {
          include: { product: true },
        },
      },
    });

    // Vincular presupuesto a la consultoría
    await prisma.consultation.update({
      where: { id: consultationId },
      data: { 
        budgetId: budget.id,
        status: 'PRESUPUESTADO',
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        budget,
        summary: {
          itemsCount: budgetItems.length,
          subtotal,
          discount,
          taxes,
          total,
        },
      },
    });

  } catch (error) {
    console.error('Error generando presupuesto:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Datos inválidos', details: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: 'Error generando presupuesto' },
      { status: 500 }
    );
  }
}

// GET /api/consultation/[id]/budget
// Obtiene el presupuesto de la consultoría
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: consultationId } = await params;

    const consultation = await prisma.consultation.findUnique({
      where: { id: consultationId },
      select: { budgetId: true },
    });

    if (!consultation) {
      return NextResponse.json(
        { success: false, error: 'Consultoría no encontrada' },
        { status: 404 }
      );
    }

    if (!consultation.budgetId) {
      return NextResponse.json({
        success: true,
        data: null,
      });
    }

    const budget = await prisma.budget.findUnique({
      where: { id: consultation.budgetId },
      include: {
        items: {
          include: { product: true },
          orderBy: { order: 'asc' },
        },
        client: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: budget,
    });

  } catch (error) {
    console.error('Error obteniendo presupuesto:', error);
    return NextResponse.json(
      { success: false, error: 'Error obteniendo presupuesto' },
      { status: 500 }
    );
  }
}
