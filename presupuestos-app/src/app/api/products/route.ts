import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { successResponse, handleApiError, parseBody } from '@/lib/api-utils';
import { createProductSchema, type CreateProductInput } from '@/lib/validations';

// GET /api/products - Listar productos
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const tag = searchParams.get('tag');
    const includeInactive = searchParams.get('includeInactive') === 'true';

    const where: Record<string, unknown> = {};

    if (!includeInactive) {
      where.isActive = true;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { descriptionPublic: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (tag && tag !== 'all') {
      where.tags = { has: tag };
    }

    const products = await prisma.product.findMany({
      where,
      orderBy: { name: 'asc' },
    });

    return successResponse(products);
  } catch (error) {
    return handleApiError(error);
  }
}

// POST /api/products - Crear producto
export async function POST(request: NextRequest) {
  try {
    const body = await parseBody<CreateProductInput>(request);
    const validated = createProductSchema.parse(body);

    const product = await prisma.product.create({
      data: {
        name: validated.name,
        internalReference: validated.internalReference || null,
        category: validated.category || null,
        descriptionPublic: validated.descriptionPublic || validated.description || null,
        descriptionInternal: validated.descriptionInternal || null,
        price: validated.price,
        cost: validated.cost || null,
        estimatedHours: validated.estimatedHours || validated.hoursMin || null,
        tags: validated.tags || [],
        isActive: validated.isActive ?? true,
      },
    });

    return successResponse(product, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
