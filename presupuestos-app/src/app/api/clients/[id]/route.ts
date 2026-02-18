import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { successResponse, errorResponse, handleApiError, parseBody } from '@/lib/api-utils';
import { updateClientSchema, type UpdateClientInput } from '@/lib/validations';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/clients/[id] - Obtener cliente
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const client = await prisma.client.findUnique({
      where: { id },
    });

    if (!client) {
      return errorResponse('Cliente no encontrado', 404);
    }

    return successResponse(client);
  } catch (error) {
    return handleApiError(error);
  }
}

// PATCH /api/clients/[id] - Actualizar cliente
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await parseBody<UpdateClientInput>(request);
    const validated = updateClientSchema.parse(body);

    const client = await prisma.client.update({
      where: { id },
      data: validated,
    });

    return successResponse(client);
  } catch (error) {
    return handleApiError(error);
  }
}

// DELETE /api/clients/[id] - Archivar cliente (soft delete)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const client = await prisma.client.update({
      where: { id },
      data: { status: 'ARCHIVADO' },
    });

    return successResponse(client);
  } catch (error) {
    return handleApiError(error);
  }
}
