// ============================================
// TYPES - PresupuestosIA
// ============================================

// Enums (mirror de Prisma para uso en cliente)
export type FlowType = 'CONSULTORIA' | 'DIAGNOSTICO';

export type ClientStatus = 
  | 'NUEVO' 
  | 'EN_PROCESO' 
  | 'PENDIENTE_CONSULTORIA'
  | 'PRESUPUESTADO' 
  | 'CERRADO' 
  | 'ARCHIVADO';

export type BudgetStatus = 
  | 'BORRADOR' 
  | 'ENVIADO' 
  | 'ACEPTADO' 
  | 'RECHAZADO' 
  | 'EXPIRADO';

export type DiagnosticRecommendation = 
  | 'PILOTO' 
  | 'DESARROLLO_COMPLETO' 
  | 'PIVOTAR_CONSULTORIA';

// ============================================
// Entidades principales
// ============================================

export interface Client {
  id: string;
  name: string;
  company?: string | null;
  email?: string | null;
  phone?: string | null;
  notes?: string | null;
  flowType?: FlowType | null;
  status: ClientStatus;
  createdAt: Date;
  updatedAt: Date;
  budgets?: Budget[];
  consultations?: Consultation[];
  diagnostics?: Diagnostic[];
}

export interface Product {
  id: string;
  name: string;
  descriptionPublic?: string | null;
  descriptionInternal?: string | null;
  price: number;
  cost?: number | null;
  estimatedHours?: number | null;
  tags: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Budget {
  id: string;
  clientId: string;
  client?: Client;
  version: number;
  status: BudgetStatus;
  summary?: string | null;
  scope?: string | null;
  assumptions?: string | null;
  risks?: string | null;
  validUntil?: Date | null;
  subtotal: number;
  discount: number;
  taxes: number;
  total: number;
  maintenanceTokens?: number | null;
  maintenanceHours?: number | null;
  maintenanceMonthly?: number | null;
  createdAt: Date;
  updatedAt: Date;
  items?: BudgetItem[];
}

export interface BudgetItem {
  id: string;
  budgetId: string;
  productId?: string | null;
  product?: Product | null;
  name: string;
  description?: string | null;
  quantity: number;
  unitPrice: number;
  hoursMin?: number | null;
  hoursMed?: number | null;
  hoursMax?: number | null;
  assumptions?: string | null;
  risks?: string | null;
  aiGenerated: boolean;
  aiReasoning?: string | null;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Consultation {
  id: string;
  clientId: string;
  isCompleted: boolean;
  amount?: number | null;
  invoiceGenerated: boolean;
  rawNotes?: string | null;
  normalizedBrief?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Diagnostic {
  id: string;
  clientId: string;
  isCompleted: boolean;
  rawNotes?: string | null;
  recommendation?: DiagnosticRecommendation | null;
  aiAnalysis?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// DTOs para API
// ============================================

export interface CreateClientDTO {
  name: string;
  company?: string;
  email?: string;
  phone?: string;
  notes?: string;
}

export interface UpdateClientDTO extends Partial<CreateClientDTO> {
  flowType?: FlowType;
  status?: ClientStatus;
}

export interface CreateProductDTO {
  name: string;
  descriptionPublic?: string;
  descriptionInternal?: string;
  price: number;
  cost?: number;
  estimatedHours?: number;
  tags?: string[];
}

export interface CreateBudgetItemDTO {
  productId?: string;
  name: string;
  description?: string;
  quantity?: number;
  unitPrice: number;
  hoursMin?: number;
  hoursMed?: number;
  hoursMax?: number;
  assumptions?: string;
  risks?: string;
  aiGenerated?: boolean;
  aiReasoning?: string;
}

