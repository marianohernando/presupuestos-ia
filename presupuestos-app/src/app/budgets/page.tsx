'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { FileText, Plus, Search, Filter, Clock, User, Euro } from 'lucide-react';
import { Header } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Budget {
  id: string;
  clientId: string;
  version: number;
  status: 'BORRADOR' | 'ENVIADO' | 'ACEPTADO' | 'RECHAZADO' | 'EXPIRADO';
  summary: string | null;
  total: number;
  createdAt: string;
  updatedAt: string;
  client: {
    id: string;
    name: string;
    company: string | null;
  };
  _count: {
    items: number;
  };
}

const statusColors: Record<string, string> = {
  BORRADOR: 'bg-muted text-muted-foreground',
  ENVIADO: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  ACEPTADO: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  RECHAZADO: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  EXPIRADO: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
};

const statusLabels: Record<string, string> = {
  BORRADOR: 'Borrador',
  ENVIADO: 'Enviado',
  ACEPTADO: 'Aceptado',
  RECHAZADO: 'Rechazado',
  EXPIRADO: 'Expirado',
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default function BudgetsPage() {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Cargar presupuestos desde la API
  useEffect(() => {
    async function fetchBudgets() {
      try {
        const res = await fetch('/api/budgets');
        const data = await res.json();
        if (data.success) {
          setBudgets(data.data);
        }
      } catch (error) {
        console.error('Error fetching budgets:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchBudgets();
  }, []);

  const filteredBudgets = budgets.filter((budget) => {
    const matchesSearch =
      budget.client.name.toLowerCase().includes(search.toLowerCase()) ||
      budget.client.company?.toLowerCase().includes(search.toLowerCase()) ||
      budget.summary?.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = statusFilter === 'all' || budget.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <>
      <Header
        title="Presupuestos"
        description={`${budgets.length} presupuestos generados`}
        actions={
          <Button asChild>
            <Link href="/clients">
              <Plus className="mr-2 h-4 w-4" />
              Nuevo presupuesto
            </Link>
          </Button>
        }
      />

      <div className="p-6 space-y-6">
        {/* Filters */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar presupuestos..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filtrar por estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="BORRADOR">Borrador</SelectItem>
                <SelectItem value="ENVIADO">Enviado</SelectItem>
                <SelectItem value="ACEPTADO">Aceptado</SelectItem>
                <SelectItem value="RECHAZADO">Rechazado</SelectItem>
                <SelectItem value="EXPIRADO">Expirado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Budget List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : filteredBudgets.length > 0 ? (
          <div className="space-y-4">
            {filteredBudgets.map((budget) => (
              <Card key={budget.id} className="hover:shadow-md transition-shadow">
                <Link href={`/budgets/${budget.id}`}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                          <FileText className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-base flex items-center gap-2">
                            {budget.client.name}
                            <Badge variant="outline" className="text-xs font-normal">
                              v{budget.version}
                            </Badge>
                          </CardTitle>
                          <p className="text-sm text-muted-foreground">
                            {budget.client.company || 'Sin empresa'}
                          </p>
                        </div>
                      </div>
                      <Badge className={statusColors[budget.status]}>
                        {statusLabels[budget.status]}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {budget.summary && (
                      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                        {budget.summary}
                      </p>
                    )}
                    <div className="flex items-center gap-6 text-sm">
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        <Euro className="h-4 w-4" />
                        <span className="font-semibold text-foreground">
                          {formatCurrency(budget.total)}
                        </span>
                      </span>
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        <User className="h-4 w-4" />
                        {budget._count.items} items
                      </span>
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        {formatDate(budget.createdAt)}
                      </span>
                    </div>
                  </CardContent>
                </Link>
              </Card>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-4">
              <FileText className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="font-semibold">No hay presupuestos</h3>
            <p className="text-sm text-muted-foreground mt-1 mb-4">
              {search
                ? 'No se encontraron presupuestos con esos criterios'
                : 'Crea tu primer presupuesto desde un cliente'}
            </p>
            <Button asChild>
              <Link href="/clients">
                <Plus className="mr-2 h-4 w-4" />
                Ir a clientes
              </Link>
            </Button>
          </div>
        )}
      </div>
    </>
  );
}
