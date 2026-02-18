import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// GET /api/consultation?clientId=xxx
// Obtener consulta activa de un cliente
export async function GET(request: NextRequest) {
  try {
    const clientId = request.nextUrl.searchParams.get('clientId');
    
    if (!clientId) {
      return NextResponse.json(
        { success: false, error: 'clientId requerido' },
        { status: 400 }
      );
    }

    // Buscar consulta activa (no archivada)
    const consultation = await prisma.consultation.findFirst({
      where: {
        clientId,
        status: { not: 'ARCHIVADO' }
      }
    });

    // Si existe, cargar relaciones por separado para evitar consulta pesada
    if (consultation) {
      const [meetings, keyPoints, suggestedProducts] = await Promise.all([
        prisma.meeting.findMany({
          where: { consultationId: consultation.id },
          orderBy: { order: 'asc' },
          include: {
            noteVersions: {
              orderBy: { version: 'desc' },
              take: 1
            },
            _count: {
              select: { keyPoints: true }
            }
          }
        }),
        prisma.keyPoint.findMany({
          where: { consultationId: consultation.id },
          orderBy: { createdAt: 'desc' }
        }),
        prisma.suggestedProduct.findMany({
          where: { consultationId: consultation.id },
          include: {
            product: true
          }
        })
      ]);

      return NextResponse.json({
        success: true,
        data: {
          ...consultation,
          meetings,
          keyPoints,
          suggestedProducts
        }
      });
    }

    return NextResponse.json({
      success: true,
      data: consultation
    });
  } catch (error) {
    console.error('Error obteniendo consulta:', error);
    return NextResponse.json(
      { success: false, error: 'Error obteniendo consulta' },
      { status: 500 }
    );
  }
}

// POST /api/consultation
// Crear nueva consulta
const createSchema = z.object({
  clientId: z.string(),
  type: z.enum(['CONSULTORIA', 'DIAGNOSTICO']),
  initialNotes: z.string().optional()
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { clientId, type, initialNotes } = createSchema.parse(body);

    // Verificar que el cliente existe
    const client = await prisma.client.findUnique({
      where: { id: clientId }
    });

    if (!client) {
      return NextResponse.json(
        { success: false, error: 'Cliente no encontrado' },
        { status: 404 }
      );
    }

    // Verificar que no hay otra consulta activa
    const existingConsultation = await prisma.consultation.findFirst({
      where: {
        clientId,
        status: { not: 'ARCHIVADO' }
      }
    });

    if (existingConsultation) {
      return NextResponse.json(
        { success: false, error: 'Ya existe una consulta activa para este cliente' },
        { status: 400 }
      );
    }

    // Crear consulta
    const consultation = await prisma.consultation.create({
      data: {
        clientId,
        type,
        initialNotes,
        status: 'EN_PROGRESO'
      }
    });

    // Actualizar estado del cliente
    await prisma.client.update({
      where: { id: clientId },
      data: { 
        status: 'EN_PROCESO',
        flowType: type
      }
    });

    // Si hay notas iniciales, crear primera reunión y extraer puntos clave
    let firstMeeting = null;
    let extractedKeyPoints: { id: string; description: string; department: string }[] = [];
    
    if (initialNotes && initialNotes.trim().length > 10) {
      // Crear primera reunión
      firstMeeting = await prisma.meeting.create({
        data: {
          consultationId: consultation.id,
          title: 'Reunión inicial',
          status: 'COMPLETADA',
          department: 'NEGOCIO',
          attendees: [],
          suggestedByAI: false,
          order: 0
        }
      });

      // Guardar las notas como primera versión
      const noteVersion = await prisma.noteVersion.create({
        data: {
          meetingId: firstMeeting.id,
          content: initialNotes,
          version: 1
        }
      });

      // Extraer puntos clave con IA
      try {
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
              content: `Extrae los puntos clave de estas notas de reunión inicial:

${initialNotes}`
            }
          ],
          response_format: { type: 'json_object' }
        });

        const result = JSON.parse(completion.choices[0].message.content || '{"keyPoints": []}');
        
        // Validar departamentos
        const validDepartments = ['MARKETING', 'ATENCION_CLIENTE', 'INFRAESTRUCTURA', 'NEGOCIO', 'OTRO'];
        
        // Guardar puntos clave en la base de datos
        extractedKeyPoints = await Promise.all(
          result.keyPoints.map(async (point: { description: string; department: string; priority: number; isUnknown: boolean }) => {
            const department = validDepartments.includes(point.department) ? point.department : 'OTRO';
            
            return prisma.keyPoint.create({
              data: {
                consultationId: consultation.id,
                meetingId: firstMeeting!.id,
                noteVersionId: noteVersion.id,
                description: point.description,
                department: department as 'MARKETING' | 'ATENCION_CLIENTE' | 'INFRAESTRUCTURA' | 'NEGOCIO' | 'OTRO',
                priority: point.priority || 0,
                isUnknown: point.isUnknown || false,
                status: 'PENDIENTE'
              }
            });
          })
        );
      } catch (aiError) {
        console.error('Error extrayendo puntos clave con IA:', aiError);
        // No fallar la creación de consulta si falla la extracción de puntos clave
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        ...consultation,
        firstMeeting,
        extractedKeyPoints
      },
      message: extractedKeyPoints.length > 0 
        ? `Consulta creada con ${extractedKeyPoints.length} puntos clave extraídos`
        : 'Consulta creada correctamente'
    });
  } catch (error) {
    console.error('Error creando consulta:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Datos inválidos', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Error creando consulta' },
      { status: 500 }
    );
  }
}

// PATCH /api/consultation
// Actualizar consulta
const updateSchema = z.object({
  id: z.string(),
  initialNotes: z.string().optional(),
  generalScript: z.string().optional(),
  executiveSummary: z.string().optional(),
  orgChartFileUrl: z.string().optional(),
  orgChartFileName: z.string().optional(),
  orgChartData: z.any().optional(),
  status: z.enum(['EN_PROGRESO', 'LISTO_PRESUPUESTO', 'PRESUPUESTADO', 'ARCHIVADO']).optional()
});

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const data = updateSchema.parse(body);
    const { id, ...updateData } = data;

    const consultation = await prisma.consultation.update({
      where: { id },
      data: updateData
    });

    return NextResponse.json({
      success: true,
      data: consultation
    });
  } catch (error) {
    console.error('Error actualizando consulta:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Datos inválidos', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Error actualizando consulta' },
      { status: 500 }
    );
  }
}
