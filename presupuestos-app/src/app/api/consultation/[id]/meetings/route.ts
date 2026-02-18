import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/consultation/[id]/meetings
// Obtener todas las reuniones de una consulta
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: consultationId } = await params;

    const meetings = await prisma.meeting.findMany({
      where: { consultationId },
      orderBy: { order: 'asc' },
      include: {
        noteVersions: {
          orderBy: { version: 'desc' },
          take: 1
        },
        _count: {
          select: { keyPoints: true, noteVersions: true }
        }
      }
    });

    return NextResponse.json({
      success: true,
      data: meetings
    });
  } catch (error) {
    console.error('Error obteniendo reuniones:', error);
    return NextResponse.json(
      { success: false, error: 'Error obteniendo reuniones' },
      { status: 500 }
    );
  }
}

// POST /api/consultation/[id]/meetings
// Crear nueva reunión
const createMeetingSchema = z.object({
  title: z.string().min(1, 'El título es requerido'),
  description: z.string().optional(),
  department: z.enum([
    'MARKETING', 'ATENCION_CLIENTE', 'INFRAESTRUCTURA', 'NEGOCIO', 'OTRO'
  ]).optional(),
  attendees: z.array(z.string()).default([]),
  scheduledAt: z.string().datetime().optional(),
  initialNotes: z.string().optional()
});

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: consultationId } = await params;
    const body = await request.json();
    const data = createMeetingSchema.parse(body);

    // Verificar que la consulta existe
    const consultation = await prisma.consultation.findUnique({
      where: { id: consultationId }
    });

    if (!consultation) {
      return NextResponse.json(
        { success: false, error: 'Consulta no encontrada' },
        { status: 404 }
      );
    }

    // Obtener el orden máximo actual
    const maxOrder = await prisma.meeting.aggregate({
      where: { consultationId },
      _max: { order: true }
    });

    // Crear la reunión
    const meeting = await prisma.meeting.create({
      data: {
        consultationId,
        title: data.title,
        description: data.description,
        department: data.department,
        attendees: data.attendees,
        scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : undefined,
        order: (maxOrder._max.order ?? -1) + 1,
        status: data.scheduledAt ? 'PROGRAMADA' : 'PENDIENTE'
      }
    });

    // Si hay notas iniciales, crear la primera versión
    if (data.initialNotes) {
      await prisma.noteVersion.create({
        data: {
          meetingId: meeting.id,
          version: 1,
          content: data.initialNotes
        }
      });
    }

    // Obtener la reunión con sus relaciones
    const meetingWithRelations = await prisma.meeting.findUnique({
      where: { id: meeting.id },
      include: {
        noteVersions: {
          orderBy: { version: 'desc' }
        },
        _count: {
          select: { keyPoints: true, noteVersions: true }
        }
      }
    });

    return NextResponse.json({
      success: true,
      data: meetingWithRelations
    });
  } catch (error) {
    console.error('Error creando reunión:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Datos inválidos', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Error creando reunión' },
      { status: 500 }
    );
  }
}
