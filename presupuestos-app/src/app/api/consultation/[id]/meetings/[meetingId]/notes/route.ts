import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';

interface RouteParams {
  params: Promise<{ id: string; meetingId: string }>;
}

// GET /api/consultation/[id]/meetings/[meetingId]/notes
// Obtener todas las versiones de notas de una reunión
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { meetingId } = await params;

    const notes = await prisma.noteVersion.findMany({
      where: { meetingId },
      orderBy: { version: 'desc' }
    });

    return NextResponse.json({
      success: true,
      data: notes
    });
  } catch (error) {
    console.error('Error obteniendo notas:', error);
    return NextResponse.json(
      { success: false, error: 'Error obteniendo notas' },
      { status: 500 }
    );
  }
}

// POST /api/consultation/[id]/meetings/[meetingId]/notes
// Añadir nueva versión de notas
const createNoteSchema = z.object({
  content: z.string().min(1, 'El contenido es requerido')
});

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { meetingId } = await params;
    const body = await request.json();
    const { content } = createNoteSchema.parse(body);

    // Verificar que la reunión existe
    const meeting = await prisma.meeting.findUnique({
      where: { id: meetingId }
    });

    if (!meeting) {
      return NextResponse.json(
        { success: false, error: 'Reunión no encontrada' },
        { status: 404 }
      );
    }

    // Obtener la versión máxima actual
    const maxVersion = await prisma.noteVersion.aggregate({
      where: { meetingId },
      _max: { version: true }
    });

    const newVersion = (maxVersion._max.version ?? 0) + 1;

    // Crear nueva versión de notas
    const noteVersion = await prisma.noteVersion.create({
      data: {
        meetingId,
        version: newVersion,
        content
      }
    });

    // Si es la primera nota y la reunión no está completada, 
    // actualizar estado a COMPLETADA
    if (newVersion === 1 && meeting.status !== 'COMPLETADA') {
      await prisma.meeting.update({
        where: { id: meetingId },
        data: { 
          status: 'COMPLETADA',
          completedAt: new Date()
        }
      });
    }

    return NextResponse.json({
      success: true,
      data: noteVersion
    });
  } catch (error) {
    console.error('Error creando nota:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Datos inválidos', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Error creando nota' },
      { status: 500 }
    );
  }
}
