'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Building2, 
  Users, 
  FileText, 
  Package, 
  MessageSquare, 
  Calculator,
  RefreshCw,
  Plus,
  ChevronRight,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Clock,
  Target,
  HelpCircle,
  Search,
  Lightbulb
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

// Tipos
interface Client {
  id: string;
  name: string;
  company?: string;
  email?: string;
  notes?: string;
  flowType?: 'CONSULTORIA' | 'DIAGNOSTICO';
  status: string;
}

interface Meeting {
  id: string;
  title: string;
  status: 'SUGERIDA' | 'PENDIENTE' | 'PROGRAMADA' | 'COMPLETADA' | 'CANCELADA';
  department?: string;
  attendees: string[];
  suggestedByAI: boolean;
  noteVersions: { version: number; content: string; createdAt: string }[];
  _count: { keyPoints: number };
  script?: string;
  questionsToAsk?: string[];
}

interface KeyPoint {
  id: string;
  description: string;
  department: string;
  priority: number;
  status: string;
  isValidated: boolean;
  isUnknown: boolean;
  meetingId?: string;
  estimatedPrice?: number | string;
  userAdjustedPrice?: number | string;
  aiReasoning?: string;
}

interface SuggestedProduct {
  id: string;
  productId: string;
  product: {
    name: string;
    description?: string;
    category?: string;
    price: number;
    tags?: string[];
  };
  matchReason: string;
  confidence: number;
  isValidated: boolean;
  isRejected: boolean;
  keyPoints?: {
    id: string;
    description: string;
    department?: string;
  }[];
}

interface Consultation {
  id: string;
  clientId: string;
  type: 'CONSULTORIA' | 'DIAGNOSTICO';
  status: 'EN_PROGRESO' | 'LISTO_PRESUPUESTO' | 'PRESUPUESTADO' | 'ARCHIVADO';
  orgChartFileUrl?: string;
  orgChartFileName?: string;
  orgChartData?: Record<string, unknown>;
  generalScript?: string;
  initialNotes?: string;
  executiveSummary?: string;
  meetings: Meeting[];
  keyPoints: KeyPoint[];
  suggestedProducts: SuggestedProduct[];
  createdAt: string;
  updatedAt: string;
}

type TabType = 'orgchart' | 'meetings' | 'keypoints' | 'products' | 'clarify' | 'scripts' | 'budget';

