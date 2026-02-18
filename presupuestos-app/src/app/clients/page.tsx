'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, Search, Filter, Loader2 } from 'lucide-react';
import { Header } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ClientCard } from '@/components/clients';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useClientsStore } from '@/store';
import type { Client, ClientStatus } from '@/types';

export default function ClientsPage() {
  const router = useRouter();
  const { selectClient } = useClientsStore();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Cargar clientes desde la API
  useEffect(() => {
    async function fetchClients() {
      try {
        const res = await fetch('/api/clients');
        const data = await res.json();
        if (data.success) {
          setClients(data.data.map((c: Record<string, unknown>) => ({
            ...c,
            createdAt: new Date(c.createdAt as string),
            updatedAt: new Date(c.updatedAt as string),
          })));
        }
      } catch (error) {
        console.error('Error fetching clients:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchClients();
  }, []);
  const [statusFilter, setStatusFilter] = useState<ClientStatus | 'all'>('all');

  const filteredClients = clients.filter((client: Client) => {
    const matchesSearch =
      client.name.toLowerCase().includes(search.toLowerCase()) ||
      client.company?.toLowerCase().includes(search.toLowerCase()) ||
      client.email?.toLowerCase().includes(search.toLowerCase());

    const matchesStatus =
      statusFilter === 'all' || client.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const handleSelectClient = (client: Client) => {
    selectClient(client);
    router.push(`/clients/${client.id}`);
  };

  return (
    <>
      <Header
        title="Clientes"
        description={`${clients.length} clientes registrados`}
        actions={
          <Button asChild>
            <Link href="/clients/new">
              <Plus className="mr-2 h-4 w-4" />
              Nuevo cliente
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
              placeholder="Buscar clientes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select
              value={statusFilter}
              onValueChange={(value) =>
                setStatusFilter(value as ClientStatus | 'all')
              }
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filtrar por estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="NUEVO">Nuevo</SelectItem>
                <SelectItem value="EN_PROCESO">En proceso</SelectItem>
                <SelectItem value="PRESUPUESTADO">Presupuestado</SelectItem>
                <SelectItem value="CERRADO">Cerrado</SelectItem>
                <SelectItem value="ARCHIVADO">Archivado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Client Grid */}
        {filteredClients.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredClients.map((client) => (
              <ClientCard
                key={client.id}
                client={client}
                onSelect={handleSelectClient}
                onEdit={(c) => router.push(`/clients/${c.id}/edit`)}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-4">
              <Search className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="font-semibold">No se encontraron clientes</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {search
                ? 'Prueba con otros términos de búsqueda'
                : 'Añade tu primer cliente para comenzar'}
            </p>
            {!search && (
              <Button asChild className="mt-4">
                <Link href="/clients/new">
                  <Plus className="mr-2 h-4 w-4" />
                  Añadir cliente
                </Link>
              </Button>
            )}
          </div>
        )}
      </div>
    </>
  );
}
