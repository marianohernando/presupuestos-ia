import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import OpenAI from 'openai';
import { z } from 'zod';

interface RouteParams {
  params: Promise<{ id: string }>;
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// GET /api/consultation/[id]/clarify
// Obtener preguntas de clarificación existentes
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: consultationId } = await params;

    const questions = await prisma.clarificationQuestion.findMany({
      where: { consultationId },
      orderBy: [
        { priority: 'desc' },
        { order: 'asc' },
        { createdAt: 'asc' }
      ]
    });

    // Contar respondidas vs pendientes
    const answered = questions.filter(q => q.isAnswered).length;
    const pending = questions.filter(q => !q.isAnswered).length;

    return NextResponse.json({
      success: true,
      data: {
        questions,
        stats: { total: questions.length, answered, pending }
      }
    });
  } catch (error) {
    console.error('Error obteniendo preguntas:', error);
    return NextResponse.json(
      { success: false, error: 'Error obteniendo preguntas' },
      { status: 500 }
    );
  }
}

// POST /api/consultation/[id]/clarify
// Generar preguntas de clarificación basadas en los puntos clave
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: consultationId } = await params;

    // Obtener la consulta con TODOS sus puntos clave (sin filtrar)
    const consultation = await prisma.consultation.findUnique({
      where: { id: consultationId },
      include: {
        client: true,
        keyPoints: true, // Incluir todos para análisis completo
        meetings: {
          include: {
            noteVersions: {
              orderBy: { version: 'desc' },
              take: 1
            }
          }
        }
      }
    });

    if (!consultation) {
      return NextResponse.json(
        { success: false, error: 'Consulta no encontrada' },
        { status: 404 }
      );
    }

    // Verificar que hay datos para analizar
    const hasKeyPoints = consultation.keyPoints.length > 0;
    const hasNotes = consultation.meetings.some(m => m.noteVersions.length > 0);
    const hasInitialNotes = consultation.initialNotes && consultation.initialNotes.length > 10;

    if (!hasKeyPoints && !hasNotes && !hasInitialNotes) {
      return NextResponse.json(
        { success: false, error: 'No hay puntos clave ni notas para analizar. Añade primero una reunión con notas.' },
        { status: 400 }
      );
    }

    // Recopilar contexto
    const meetingNotes = consultation.meetings
      .map(m => m.noteVersions[0]?.content || '')
      .filter(Boolean)
      .join('\n\n---\n\n');
    
    const allNotes = [consultation.initialNotes, meetingNotes].filter(Boolean).join('\n\n---\n\n');

    const keyPointsText = consultation.keyPoints
      .map((kp, i) => `${i + 1}. [${kp.department}] ${kp.description}${kp.isUnknown ? ' (INCÓGNITA - producto desconocido)' : ''}`)
      .join('\n');

    // Identificar incógnitas
    const unknowns = consultation.keyPoints.filter(kp => kp.isUnknown);
    
    console.log('Generando preguntas para consulta:', consultationId, {
      keyPoints: consultation.keyPoints.length,
      unknowns: unknowns.length,
      hasNotes: allNotes.length > 0
    });

    // Llamar a OpenAI para generar preguntas
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `Eres un experto en análisis de proyectos tecnológicos. Tu trabajo es generar preguntas de clarificación para un presupuesto.

Analiza los puntos clave extraídos de las reuniones y genera preguntas que ayuden a:
1. Aclarar ambigüedades o información faltante
2. Entender mejor el alcance del proyecto
3. Identificar riesgos o dependencias
4. Estimar mejor los costes

Para cada pregunta, proporciona 2-4 respuestas predefinidas que faciliten la respuesta rápida del usuario.

IMPORTANTE sobre INCÓGNITAS:
- Si un punto está marcado como INCÓGNITA, significa que menciona un producto o tecnología que no está en nuestro catálogo
- Para incógnitas, genera preguntas que ayuden a entender qué se necesita exactamente

Responde en formato JSON:
{
  "questions": [
    {
      "question": "La pregunta clara y concreta",
      "context": "Por qué es importante esta pregunta",
      "suggestedAnswers": ["Opción 1", "Opción 2", "Opción 3"],
      "priority": "high|medium|low",
      "impactArea": "pricing|scope|timeline|technical",
      "relatedKeyPointIndex": null o número (0-indexed)
    }
  ]
}`
        },
        {
          role: 'user',
          content: `Genera preguntas de clarificación para este proyecto:

CLIENTE: ${consultation.client.name} (${consultation.client.company || 'Sin empresa'})
TIPO: ${consultation.type}

NOTAS DE REUNIONES:
${allNotes || 'Sin notas adicionales'}

PUNTOS CLAVE EXTRAÍDOS:
${keyPointsText || 'Sin puntos clave aún'}

${unknowns.length > 0 ? `\nINCÓGNITAS DETECTADAS (${unknowns.length}):
${unknowns.map(u => `- ${u.description}`).join('\n')}` : ''}

Genera entre 3 y 8 preguntas relevantes, priorizando las más importantes.`
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.4
    });

    const result = JSON.parse(completion.choices[0].message.content || '{"questions": []}');

    // Guardar las preguntas en la base de datos
    const createdQuestions = await Promise.all(
      result.questions.map(async (q: {
        question: string;
        context?: string;
        suggestedAnswers?: string[];
        priority?: string;
        impactArea?: string;
        relatedKeyPointIndex?: number | null;
      }, index: number) => {
        // Relacionar con punto clave si corresponde
        let keyPointId = null;
        if (q.relatedKeyPointIndex !== null && q.relatedKeyPointIndex !== undefined) {
          const kp = consultation.keyPoints[q.relatedKeyPointIndex];
          if (kp) keyPointId = kp.id;
        }

        return prisma.clarificationQuestion.create({
          data: {
            consultationId,
            keyPointId,
            question: q.question,
            context: q.context || null,
            suggestedAnswers: q.suggestedAnswers || [],
            priority: q.priority || 'medium',
            impactArea: q.impactArea || null,
            order: index
          }
        });
      })
    );

    return NextResponse.json({
      success: true,
      data: createdQuestions,
      message: `Se generaron ${createdQuestions.length} preguntas de clarificación`
    });
  } catch (error) {
    console.error('Error generando preguntas:', error);
    return NextResponse.json(
      { success: false, error: 'Error generando preguntas' },
      { status: 500 }
    );
  }
}

// PATCH /api/consultation/[id]/clarify
// Responder una pregunta
const answerSchema = z.object({
  questionId: z.string(),
  answer: z.string().min(1)
});

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: consultationId } = await params;
    const body = await request.json();
    const { questionId, answer } = answerSchema.parse(body);

    // Verificar que la pregunta pertenece a esta consulta
    const question = await prisma.clarificationQuestion.findFirst({
      where: { id: questionId, consultationId }
    });

    if (!question) {
      return NextResponse.json(
        { success: false, error: 'Pregunta no encontrada' },
        { status: 404 }
      );
    }

    // Actualizar la respuesta
    const updated = await prisma.clarificationQuestion.update({
      where: { id: questionId },
      data: {
        answer,
        isAnswered: true,
        answeredAt: new Date()
      }
    });

    return NextResponse.json({
      success: true,
      data: updated
    });
  } catch (error) {
    console.error('Error respondiendo pregunta:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Datos inválidos', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Error respondiendo pregunta' },
      { status: 500 }
    );
  }
}