// Componente principal
export default function ConsultationDashboard() {
  const params = useParams();
  const clientId = params.id as string;

  // Estado
  const [client, setClient] = useState<Client | null>(null);
  const [consultation, setConsultation] = useState<Consultation | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('meetings');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Estado para crear nueva consulta
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [newConsultationType, setNewConsultationType] = useState<'CONSULTORIA' | 'DIAGNOSTICO'>('CONSULTORIA');
  const [initialNotes, setInitialNotes] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  
  // Estado para análisis de IA
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiRecommendation, setAiRecommendation] = useState<{
    recommendation: 'CONSULTORIA' | 'DIAGNOSTICO';
    confidence: number;
    reasons: string[];
    keyInsights: string[];
    suggestedNextSteps: string[];
    warnings: string[];
  } | null>(null);

  // Estado para gestión de reuniones
  const [showMeetingDialog, setShowMeetingDialog] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [newMeetingTitle, setNewMeetingTitle] = useState('');
  const [newMeetingDepartment, setNewMeetingDepartment] = useState<string>('');
  const [newMeetingAttendees, setNewMeetingAttendees] = useState('');
  const [newMeetingNotes, setNewMeetingNotes] = useState('');
  const [isCreatingMeeting, setIsCreatingMeeting] = useState(false);
  const [isExtractingKeyPoints, setIsExtractingKeyPoints] = useState(false);

  // Estado para organigrama
  const [orgChartDescription, setOrgChartDescription] = useState('');
  const [isProcessingOrgChart, setIsProcessingOrgChart] = useState(false);

  // Estado para productos
  const [isMatchingProducts, setIsMatchingProducts] = useState(false);

  // Estado para guiones
  const [isGeneratingScripts, setIsGeneratingScripts] = useState(false);

  // Estado para presupuesto
  const [isGeneratingBudget, setIsGeneratingBudget] = useState(false);
  const [budgetGenerated, setBudgetGenerated] = useState<{
    id: string;
    subtotal: number;
    discount: number;
    taxes: number;
    total: number;
    items: Array<{ name: string; unitPrice: number; quantity: number }>;
  } | null>(null);
  const [maintenanceType, setMaintenanceType] = useState<string>('');

  // Estado para clarificación
  const [clarificationQuestions, setClarificationQuestions] = useState<Array<{
    id: string;
    question: string;
    context?: string;
    suggestedAnswers: string[];
    priority: string;
    impactArea?: string;
    answer?: string;
    isAnswered: boolean;
  }>>([]);
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false);
  const [isAnsweringQuestion, setIsAnsweringQuestion] = useState<string | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string>('');
  const [customAnswer, setCustomAnswer] = useState<string>('');

  // Cargar datos
  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Cargar cliente
      const clientRes = await fetch(`/api/clients/${clientId}`);
      const clientData = await clientRes.json();
      
      if (!clientRes.ok || !clientData.success) {
        throw new Error(clientData.error || 'Error cargando cliente');
      }
      
      setClient(clientData.data);

      // Cargar consulta existente
      const consultationRes = await fetch(`/api/consultation?clientId=${clientId}`);
      const consultationData = await consultationRes.json();
      
      if (consultationRes.ok && consultationData.data) {
        setConsultation(consultationData.data);
        
        // Cargar preguntas de clarificación existentes
        try {
          const clarifyRes = await fetch(`/api/consultation/${consultationData.data.id}/clarify`);
          const clarifyData = await clarifyRes.json();
          if (clarifyRes.ok && clarifyData.success && clarifyData.data.questions) {
            setClarificationQuestions(clarifyData.data.questions);
          }
        } catch (clarifyErr) {
          console.error('Error cargando preguntas:', clarifyErr);
        }
      } else {
        setConsultation(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setIsLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Efecto para leer notas de sessionStorage y analizar con IA
  useEffect(() => {
    const analyzeStoredNotes = async () => {
      // Solo analizar si no hay consulta existente y hay notas guardadas
      if (consultation || isLoading) return;
      
      const storedNotes = sessionStorage.getItem(`initialNotes_${clientId}`);
      if (!storedNotes) return;
      
      // Guardar notas en el estado
      setInitialNotes(storedNotes);
      
      // Llamar a la API de análisis
      setIsAnalyzing(true);
      try {
        const res = await fetch('/api/consultation/analyze-notes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            notes: storedNotes,
            clientName: client?.name 
          })
        });
        
        const data = await res.json();
        
        if (res.ok && data.success) {
          setAiRecommendation(data.data);
          setNewConsultationType(data.data.recommendation);
        }
      } catch (err) {
        console.error('Error analyzing notes:', err);
      } finally {
        setIsAnalyzing(false);
        // Limpiar sessionStorage después de usar
        sessionStorage.removeItem(`initialNotes_${clientId}`);
      }
    };
    
    analyzeStoredNotes();
  }, [consultation, isLoading, clientId, client?.name]);

  // Crear nueva consulta
  const handleCreateConsultation = async () => {
    setIsCreating(true);
    
    try {
      const res = await fetch('/api/consultation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          type: newConsultationType,
          initialNotes: initialNotes || undefined
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Error creando consulta');
      }

      setShowNewDialog(false);
      setInitialNotes('');
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error creando consulta');
    } finally {
      setIsCreating(false);
    }
  };

  // Crear nueva reunión
  const handleCreateMeeting = async () => {
    if (!consultation || !newMeetingTitle.trim()) return;
    
    setIsCreatingMeeting(true);
    
    try {
      const res = await fetch(`/api/consultation/${consultation.id}/meetings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newMeetingTitle.trim(),
          department: newMeetingDepartment || undefined,
          attendees: newMeetingAttendees.split(',').map(a => a.trim()).filter(Boolean),
          initialNotes: newMeetingNotes.trim() || undefined
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Error creando reunión');
      }

      // Limpiar formulario y cerrar dialog
      setNewMeetingTitle('');
      setNewMeetingDepartment('');
      setNewMeetingAttendees('');
      setNewMeetingNotes('');
      setShowMeetingDialog(false);
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error creando reunión');
    } finally {
      setIsCreatingMeeting(false);
    }
  };

  // Extraer puntos clave de una reunión
  const handleExtractKeyPoints = async (meetingId: string) => {
    if (!consultation) return;
    
    setIsExtractingKeyPoints(true);
    
    try {
      const res = await fetch(`/api/consultation/${consultation.id}/keypoints`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meetingId })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Error extrayendo puntos clave');
      }

      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error extrayendo puntos clave');
    } finally {
      setIsExtractingKeyPoints(false);
    }
  };

  // Abrir reunión para ver detalles
  const handleOpenMeeting = (meeting: Meeting) => {
    setSelectedMeeting(meeting);
    setNewMeetingNotes(meeting.noteVersions[0]?.content || '');
    setShowMeetingDialog(true);
  };

  // Guardar notas de reunión
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  
  const handleSaveNotes = async () => {
    if (!consultation || !selectedMeeting || !newMeetingNotes.trim()) return;
    
    setIsSavingNotes(true);
    
    try {
      const res = await fetch(`/api/consultation/${consultation.id}/meetings/${selectedMeeting.id}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newMeetingNotes })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Error guardando notas');
      }

      // Recargar datos para actualizar la reunión
      loadData();
      setShowMeetingDialog(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error guardando notas');
    } finally {
      setIsSavingNotes(false);
    }
  };

  // Procesar organigrama con IA
  const handleProcessOrgChart = async () => {
    if (!consultation || !orgChartDescription.trim()) return;
    
    setIsProcessingOrgChart(true);
    
    try {
      const res = await fetch(`/api/consultation/${consultation.id}/orgchart`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: orgChartDescription })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Error procesando organigrama');
      }

      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error procesando organigrama');
    } finally {
      setIsProcessingOrgChart(false);
    }
  };

  // Generar sugerencias de productos con IA
  const handleMatchProducts = async () => {
    if (!consultation) return;
    
    setIsMatchingProducts(true);
    
    try {
      const res = await fetch(`/api/consultation/${consultation.id}/products`, {
        method: 'POST',
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Error generando sugerencias');
      }

      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error generando sugerencias');
    } finally {
      setIsMatchingProducts(false);
    }
  };

  // Validar o rechazar producto sugerido
  const handleProductAction = async (suggestedProductId: string, action: 'validate' | 'reject') => {
    if (!consultation) return;
    
    try {
      const res = await fetch(`/api/consultation/${consultation.id}/products`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ suggestedProductId, action }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Error actualizando producto');
      }

      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error actualizando producto');
    }
  };

  // Generar presupuesto
  const handleGenerateBudget = async () => {
    if (!consultation) return;

    setIsGeneratingBudget(true);
    try {
      const res = await fetch(`/api/consultation/${consultation.id}/budget`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          maintenanceType: maintenanceType || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error generando presupuesto');

      setBudgetGenerated({
        id: data.data.budget.id,
        subtotal: data.data.summary.subtotal,
        discount: data.data.summary.discount,
        taxes: data.data.summary.taxes,
        total: data.data.summary.total,
        items: data.data.budget.items,
      });

      // Recargar datos
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error generando presupuesto');
    } finally {
      setIsGeneratingBudget(false);
    }
  };

  // Generar guiones con IA
  const handleGenerateScripts = async (type: 'general' | 'meeting' | 'all' = 'all') => {
    if (!consultation) return;

    setIsGeneratingScripts(true);
    try {
      const res = await fetch(`/api/consultation/${consultation.id}/scripts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error generando guiones');

      // Recargar datos para ver guiones actualizados
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error generando guiones');
    } finally {
      setIsGeneratingScripts(false);
    }
  };

  // Estadísticas rápidas
  const stats = consultation ? {
    totalMeetings: consultation.meetings.length,
    completedMeetings: consultation.meetings.filter(m => m.status === 'COMPLETADA').length,
    totalKeyPoints: consultation.keyPoints.length,
    validatedKeyPoints: consultation.keyPoints.filter(p => p.isValidated).length,
    totalProducts: consultation.suggestedProducts.length,
    validatedProducts: consultation.suggestedProducts.filter(p => p.isValidated).length,
  } : null;

  // Estado del proceso
  const getStatusBadge = (status: string) => {
    const configs: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      'EN_PROGRESO': { label: 'En Progreso', variant: 'default' },
      'LISTO_PRESUPUESTO': { label: 'Listo para Presupuesto', variant: 'secondary' },
      'PRESUPUESTADO': { label: 'Presupuestado', variant: 'outline' },
      'ARCHIVADO': { label: 'Archivado', variant: 'destructive' }
    };
    const config = configs[status] || { label: status, variant: 'default' as const };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  // Loading
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-500" />
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  // Error
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-lg font-semibold mb-2">Error</h2>
              <p className="text-muted-foreground mb-4">{error}</p>
              <Button onClick={loadData}>Reintentar</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // No hay cliente
  if (!client) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
              <h2 className="text-lg font-semibold mb-2">Cliente no encontrado</h2>
              <Link href="/clients">
                <Button>Volver a clientes</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // No hay consulta - mostrar opción de crear
  if (!consultation) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b sticky top-0 z-10">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center gap-4">
              <Link href={`/clients/${clientId}`}>
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Volver
                </Button>
              </Link>
              <div>
                <h1 className="text-xl font-semibold">{client.name}</h1>
                {client.company && (
                  <p className="text-sm text-muted-foreground">{client.company}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Contenido */}
        <div className="container mx-auto px-4 py-8">
          {/* Loading de análisis */}
          {isAnalyzing && (
            <Card className="max-w-2xl mx-auto mb-6">
              <CardContent className="py-12">
                <div className="flex flex-col items-center gap-4">
                  <Loader2 className="h-12 w-12 animate-spin text-primary" />
                  <div className="text-center">
                    <p className="font-medium">Analizando notas con IA...</p>
                    <p className="text-sm text-muted-foreground">
                      Determinando el tipo de proceso más adecuado
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recomendación de IA */}
          {!isAnalyzing && aiRecommendation && (
            <Card className="max-w-2xl mx-auto mb-6 border-2 border-primary/20 bg-primary/5">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Target className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Recomendación de la IA</CardTitle>
                    <CardDescription>
                      Basada en el análisis de las notas de tu reunión
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Tipo recomendado */}
                <div className="flex items-center justify-between p-4 rounded-lg bg-white border">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                      aiRecommendation.recommendation === 'CONSULTORIA' 
                        ? 'bg-blue-100' 
                        : 'bg-green-100'
                    }`}>
                      {aiRecommendation.recommendation === 'CONSULTORIA' ? (
                        <Users className={`h-6 w-6 text-blue-600`} />
                      ) : (
                        <Target className={`h-6 w-6 text-green-600`} />
                      )}
                    </div>
                    <div>
                      <p className="font-semibold text-lg">
                        {aiRecommendation.recommendation === 'CONSULTORIA' ? 'Consultoría' : 'Diagnóstico'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Confianza: {aiRecommendation.confidence}%
                      </p>
                    </div>
                  </div>
                  <Badge variant={aiRecommendation.recommendation === 'CONSULTORIA' ? 'default' : 'secondary'}>
                    Recomendado
                  </Badge>
                </div>

                {/* Razones */}
                <div>
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    ¿Por qué esta recomendación?
                  </h4>
                  <ul className="space-y-2">
                    {aiRecommendation.reasons.map((reason, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm">
                        <ChevronRight className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                        <span>{reason}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Insights clave */}
                {aiRecommendation.keyInsights.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-blue-600" />
                      Puntos clave identificados
                    </h4>
                    <ul className="space-y-1">
                      {aiRecommendation.keyInsights.map((insight, idx) => (
                        <li key={idx} className="text-sm text-muted-foreground">
                          • {insight}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Advertencias */}
                {aiRecommendation.warnings.length > 0 && (
                  <div className="p-3 rounded-lg bg-yellow-50 border border-yellow-200">
                    <h4 className="font-medium text-yellow-800 mb-1">Consideraciones</h4>
                    <ul className="space-y-1">
                      {aiRecommendation.warnings.map((warning, idx) => (
                        <li key={idx} className="text-sm text-yellow-700">
                          ⚠️ {warning}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Selección de tipo */}
          {!isAnalyzing && (
            <Card className="max-w-2xl mx-auto">
              <CardHeader className="text-center">
                <CardTitle className="text-2xl">
                  {aiRecommendation ? 'Confirma el tipo de proceso' : 'Iniciar Nuevo Proceso'}
                </CardTitle>
                <CardDescription>
                  {aiRecommendation 
                    ? 'Puedes aceptar la recomendación o elegir otro tipo de proceso'
                    : `Selecciona el tipo de proceso para comenzar a trabajar con ${client.name}`
                  }
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4">
                  {/* Consultoría */}
                  <Card 
                    className={`cursor-pointer transition-all ${
                      aiRecommendation?.recommendation === 'CONSULTORIA'
                        ? 'border-2 border-blue-500 ring-2 ring-blue-100'
                        : 'hover:border-blue-500'
                    }`}
                    onClick={() => {
                      setNewConsultationType('CONSULTORIA');
                      setShowNewDialog(true);
                    }}
                  >
                    <CardContent className="pt-6">
                      <div className="text-center">
                        {aiRecommendation?.recommendation === 'CONSULTORIA' && (
                          <Badge className="mb-2 bg-blue-600">✨ Recomendado</Badge>
                        )}
                        <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-4">
                          <Users className="h-8 w-8 text-blue-600" />
                        </div>
                        <h3 className="font-semibold text-lg mb-2">Consultoría</h3>
                        <p className="text-sm text-muted-foreground">
                          Proceso completo con múltiples reuniones, organigrama y análisis detallado
                        </p>
                        <div className="mt-4 text-xs text-muted-foreground">
                          <p>• Múltiples reuniones</p>
                          <p>• Organigrama de empresa</p>
                          <p>• Guiones personalizados</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Diagnóstico */}
                  <Card 
                    className={`cursor-pointer transition-all ${
                      aiRecommendation?.recommendation === 'DIAGNOSTICO'
                        ? 'border-2 border-green-500 ring-2 ring-green-100'
                        : 'hover:border-green-500'
                    }`}
                    onClick={() => {
                      setNewConsultationType('DIAGNOSTICO');
                      setShowNewDialog(true);
                    }}
                  >
                    <CardContent className="pt-6">
                      <div className="text-center">
                        {aiRecommendation?.recommendation === 'DIAGNOSTICO' && (
                          <Badge className="mb-2 bg-green-600">✨ Recomendado</Badge>
                        )}
                        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                          <Target className="h-8 w-8 text-green-600" />
                        </div>
                        <h3 className="font-semibold text-lg mb-2">Diagnóstico</h3>
                        <p className="text-sm text-muted-foreground">
                          Proceso rápido con 1-3 reuniones para análisis inicial
                        </p>
                        <div className="mt-4 text-xs text-muted-foreground">
                          <p>• 1-3 reuniones</p>
                          <p>• Análisis rápido</p>
                          <p>• Presupuesto inicial</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Dialog para crear */}
        <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
          <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
            <DialogHeader className="flex-shrink-0">
              <DialogTitle>
                Nueva {newConsultationType === 'CONSULTORIA' ? 'Consultoría' : 'Diagnóstico'}
              </DialogTitle>
              <DialogDescription>
                Introduce las notas de la primera reunión para comenzar
              </DialogDescription>
            </DialogHeader>
            
            <div className="py-4 flex-1 min-h-0 flex flex-col">
              <label className="text-sm font-medium mb-2 block flex-shrink-0">
                Notas de la primera reunión (opcional)
              </label>
              <Textarea
                placeholder="Pega aquí las notas de tu primera reunión con el cliente..."
                value={initialNotes}
                onChange={(e) => setInitialNotes(e.target.value)}
                className="font-mono text-sm flex-1 min-h-[200px] max-h-[400px] resize-none"
              />
              <p className="text-xs text-muted-foreground mt-2 flex-shrink-0">
                Puedes añadir las notas ahora o más tarde
              </p>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowNewDialog(false)}>
                Cancelar
              </Button>
              <Button onClick={handleCreateConsultation} disabled={isCreating}>
                {isCreating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creando...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Crear {newConsultationType === 'CONSULTORIA' ? 'Consultoría' : 'Diagnóstico'}
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Dashboard principal con consulta existente
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header fijo */}
      <header className="bg-white border-b sticky top-0 z-20">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href={`/clients/${clientId}`}>
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Volver
                </Button>
              </Link>
              <div className="h-6 w-px bg-gray-200" />
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-semibold">{client.name}</h1>
                  <Badge variant={consultation.type === 'CONSULTORIA' ? 'default' : 'secondary'}>
                    {consultation.type}
                  </Badge>
                  {getStatusBadge(consultation.status)}
                </div>
                {client.company && (
                  <p className="text-sm text-muted-foreground">{client.company}</p>
                )}
              </div>
            </div>

            <Button variant="outline" onClick={loadData}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Actualizar con IA
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-4 border-t">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabType)}>
            <TabsList className="h-12 bg-transparent border-none">
              {/* Organigrama solo para Consultoría */}
              {consultation.type === 'CONSULTORIA' && (
                <TabsTrigger 
                  value="orgchart" 
                  className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-blue-500 rounded-none"
                >
                  <Building2 className="h-4 w-4 mr-2" />
                  Organigrama
                </TabsTrigger>
              )}
              <TabsTrigger 
                value="meetings"
                className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-blue-500 rounded-none"
              >
                <Users className="h-4 w-4 mr-2" />
                Reuniones
                {stats && (
                  <Badge variant="secondary" className="ml-2">
                    {stats.completedMeetings}/{stats.totalMeetings}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger 
                value="keypoints"
                className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-blue-500 rounded-none"
              >
                <FileText className="h-4 w-4 mr-2" />
                Puntos Clave
                {stats && (
                  <Badge variant="secondary" className="ml-2">
                    {stats.totalKeyPoints}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger 
                value="products"
                className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-blue-500 rounded-none"
              >
                <Package className="h-4 w-4 mr-2" />
                Productos
                {stats && (
                  <Badge variant="secondary" className="ml-2">
                    {stats.validatedProducts}/{stats.totalProducts}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger 
                value="clarify"
                className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-blue-500 rounded-none"
              >
                <HelpCircle className="h-4 w-4 mr-2" />
                Clarificación
                {clarificationQuestions.length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {clarificationQuestions.filter(q => !q.isAnswered).length}
                  </Badge>
                )}
              </TabsTrigger>
              {/* Guiones solo para Consultoría */}
              {consultation.type === 'CONSULTORIA' && (
                <TabsTrigger 
                  value="scripts"
                  className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-blue-500 rounded-none"
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Guiones
                </TabsTrigger>
              )}
              <TabsTrigger 
                value="budget"
                className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-blue-500 rounded-none"
              >
                <Calculator className="h-4 w-4 mr-2" />
                Presupuesto
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </header>

      {/* Contenido principal con sidebar */}
      <div className="flex-1 flex">
        {/* Área principal */}
        <main className="flex-1 p-6 overflow-auto">
          <Tabs value={activeTab} className="h-full">
            {/* Tab: Organigrama */}
            <TabsContent value="orgchart" className="mt-0">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">Organigrama</h2>
                </div>

                {/* Si ya hay organigrama procesado */}
                {consultation.orgChartData ? (
                  <div className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                          <CheckCircle2 className="h-5 w-5 text-green-500" />
                          Organigrama Procesado
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {/* Departamentos */}
                          {(consultation.orgChartData as { departments?: Array<{ name: string; code: string; head?: string; members?: string[] }> }).departments && (
                            <div>
                              <h4 className="font-medium mb-2">Departamentos detectados:</h4>
                              <div className="grid gap-2 md:grid-cols-2">
                                {((consultation.orgChartData as { departments: Array<{ name: string; code: string; head?: string; members?: string[] }> }).departments).map((dept, idx) => (
                                  <div key={idx} className="border rounded-lg p-3">
                                    <div className="flex items-center gap-2">
                                      <Badge variant="outline">{dept.code}</Badge>
                                      <span className="font-medium">{dept.name}</span>
                                    </div>
                                    {dept.head && (
                                      <p className="text-sm text-muted-foreground mt-1">
                                        Responsable: {dept.head}
                                      </p>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Personas */}
                          {(consultation.orgChartData as { people?: Array<{ name: string; role: string; department: string }> }).people && (
                            <div>
                              <h4 className="font-medium mb-2">Personas clave:</h4>
                              <div className="flex flex-wrap gap-2">
                                {((consultation.orgChartData as { people: Array<{ name: string; role: string; department: string }> }).people).map((person, idx) => (
                                  <Badge key={idx} variant="secondary">
                                    {person.name} - {person.role}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Reuniones sugeridas */}
                    {consultation.meetings.filter(m => m.suggestedByAI && m.status === 'SUGERIDA').length > 0 && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">Reuniones Sugeridas por IA</CardTitle>
                          <CardDescription>
                            Acepta o rechaza las reuniones sugeridas
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            {consultation.meetings
                              .filter(m => m.suggestedByAI && m.status === 'SUGERIDA')
                              .map((meeting) => (
                                <div key={meeting.id} className="flex items-center justify-between border rounded-lg p-3">
                                  <div>
                                    <p className="font-medium">{meeting.title}</p>
                                    <p className="text-sm text-muted-foreground">
                                      {meeting.attendees.join(', ')}
                                    </p>
                                  </div>
                                  <div className="flex gap-2">
                                    <Button size="sm" variant="outline" className="text-green-600">
                                      <CheckCircle2 className="h-4 w-4" />
                                    </Button>
                                    <Button size="sm" variant="outline" className="text-red-600">
                                      <AlertCircle className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                              ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                ) : (
                  /* Si no hay organigrama, mostrar formulario */
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Building2 className="h-5 w-5" />
                        Describir Organigrama
                      </CardTitle>
                      <CardDescription>
                        Describe la estructura de la empresa y la IA sugerirá las reuniones necesarias
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <Textarea
                        placeholder="Describe la estructura de la empresa. Por ejemplo:

- CEO: Juan García
- Departamento de Marketing: María López (directora), Ana Ruiz (analista)
- Departamento de IT: Pedro Sánchez (CTO), Carlos Gómez (desarrollador)
- Atención al Cliente: Laura Martínez (responsable)

También puedes pegar el contenido de un organigrama o describir los departamentos y personas clave."
                        value={orgChartDescription}
                        onChange={(e) => setOrgChartDescription(e.target.value)}
                        rows={10}
                        className="font-mono text-sm"
                      />
                      <Button 
                        onClick={handleProcessOrgChart}
                        disabled={isProcessingOrgChart || !orgChartDescription.trim()}
                      >
                        {isProcessingOrgChart ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Procesando...
                          </>
                        ) : (
                          <>
                            <Building2 className="h-4 w-4 mr-2" />
                            Procesar con IA
                          </>
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>

            {/* Tab: Reuniones */}
            <TabsContent value="meetings" className="mt-0">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">Reuniones</h2>
                  <Button onClick={() => { setSelectedMeeting(null); setShowMeetingDialog(true); }}>
                    <Plus className="h-4 w-4 mr-2" />
                    Nueva Reunión
                  </Button>
                </div>

                {consultation.meetings.length === 0 ? (
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center py-8">
                        <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                        <h3 className="font-medium mb-2">Sin reuniones todavía</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                          Añade tu primera reunión o sube un organigrama para que la IA las sugiera
                        </p>
                        <Button onClick={() => { setSelectedMeeting(null); setShowMeetingDialog(true); }}>
                          <Plus className="h-4 w-4 mr-2" />
                          Crear Primera Reunión
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-4">
                    {consultation.meetings.map((meeting) => (
                      <Card 
                        key={meeting.id} 
                        className="hover:shadow-md transition-shadow cursor-pointer"
                        onClick={() => handleOpenMeeting(meeting)}
                      >
                        <CardContent className="pt-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-medium">{meeting.title}</h3>
                                {meeting.suggestedByAI && (
                                  <Badge variant="outline" className="text-xs">
                                    Sugerida por IA
                                  </Badge>
                                )}
                              </div>
                              {meeting.department && (
                                <p className="text-sm text-muted-foreground">
                                  {meeting.department}
                                </p>
                              )}
                              {meeting.attendees.length > 0 && (
                                <p className="text-sm text-muted-foreground">
                                  Asistentes: {meeting.attendees.join(', ')}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant={
                                meeting.status === 'COMPLETADA' ? 'default' :
                                meeting.status === 'PROGRAMADA' ? 'secondary' : 'outline'
                              }>
                                {meeting.status}
                              </Badge>
                              <ChevronRight className="h-5 w-5 text-muted-foreground" />
                            </div>
                          </div>
                          <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <FileText className="h-3 w-3" />
                              {meeting.noteVersions.length} versiones de notas
                            </span>
                            <span className="flex items-center gap-1">
                              <Target className="h-3 w-3" />
                              {meeting._count.keyPoints} puntos extraídos
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Tab: Puntos Clave */}
            <TabsContent value="keypoints" className="mt-0">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">Puntos Clave</h2>
                  <Button variant="outline">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Extraer de Notas
                  </Button>
                </div>

                {consultation.keyPoints.length === 0 ? (
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center py-8">
                        <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                        <h3 className="font-medium mb-2">Sin puntos clave todavía</h3>
                        <p className="text-sm text-muted-foreground">
                          Los puntos clave se extraerán automáticamente de las notas de las reuniones
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-2">
                    {consultation.keyPoints.map((point) => (
                      <Card key={point.id}>
                        <CardContent className="py-3">
                          <div className="flex items-start gap-3">
                            <div className="flex-1">
                              <p className="text-sm">{point.description}</p>
                              <div className="flex items-center gap-2 mt-2">
                                <Badge variant="outline" className="text-xs">
                                  {point.department}
                                </Badge>
                                {point.isUnknown && (
                                  <Badge variant="destructive" className="text-xs">
                                    Incógnita
                                  </Badge>
                                )}
                              </div>
                            </div>
                            {point.isValidated ? (
                              <CheckCircle2 className="h-5 w-5 text-green-500" />
                            ) : (
                              <Clock className="h-5 w-5 text-muted-foreground" />
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Tab: Productos */}
            <TabsContent value="products" className="mt-0">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">Productos Sugeridos</h2>
                  <Button 
                    variant="outline"
                    onClick={handleMatchProducts}
                    disabled={isMatchingProducts || consultation.keyPoints.length === 0}
                  >
                    {isMatchingProducts ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Buscando...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Buscar Productos con IA
                      </>
                    )}
                  </Button>
                </div>

                {consultation.keyPoints.length === 0 ? (
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center py-8">
                        <Target className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                        <h3 className="font-medium mb-2">Primero extrae puntos clave</h3>
                        <p className="text-sm text-muted-foreground">
                          Ve a una reunión, añade notas y extrae los puntos clave para buscar productos
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ) : consultation.suggestedProducts.length === 0 ? (
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center py-8">
                        <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                        <h3 className="font-medium mb-2">Sin productos sugeridos</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                          Tienes {consultation.keyPoints.length} puntos clave. Haz clic en &quot;Buscar Productos con IA&quot; para encontrar productos del catálogo
                        </p>
                        <Button onClick={handleMatchProducts} disabled={isMatchingProducts}>
                          {isMatchingProducts ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Buscando...
                            </>
                          ) : (
                            <>
                              <Package className="h-4 w-4 mr-2" />
                              Buscar Productos
                            </>
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    {consultation.suggestedProducts.map((sp) => (
                      <Card 
                        key={sp.id} 
                        className={`${sp.isRejected ? 'opacity-50 border-red-200' : ''} ${sp.isValidated ? 'border-green-500 border-2' : ''}`}
                      >
                        <CardContent className="pt-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <h3 className="font-medium">{sp.product.name}</h3>
                                {sp.isValidated && (
                                  <Badge variant="default" className="bg-green-500">
                                    <CheckCircle2 className="h-3 w-3 mr-1" />
                                    Validado
                                  </Badge>
                                )}
                                {sp.isRejected && (
                                  <Badge variant="destructive">Rechazado</Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground mt-1">
                                {sp.product.category || 'Sin categoría'} · {Number(sp.product.price)}€
                              </p>
                              <p className="text-sm mt-2 text-gray-600">
                                {sp.matchReason}
                              </p>
                              {sp.keyPoints && sp.keyPoints.length > 0 && (
                                <div className="mt-2">
                                  <p className="text-xs text-muted-foreground">Resuelve:</p>
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {sp.keyPoints.map((kp) => (
                                      <Badge key={kp.id} variant="outline" className="text-xs">
                                        {kp.description.substring(0, 30)}...
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                            <Badge variant="secondary" className="ml-2">
                              {Math.round(sp.confidence * 100)}%
                            </Badge>
                          </div>
                          {!sp.isValidated && !sp.isRejected && (
                            <div className="flex items-center gap-2 mt-4 pt-3 border-t">
                              <Button 
                                size="sm" 
                                onClick={() => handleProductAction(sp.id, 'validate')}
                              >
                                <CheckCircle2 className="h-4 w-4 mr-1" />
                                Validar
                              </Button>
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                className="text-red-500"
                                onClick={() => handleProductAction(sp.id, 'reject')}
                              >
                                Rechazar
                              </Button>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Tab: Guiones */}
            <TabsContent value="scripts" className="mt-0">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">Guiones para el Comercial</h2>
                  <Button 
                    variant="outline"
                    onClick={() => handleGenerateScripts('all')}
                    disabled={isGeneratingScripts}
                  >
                    {isGeneratingScripts ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Generando...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        {consultation.generalScript ? 'Regenerar Guiones' : 'Generar Guiones con IA'}
                      </>
                    )}
                  </Button>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Guión General de la Consultoría</CardTitle>
                    <CardDescription>
                      Resumen en lenguaje no técnico para explicar al cliente
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {consultation.generalScript ? (
                      <div className="prose prose-sm max-w-none bg-blue-50 p-4 rounded-lg">
                        <p className="whitespace-pre-wrap text-sm">{consultation.generalScript}</p>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>Haz clic en &quot;Generar Guiones con IA&quot; para crear el guión</p>
                        <p className="text-xs mt-1">Se generará a partir de las notas y puntos clave</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {consultation.meetings.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="font-medium">Guiones Pre-Reunión</h3>
                    <p className="text-sm text-muted-foreground">
                      Guías para reuniones pendientes: qué temas tratar y preguntas sugeridas
                    </p>
                    {consultation.meetings
                      .filter(m => m.status !== 'COMPLETADA')
                      .map((meeting) => (
                      <Card key={meeting.id} className="border-orange-200">
                        <CardHeader className="pb-2">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-base">{meeting.title}</CardTitle>
                            <Badge variant="outline" className="text-orange-600">
                              {meeting.department || 'General'}
                            </Badge>
                          </div>
                          {meeting.attendees && meeting.attendees.length > 0 && (
                            <CardDescription>
                              Asistentes: {meeting.attendees.join(', ')}
                            </CardDescription>
                          )}
                        </CardHeader>
                        <CardContent className="space-y-4">
                          {meeting.script ? (
                            <>
                              <div>
                                <h4 className="text-sm font-medium mb-2">Guión de la reunión:</h4>
                                <div className="bg-orange-50 p-3 rounded-lg text-sm">
                                  <p className="whitespace-pre-wrap">{meeting.script}</p>
                                </div>
                              </div>
                              {meeting.questionsToAsk && meeting.questionsToAsk.length > 0 && (
                                <div>
                                  <h4 className="text-sm font-medium mb-2">Preguntas sugeridas:</h4>
                                  <ul className="space-y-1">
                                    {meeting.questionsToAsk.map((q: string, i: number) => (
                                      <li key={i} className="text-sm flex items-start gap-2">
                                        <span className="text-orange-500">•</span>
                                        {q}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </>
                          ) : (
                            <p className="text-sm text-muted-foreground">
                              Genera los guiones para ver las recomendaciones
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Tab: Clarificación */}
            <TabsContent value="clarify" className="mt-0">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">Clarificación</h2>
                  <Button
                    onClick={async () => {
                      if (!consultation) return;
                      setIsGeneratingQuestions(true);
                      setError(null);
                      try {
                        const res = await fetch(`/api/consultation/${consultation.id}/clarify`, {
                          method: 'POST'
                        });
                        const data = await res.json();
                        if (res.ok && data.success) {
                          setClarificationQuestions(prev => [...prev, ...data.data]);
                        } else {
                          setError(data.error || 'Error generando preguntas');
                        }
                      } catch (err) {
                        console.error('Error generando preguntas:', err);
                        setError('Error de conexión al generar preguntas');
                      } finally {
                        setIsGeneratingQuestions(false);
                      }
                    }}
                    disabled={isGeneratingQuestions || !consultation?.keyPoints?.length}
                  >
                    {isGeneratingQuestions ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Analizando puntos clave...
                      </>
                    ) : (
                      <>
                        <Lightbulb className="h-4 w-4 mr-2" />
                        Generar Preguntas
                      </>
                    )}
                  </Button>
                </div>

                <p className="text-sm text-muted-foreground">
                  La IA analizará los {consultation?.keyPoints?.length || 0} puntos clave y generará preguntas para clarificar dudas antes de generar el presupuesto.
                </p>
                
                {error && (
                  <Card className="border-red-200 bg-red-50">
                    <CardContent className="py-3">
                      <p className="text-sm text-red-600 flex items-center gap-2">
                        <AlertCircle className="h-4 w-4" />
                        {error}
                      </p>
                    </CardContent>
                  </Card>
                )}

                {clarificationQuestions.length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <HelpCircle className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                      <p className="text-muted-foreground">
                        No hay preguntas de clarificación generadas.
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Haz clic en &quot;Generar Preguntas&quot; para que la IA analice los puntos clave.
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-4">
                    {clarificationQuestions.map((q) => (
                      <Card key={q.id} className={q.isAnswered ? 'border-green-200 bg-green-50/30' : ''}>
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-2">
                              {q.isAnswered ? (
                                <CheckCircle2 className="h-5 w-5 text-green-600" />
                              ) : (
                                <HelpCircle className="h-5 w-5 text-orange-500" />
                              )}
                              <Badge variant={q.priority === 'high' ? 'destructive' : q.priority === 'medium' ? 'default' : 'secondary'}>
                                {q.priority === 'high' ? 'Alta' : q.priority === 'medium' ? 'Media' : 'Baja'}
                              </Badge>
                              {q.impactArea && (
                                <Badge variant="outline">{q.impactArea}</Badge>
                              )}
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <p className="font-medium">{q.question}</p>
                          {q.context && (
                            <p className="text-sm text-muted-foreground">{q.context}</p>
                          )}
                          
                          {q.isAnswered ? (
                            <div className="bg-green-100 p-3 rounded-lg">
                              <p className="text-sm font-medium text-green-800">Respuesta:</p>
                              <p className="text-sm text-green-700">{q.answer}</p>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <p className="text-sm font-medium">Respuestas sugeridas:</p>
                              <div className="flex flex-wrap gap-2">
                                {q.suggestedAnswers.map((ans, idx) => (
                                  <Button
                                    key={idx}
                                    variant={selectedAnswer === ans && isAnsweringQuestion === q.id ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => {
                                      setSelectedAnswer(ans);
                                      setIsAnsweringQuestion(q.id);
                                    }}
                                  >
                                    {ans}
                                  </Button>
                                ))}
                              </div>
                              
                              {isAnsweringQuestion === q.id && (
                                <div className="space-y-2 pt-2">
                                  <Input
                                    placeholder="O escribe tu propia respuesta..."
                                    value={customAnswer}
                                    onChange={(e) => setCustomAnswer(e.target.value)}
                                  />
                                  <div className="flex gap-2">
                                    <Button
                                      size="sm"
                                      onClick={async () => {
                                        const answer = customAnswer || selectedAnswer;
                                        if (!answer) return;
                                        
                                        try {
                                          const res = await fetch(`/api/consultation/${consultation?.id}/clarify`, {
                                            method: 'PATCH',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ questionId: q.id, answer })
                                          });
                                          
                                          if (res.ok) {
                                            setClarificationQuestions(prev => 
                                              prev.map(pq => pq.id === q.id ? { ...pq, answer, isAnswered: true } : pq)
                                            );
                                            setSelectedAnswer('');
                                            setCustomAnswer('');
                                            setIsAnsweringQuestion(null);
                                          }
                                        } catch (err) {
                                          console.error('Error respondiendo:', err);
                                        }
                                      }}
                                    >
                                      <CheckCircle2 className="h-4 w-4 mr-1" />
                                      Confirmar
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => {
                                        setSelectedAnswer('');
                                        setCustomAnswer('');
                                        setIsAnsweringQuestion(null);
                                      }}
                                    >
                                      Cancelar
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}

                {/* Separador y sección de incógnitas */}
                <Separator className="my-6" />
                
                {/* Incógnitas detectadas */}
                <div>
                  <h3 className="text-base font-semibold flex items-center gap-2 mb-3">
                    <Search className="h-5 w-5 text-orange-500" />
                    Incógnitas detectadas ({consultation?.keyPoints.filter(kp => kp.isUnknown).length || 0})
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Productos o tecnologías mencionados que no están en el catálogo. La IA puede investigar y estimar precios de mercado.
                  </p>
                  
                  {consultation?.keyPoints.filter(kp => kp.isUnknown).length === 0 ? (
                    <Card className="border-dashed">
                      <CardContent className="py-6 text-center">
                        <CheckCircle2 className="h-8 w-8 mx-auto text-green-500 mb-2" />
                        <p className="text-sm text-muted-foreground">
                          No hay incógnitas. Todos los puntos clave tienen productos asociados del catálogo.
                        </p>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="space-y-4">
                      {consultation?.keyPoints.filter(kp => kp.isUnknown).map((kp) => (
                        <Card key={kp.id} className="border-orange-200 bg-orange-50/30">
                          <CardHeader className="pb-2">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <Badge variant="outline" className="border-orange-400 text-orange-600">
                                    {kp.department}
                                  </Badge>
                                  <Badge variant="secondary">
                                    {kp.priority === 2 ? 'Crítica' : kp.priority === 1 ? 'Alta' : 'Normal'}
                                  </Badge>
                                </div>
                                <p className="font-medium text-base">{kp.description}</p>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            {/* Mostrar precio estimado si existe */}
                            {(kp.estimatedPrice || kp.userAdjustedPrice) && (
                              <div className="flex items-center gap-4 p-3 bg-white rounded-lg border">
                                <div>
                                  <p className="text-xs text-muted-foreground">Precio estimado</p>
                                  <p className="text-lg font-semibold text-green-600">
                                    {Number(kp.userAdjustedPrice || kp.estimatedPrice).toLocaleString('es-ES')} €
                                  </p>
                                </div>
                                {kp.aiReasoning && (
                                  <div className="flex-1 border-l pl-4">
                                    <p className="text-xs text-muted-foreground">Razonamiento</p>
                                    <p className="text-sm">{kp.aiReasoning}</p>
                                  </div>
                                )}
                              </div>
                            )}
                            
                            {/* Botón para investigar */}
                            {!kp.estimatedPrice && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="w-full"
                                onClick={async () => {
                                  if (!consultation) return;
                                  // Usar el ID como indicador de carga
                                  const btn = document.getElementById(`investigate-${kp.id}`);
                                  if (btn) btn.innerHTML = '<span class="animate-spin">⏳</span> Investigando...';
                                  
                                  try {
                                    const res = await fetch(`/api/consultation/${consultation.id}/investigate`, {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({ keyPointId: kp.id })
                                    });
                                    const data = await res.json();
                                    if (res.ok && data.success) {
                                      loadData();
                                    } else {
                                      setError(data.error || 'Error investigando');
                                    }
                                  } catch (err) {
                                    console.error('Error investigando:', err);
                                    setError('Error de conexión');
                                  }
                                }}
                                id={`investigate-${kp.id}`}
                              >
                                <Search className="h-4 w-4 mr-2" />
                                Investigar y estimar precio
                              </Button>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* Tab: Presupuesto */}
            <TabsContent value="budget" className="mt-0">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">Presupuesto</h2>
                </div>

                {/* Presupuesto ya generado */}
                {budgetGenerated ? (
                  <div className="space-y-4">
                    <Card className="border-green-200 bg-green-50/50">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="flex items-center gap-2 text-green-700">
                            <CheckCircle2 className="h-5 w-5" />
                            Presupuesto Generado
                          </CardTitle>
                          <Badge variant="outline" className="border-green-500 text-green-600">
                            ID: {budgetGenerated.id.slice(-8)}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {/* Items */}
                        <div className="space-y-2">
                          {budgetGenerated.items.map((item, i) => (
                            <div key={i} className="flex justify-between items-center py-2 border-b last:border-0">
                              <span className="text-sm">{item.name}</span>
                              <span className="font-medium">{Number(item.unitPrice).toFixed(2)} €</span>
                            </div>
                          ))}
                        </div>

                        {/* Totales */}
                        <div className="bg-white rounded-lg p-4 space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Subtotal</span>
                            <span>{Number(budgetGenerated.subtotal).toFixed(2)} €</span>
                          </div>
                          {budgetGenerated.discount > 0 && (
                            <div className="flex justify-between text-sm text-green-600">
                              <span>Descuento</span>
                              <span>-{Number(budgetGenerated.discount).toFixed(2)} €</span>
                            </div>
                          )}
                          <div className="flex justify-between text-sm">
                            <span>IVA (21%)</span>
                            <span>{Number(budgetGenerated.taxes).toFixed(2)} €</span>
                          </div>
                          <Separator />
                          <div className="flex justify-between font-bold text-lg">
                            <span>Total</span>
                            <span>{Number(budgetGenerated.total).toFixed(2)} €</span>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <Button className="flex-1" asChild>
                            <a href={`/budgets/${budgetGenerated.id}`}>
                              Ver Presupuesto Completo
                            </a>
                          </Button>
                          <Button variant="outline" asChild>
                            <a href={`/api/pdf/budget/${budgetGenerated.id}`} target="_blank">
                              <FileText className="h-4 w-4 mr-2" />
                              PDF
                            </a>
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                ) : (
                  /* Formulario de generación */
                  <div className="space-y-4">
                    {/* Productos validados */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Productos a Presupuestar</CardTitle>
                        <CardDescription>
                          {stats?.validatedProducts || 0} productos validados de {stats?.totalProducts || 0} sugeridos
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {consultation.suggestedProducts.filter(sp => sp.isValidated).length > 0 ? (
                          <div className="space-y-2">
                            {consultation.suggestedProducts
                              .filter(sp => sp.isValidated)
                              .map((sp) => (
                                <div key={sp.id} className="flex justify-between items-center py-2 border-b last:border-0">
                                  <div>
                                    <p className="font-medium text-sm">{sp.product?.name}</p>
                                    <p className="text-xs text-muted-foreground">{sp.matchReason}</p>
                                  </div>
                                  <span className="font-medium">{Number(sp.product?.price || 0).toFixed(2)} €</span>
                                </div>
                              ))}
                          </div>
                        ) : (
                          <div className="text-center py-4 text-muted-foreground">
                            <p>No hay productos validados</p>
                            <p className="text-xs mt-1">Ve al tab Productos para validar sugerencias</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Configuración de mantenimiento */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Mantenimiento (Opcional)</CardTitle>
                        <CardDescription>
                          Selecciona el tipo de mantenimiento para incluir en el presupuesto
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 gap-2">
                          {[
                            { value: '', label: 'Sin mantenimiento' },
                            { value: 'HORAS', label: 'Bolsa de horas' },
                            { value: 'TOKENS', label: 'Tokens IA' },
                            { value: 'SLA', label: 'SLA' },
                          ].map((opt) => (
                            <Button
                              key={opt.value}
                              variant={maintenanceType === opt.value ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => setMaintenanceType(opt.value)}
                              className="justify-start"
                            >
                              {opt.label}
                            </Button>
                          ))}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Resumen y botón */}
                    <Card>
                      <CardContent className="pt-6">
                        {stats && (
                          <div className="grid grid-cols-3 gap-4 max-w-md mx-auto mb-6">
                            <div className="text-center">
                              <p className="text-2xl font-bold">{stats.completedMeetings}/{stats.totalMeetings}</p>
                              <p className="text-xs text-muted-foreground">Reuniones</p>
                            </div>
                            <div className="text-center">
                              <p className="text-2xl font-bold">{stats.validatedKeyPoints}/{stats.totalKeyPoints}</p>
                              <p className="text-xs text-muted-foreground">Puntos</p>
                            </div>
                            <div className="text-center">
                              <p className="text-2xl font-bold text-green-600">{stats.validatedProducts}</p>
                              <p className="text-xs text-muted-foreground">Productos</p>
                            </div>
                          </div>
                        )}

                        <Button 
                          size="lg"
                          className="w-full"
                          disabled={!stats || stats.validatedProducts === 0 || isGeneratingBudget}
                          onClick={handleGenerateBudget}
                        >
                          {isGeneratingBudget ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Generando...
                            </>
                          ) : (
                            <>
                              <Calculator className="h-4 w-4 mr-2" />
                              Generar Presupuesto
                            </>
                          )}
                        </Button>

                        {stats?.validatedProducts === 0 && (
                          <p className="text-xs text-center text-muted-foreground mt-2">
                            Primero valida productos en el tab Productos
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </main>

        {/* Sidebar derecho */}
        <aside className="w-80 border-l bg-white p-4 hidden lg:block overflow-auto">
          <div className="space-y-6">
            {/* Resumen */}
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Target className="h-4 w-4" />
                Resumen
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Reuniones</span>
                  <span className="font-medium">
                    {stats?.completedMeetings || 0} / {stats?.totalMeetings || 0}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Puntos clave</span>
                  <span className="font-medium">{stats?.totalKeyPoints || 0}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Productos</span>
                  <span className="font-medium">
                    {stats?.validatedProducts || 0} / {stats?.totalProducts || 0}
                  </span>
                </div>
              </div>
            </div>

            {/* Guión general */}
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Guión General
              </h3>
              {consultation.generalScript ? (
                <p className="text-sm text-muted-foreground line-clamp-6">
                  {consultation.generalScript}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground italic">
                  El guión se generará a partir de las notas de las reuniones
                </p>
              )}
            </div>

            {/* Notas iniciales */}
            {consultation.initialNotes && (
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Notas Iniciales
                </h3>
                <p className="text-sm text-muted-foreground line-clamp-6">
                  {consultation.initialNotes}
                </p>
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* Dialog para crear/editar reunión */}
      <Dialog open={showMeetingDialog} onOpenChange={setShowMeetingDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {selectedMeeting ? `Reunión: ${selectedMeeting.title}` : 'Nueva Reunión'}
            </DialogTitle>
            <DialogDescription>
              {selectedMeeting 
                ? 'Gestiona las notas y puntos clave de esta reunión'
                : 'Crea una nueva reunión para la consultoría'
              }
            </DialogDescription>
          </DialogHeader>

          {selectedMeeting ? (
            // Ver/editar reunión existente
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge variant={
                  selectedMeeting.status === 'COMPLETADA' ? 'default' :
                  selectedMeeting.status === 'PROGRAMADA' ? 'secondary' : 'outline'
                }>
                  {selectedMeeting.status}
                </Badge>
                {selectedMeeting.department && (
                  <Badge variant="outline">{selectedMeeting.department}</Badge>
                )}
              </div>

              {selectedMeeting.attendees.length > 0 && (
                <p className="text-sm text-muted-foreground">
                  <strong>Asistentes:</strong> {selectedMeeting.attendees.join(', ')}
                </p>
              )}

              <div>
                <label className="text-sm font-medium mb-2 block">
                  Notas de la reunión
                </label>
                <Textarea
                  placeholder="Añade o edita las notas de la reunión..."
                  value={newMeetingNotes}
                  onChange={(e) => setNewMeetingNotes(e.target.value)}
                  rows={8}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Versión actual: v{selectedMeeting.noteVersions.length || 0}
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <Button 
                  onClick={handleSaveNotes}
                  disabled={isSavingNotes || !newMeetingNotes.trim()}
                >
                  {isSavingNotes ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <FileText className="h-4 w-4 mr-2" />
                      Guardar Notas
                    </>
                  )}
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => handleExtractKeyPoints(selectedMeeting.id)}
                  disabled={isExtractingKeyPoints || !selectedMeeting.noteVersions.length}
                >
                  {isExtractingKeyPoints ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Extrayendo...
                    </>
                  ) : (
                    <>
                      <Target className="h-4 w-4 mr-2" />
                      Extraer Puntos Clave
                    </>
                  )}
                </Button>
                <span className="text-sm text-muted-foreground">
                  {selectedMeeting._count.keyPoints} puntos extraídos
                </span>
              </div>
            </div>
          ) : (
            // Crear nueva reunión
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Título de la reunión *
                </label>
                <Input
                  placeholder="Ej: Reunión con Marketing - Primera sesión"
                  value={newMeetingTitle}
                  onChange={(e) => setNewMeetingTitle(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Departamento
                  </label>
                  <Select value={newMeetingDepartment} onValueChange={setNewMeetingDepartment}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MARKETING">Marketing</SelectItem>
                      <SelectItem value="ATENCION_CLIENTE">Atención al Cliente</SelectItem>
                      <SelectItem value="INFRAESTRUCTURA">Infraestructura</SelectItem>
                      <SelectItem value="NEGOCIO">Negocio</SelectItem>
                      <SelectItem value="OTRO">Otro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Asistentes
                  </label>
                  <Input
                    placeholder="Nombres separados por comas"
                    value={newMeetingAttendees}
                    onChange={(e) => setNewMeetingAttendees(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">
                  Notas de la reunión (opcional)
                </label>
                <Textarea
                  placeholder="Pega aquí las notas de la reunión..."
                  value={newMeetingNotes}
                  onChange={(e) => setNewMeetingNotes(e.target.value)}
                  rows={6}
                  className="font-mono text-sm"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowMeetingDialog(false);
              setSelectedMeeting(null);
              setNewMeetingTitle('');
              setNewMeetingDepartment('');
              setNewMeetingAttendees('');
              setNewMeetingNotes('');
            }}>
              Cancelar
            </Button>
            {selectedMeeting ? (
              <Button onClick={() => setShowMeetingDialog(false)}>
                Cerrar
              </Button>
            ) : (
              <Button 
                onClick={handleCreateMeeting} 
                disabled={isCreatingMeeting || !newMeetingTitle.trim()}
              >
                {isCreatingMeeting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creando...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Crear Reunión
                  </>
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
