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

// POST /api/consultation/[id]/orgchart
// Procesar organigrama (texto descriptivo) y sugerir reuniones
const processOrgChartSchema = z.object({
  description: z.string().min(10, 'La descripción debe tener al menos 10 caracteres')
});

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: consultationId } = await params;
    const body = await request.json();
    const { description } = processOrgChartSchema.parse(body);

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

    // Llamar a OpenAI para extraer estructura del organigrama
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `Eres un experto en análisis organizacional. 
Tu tarea es extraer la estructura de una empresa a partir de una descripción y sugerir reuniones necesarias para una consultoría.

Debes identificar:
1. Departamentos de la empresa
2. Personas clave con sus roles
3. Reuniones necesarias para recopilar información

Los departamentos válidos son: MARKETING, ATENCION_CLIENTE, INFRAESTRUCTURA, NEGOCIO, OTRO

Responde en formato JSON con el siguiente esquema:
{
  "departments": [
    {
      "name": "string (nombre del departamento)",
      "code": "string (MARKETING, ATENCION_CLIENTE, INFRAESTRUCTURA, NEGOCIO, OTRO)",
      "head": "string (nombre del responsable)",
      "members": ["string (nombres de otros miembros)"]
    }
  ],
  "people": [
    {
      "name": "string",
      "role": "string",
      "department": "string"
    }
  ],
  "suggestedMeetings": [
    {
      "title": "string (título descriptivo de la reunión)",
      "department": "string (MARKETING, ATENCION_CLIENTE, INFRAESTRUCTURA, NEGOCIO, OTRO)",
      "attendees": ["string (nombres de las personas)"],
      "reason": "string (por qué es necesaria esta reunión)"
    }
  ]
}`
        },
        {
          role: 'user',
          content: `Analiza esta descripción del organigrama de la empresa y extrae la estructura:

${description}`
        }
      ],
      response_format: { type: 'json_object' }
    });

    const orgChartData = JSON.parse(completion.choices[0].message.content || '{}');
    
    // Guardar datos del organigrama en la consulta
    await prisma.consultation.update({
      where: { id: consultationId },
      data: {
        orgChartData: orgChartData
      }
    });

    // Crear reuniones sugeridas automáticamente
    const validDepartments = ['MARKETING', 'ATENCION_CLIENTE', 'INFRAESTRUCTURA', 'NEGOCIO', 'OTRO'];
    const createdMeetings = [];

    if (orgChartData.suggestedMeetings && Array.isArray(orgChartData.suggestedMeetings)) {
      // Obtener el orden máximo actual
      const maxOrder = await prisma.meeting.aggregate({
        where: { consultationId },
        _max: { order: true }
      });
      let currentOrder = (maxOrder._max.order ?? -1) + 1;

      for (const suggestion of orgChartData.suggestedMeetings) {
        const department = validDepartments.includes(suggestion.department) 
          ? suggestion.department 
          : 'OTRO';

        const meeting = await prisma.meeting.create({
          data: {
            consultationId,
            title: suggestion.title,
            description: suggestion.reason,
            department: department as 'MARKETING' | 'ATENCION_CLIENTE' | 'INFRAESTRUCTURA' | 'NEGOCIO' | 'OTRO',
            attendees: suggestion.attendees || [],
            status: 'SUGERIDA',
            suggestedByAI: true,
            order: currentOrder++
          }
        });
        createdMeetings.push(meeting);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        orgChart: orgChartData,
        suggestedMeetings: createdMeetings
      },
      message: `Organigrama procesado. Se sugirieron ${createdMeetings.length} reuniones.`
    });
  } catch (error) {
    console.error('Error procesando organigrama:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Datos inválidos', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Error procesando organigrama' },
      { status: 500 }
    );
  }
}

// GET /api/consultation/[id]/orgchart
// Obtener datos del organigrama
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: consultationId } = await params;

    const consultation = await prisma.consultation.findUnique({
      where: { id: consultationId },
      select: {
        orgChartData: true,
        orgChartFileUrl: true,
        orgChartFileName: true
      }
    });

    if (!consultation) {
      return NextResponse.json(
        { success: false, error: 'Consulta no encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: consultation
    });
  } catch (error) {
    console.error('Error obteniendo organigrama:', error);
    return NextResponse.json(
      { success: false, error: 'Error obteniendo organigrama' },
      { status: 500 }
    );
  }
}
