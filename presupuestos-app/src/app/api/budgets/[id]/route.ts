import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { successResponse, handleApiError } from '@/lib/api-utils';

// GET /api/budgets/[id] - Obtener un presupuesto por ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const budget = await prisma.budget.findUnique({
      where: { id },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            company: true,
            email: true,
          },
        },
        items: {
          orderBy: { order: 'asc' },
          include: {
            product: {
              select: {
                id: true,
                name: true,
                category: true,
              },
            },
          },
        },
      },
    });

    if (!budget) {
      return NextResponse.json(
        { success: false, error: 'Presupuesto no encontrado' },
        { status: 404 }
      );
    }

    return successResponse(budget);
  } catch (error) {
    return handleApiError(error);
  }
}

// PUT /api/budgets/[id] - Actualizar un presupuesto
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    
    const { status, summary, discount, validUntil } = body;

    const budget = await prisma.budget.update({
      where: { id },
      data: {
        ...(status && { status }),
        ...(summary && { summary }),
        ...(discount !== undefined && { discount }),
        ...(validUntil && { validUntil: new Date(validUntil) }),
        version: { increment: 1 },
      },
      include: {
        client: true,
        items: true,
      },
    });

    return successResponse(budget);
  } catch (error) {
    return handleApiError(error);
  }
}

// DELETE /api/budgets/[id] - Eliminar un presupuesto
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Primero eliminar items relacionados
    await prisma.budgetItem.deleteMany({
      where: { budgetId: id },
    });
    
    // Luego eliminar el presupuesto
    await prisma.budget.delete({
      where: { id },
    });

    return successResponse({ deleted: true });
  } catch (error) {
    return handleApiError(error);
  }
}
