'use client';

import { Package, Clock, Tag, MoreVertical, Pencil } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Product } from '@/types';

interface ProductCardProps {
  product: Product;
  onEdit?: (product: Product) => void;
  onToggleActive?: (product: Product) => void;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount);
}

export function ProductCard({ product, onEdit, onToggleActive }: ProductCardProps) {
  return (
    <Card className="group relative overflow-hidden transition-all hover:shadow-md">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Package className="h-5 w-5 text-primary" />
          </div>
          <div className="space-y-1">
            <h3 className="font-semibold leading-none text-foreground">
              {product.name}
            </h3>
            {product.descriptionPublic && (
              <p className="line-clamp-2 text-sm text-muted-foreground">
                {product.descriptionPublic}
              </p>
            )}
          </div>
        </div>

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
            <DropdownMenuItem onClick={() => onEdit?.(product)}>
              <Pencil className="mr-2 h-4 w-4" />
              Editar
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onToggleActive?.(product)}>
              {product.isActive ? 'Desactivar' : 'Activar'}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>

      <CardContent className="pb-2">
        <div className="flex flex-wrap gap-1">
          {product.tags.slice(0, 4).map((tag) => (
            <Badge key={tag} variant="secondary" className="text-xs">
              <Tag className="mr-1 h-3 w-3" />
              {tag}
            </Badge>
          ))}
          {product.tags.length > 4 && (
            <Badge variant="outline" className="text-xs">
              +{product.tags.length - 4}
            </Badge>
          )}
        </div>
      </CardContent>

      <CardFooter className="flex items-center justify-between border-t pt-3">
        <div className="flex items-center gap-4 text-sm">
          <span className="font-semibold text-foreground">
            {formatCurrency(product.price)}
          </span>
          {product.estimatedHours && (
            <span className="flex items-center gap-1 text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              {product.estimatedHours}h
            </span>
          )}
        </div>
        
        {!product.isActive && (
          <Badge variant="outline" className="text-muted-foreground">
            Inactivo
          </Badge>
        )}
      </CardFooter>
    </Card>
  );
}
