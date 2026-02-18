'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, Loader2, Package } from 'lucide-react';
import { Header } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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

export default function NewProductPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    internalReference: '',
    category: '',
    descriptionPublic: '',
    price: '',
    cost: '',
    estimatedHours: '',
      });

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      // Validación básica
      if (!formData.name.trim()) {
        throw new Error('El nombre es obligatorio');
      }
      if (!formData.price || parseFloat(formData.price) <= 0) {
        throw new Error('El precio debe ser mayor que 0');
      }

      const payload = {
        name: formData.name.trim(),
        internalReference: formData.internalReference.trim() || null,
        category: formData.category || 'Otros',
        descriptionPublic: formData.descriptionPublic.trim() || null,
        price: parseFloat(formData.price),
        cost: formData.cost ? parseFloat(formData.cost) : null,
        estimatedHours: formData.estimatedHours ? parseFloat(formData.estimatedHours) : null,
      };

      const response = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al crear el producto');
      }

      router.push('/products');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container py-8 max-w-2xl">
        <Button variant="ghost" className="mb-6" asChild>
          <Link href="/products">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver a productos
          </Link>
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Nuevo Producto
            </CardTitle>
            <CardDescription>
              Añade un nuevo producto o servicio al catálogo
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm">
                  {error}
                </div>
              )}

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Nombre *</Label>
                  <Input
                    id="name"
                    placeholder="Ej: Integración API WhatsApp"
                    value={formData.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reference">Referencia</Label>
                  <Input
                    id="reference"
                    placeholder="Ej: INT-WA-001"
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
                  placeholder="Descripción detallada del producto o servicio..."
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
                    placeholder="0.00"
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
                    placeholder="0.00"
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
                  {isSubmitting ? 'Guardando...' : 'Guardar producto'}
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
