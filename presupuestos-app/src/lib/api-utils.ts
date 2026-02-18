import { NextResponse } from 'next/server';
import { z } from 'zod';

// Tipos de respuesta estándar
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  details?: unknown;
}

// Respuesta exitosa
export function successResponse<T>(data: T, status = 200) {
  return NextResponse.json<ApiResponse<T>>(
    { success: true, data },
    { status }
  );
}

// Respuesta de error
export function errorResponse(
  message: string,
  status = 400,
  details?: unknown
) {
  return NextResponse.json<ApiResponse>(
    { success: false, error: message, details },
    { status }
  );
}

// Manejador de errores genérico
export function handleApiError(error: unknown) {
  console.error('API Error:', error);

  if (error instanceof z.ZodError) {
    return errorResponse(
      'Datos de entrada inválidos',
      400,
      error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }))
    );
  }

  if (error instanceof Error) {
    return errorResponse(error.message, 500);
  }

  return errorResponse('Error interno del servidor', 500);
}

// Validar que el body existe
export async function parseBody<T>(request: Request): Promise<T> {
  try {
    return await request.json();
  } catch {
    throw new Error('El cuerpo de la petición no es JSON válido');
  }
}
