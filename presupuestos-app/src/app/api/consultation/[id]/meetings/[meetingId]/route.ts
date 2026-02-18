import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';

interface RouteParams {
  params: Promise<{ id: string; meetingId: string }>;
}

// GET /api/consultation/[id]/meetings/[meetingId]
// Obtener una reunión específica con todas sus notas y puntos
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { meetingId } = await params;

    const meeting = await prisma.meeting.findUnique({
      where: { id: meetingId },
      include: {
        noteVersions: {
          orderBy: { version: 'desc' }
        },
        keyPoints: {
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!meeting) {
      return NextResponse.json(
        { success: false, error: 'Reunión no encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: meeting
    });
  } catch (error) {
    console.error('Error obteniendo reunión:', error);
    return NextResponse.json(
      { success: false, error: 'Error obteniendo reunión' },
      { status: 500 }
    );
  }
}

// PATCH /api/consultation/[id]/meetings/[meetingId]
// Actualizar reunión
const updateMeetingSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  department: z.enum([
    'MARKETING', 'ATENCION_CLIENTE', 'INFRAESTRUCTURA', 'NEGOCIO', 'OTRO'
  ]).optional(),
  attendees: z.array(z.string()).optional(),
  status: z.enum(['SUGERIDA', 'PENDIENTE', 'PROGRAMADA', 'COMPLETADA', 'CANCELADA']).optional(),
  scheduledAt: z.string().datetime().nullable().optional(),
  completedAt: z.string().datetime().nullable().optional(),
  script: z.string().optional(),
  questionsToAsk: z.array(z.string()).optional()
});

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { meetingId } = await params;
    const body = await request.json();
    const data = updateMeetingSchema.parse(body);

    // Preparar datos de actualización
    const updateData: Record<string, unknown> = { ...data };
    
    if (data.scheduledAt !== undefined) {
      updateData.scheduledAt = data.scheduledAt ? new Date(data.scheduledAt) : null;
    }
    if (data.completedAt !== undefined) {
      updateData.completedAt = data.completedAt ? new Date(data.completedAt) : null;
    }

    const meeting = await prisma.meeting.update({
      where: { id: meetingId },
      data: updateData,
      include: {
        noteVersions: {
          orderBy: { version: 'desc' }
        },
        keyPoints: {
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    return NextResponse.json({
      success: true,
      data: meeting
    });
  } catch (error) {
    console.error('Error actualizando reunión:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Datos inválidos', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Error actualizando reunión' },
      { status: 500 }
    );
  }
}

// DELETE /api/consultation/[id]/meetings/[meetingId]
// Eliminar reunión
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { meetingId } = await params;

    await prisma.meeting.delete({
      where: { id: meetingId }
    });

    return NextResponse.json({
      success: true,
      message: 'Reunión eliminada'
    });
  } catch (error) {
    console.error('Error eliminando reunión:', error);
    return NextResponse.json(
      { success: false, error: 'Error eliminando reunión' },
      { status: 500 }
    );
  }
}
