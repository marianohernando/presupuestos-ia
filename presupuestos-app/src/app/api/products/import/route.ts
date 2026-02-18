import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { successResponse, errorResponse, handleApiError, parseBody } from '@/lib/api-utils';
import { z } from 'zod';

// Schema para productos importados
const importProductSchema = z.object({
  name: z.string().min(1),
  internalReference: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  descriptionPublic: z.string().nullable().optional(),
  descriptionInternal: z.string().nullable().optional(),
  price: z.number().min(0),
  cost: z.number().nullable().optional(),
  estimatedHours: z.number().nullable().optional(),
  unitOfMeasure: z.string().nullable().optional(),
  tags: z.array(z.string()).default([]),
});

const importRequestSchema = z.object({
  products: z.array(importProductSchema),
  updateExisting: z.boolean().default(false),
});

type ImportRequest = z.infer<typeof importRequestSchema>;

// POST /api/products/import - Importar productos en batch
export async function POST(request: NextRequest) {
  try {
    const body = await parseBody<ImportRequest>(request);
    const { products, updateExisting } = importRequestSchema.parse(body);

    const results = {
      created: 0,
      updated: 0,
      skipped: 0,
      errors: [] as { name: string; error: string }[],
    };

    for (const productData of products) {
      try {
        // Buscar si ya existe por referencia interna
        let existing = null;
        if (productData.internalReference) {
          existing = await prisma.product.findUnique({
            where: { internalReference: productData.internalReference },
          });
        }

        if (existing) {
          if (updateExisting) {
            // Actualizar existente
            await prisma.product.update({
              where: { id: existing.id },
              data: {
                name: productData.name,
                category: productData.category,
                descriptionPublic: productData.descriptionPublic,
                descriptionInternal: productData.descriptionInternal,
                price: productData.price,
                cost: productData.cost,
                estimatedHours: productData.estimatedHours,
                unitOfMeasure: productData.unitOfMeasure,
                tags: productData.tags,
              },
            });
            results.updated++;
          } else {
            results.skipped++;
          }
        } else {
          // Crear nuevo
          await prisma.product.create({
            data: {
              name: productData.name,
              internalReference: productData.internalReference,
              category: productData.category,
              descriptionPublic: productData.descriptionPublic,
              descriptionInternal: productData.descriptionInternal,
              price: productData.price,
              cost: productData.cost,
              estimatedHours: productData.estimatedHours,
              unitOfMeasure: productData.unitOfMeasure,
              tags: productData.tags,
            },
          });
          results.created++;
        }
      } catch (error) {
        results.errors.push({
          name: productData.name,
          error: error instanceof Error ? error.message : 'Error desconocido',
        });
      }
    }

    return successResponse({
      message: `Importación completada: ${results.created} creados, ${results.updated} actualizados, ${results.skipped} omitidos`,
      ...results,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
