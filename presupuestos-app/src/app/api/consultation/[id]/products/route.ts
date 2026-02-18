import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// GET: Obtener productos sugeridos para una consulta
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const suggestedProducts = await prisma.suggestedProduct.findMany({
      where: { consultationId: id },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            category: true,
            descriptionPublic: true,
            price: true,
            tags: true,
          },
        },
        keyPoints: {
          select: {
            id: true,
            description: true,
            department: true,
          },
        },
      },
      orderBy: [
        { isValidated: 'desc' },
        { confidence: 'desc' },
      ],
    });

    return NextResponse.json({
      success: true,
      data: suggestedProducts,
    });
  } catch (error) {
    console.error('Error obteniendo productos sugeridos:', error);
    return NextResponse.json(
      { success: false, error: 'Error obteniendo productos sugeridos' },
      { status: 500 }
    );
  }
}

// POST: Generar sugerencias de productos basadas en KeyPoints
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Verificar consulta existe
    const consultation = await prisma.consultation.findUnique({
      where: { id },
      include: {
        client: true,
      },
    });

    if (!consultation) {
      return NextResponse.json(
        { success: false, error: 'Consulta no encontrada' },
        { status: 404 }
      );
    }

    // Obtener puntos clave pendientes (sin producto asignado)
    const keyPoints = await prisma.keyPoint.findMany({
      where: {
        meeting: { consultationId: id },
        suggestedProductId: null,
      },
      include: {
        meeting: true,
      },
    });

    if (keyPoints.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No hay puntos clave pendientes de matching',
        data: [],
      });
    }

    // Obtener productos activos del catálogo
    const products = await prisma.product.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        category: true,
        descriptionPublic: true,
        descriptionInternal: true,
        price: true,
        tags: true,
      },
    });

    if (products.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No hay productos en el catálogo',
      }, { status: 400 });
    }

    // Construir prompt para IA
    const keyPointsList = keyPoints.map((kp: { id: string; department: string; description: string }) => 
      `- [${kp.id}] (${kp.department}): ${kp.description}`
    ).join('\n');

    const productsList = products.map(p => 
      `- [${p.id}] ${p.name} | ${p.category || 'Sin categoría'} | ${Number(p.price)}€
  Descripción: ${p.descriptionPublic || p.descriptionInternal || 'Sin descripción'}
  Tags: ${p.tags.join(', ') || 'ninguno'}`
    ).join('\n\n');

    const systemPrompt = `Eres un experto en matching de productos con necesidades de clientes.
Tu tarea es analizar los puntos clave de las reuniones y sugerir productos del catálogo que los resuelvan.

REGLAS:
1. Solo sugiere productos que realmente resuelvan la necesidad del punto clave
2. Un producto puede resolver múltiples puntos clave
3. La confianza debe ser entre 0.0 y 1.0 (usa > 0.7 solo si es muy relevante)
4. Explica brevemente por qué cada producto resuelve los puntos
5. Si un punto no tiene producto adecuado, NO lo incluyas

Responde en JSON:
{
  "suggestions": [
    {
      "productId": "id_del_producto",
      "keyPointIds": ["id_punto1", "id_punto2"],
      "confidence": 0.85,
      "matchReason": "Este producto resuelve la necesidad porque..."
    }
  ]
}`;

    const userPrompt = `## CONTEXTO
Cliente: ${consultation.client.name} (${consultation.client.company || 'Sin empresa'})
Tipo de consulta: ${consultation.client.flowType || 'CONSULTORIA'}

## PUNTOS CLAVE A RESOLVER:
${keyPointsList}

## CATÁLOGO DE PRODUCTOS DISPONIBLES:
${productsList}

Analiza y sugiere los mejores productos para resolver estos puntos clave.`;

    // Llamar a OpenAI
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    });

    const response = completion.choices[0]?.message?.content || '{}';
    const parsed = JSON.parse(response);

    // Validar IDs
    const validProductIds = new Set(products.map(p => p.id));
    const validKeyPointIds = new Set(keyPoints.map((kp: { id: string }) => kp.id));

    // Crear sugerencias en DB
    const createdSuggestions = [];

    for (const suggestion of (parsed.suggestions || [])) {
      // Validar productId
      if (!validProductIds.has(suggestion.productId)) {
        console.warn(`[Products] productId inválido: ${suggestion.productId}`);
        continue;
      }

      // Validar keyPointIds
      const validKeyPoints = (suggestion.keyPointIds || []).filter(
        (kpId: string) => validKeyPointIds.has(kpId)
      );

      if (validKeyPoints.length === 0) {
        continue;
      }

      // Verificar si ya existe sugerencia para este producto
      const existing = await prisma.suggestedProduct.findUnique({
        where: {
          consultationId_productId: {
            consultationId: id,
            productId: suggestion.productId,
          },
        },
      });

      if (existing) {
        // Actualizar keyPoints asociados
        for (const kpId of validKeyPoints) {
          await prisma.keyPoint.update({
            where: { id: kpId },
            data: {
              suggestedProductId: existing.id,
              matchConfidence: suggestion.confidence,
            },
          });
        }
        createdSuggestions.push(existing);
      } else {
        // Crear nueva sugerencia
        const newSuggestion = await prisma.suggestedProduct.create({
          data: {
            consultationId: id,
            productId: suggestion.productId,
            matchReason: suggestion.matchReason || 'Match automático por IA',
            confidence: suggestion.confidence || 0.5,
          },
          include: {
            product: true,
          },
        });

        // Asociar keyPoints
        for (const kpId of validKeyPoints) {
          await prisma.keyPoint.update({
            where: { id: kpId },
            data: {
              suggestedProductId: newSuggestion.id,
              matchConfidence: suggestion.confidence,
            },
          });
        }

        createdSuggestions.push(newSuggestion);
      }
    }

    // Log action
    await prisma.aIAction.create({
      data: {
        type: 'consultation_product_matching',
        input: JSON.parse(JSON.stringify({ 
          consultationId: id,
          keyPointsCount: keyPoints.length,
          productsCount: products.length,
        })),
        output: JSON.parse(JSON.stringify(parsed)),
        model: 'gpt-4o-mini',
        tokens: completion.usage?.total_tokens || 0,
        duration: 0,
        clientId: consultation.clientId,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Se crearon ${createdSuggestions.length} sugerencias de productos`,
      data: createdSuggestions,
    });
  } catch (error) {
    console.error('Error generando sugerencias:', error);
    return NextResponse.json(
      { success: false, error: 'Error generando sugerencias de productos' },
      { status: 500 }
    );
  }
}

// PATCH: Validar o rechazar un producto sugerido
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { suggestedProductId, action, rejectionReason } = body;

    if (!suggestedProductId || !action) {
      return NextResponse.json(
        { success: false, error: 'suggestedProductId y action son requeridos' },
        { status: 400 }
      );
    }

    if (!['validate', 'reject'].includes(action)) {
      return NextResponse.json(
        { success: false, error: 'action debe ser "validate" o "reject"' },
        { status: 400 }
      );
    }

    // Verificar que el producto pertenece a esta consulta
    const suggestedProduct = await prisma.suggestedProduct.findFirst({
      where: {
        id: suggestedProductId,
        consultationId: id,
      },
    });

    if (!suggestedProduct) {
      return NextResponse.json(
        { success: false, error: 'Producto sugerido no encontrado' },
        { status: 404 }
      );
    }

    // Actualizar estado
    const updated = await prisma.suggestedProduct.update({
      where: { id: suggestedProductId },
      data: {
        isValidated: action === 'validate',
        isRejected: action === 'reject',
        rejectionReason: action === 'reject' ? rejectionReason : null,
      },
      include: {
        product: true,
        keyPoints: true,
      },
    });

    // Si se valida, actualizar estado de los keyPoints asociados
    if (action === 'validate') {
      await prisma.keyPoint.updateMany({
        where: { suggestedProductId },
        data: {
          isValidated: true,
          status: 'VALIDATED',
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    console.error('Error actualizando producto sugerido:', error);
    return NextResponse.json(
      { success: false, error: 'Error actualizando producto sugerido' },
      { status: 500 }
    );
  }
}
