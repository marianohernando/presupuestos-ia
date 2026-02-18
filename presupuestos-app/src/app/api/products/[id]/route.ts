import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { successResponse, errorResponse, handleApiError, parseBody } from '@/lib/api-utils';
import { updateProductSchema, type UpdateProductInput } from '@/lib/validations';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/products/[id] - Obtener producto
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const product = await prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      return errorResponse('Producto no encontrado', 404);
    }

    return successResponse(product);
  } catch (error) {
    return handleApiError(error);
  }
}

// PATCH /api/products/[id] - Actualizar producto (parcial)
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await parseBody<UpdateProductInput>(request);
    const validated = updateProductSchema.parse(body);

    const product = await prisma.product.update({
      where: { id },
      data: {
        ...(validated.name && { name: validated.name }),
        ...(validated.internalReference !== undefined && { internalReference: validated.internalReference }),
        ...(validated.category !== undefined && { category: validated.category }),
        ...(validated.descriptionPublic !== undefined && { descriptionPublic: validated.descriptionPublic }),
        ...(validated.description !== undefined && { descriptionPublic: validated.description }),
        ...(validated.price !== undefined && { price: validated.price }),
        ...(validated.cost !== undefined && { cost: validated.cost }),
        ...(validated.estimatedHours !== undefined && { estimatedHours: validated.estimatedHours }),
        ...(validated.isActive !== undefined && { isActive: validated.isActive }),
      },
    });

    return successResponse(product);
  } catch (error) {
    return handleApiError(error);
  }
}

// PUT /api/products/[id] - Actualizar producto (completo)
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await parseBody<UpdateProductInput>(request);
    const validated = updateProductSchema.parse(body);

    const product = await prisma.product.update({
      where: { id },
      data: {
        name: validated.name || '',
        internalReference: validated.internalReference || null,
        category: validated.category || null,
        descriptionPublic: validated.descriptionPublic || validated.description || null,
        descriptionInternal: validated.descriptionInternal || null,
        price: validated.price || 0,
        cost: validated.cost || null,
        estimatedHours: validated.estimatedHours || validated.hoursMin || null,
        isActive: validated.isActive ?? true,
      },
    });

    return successResponse(product);
  } catch (error) {
    return handleApiError(error);
  }
}

// DELETE /api/products/[id] - Desactivar producto (soft delete)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const product = await prisma.product.update({
      where: { id },
      data: { isActive: false },
    });

    return successResponse(product);
  } catch (error) {
    return handleApiError(error);
  }
}
