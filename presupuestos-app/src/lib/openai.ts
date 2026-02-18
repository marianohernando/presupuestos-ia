import OpenAI from 'openai';

if (!process.env.OPENAI_API_KEY) {
  console.warn('⚠️ OPENAI_API_KEY no está configurada. Las funciones de IA no funcionarán.');
}

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

// Configuración por defecto para las llamadas
export const AI_CONFIG = {
  model: 'gpt-4-turbo-preview',
  temperature: 0.7,
  maxTokens: 2000,
} as const;

// Tipos de tools disponibles
export const AI_TOOL_TYPES = {
  NORMALIZE_NOTES: 'normalize_notes',
  SEARCH_CATALOG: 'search_catalog',
  ESTIMATE_CUSTOM: 'estimate_custom',
  SUGGEST_PRODUCTS: 'suggest_products',
  GENERATE_QUESTIONS: 'generate_questions',
  ANALYZE_DIAGNOSTIC: 'analyze_diagnostic',
} as const;

export type AIToolType = typeof AI_TOOL_TYPES[keyof typeof AI_TOOL_TYPES];

export default openai;
