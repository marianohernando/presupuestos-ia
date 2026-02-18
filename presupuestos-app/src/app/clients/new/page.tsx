'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, Building2, Mail, Phone, FileText } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Header } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { createClientSchema, type CreateClientInput } from '@/lib/validations';
import { toast } from 'sonner';

export default function NewClientPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<CreateClientInput>({
    resolver: zodResolver(createClientSchema),
    defaultValues: {
      name: '',
      company: '',
      email: '',
      phone: '',
      notes: '',
    },
  });

  const onSubmit = async (data: CreateClientInput) => {
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Error al crear cliente');
      }

      const result = await response.json();
      toast.success('Cliente creado correctamente');
      router.push(`/clients/${result.data.id}`);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al crear el cliente');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Header
        title="Nuevo cliente"
        description="Registra un nuevo cliente para comenzar el proceso de presupuestación"
        actions={
          <Button variant="outline" asChild>
            <Link href="/clients">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver
            </Link>
          </Button>
        }
      />

      <div className="p-6 max-w-2xl mx-auto">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Información básica</CardTitle>
                <CardDescription>
                  Datos del cliente o empresa
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre del contacto *</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input 
                            placeholder="Juan García" 
                            {...field} 
                            className="pl-9"
                          />
                          <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="company"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Empresa</FormLabel>
                      <FormControl>
                        <Input placeholder="Nombre de la empresa" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input 
                              type="email"
                              placeholder="email@empresa.com" 
                              {...field} 
                              className="pl-9"
                            />
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Teléfono</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input 
                              placeholder="+34 600 000 000" 
                              {...field} 
                              className="pl-9"
                            />
                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Notas iniciales</CardTitle>
                <CardDescription>
                  Información adicional sobre el cliente o el proyecto
                </CardDescription>
              </CardHeader>
              <CardContent>
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <div className="relative">
                          <Textarea 
                            placeholder="Contexto del cliente, necesidades identificadas, origen del lead..."
                            className="min-h-[120px] pl-9 pt-3"
                            {...field} 
                          />
                          <FileText className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        </div>
                      </FormControl>
                      <FormDescription>
                        Estas notas se usarán como contexto inicial para la IA
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <div className="flex justify-end gap-3">
              <Button 
                type="button" 
                variant="outline"
                onClick={() => router.push('/clients')}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  'Guardando...'
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Crear cliente
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </>
  );
}
