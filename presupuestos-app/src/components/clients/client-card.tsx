'use client';

import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { Building2, Mail, Phone, ArrowRight, MoreVertical } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import type { Client, ClientStatus, FlowType } from '@/types';

interface ClientCardProps {
  client: Client;
  onSelect?: (client: Client) => void;
  onEdit?: (client: Client) => void;
  onArchive?: (client: Client) => void;
}

const statusConfig: Record<ClientStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  NUEVO: { label: 'Nuevo', variant: 'default' },
  EN_PROCESO: { label: 'En proceso', variant: 'secondary' },
  PENDIENTE_CONSULTORIA: { label: 'Pendiente consultoría', variant: 'outline' },
  PRESUPUESTADO: { label: 'Presupuestado', variant: 'outline' },
  CERRADO: { label: 'Cerrado', variant: 'default' },
  ARCHIVADO: { label: 'Archivado', variant: 'destructive' },
};

const flowTypeConfig: Record<FlowType, { label: string; color: string }> = {
  CONSULTORIA: { label: 'Consultoría', color: 'bg-[var(--consultoria)]' },
  DIAGNOSTICO: { label: 'Diagnóstico', color: 'bg-[var(--diagnostic)]' },
};

export function ClientCard({ client, onSelect, onEdit, onArchive }: ClientCardProps) {
  const status = statusConfig[client.status];
  const flowType = client.flowType ? flowTypeConfig[client.flowType] : null;

  return (
    <Card className="group relative overflow-hidden transition-all hover:shadow-md">
      {/* Accent lateral según tipo de flujo */}
      {flowType && (
        <div className={cn('absolute left-0 top-0 h-full w-1', flowType.color)} />
      )}
      
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div className="space-y-1">
          <h3 className="font-semibold leading-none text-foreground">
            {client.name}
          </h3>
          {client.company && (
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Building2 className="h-3.5 w-3.5" />
              {client.company}
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <Badge variant={status.variant}>{status.label}</Badge>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 opacity-0 transition-opacity group-hover:opacity-100"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit?.(client)}>
                Editar
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => onArchive?.(client)}
                className="text-destructive"
              >
                Archivar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className="pb-2">
        <div className="flex flex-col gap-1 text-sm text-muted-foreground">
          {client.email && (
            <div className="flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5" />
              <span className="truncate">{client.email}</span>
            </div>
          )}
          {client.phone && (
            <div className="flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5" />
              <span>{client.phone}</span>
            </div>
          )}
        </div>
        
        {flowType && (
          <Badge 
            variant="outline" 
            className="mt-3"
          >
            {flowType.label}
          </Badge>
        )}
      </CardContent>

      <CardFooter className="flex items-center justify-between pt-2">
        <span className="text-xs text-muted-foreground">
          {formatDistanceToNow(new Date(client.updatedAt), { 
            addSuffix: true,
            locale: es 
          })}
        </span>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onSelect?.(client)}
          className="gap-1"
        >
          Continuar
          <ArrowRight className="h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  );
}
