'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Users, Package, FileText, Plus, Upload, Clock, Loader2 } from 'lucide-react';
import { Header } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ClientCard } from '@/components/clients';
import { useClientsStore } from '@/store';
import type { Client } from '@/types';

interface Stats {
  clients: number;
  products: number;
  budgets: number;
  pendingBudgets: number;
}

export default function DashboardPage() {
  const router = useRouter();
  const { selectClient } = useClientsStore();
  const [clients, setClients] = useState<Client[]>([]);
  const [stats, setStats] = useState<Stats>({ clients: 0, products: 0, budgets: 0, pendingBudgets: 0 });
  const [loading, setLoading] = useState(true);

  // Cargar datos reales
  useEffect(() => {
    async function fetchData() {
      try {
        const [clientsRes, productsRes, budgetsRes] = await Promise.all([
          fetch('/api/clients'),
          fetch('/api/products'),
          fetch('/api/budgets'),
        ]);
        
        const clientsData = await clientsRes.json();
        const productsData = await productsRes.json();
        const budgetsData = await budgetsRes.json();
        
        if (clientsData.success) {
          const mappedClients = clientsData.data.map((c: Record<string, unknown>) => ({
            ...c,
            createdAt: new Date(c.createdAt as string),
            updatedAt: new Date(c.updatedAt as string),
          }));
          setClients(mappedClients.slice(0, 3)); // Solo los 3 más recientes
          setStats(prev => ({ ...prev, clients: clientsData.data.length }));
        }
        
        if (productsData.success) {
          setStats(prev => ({ ...prev, products: productsData.data.filter((p: { isActive: boolean }) => p.isActive).length }));
        }

        if (budgetsData.success) {
          const allBudgets = budgetsData.data || [];
          const pending = allBudgets.filter((b: { status: string }) => 
            b.status === 'BORRADOR' || b.status === 'ENVIADO'
          );
          setStats(prev => ({ 
            ...prev, 
            budgets: allBudgets.length,
            pendingBudgets: pending.length 
          }));
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const handleSelectClient = (client: Client) => {
    selectClient(client);
    router.push(`/clients/${client.id}`);
  };

  const statsCards = [
    { name: 'Clientes activos', value: stats.clients.toString(), icon: Users, color: 'text-primary' },
    { name: 'Presupuestos pendientes', value: stats.pendingBudgets.toString(), icon: FileText, color: 'text-[var(--warning)]' },
    { name: 'Productos en catálogo', value: stats.products.toString(), icon: Package, color: 'text-[var(--success)]' },
    { name: 'Tiempo promedio', value: '-', icon: Clock, color: 'text-[var(--ai)]' },
  ];

  return (
    <>
      <Header
        title="Dashboard"
        description="Vista general de tu actividad"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href="/products">
                <Upload className="mr-2 h-4 w-4" />
                Subir productos
              </Link>
            </Button>
            <Button asChild>
              <Link href="/clients/new">
                <Plus className="mr-2 h-4 w-4" />
                Añadir cliente
              </Link>
            </Button>
          </div>
        }
      />

      <div className="p-6 space-y-8">
        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {statsCards.map((stat) => (
            <Card key={stat.name}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.name}
                </CardTitle>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                ) : (
                  <div className="text-2xl font-bold">{stat.value}</div>
                )}
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                  {stat.name}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Clientes recientes */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold">Clientes recientes</h2>
              <p className="text-sm text-muted-foreground">
                Continúa donde lo dejaste
              </p>
            </div>
            <Button variant="ghost" asChild>
              <Link href="/clients">Ver todos</Link>
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {clients.map((client: Client) => (
              <ClientCard
                key={client.id}
                client={client}
                onSelect={handleSelectClient}
                onEdit={(c) => router.push(`/clients/${c.id}/edit`)}
              />
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Acciones rápidas</h2>
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="cursor-pointer transition-all hover:shadow-md hover:border-primary/50">
              <Link href="/clients/new">
                <CardHeader>
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 mb-2">
                    <Users className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-base">Nuevo cliente</CardTitle>
                  <CardDescription>
                    Registra un nuevo cliente y comienza el proceso de presupuestación
                  </CardDescription>
                </CardHeader>
              </Link>
            </Card>

            <Card className="cursor-pointer transition-all hover:shadow-md hover:border-primary/50">
              <Link href="/products/import">
                <CardHeader>
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[var(--success)]/10 mb-2">
                    <Upload className="h-6 w-6 text-[var(--success)]" />
                  </div>
                  <CardTitle className="text-base">Importar productos</CardTitle>
                  <CardDescription>
                    Sube un archivo CSV con tu catálogo de productos y servicios
                  </CardDescription>
                </CardHeader>
              </Link>
            </Card>

            <Card className="cursor-pointer transition-all hover:shadow-md hover:border-primary/50">
              <Link href="/budgets">
                <CardHeader>
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[var(--ai)]/10 mb-2">
                    <FileText className="h-6 w-6 text-[var(--ai)]" />
                  </div>
                  <CardTitle className="text-base">Ver presupuestos</CardTitle>
                  <CardDescription>
                    Revisa y gestiona todos los presupuestos generados
                  </CardDescription>
                </CardHeader>
              </Link>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
