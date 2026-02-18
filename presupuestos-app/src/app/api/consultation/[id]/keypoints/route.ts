import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import OpenAI from 'openai';

interface RouteParams {
  params: Promise<{ id: string }>;
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// GET /api/consultation/[id]/keypoints
// Obtener todos los puntos clave de una consulta
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: consultationId } = await params;

    const keyPoints = await prisma.keyPoint.findMany({
      where: { consultationId },
      orderBy: [
        { department: 'asc' },
        { priority: 'desc' },
        { createdAt: 'desc' }
      ],
      include: {
        meeting: {
          select: { id: true, title: true }
        },
        suggestedProduct: {
          include: {
            product: {
              select: { id: true, name: true }
            }
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      data: keyPoints
    });
  } catch (error) {
    console.error('Error obteniendo puntos clave:', error);
    return NextResponse.json(
      { success: false, error: 'Error obteniendo puntos clave' },
      { status: 500 }
    );
  }
}

// POST /api/consultation/[id]/keypoints
// Extraer puntos clave de las notas de una reunión con IA
const extractSchema = z.object({
  meetingId: z.string(),
  noteVersionId: z.string().optional() // Si no se especifica, usa la última versión
});

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: consultationId } = await params;
    const body = await request.json();
    const { meetingId, noteVersionId } = extractSchema.parse(body);

    // Obtener la reunión
    const meeting = await prisma.meeting.findUnique({
      where: { id: meetingId },
      include: {
        noteVersions: {
          orderBy: { version: 'desc' },
          take: 1
        }
      }
    });

    if (!meeting) {
      return NextResponse.json(
        { success: false, error: 'Reunión no encontrada' },
        { status: 404 }
      );
    }

    // Obtener las notas
    let notes: string;
    if (noteVersionId) {
      const noteVersion = await prisma.noteVersion.findUnique({
        where: { id: noteVersionId }
      });
      if (!noteVersion) {
        return NextResponse.json(
          { success: false, error: 'Versión de notas no encontrada' },
          { status: 404 }
        );
      }
      notes = noteVersion.content;
    } else if (meeting.noteVersions.length > 0) {
      notes = meeting.noteVersions[0].content;
    } else {
      return NextResponse.json(
        { success: false, error: 'No hay notas en esta reunión' },
        { status: 400 }
      );
    }

    // Llamar a OpenAI para extraer puntos clave
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `Eres un experto en análisis de reuniones de negocio. 
Tu tarea es extraer puntos clave de las notas de una reunión.

Para cada punto clave, debes identificar:
1. description: Descripción clara y concisa del punto
2. department: Departamento relacionado (MARKETING, ATENCION_CLIENTE, INFRAESTRUCTURA, NEGOCIO, OTRO)
3. priority: Prioridad (0=normal, 1=alta, 2=crítica)
4. isUnknown: true si es algo que necesita más investigación o no está claro

Responde en formato JSON con el siguiente esquema:
{
  "keyPoints": [
    {
      "description": "string",
      "department": "string",
      "priority": number,
      "isUnknown": boolean
    }
  ]
}`
        },
        {
          role: 'user',
          content: `Extrae los puntos clave de estas notas de reunión:

${notes}`
        }
      ],
      response_format: { type: 'json_object' }
    });

    const result = JSON.parse(completion.choices[0].message.content || '{"keyPoints": []}');
    
    // Validar departamentos
    const validDepartments = ['MARKETING', 'ATENCION_CLIENTE', 'INFRAESTRUCTURA', 'NEGOCIO', 'OTRO'];
    
    // Guardar puntos clave en la base de datos
    const createdKeyPoints = await Promise.all(
      result.keyPoints.map(async (point: { description: string; department: string; priority: number; isUnknown: boolean }) => {
        const department = validDepartments.includes(point.department) ? point.department : 'OTRO';
        
        return prisma.keyPoint.create({
          data: {
            consultationId,
            meetingId,
            noteVersionId: noteVersionId || meeting.noteVersions[0]?.id,
            description: point.description,
            department: department as 'MARKETING' | 'ATENCION_CLIENTE' | 'INFRAESTRUCTURA' | 'NEGOCIO' | 'OTRO',
            priority: point.priority || 0,
            isUnknown: point.isUnknown || false,
            status: 'PENDIENTE'
          }
        });
      })
    );

    return NextResponse.json({
      success: true,
      data: createdKeyPoints,
      message: `Se extrajeron ${createdKeyPoints.length} puntos clave`
    });
  } catch (error) {
    console.error('Error extrayendo puntos clave:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Datos inválidos', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Error extrayendo puntos clave' },
      { status: 500 }
    );
  }
}
