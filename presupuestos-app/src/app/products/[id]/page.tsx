'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, Loader2, Package, Trash2, Copy } from 'lucide-react';
import { Header } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

const CATEGORIES = [
  'Automatización',
  'IA',
  'Integraciones',
  'Consultoría',
  'Desarrollo',
  'Mantenimiento',
  'Formación',
  'Otros',
];

interface Product {
  id: string;
  name: string;
  internalReference: string | null;
  category: string | null;
  descriptionPublic: string | null;
  price: number;
  cost: number | null;
  estimatedHours: number | null;
  isActive: boolean;
}

export default function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    internalReference: '',
    category: '',
    descriptionPublic: '',
    price: '',
    cost: '',
    estimatedHours: '',
    isActive: true,
  });

  useEffect(() => {
    const loadProduct = async () => {
      try {
        const response = await fetch(`/api/products/${id}`);
        if (!response.ok) throw new Error('Producto no encontrado');
        
        const data = await response.json();
        const product: Product = data.data;
        
        setFormData({
          name: product.name,
          internalReference: product.internalReference || '',
          category: product.category || '',
          descriptionPublic: product.descriptionPublic || '',
          price: String(product.price),
          cost: product.cost ? String(product.cost) : '',
          estimatedHours: product.estimatedHours ? String(product.estimatedHours) : '',
          isActive: product.isActive,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al cargar');
      } finally {
        setIsLoading(false);
      }
    };

    loadProduct();
  }, [id]);

  const handleChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      if (!formData.name.trim()) {
        throw new Error('El nombre es obligatorio');
      }

      const payload = {
        name: formData.name.trim(),
        reference: formData.internalReference.trim() || null,
        category: formData.category || 'Otros',
        description: formData.descriptionPublic.trim() || null,
        price: parseFloat(formData.price),
        cost: formData.cost ? parseFloat(formData.cost) : null,
        hoursMin: formData.estimatedHours ? parseFloat(formData.estimatedHours) : null,
        hoursMax: formData.estimatedHours ? parseFloat(formData.estimatedHours) : null,
        isActive: formData.isActive,
      };

      const response = await fetch(`/api/products/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error al actualizar');
      }

      router.push('/products');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('¿Estás seguro de eliminar este producto?')) return;
    
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/products/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Error al eliminar');
      
      router.push('/products');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar');
      setIsDeleting(false);
    }
  };

  const handleDuplicate = async () => {
    try {
      const payload = {
        name: `${formData.name} (copia)`,
        reference: formData.internalReference ? `${formData.internalReference}-COPY` : null,
        category: formData.category || 'Otros',
        description: formData.descriptionPublic || null,
        price: parseFloat(formData.price),
        cost: formData.cost ? parseFloat(formData.cost) : null,
        hoursMin: formData.estimatedHours ? parseFloat(formData.estimatedHours) : null,
        hoursMax: formData.estimatedHours ? parseFloat(formData.estimatedHours) : null,
      };

      const response = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error('Error al duplicar');
      
      const data = await response.json();
      router.push(`/products/${data.data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al duplicar');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container py-8 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container py-8 max-w-2xl">
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" asChild>
            <Link href="/products">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver a productos
            </Link>
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleDuplicate}>
              <Copy className="mr-2 h-4 w-4" />
              Duplicar
            </Button>
            <Button 
              variant="destructive" 
              size="sm" 
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              Eliminar
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Editar Producto
            </CardTitle>
            <CardDescription>
              Modifica los datos del producto
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm">
                  {error}
                </div>
              )}

              <div className="flex items-center justify-between p-4 rounded-lg border">
                <div>
                  <Label htmlFor="isActive">Producto activo</Label>
                  <p className="text-sm text-muted-foreground">
                    Los productos inactivos no aparecen en el catálogo
                  </p>
                </div>
                <Switch
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked: boolean) => handleChange('isActive', checked)}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Nombre *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reference">Referencia</Label>
                  <Input
                    id="reference"
                    value={formData.internalReference}
                    onChange={(e) => handleChange('internalReference', e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Categoría</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => handleChange('category', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descripción</Label>
                <Textarea
                  id="description"
                  value={formData.descriptionPublic}
                  onChange={(e) => handleChange('descriptionPublic', e.target.value)}
                  rows={4}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="price">Precio (€) *</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.price}
                    onChange={(e) => handleChange('price', e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cost">Coste (€)</Label>
                  <Input
                    id="cost"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.cost}
                    onChange={(e) => handleChange('cost', e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="estimatedHours">Horas estimadas</Label>
                <Input
                  id="estimatedHours"
                  type="number"
                  step="0.5"
                  min="0"
                  placeholder="0"
                  value={formData.estimatedHours}
                  onChange={(e) => handleChange('estimatedHours', e.target.value)}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  {isSubmitting ? 'Guardando...' : 'Guardar cambios'}
                </Button>
                <Button type="button" variant="outline" asChild>
                  <Link href="/products">Cancelar</Link>
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
