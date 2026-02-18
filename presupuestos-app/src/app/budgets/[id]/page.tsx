'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Download, 
  FileText, 
  User, 
  Calendar, 
  Euro,
  Loader2,
  Package,
  Clock,
  CheckCircle2
} from 'lucide-react';
import { Header } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

interface BudgetItem {
  id: string;
  name: string;
  description: string | null;
  quantity: number;
  unitPrice: number;
  productId: string | null;
}

interface Budget {
  id: string;
  flowType: string;
  status: string;
  summary: string | null;
  subtotal: number;
  discount: number;
  taxes: number;
  total: number;
  maintenanceHours: number | null;
  maintenanceMonthly: number | null;
  createdAt: string;
  validUntil: string | null;
  client: {
    id: string;
    name: string;
    company: string | null;
    email: string | null;
  };
  items: BudgetItem[];
}

const statusColors: Record<string, string> = {
  BORRADOR: 'bg-gray-100 text-gray-800',
  ENVIADO: 'bg-blue-100 text-blue-800',
  ACEPTADO: 'bg-green-100 text-green-800',
  RECHAZADO: 'bg-red-100 text-red-800',
  REVISION: 'bg-yellow-100 text-yellow-800',
};

export default function BudgetDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [budget, setBudget] = useState<Budget | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadBudget = async () => {
      try {
        const response = await fetch(`/api/budgets/${id}`);
        if (!response.ok) {
          throw new Error('Presupuesto no encontrado');
        }
        const data = await response.json();
        setBudget(data.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al cargar');
      } finally {
        setIsLoading(false);
      }
    };

    loadBudget();
  }, [id]);

  const handleDownloadPDF = async () => {
    if (!budget) return;
    
    setIsDownloading(true);
    try {
      const response = await fetch('/api/pdf/budget', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ budgetId: budget.id }),
      });

      if (!response.ok) {
        throw new Error('Error al generar PDF');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `presupuesto-${budget.id.substring(0, 8)}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error:', error);
      alert('Error al generar el PDF');
    } finally {
      setIsDownloading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container py-8">
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </main>
      </div>
    );
  }

  if (error || !budget) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container py-8">
          <div className="text-center py-16">
            <FileText className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">Presupuesto no encontrado</h2>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button asChild>
              <Link href="/budgets">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Volver a presupuestos
              </Link>
            </Button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container py-8">
        {/* Navegación */}
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" asChild>
            <Link href="/budgets">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver a presupuestos
            </Link>
          </Button>
          <Button onClick={handleDownloadPDF} disabled={isDownloading}>
            {isDownloading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            Descargar PDF
          </Button>
        </div>

        {/* Cabecera */}
        <div className="grid gap-6 md:grid-cols-3 mb-8">
          <Card className="md:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-2xl">
                    Presupuesto #{budget.id.substring(0, 8).toUpperCase()}
                  </CardTitle>
                  <CardDescription className="mt-1">
                    {budget.summary || 'Sin descripción'}
                  </CardDescription>
                </div>
                <Badge className={statusColors[budget.status] || 'bg-gray-100'}>
                  {budget.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>Creado: {new Date(budget.createdAt).toLocaleDateString('es-ES')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>
                    Válido hasta: {budget.validUntil 
                      ? new Date(budget.validUntil).toLocaleDateString('es-ES')
                      : 'Sin fecha'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span>Flujo: {budget.flowType}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Cliente
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="font-medium">{budget.client.name}</p>
                {budget.client.company && (
                  <p className="text-sm text-muted-foreground">{budget.client.company}</p>
                )}
                {budget.client.email && (
                  <p className="text-sm text-muted-foreground">{budget.client.email}</p>
                )}
                <Button variant="outline" size="sm" className="mt-2" asChild>
                  <Link href={`/clients/${budget.client.id}`}>
                    Ver cliente
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Items */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Items del presupuesto
            </CardTitle>
            <CardDescription>
              {budget.items.length} items en este presupuesto
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {budget.items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-4 rounded-lg border"
                >
                  <div className="flex items-center gap-3">
                    {item.productId ? (
                      <Package className="h-5 w-5 text-primary" />
                    ) : (
                      <FileText className="h-5 w-5 text-orange-500" />
                    )}
                    <div>
                      <div className="font-medium">{item.name}</div>
                      {item.description && (
                        <p className="text-sm text-muted-foreground">{item.description}</p>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary" className="text-xs">
                          {Number(item.unitPrice).toLocaleString('es-ES')}€ x {item.quantity}
                        </Badge>
                        {!item.productId && (
                          <Badge variant="outline" className="text-xs">Custom</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="font-semibold text-lg">
                    {(Number(item.unitPrice) * item.quantity).toLocaleString('es-ES')}€
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Totales */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Euro className="h-5 w-5" />
              Resumen económico
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{Number(budget.subtotal).toLocaleString('es-ES')}€</span>
              </div>
              {Number(budget.discount) > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Descuento</span>
                  <span>-{Number(budget.discount).toLocaleString('es-ES')}€</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">IVA (21%)</span>
                <span>{Number(budget.taxes).toLocaleString('es-ES')}€</span>
              </div>
              <Separator />
              <div className="flex justify-between text-xl font-bold">
                <span>Total</span>
                <span>{Number(budget.total).toLocaleString('es-ES')}€</span>
              </div>

              {budget.maintenanceMonthly && (
                <>
                  <Separator />
                  <div className="bg-muted/50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                      <span className="font-medium">Mantenimiento incluido</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>{budget.maintenanceHours}h/mes</span>
                      <span className="font-semibold">
                        {Number(budget.maintenanceMonthly).toLocaleString('es-ES')}€/mes
                      </span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
