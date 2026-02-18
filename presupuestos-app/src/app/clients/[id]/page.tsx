'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Building2, 
  Mail, 
  Phone, 
  FileText,
  ArrowRight,
  Clock,
  Loader2,
  Sparkles
} from 'lucide-react';
import { Header } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import type { Client } from '@/types';


export default function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  
  // Estado del cliente
  const [client, setClient] = useState<Client | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasConsultation, setHasConsultation] = useState(false);
  
  // Estado para las notas iniciales
  const [meetingNotes, setMeetingNotes] = useState('');

  // Cargar cliente y consultoría desde API
  useEffect(() => {
    const loadData = async () => {
      try {
        // Cargar cliente
        const res = await fetch(`/api/clients/${id}`);
        const json = await res.json();
        const clientData = json.data || json;
        if (clientData && clientData.id) {
          setClient(clientData);
        }
        
        // Verificar si tiene consultoría activa
        const consultRes = await fetch(`/api/consultation?clientId=${id}`);
        const consultJson = await consultRes.json();
        if (consultRes.ok && consultJson.data && consultJson.data.id) {
          setHasConsultation(true);
        }
      } catch (err) {
        console.error('Error loading client:', err);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [id]);

  const handleStartBudget = () => {
    // Guardar notas en sessionStorage para que la página de consultation las lea
    if (meetingNotes.trim()) {
      sessionStorage.setItem(`initialNotes_${id}`, meetingNotes.trim());
    }
    // Ir al flujo dinámico de consultoría/diagnóstico con tabs
    router.push(`/clients/${id}/consultation`);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Client not found
  if (!client) {
    return (
      <div className="min-h-screen flex items-center justify-center flex-col gap-4">
        <p className="text-lg text-muted-foreground">Cliente no encontrado</p>
        <Button asChild>
          <Link href="/clients">Volver a clientes</Link>
        </Button>
      </div>
    );
  }

  return (
    <>
      <Header
        title={client.name}
        description={client.company || 'Cliente individual'}
        actions={
          <Button variant="outline" asChild>
            <Link href="/clients">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver
            </Link>
          </Button>
        }
      />

      <div className="p-6 space-y-6">
        {/* Info del cliente */}
        <div className="grid md:grid-cols-3 gap-6">
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Información del cliente
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                {client.email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <a href={`mailto:${client.email}`} className="hover:underline">
                      {client.email}
                    </a>
                  </div>
                )}
                {client.phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <a href={`tel:${client.phone}`} className="hover:underline">
                      {client.phone}
                    </a>
                  </div>
                )}
              </div>
              
              {client.notes && (
                <>
                  <Separator />
                  <div>
                    <div className="flex items-center gap-2 text-sm font-medium mb-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      Notas
                    </div>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {client.notes}
                    </p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Estado</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Estado actual</span>
                <Badge>En proceso</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Presupuestos</span>
                <span className="font-medium">0</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Última actividad</span>
                <span className="text-sm flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  Hace 2 días
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Consultoría activa */}
        {hasConsultation && (
          <Card className="border-blue-200 bg-blue-50/50">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-blue-500" />
                  Consultoría en progreso
                </CardTitle>
                <Badge variant="outline" className="border-blue-500 text-blue-600">
                  Activa
                </Badge>
              </div>
              <CardDescription>
                Este cliente tiene una consultoría activa. Continúa gestionando reuniones, puntos clave y productos.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                size="lg" 
                onClick={() => router.push(`/clients/${id}/consultation`)} 
                className="w-full gap-2 bg-blue-600 hover:bg-blue-700"
              >
                <ArrowRight className="h-4 w-4" />
                Continuar Consultoría
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Crear presupuesto */}
        {client.status === 'PENDIENTE_CONSULTORIA' ? (
          <Card className="border-orange-200 bg-orange-50/50">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-orange-500" />
                  Consultoría pendiente
                </CardTitle>
                <Badge variant="outline" className="border-orange-500 text-orange-600">
                  Esperando consultoría
                </Badge>
              </div>
              <CardDescription>
                Ya se generó el presupuesto de consultoría. Cuando la consultoría se haya realizado, podrás añadir las notas y generar el presupuesto del proyecto.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-white rounded-lg p-4 space-y-3 border">
                <h4 className="font-medium">Próximos pasos</h4>
                <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
                  <li>Realiza la consultoría con el cliente</li>
                  <li>Toma notas de todas las reuniones</li>
                  <li>Cuando termines, haz clic en el botón de abajo</li>
                  <li>Pega las notas y genera el presupuesto del proyecto</li>
                </ol>
              </div>
              
              <Button 
                size="lg" 
                onClick={() => router.push(`/clients/${id}/consultation`)} 
                className="w-full gap-2"
              >
                <FileText className="h-4 w-4" />
                Consultoría realizada - Generar presupuesto del proyecto
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Crear presupuesto
              </CardTitle>
              <CardDescription>
                Introduce las notas de tu reunión con el cliente y la IA te ayudará a generar un presupuesto personalizado.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Textarea para notas */}
              <div className="space-y-2">
                <Label htmlFor="meeting-notes" className="text-base font-medium">
                  Notas de la reunión inicial
                </Label>
                <Textarea
                  id="meeting-notes"
                  placeholder="Pega aquí las notas de tu primera reunión con el cliente. La IA analizará el contenido y te recomendará si es mejor un proceso de Consultoría o Diagnóstico..."
                  value={meetingNotes}
                  onChange={(e) => setMeetingNotes(e.target.value)}
                  className="min-h-[200px] resize-y"
                />
                <p className="text-sm text-muted-foreground">
                  Incluye información sobre: necesidades del cliente, complejidad del proyecto, número de departamentos involucrados, urgencia, etc.
                </p>
              </div>

              <Separator />

              <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                <h4 className="font-medium">¿Cómo funciona?</h4>
                <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
                  <li>Introduce las notas de tu primera reunión con el cliente</li>
                  <li>La IA analizará las notas y te recomendará si es un proyecto de <strong>Consultoría</strong> o <strong>Diagnóstico</strong></li>
                  <li>Tú decides el tipo de proyecto basándote en la recomendación</li>
                  <li>La IA extrae los puntos clave y sugiere productos del catálogo</li>
                  <li>Validas, ajustas y generas el presupuesto final</li>
                </ol>
              </div>
              
              <Button 
                size="lg" 
                onClick={handleStartBudget} 
                className="w-full gap-2"
                disabled={!meetingNotes.trim()}
              >
                <ArrowRight className="h-4 w-4" />
                {meetingNotes.trim() ? 'Analizar notas y continuar' : 'Introduce las notas para continuar'}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}
