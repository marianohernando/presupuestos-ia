'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Papa from 'papaparse';
import { 
  Upload, 
  FileSpreadsheet, 
  Check, 
  X, 
  AlertCircle,
  ArrowLeft,
  Package,
  Clock,
  Tag,
  ChevronDown,
  ChevronUp,
  Pencil,
  Save
} from 'lucide-react';
import { Header } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  csvProductRowSchema, 
  transformCSVToProduct,
  type CSVProductRow,
  type TransformedProduct 
} from '@/lib/validations';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

type ImportState = 'idle' | 'parsing' | 'preview' | 'importing' | 'complete' | 'error';

interface ParsedProduct extends TransformedProduct {
  _rowIndex: number;
  _valid: boolean;
  _errors: string[];
  _expanded?: boolean;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount);
}

export default function ImportProductsPage() {
  const router = useRouter();
  const [state, setState] = useState<ImportState>('idle');
  const [fileName, setFileName] = useState<string>('');
  const [products, setProducts] = useState<ParsedProduct[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<Set<number>>(new Set());
  const [importProgress, setImportProgress] = useState(0);
  const [stats, setStats] = useState({ total: 0, valid: 0, invalid: 0, new: 0, existing: 0 });

  const handleFileSelect = useCallback((file: File) => {
    setFileName(file.name);
    setState('parsing');

    Papa.parse<CSVProductRow>(file, {
      header: true,
      skipEmptyLines: true,
      newline: '\n',
      quoteChar: '"',
      escapeChar: '"',
      complete: (results) => {
        const parsed: ParsedProduct[] = [];
        let valid = 0;
        let invalid = 0;

        results.data.forEach((row, index) => {
          const errors: string[] = [];
          
          // Validar con Zod
          const validation = csvProductRowSchema.safeParse(row);
          if (!validation.success) {
            validation.error.issues.forEach(issue => {
              errors.push(`${issue.path.join('.')}: ${issue.message}`);
            });
          }

          // Transformar
          const transformed = transformCSVToProduct(row);
          
          // Validaciones adicionales
          if (!transformed.name || transformed.name.trim() === '') {
            errors.push('El nombre es obligatorio');
          }
          if (transformed.price <= 0 && !transformed.name?.includes('Discovery')) {
            errors.push('El precio debe ser mayor a 0');
          }

          const isValid = errors.length === 0;
          if (isValid) valid++;
          else invalid++;

          parsed.push({
            ...transformed,
            _rowIndex: index + 1,
            _valid: isValid,
            _errors: errors,
          });
        });

        setProducts(parsed);
        setSelectedProducts(new Set(parsed.filter(p => p._valid).map(p => p._rowIndex)));
        setStats({
          total: parsed.length,
          valid,
          invalid,
          new: valid, // TODO: comparar con BD para detectar existentes
          existing: 0,
        });
        setState('preview');
      },
      error: (error) => {
        console.error('CSV Parse Error:', error);
        toast.error('Error al parsear el archivo CSV');
        setState('error');
      },
    });
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.name.endsWith('.csv')) {
      handleFileSelect(file);
    } else {
      toast.error('Por favor, sube un archivo CSV');
    }
  }, [handleFileSelect]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  }, [handleFileSelect]);

  const toggleProduct = (rowIndex: number) => {
    const newSelected = new Set(selectedProducts);
    if (newSelected.has(rowIndex)) {
      newSelected.delete(rowIndex);
    } else {
      newSelected.add(rowIndex);
    }
    setSelectedProducts(newSelected);
  };

  const toggleAll = () => {
    if (selectedProducts.size === products.filter(p => p._valid).length) {
      setSelectedProducts(new Set());
    } else {
      setSelectedProducts(new Set(products.filter(p => p._valid).map(p => p._rowIndex)));
    }
  };

  // Expandir/colapsar producto para edición
  const toggleExpand = (rowIndex: number) => {
    setProducts(prev => prev.map(p => 
      p._rowIndex === rowIndex 
        ? { ...p, _expanded: !p._expanded }
        : p
    ));
  };

  // Actualizar campo de un producto (sin validar - solo actualiza el valor)
  const updateProductField = (rowIndex: number, field: keyof ParsedProduct, value: string | number) => {
    setProducts(prev => prev.map(p => {
      if (p._rowIndex !== rowIndex) return p;
      return { ...p, [field]: value };
    }));
  };

  // Validar producto (llamado al hacer blur o al guardar)
  const validateProduct = (rowIndex: number) => {
    setProducts(prev => prev.map(p => {
      if (p._rowIndex !== rowIndex) return p;
      
      // Re-validar
      const errors: string[] = [];
      if (!p.name || p.name.trim() === '') {
        errors.push('El nombre es obligatorio');
      }
      if (p.price <= 0 && !p.name?.includes('Discovery')) {
        errors.push('El precio debe ser mayor a 0');
      }
      
      const isValid = errors.length === 0;
      
      // Si ahora es válido, añadirlo a seleccionados
      if (isValid && !selectedProducts.has(rowIndex)) {
        setSelectedProducts(s => new Set([...s, rowIndex]));
      }
      
      return { ...p, _errors: errors, _valid: isValid };
    }));
    
    // Actualizar stats después
    setTimeout(() => {
      setProducts(current => {
        const validCount = current.filter(prod => prod._valid).length;
        setStats(s => ({
          ...s,
          valid: validCount,
          invalid: s.total - validCount,
        }));
        return current;
      });
    }, 0);
  };

  const handleImport = async () => {
    setState('importing');
    const toImport = products.filter(p => selectedProducts.has(p._rowIndex));
    
    try {
      // Preparar datos para la API
      const productsToImport = toImport.map(p => ({
        name: p.name,
        internalReference: p.internalReference,
        category: p.category,
        descriptionPublic: p.descriptionPublic,
        descriptionInternal: p.descriptionInternal,
        price: p.price,
        cost: p.cost,
        estimatedHours: p.estimatedHours,
        unitOfMeasure: p.unitOfMeasure,
        tags: p.tags,
      }));

      // Llamar a la API de importación
      const response = await fetch('/api/products/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          products: productsToImport,
          updateExisting: false 
        }),
      });

      if (!response.ok) {
        throw new Error('Error en la importación');
      }

      const result = await response.json();
      
      // Actualizar progreso
      setImportProgress(100);
      setState('complete');
      
      toast.success(
        `${result.data.created} productos importados, ${result.data.skipped} omitidos (ya existían)`
      );
    } catch (error) {
      console.error('Error importing products:', error);
      toast.error('Error al importar productos');
      setState('preview');
    }
  };

  return (
    <>
      <Header
        title="Importar productos"
        description="Sube un archivo CSV con tu catálogo de productos"
        actions={
          <Button variant="outline" asChild>
            <Link href="/products">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver
            </Link>
          </Button>
        }
      />

      <div className="p-6 max-w-5xl mx-auto space-y-6">
        {/* Estado: Idle - Zona de carga */}
        {state === 'idle' && (
          <Card>
            <CardHeader>
              <CardTitle>Subir archivo CSV</CardTitle>
              <CardDescription>
                Formato esperado: exportación de Odoo con columnas Name, Sales Price, Cost, Sales Description, etc.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                className="border-2 border-dashed border-border rounded-lg p-12 text-center hover:border-primary/50 hover:bg-muted/50 transition-colors cursor-pointer"
              >
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileInput}
                  className="hidden"
                  id="csv-upload"
                />
                <label htmlFor="csv-upload" className="cursor-pointer">
                  <div className="flex flex-col items-center gap-4">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                      <Upload className="h-8 w-8 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">Arrastra un archivo CSV aquí</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        o haz clic para seleccionar
                      </p>
                    </div>
                  </div>
                </label>
              </div>

              <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                <h4 className="font-medium text-sm mb-2">Columnas esperadas:</h4>
                <div className="flex flex-wrap gap-2">
                  {['Name', 'Sales Price', 'Cost', 'Product Category', 'Sales Description', 'Internal Description'].map(col => (
                    <Badge key={col} variant="secondary" className="text-xs">{col}</Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Estado: Parsing */}
        {state === 'parsing' && (
          <Card>
            <CardContent className="py-12">
              <div className="flex flex-col items-center gap-4">
                <div className="animate-spin">
                  <FileSpreadsheet className="h-12 w-12 text-primary" />
                </div>
                <p className="font-medium">Procesando {fileName}...</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Estado: Preview */}
        {state === 'preview' && (
          <>
            {/* Stats */}
            <div className="grid grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold">{stats.total}</div>
                  <p className="text-sm text-muted-foreground">Total productos</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold text-[var(--success)]">{stats.valid}</div>
                  <p className="text-sm text-muted-foreground">Válidos</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold text-destructive">{stats.invalid}</div>
                  <p className="text-sm text-muted-foreground">Con errores</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold text-primary">{selectedProducts.size}</div>
                  <p className="text-sm text-muted-foreground">Seleccionados</p>
                </CardContent>
              </Card>
            </div>

            {/* Lista de productos */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Vista previa</CardTitle>
                  <CardDescription>Revisa y selecciona los productos a importar</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={toggleAll}>
                  {selectedProducts.size === products.filter(p => p._valid).length 
                    ? 'Deseleccionar todos' 
                    : 'Seleccionar todos'}
                </Button>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px] pr-4">
                  <div className="space-y-2">
                    {products.map((product) => (
                      <div
                        key={product._rowIndex}
                        className={cn(
                          'rounded-lg border transition-colors',
                          product._valid 
                            ? 'hover:bg-muted/50' 
                            : 'bg-destructive/5 border-destructive/20',
                          selectedProducts.has(product._rowIndex) && 'bg-primary/5 border-primary/30'
                        )}
                      >
                        {/* Fila principal */}
                        <div 
                          className="flex items-start gap-3 p-3 cursor-pointer"
                          onClick={() => {
                            if (product._valid) {
                              toggleProduct(product._rowIndex);
                            } else {
                              toggleExpand(product._rowIndex);
                            }
                          }}
                        >
                          {/* Checkbox */}
                          <div className={cn(
                            'flex h-5 w-5 shrink-0 items-center justify-center rounded border mt-0.5',
                            selectedProducts.has(product._rowIndex) 
                              ? 'bg-primary border-primary' 
                              : 'border-input',
                            !product._valid && 'opacity-50'
                          )}>
                            {selectedProducts.has(product._rowIndex) && (
                              <Check className="h-3 w-3 text-primary-foreground" />
                            )}
                          </div>

                          {/* Contenido */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <Package className="h-4 w-4 text-muted-foreground shrink-0" />
                                <span className="font-medium truncate">{product.name}</span>
                              </div>
                              <span className={cn(
                                "font-semibold shrink-0",
                                product.price <= 0 && "text-destructive"
                              )}>
                                {formatCurrency(product.price)}
                              </span>
                            </div>

                            {product.descriptionPublic && (
                              <p className="text-sm text-muted-foreground line-clamp-1 mt-1">
                                {product.descriptionPublic.split('\n')[0]}
                              </p>
                            )}

                            <div className="flex items-center gap-3 mt-2">
                              {product.estimatedHours && (
                                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <Clock className="h-3 w-3" />
                                  {product.estimatedHours}h
                                </span>
                              )}
                              {product.tags.slice(0, 3).map((tag) => (
                                <Badge key={tag} variant="secondary" className="text-xs">
                                  <Tag className="h-2.5 w-2.5 mr-1" />
                                  {tag}
                                </Badge>
                              ))}
                            </div>

                            {/* Errores con hint de edición */}
                            {product._errors.length > 0 && (
                              <div className="flex items-center justify-between mt-2">
                                <div className="flex items-start gap-2 text-destructive">
                                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                                  <div className="text-xs">
                                    {product._errors.map((err, i) => (
                                      <div key={i}>{err}</div>
                                    ))}
                                  </div>
                                </div>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="text-xs h-7 text-primary"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleExpand(product._rowIndex);
                                  }}
                                >
                                  <Pencil className="h-3 w-3 mr-1" />
                                  {product._expanded ? 'Cerrar' : 'Editar'}
                                </Button>
                              </div>
                            )}
                          </div>

                          {/* Status icon */}
                          <div className="shrink-0">
                            {product._valid ? (
                              <Check className="h-5 w-5 text-[var(--success)]" />
                            ) : (
                              product._expanded ? (
                                <ChevronUp className="h-5 w-5 text-muted-foreground" />
                              ) : (
                                <ChevronDown className="h-5 w-5 text-destructive" />
                              )
                            )}
                          </div>
                        </div>

                        {/* Panel de edición expandible */}
                        {product._expanded && !product._valid && (
                          <div className="px-4 pb-4 pt-2 border-t border-destructive/20 bg-background/50">
                            <div className="grid grid-cols-2 gap-4">
                              {/* Nombre */}
                              <div className="col-span-2">
                                <Label htmlFor={`name-${product._rowIndex}`} className="text-xs font-medium">
                                  Nombre *
                                </Label>
                                <Input
                                  id={`name-${product._rowIndex}`}
                                  value={product.name || ''}
                                  onChange={(e) => updateProductField(product._rowIndex, 'name', e.target.value)}
                                  onBlur={() => validateProduct(product._rowIndex)}
                                  placeholder="Nombre del producto"
                                  className="mt-1 h-9"
                                />
                              </div>

                              {/* Precio */}
                              <div>
                                <Label htmlFor={`price-${product._rowIndex}`} className="text-xs font-medium">
                                  Precio (€) *
                                </Label>
                                <Input
                                  id={`price-${product._rowIndex}`}
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={product.price === 0 ? '' : product.price}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    updateProductField(product._rowIndex, 'price', val === '' ? 0 : parseFloat(val));
                                  }}
                                  onBlur={() => validateProduct(product._rowIndex)}
                                  placeholder="0.00"
                                  className="mt-1 h-9"
                                />
                              </div>

                              {/* Coste */}
                              <div>
                                <Label htmlFor={`cost-${product._rowIndex}`} className="text-xs font-medium">
                                  Coste (€)
                                </Label>
                                <Input
                                  id={`cost-${product._rowIndex}`}
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={product.cost === 0 ? '' : product.cost || ''}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    updateProductField(product._rowIndex, 'cost', val === '' ? 0 : parseFloat(val));
                                  }}
                                  placeholder="0.00"
                                  className="mt-1 h-9"
                                />
                              </div>

                              {/* Horas estimadas */}
                              <div>
                                <Label htmlFor={`hours-${product._rowIndex}`} className="text-xs font-medium">
                                  Horas estimadas
                                </Label>
                                <Input
                                  id={`hours-${product._rowIndex}`}
                                  type="number"
                                  min="0"
                                  step="0.5"
                                  value={product.estimatedHours === 0 ? '' : product.estimatedHours || ''}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    updateProductField(product._rowIndex, 'estimatedHours', val === '' ? 0 : parseFloat(val));
                                  }}
                                  placeholder="0"
                                  className="mt-1 h-9"
                                />
                              </div>

                              {/* Botón guardar */}
                              <div className="flex items-end">
                                <Button 
                                  size="sm" 
                                  className="w-full"
                                  onClick={() => {
                                    validateProduct(product._rowIndex);
                                    // Cerrar si es válido después de un momento
                                    setTimeout(() => {
                                      setProducts(current => {
                                        const prod = current.find(p => p._rowIndex === product._rowIndex);
                                        if (prod?._valid) {
                                          toggleExpand(product._rowIndex);
                                          toast.success('Producto corregido');
                                        }
                                        return current;
                                      });
                                    }, 50);
                                  }}
                                >
                                  <Save className="h-3.5 w-3.5 mr-1" />
                                  Guardar
                                </Button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Acciones */}
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => {
                setState('idle');
                setProducts([]);
                setSelectedProducts(new Set());
              }}>
                Cancelar
              </Button>
              <Button 
                onClick={handleImport}
                disabled={selectedProducts.size === 0}
              >
                Importar {selectedProducts.size} productos
              </Button>
            </div>
          </>
        )}

        {/* Estado: Importing */}
        {state === 'importing' && (
          <Card>
            <CardContent className="py-12">
              <div className="flex flex-col items-center gap-4">
                <FileSpreadsheet className="h-12 w-12 text-primary" />
                <p className="font-medium">Importando productos...</p>
                <div className="w-full max-w-xs">
                  <Progress value={importProgress} className="h-2" />
                </div>
                <p className="text-sm text-muted-foreground">{importProgress}%</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Estado: Complete */}
        {state === 'complete' && (
          <Card>
            <CardContent className="py-12">
              <div className="flex flex-col items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--success)]/10">
                  <Check className="h-8 w-8 text-[var(--success)]" />
                </div>
                <div className="text-center">
                  <p className="font-semibold text-lg">Importación completada</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {selectedProducts.size} productos añadidos al catálogo
                  </p>
                </div>
                <div className="flex gap-3 mt-4">
                  <Button variant="outline" onClick={() => {
                    setState('idle');
                    setProducts([]);
                    setSelectedProducts(new Set());
                  }}>
                    Importar más
                  </Button>
                  <Button onClick={() => router.push('/products')}>
                    Ver catálogo
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}
