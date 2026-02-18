import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { z } from 'zod';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const analyzeNotesSchema = z.object({
  notes: z.string().min(10, 'Las notas deben tener al menos 10 caracteres'),
  clientName: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { notes, clientName } = analyzeNotesSchema.parse(body);

    const systemPrompt = `Eres un experto en análisis de proyectos de consultoría tecnológica. Tu trabajo es analizar las notas de una reunión inicial con un cliente y recomendar el tipo de proceso más adecuado.

TIPOS DE PROCESO:

1. **CONSULTORÍA** - Proceso completo y detallado:
   - Múltiples reuniones con diferentes departamentos
   - Análisis profundo del organigrama y estructura
   - Guiones personalizados por reunión
   - Ideal para: proyectos complejos, empresas grandes, múltiples stakeholders, necesidad de análisis exhaustivo
   - Duración típica: 2-4 semanas de discovery

2. **DIAGNÓSTICO** - Proceso rápido y enfocado:
   - 1-3 reuniones máximo
   - Análisis rápido de necesidades
   - Presupuesto inicial directo
   - Ideal para: proyectos simples, empresas pequeñas, necesidades claras, urgencia, presupuesto limitado
   - Duración típica: 1-3 días

CRITERIOS DE DECISIÓN:
- Complejidad del proyecto
- Tamaño de la empresa/organización
- Número de departamentos involucrados
- Claridad de los requisitos
- Urgencia del cliente
- Presupuesto disponible
- Necesidad de múltiples reuniones

Responde en formato JSON con esta estructura exacta:
{
  "recommendation": "CONSULTORIA" o "DIAGNOSTICO",
  "confidence": número del 1 al 100,
  "reasons": ["razón 1", "razón 2", "razón 3"],
  "keyInsights": ["insight 1", "insight 2"],
  "suggestedNextSteps": ["paso 1", "paso 2"],
  "warnings": ["advertencia si hay alguna"] o []
}`;

    const userPrompt = `Analiza las siguientes notas de reunión${clientName ? ` con ${clientName}` : ''} y recomienda el tipo de proceso más adecuado:

NOTAS DE LA REUNIÓN:
${notes}

Proporciona tu análisis en formato JSON.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' },
    });

    const content = completion.choices[0].message.content;
    if (!content) {
      throw new Error('No se recibió respuesta del modelo');
    }

    const analysis = JSON.parse(content);

    return NextResponse.json({
      success: true,
      data: {
        recommendation: analysis.recommendation,
        confidence: analysis.confidence,
        reasons: analysis.reasons || [],
        keyInsights: analysis.keyInsights || [],
        suggestedNextSteps: analysis.suggestedNextSteps || [],
        warnings: analysis.warnings || [],
      },
    });
  } catch (error) {
    console.error('Error analyzing notes:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Datos de entrada inválidos', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Error al analizar las notas' },
      { status: 500 }
    );
  }
}
