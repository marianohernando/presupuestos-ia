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

// GET /api/consultation/[id]/investigate
// Obtener investigaciones de incógnitas
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: consultationId } = await params;

    const investigations = await prisma.unknownInvestigation.findMany({
      where: { consultationId },
      orderBy: { createdAt: 'desc' }
    });

    // También obtener los puntos clave que son incógnitas
    const unknownKeyPoints = await prisma.keyPoint.findMany({
      where: { 
        consultationId,
        isUnknown: true 
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        investigations,
        unknownKeyPoints,
        stats: {
          totalUnknowns: unknownKeyPoints.length,
          investigated: investigations.length,
          reviewed: investigations.filter(i => i.isReviewed).length
        }
      }
    });
  } catch (error) {
    console.error('Error obteniendo investigaciones:', error);
    return NextResponse.json(
      { success: false, error: 'Error obteniendo investigaciones' },
      { status: 500 }
    );
  }
}

// POST /api/consultation/[id]/investigate
// Investigar una incógnita (producto desconocido)
const investigateSchema = z.object({
  keyPointId: z.string()
});

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: consultationId } = await params;
    const body = await request.json();
    const { keyPointId } = investigateSchema.parse(body);

    // Obtener el punto clave
    const keyPoint = await prisma.keyPoint.findFirst({
      where: { id: keyPointId, consultationId }
    });

    if (!keyPoint) {
      return NextResponse.json(
        { success: false, error: 'Punto clave no encontrado' },
        { status: 404 }
      );
    }

    // Obtener contexto de la consulta
    const consultation = await prisma.consultation.findUnique({
      where: { id: consultationId },
      include: {
        client: true,
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

    // Recopilar contexto de notas
    const notesContext = consultation.meetings
      .map(m => m.noteVersions[0]?.content || '')
      .filter(Boolean)
      .join('\n\n');

    // Usar IA para investigar y estimar
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `Eres un experto en tecnología y pricing de servicios IT. Tu trabajo es investigar productos o tecnologías desconocidas y proporcionar información útil para presupuestar.

Cuando recibas un punto clave que menciona algo no identificado:
1. Identifica qué tecnología/producto/servicio se menciona
2. Busca en tu conocimiento información sobre:
   - Qué es exactamente
   - Proveedores principales
   - Rangos de precio típicos en el mercado español
   - Complejidad de implementación
   - Alternativas si existen
3. Proporciona una estimación de precio razonable

Responde en formato JSON:
{
  "searchQuery": "Lo que investigaste",
  "findings": {
    "whatIsIt": "Descripción clara del producto/tecnología",
    "mainProviders": ["Proveedor 1", "Proveedor 2"],
    "typicalPriceRange": {
      "min": número,
      "max": número,
      "currency": "EUR",
      "basis": "proyecto|mensual|anual|hora"
    },
    "complexity": "low|medium|high",
    "implementationTime": "Tiempo estimado",
    "alternatives": ["Alternativa 1", "Alternativa 2"],
    "considerations": ["Consideración importante 1", "Consideración 2"]
  },
  "sources": ["Fuente de información 1", "Fuente 2"],
  "estimatedPrice": número (precio medio estimado para este proyecto en EUR),
  "priceReasoning": "Justificación del precio estimado"
}`
        },
        {
          role: 'user',
          content: `Investiga esta incógnita de un proyecto de consultoría:

CLIENTE: ${consultation.client.name} (${consultation.client.company || 'Sin empresa'})

INCÓGNITA A INVESTIGAR:
"${keyPoint.description}"

CONTEXTO DE LAS REUNIONES:
${notesContext || 'Sin contexto adicional'}

Proporciona información detallada y una estimación de precio realista.`
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3
    });

    const result = JSON.parse(completion.choices[0].message.content || '{}');

    // Guardar la investigación
    const investigation = await prisma.unknownInvestigation.create({
      data: {
        consultationId,
        keyPointId,
        searchQuery: result.searchQuery || keyPoint.description,
        findings: result.findings || null,
        sources: result.sources || null,
        estimatedPrice: result.estimatedPrice || null,
        priceReasoning: result.priceReasoning || null
      }
    });

    // Actualizar el punto clave con el precio estimado
    if (result.estimatedPrice) {
      await prisma.keyPoint.update({
        where: { id: keyPointId },
        data: {
          estimatedPrice: result.estimatedPrice,
          aiReasoning: result.priceReasoning
        }
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        investigation,
        findings: result.findings,
        estimatedPrice: result.estimatedPrice
      },
      message: 'Investigación completada'
    });
  } catch (error) {
    console.error('Error investigando:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Datos inválidos', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Error investigando incógnita' },
      { status: 500 }
    );
  }
}

// PATCH /api/consultation/[id]/investigate
// Marcar investigación como revisada o actualizar notas
const updateSchema = z.object({
  investigationId: z.string(),
  isReviewed: z.boolean().optional(),
  userNotes: z.string().optional(),
  adjustedPrice: z.number().optional()
});

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: consultationId } = await params;
    const body = await request.json();
    const { investigationId, isReviewed, userNotes, adjustedPrice } = updateSchema.parse(body);

    // Verificar que la investigación pertenece a esta consulta
    const investigation = await prisma.unknownInvestigation.findFirst({
      where: { id: investigationId, consultationId }
    });

    if (!investigation) {
      return NextResponse.json(
        { success: false, error: 'Investigación no encontrada' },
        { status: 404 }
      );
    }

    // Actualizar investigación
    const updated = await prisma.unknownInvestigation.update({
      where: { id: investigationId },
      data: {
        isReviewed: isReviewed ?? investigation.isReviewed,
        userNotes: userNotes ?? investigation.userNotes,
        estimatedPrice: adjustedPrice ?? investigation.estimatedPrice
      }
    });

    // Si se ajustó el precio, actualizar también el punto clave
    if (adjustedPrice !== undefined) {
      await prisma.keyPoint.update({
        where: { id: investigation.keyPointId },
        data: {
          userAdjustedPrice: adjustedPrice
        }
      });
    }

    return NextResponse.json({
      success: true,
      data: updated
    });
  } catch (error) {
    console.error('Error actualizando investigación:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Datos inválidos', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Error actualizando investigación' },
      { status: 500 }
    );
  }
}
