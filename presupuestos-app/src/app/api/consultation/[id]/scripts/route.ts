import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// POST /api/consultation/[id]/scripts
// Genera guiones para la consultoría
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: consultationId } = await params;
    const body = await request.json();
    const { type } = body; // 'general' | 'meeting' | 'all'
    const meetingId = body.meetingId;

    // Cargar consultoría con datos necesarios
    const consultation = await prisma.consultation.findUnique({
      where: { id: consultationId },
      include: {
        client: true,
        meetings: {
          include: {
            noteVersions: {
              orderBy: { version: 'desc' },
              take: 1,
            },
          },
        },
        keyPoints: true,
        suggestedProducts: {
          where: { isValidated: true },
          include: { product: true },
        },
      },
    });

    if (!consultation) {
      return NextResponse.json(
        { success: false, error: 'Consultoría no encontrada' },
        { status: 404 }
      );
    }

    const results: { generalScript?: string; meetingScripts?: Array<{ id: string; script: string; questions: string[] }> } = {};

    // Generar guión general
    if (type === 'general' || type === 'all') {
      const generalScript = await generateGeneralScript(consultation);
      
      // Guardar en DB
      await prisma.consultation.update({
        where: { id: consultationId },
        data: { generalScript },
      });
      
      results.generalScript = generalScript;
    }

    // Generar guiones de reuniones pendientes
    if (type === 'meeting' || type === 'all') {
      interface MeetingWithNotes {
          id: string;
          title: string;
          status: string;
          department: string | null;
          attendees: string[];
          noteVersions: Array<{ content: string }>;
        }

        const meetingsToProcess = meetingId 
          ? consultation.meetings.filter((m: MeetingWithNotes) => m.id === meetingId)
          : consultation.meetings.filter((m: MeetingWithNotes) => m.status !== 'COMPLETADA');

      const meetingScripts = [];

      for (const meeting of meetingsToProcess) {
        const { script, questions } = await generateMeetingScript(consultation, meeting);
        
        // Guardar en DB
        await prisma.meeting.update({
          where: { id: meeting.id },
          data: { 
            script,
            questionsToAsk: questions,
          },
        });

        meetingScripts.push({
          id: meeting.id,
          script,
          questions,
        });
      }

      results.meetingScripts = meetingScripts;
    }

    return NextResponse.json({
      success: true,
      data: results,
    });

  } catch (error) {
    console.error('Error generando guiones:', error);
    return NextResponse.json(
      { success: false, error: 'Error generando guiones' },
      { status: 500 }
    );
  }
}

// Genera guión general de la consultoría
async function generateGeneralScript(consultation: {
  client: { name: string; company: string | null };
  initialNotes: string | null;
  orgChartData: unknown;
  meetings: Array<{ 
    title: string; 
    status: string; 
    noteVersions: Array<{ content: string }>;
  }>;
  keyPoints: Array<{ description: string; department: string }>;
  suggestedProducts: Array<{ 
    product: { name: string; descriptionPublic: string | null }; 
    matchReason: string | null;
  }>;
}): Promise<string> {
  
  // Construir contexto
  const completedMeetings = consultation.meetings.filter(m => m.status === 'COMPLETADA');
  const notesText = completedMeetings
    .map(m => m.noteVersions[0]?.content || '')
    .filter(Boolean)
    .join('\n\n');

  const keyPointsText = consultation.keyPoints
    .map(kp => `- [${kp.department}] ${kp.description}`)
    .join('\n');

  const productsText = consultation.suggestedProducts
    .map(sp => `- ${sp.product.name}: ${sp.matchReason || sp.product.descriptionPublic || ''}`)
    .join('\n');

  const prompt = `Eres un asistente para comerciales de una empresa de tecnología. 
Genera un GUIÓN GENERAL para explicar la consultoría al cliente de forma clara y no técnica.

CLIENTE: ${consultation.client.name} (${consultation.client.company || 'Sin empresa'})

NOTAS INICIALES:
${consultation.initialNotes || 'No disponibles'}

RESUMEN DE REUNIONES COMPLETADAS:
${notesText || 'Ninguna completada aún'}

PUNTOS CLAVE IDENTIFICADOS:
${keyPointsText || 'Ninguno'}

PRODUCTOS/SERVICIOS VALIDADOS:
${productsText || 'Ninguno aún'}

---

Genera un guión en español que:
1. Resuma qué necesita el cliente en términos simples
2. Explique qué soluciones se le van a proponer
3. Destaque los beneficios clave para su negocio
4. Sea conversacional y fácil de leer en voz alta
5. Máximo 300 palabras

Responde SOLO con el guión, sin títulos ni explicaciones adicionales.`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.7,
    max_tokens: 800,
  });

  return response.choices[0]?.message?.content || 'No se pudo generar el guión';
}

// Genera guión pre-reunión
async function generateMeetingScript(
  consultation: {
    client: { name: string; company: string | null };
    initialNotes: string | null;
    orgChartData: unknown;
    meetings: Array<{ 
      title: string; 
      status: string;
      department: string | null;
      attendees: string[];
      noteVersions: Array<{ content: string }>;
    }>;
    keyPoints: Array<{ description: string; department: string }>;
  },
  meeting: {
    title: string;
    department: string | null;
    attendees: string[];
  }
): Promise<{ script: string; questions: string[] }> {

  // Contexto de reuniones previas
  const completedMeetings = consultation.meetings.filter(m => m.status === 'COMPLETADA');
  const previousNotesText = completedMeetings
    .map(m => `[${m.title}]: ${m.noteVersions[0]?.content || 'Sin notas'}`)
    .join('\n\n');

  // Puntos clave del departamento relevante
  const relevantKeyPoints = meeting.department 
    ? consultation.keyPoints.filter(kp => kp.department === meeting.department)
    : consultation.keyPoints;

  const keyPointsText = relevantKeyPoints
    .map(kp => `- ${kp.description}`)
    .join('\n');

  const prompt = `Eres un asistente para comerciales de una empresa de tecnología.
Genera un GUIÓN PRE-REUNIÓN y PREGUNTAS para la siguiente reunión.

CLIENTE: ${consultation.client.name} (${consultation.client.company || 'Sin empresa'})

REUNIÓN: ${meeting.title}
DEPARTAMENTO: ${meeting.department || 'General'}
ASISTENTES: ${meeting.attendees.join(', ') || 'No especificados'}

NOTAS INICIALES DEL CLIENTE:
${consultation.initialNotes || 'No disponibles'}

NOTAS DE REUNIONES ANTERIORES:
${previousNotesText || 'Es la primera reunión'}

PUNTOS CLAVE RELEVANTES YA IDENTIFICADOS:
${keyPointsText || 'Ninguno aún'}

---

Genera:
1. UN GUIÓN BREVE (máx 150 palabras) con:
   - Objetivo de la reunión
   - Temas principales a tratar
   - Cómo abordar la conversación

2. UNA LISTA DE 5-8 PREGUNTAS específicas para hacer en esta reunión

Responde en JSON con este formato exacto:
{
  "script": "texto del guión...",
  "questions": ["pregunta 1", "pregunta 2", ...]
}`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.7,
    max_tokens: 600,
    response_format: { type: 'json_object' },
  });

  try {
    const result = JSON.parse(response.choices[0]?.message?.content || '{}');
    return {
      script: result.script || 'No se pudo generar el guión',
      questions: Array.isArray(result.questions) ? result.questions : [],
    };
  } catch {
    return {
      script: 'Error al procesar la respuesta de IA',
      questions: [],
    };
  }
}
