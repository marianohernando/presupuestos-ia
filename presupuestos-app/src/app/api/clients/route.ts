import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { successResponse, errorResponse, handleApiError, parseBody } from '@/lib/api-utils';
import { createClientSchema, type CreateClientInput } from '@/lib/validations';

// GET /api/clients - Listar clientes
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    const where: Record<string, unknown> = {};

    if (status && status !== 'all') {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { company: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const clients = await prisma.client.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      include: {
        _count: {
          select: { budgets: true },
        },
      },
    });

    return successResponse(clients);
  } catch (error) {
    return handleApiError(error);
  }
}

// POST /api/clients - Crear cliente
export async function POST(request: NextRequest) {
  try {
    const body = await parseBody<CreateClientInput>(request);
    const validated = createClientSchema.parse(body);

    const client = await prisma.client.create({
      data: {
        name: validated.name,
        company: validated.company,
        email: validated.email || null,
        phone: validated.phone,
        notes: validated.notes,
      },
    });

    return successResponse(client, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
