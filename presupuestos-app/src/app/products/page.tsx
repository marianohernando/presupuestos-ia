'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, Search, Upload, Filter } from 'lucide-react';
import { Header } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ProductCard } from '@/components/products';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Product } from '@/types';

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [tagFilter, setTagFilter] = useState<string>('all');
  const [showInactive, setShowInactive] = useState(false);

  // Cargar productos desde la API
  useEffect(() => {
    async function fetchProducts() {
      try {
        const res = await fetch('/api/products');
        const data = await res.json();
        if (data.success) {
          setProducts(data.data.map((p: Record<string, unknown>) => ({
            ...p,
            price: Number(p.price),
            cost: p.cost ? Number(p.cost) : undefined,
            estimatedHours: p.estimatedHours ? Number(p.estimatedHours) : undefined,
            createdAt: new Date(p.createdAt as string),
            updatedAt: new Date(p.updatedAt as string),
          })));
        }
      } catch (error) {
        console.error('Error fetching products:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchProducts();
  }, []);

  // Obtener todos los tags únicos
  const allTags = [...new Set(products.flatMap((p) => p.tags || []))].sort();

  const filteredProducts = products.filter((product: Product) => {
    const matchesSearch =
      product.name.toLowerCase().includes(search.toLowerCase()) ||
      product.descriptionPublic?.toLowerCase().includes(search.toLowerCase());

    const matchesTag =
      tagFilter === 'all' || product.tags.includes(tagFilter);

    const matchesActive = showInactive || product.isActive;

    return matchesSearch && matchesTag && matchesActive;
  });

  return (
    <>
      <Header
        title="Productos"
        description={`${products.filter((p: Product) => p.isActive).length} productos activos en catálogo`}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href="/products/import">
                <Upload className="mr-2 h-4 w-4" />
                Importar CSV
              </Link>
            </Button>
            <Button asChild>
              <Link href="/products/new">
                <Plus className="mr-2 h-4 w-4" />
                Nuevo producto
              </Link>
            </Button>
          </div>
        }
      />

      <div className="p-6 space-y-6">
        {/* Filters */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar productos..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={tagFilter} onValueChange={setTagFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filtrar por tag" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los tags</SelectItem>
                  {allTags.map((tag) => (
                    <SelectItem key={tag} value={tag}>
                      {tag}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={showInactive}
                onChange={(e) => setShowInactive(e.target.checked)}
                className="rounded border-input"
              />
              <span className="text-muted-foreground">Mostrar inactivos</span>
            </label>
          </div>
        </div>

        {/* Products Grid */}
        {filteredProducts.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onEdit={(p) => console.log('Edit:', p.id)}
                onToggleActive={(p) => console.log('Toggle:', p.id)}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-4">
              <Search className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="font-semibold">No se encontraron productos</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {search
                ? 'Prueba con otros términos de búsqueda'
                : 'Añade productos manualmente o importa un CSV'}
            </p>
            <div className="flex gap-2 mt-4">
              <Button variant="outline" asChild>
                <Link href="/products/import">
                  <Upload className="mr-2 h-4 w-4" />
                  Importar CSV
                </Link>
              </Button>
              <Button asChild>
                <Link href="/products/new">
                  <Plus className="mr-2 h-4 w-4" />
                  Nuevo producto
                </Link>
              </Button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
