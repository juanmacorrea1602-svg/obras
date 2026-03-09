"use client"

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useFirebase, addDocumentNonBlocking } from '@/firebase';
import { collection } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Save, Gavel, Percent } from 'lucide-react';

export default function NewTenderPage() {
  const { user, firestore } = useFirebase();
  const { toast } = useToast();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    location: '',
    totalBudgetAmount: '',
    marginPercentage: '15', // Margen por defecto
    currentStatus: 'LICITACION'
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async () => {
    if (!user || !firestore) return;
    if (!formData.name || !formData.totalBudgetAmount) {
      toast({ variant: 'destructive', title: 'Error', description: 'Nombre y Presupuesto son obligatorios.' });
      return;
    }

    setLoading(true);
    try {
      const tenderData = {
        ...formData,
        totalBudgetAmount: Number(formData.totalBudgetAmount),
        marginPercentage: Number(formData.marginPercentage),
        responsibleAnalystId: user.uid,
        projectMembers: { [user.uid]: 'admin' },
        creationDate: new Date().toISOString(),
        startDate: new Date().toISOString(),
        plannedEndDate: new Date().toISOString(),
      };

      await addDocumentNonBlocking(collection(firestore, 'projects'), tenderData);
      
      toast({ title: 'Licitación Creada', description: 'El estudio de costos ha sido registrado.' });
      router.push('/tenders');
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Fallo al guardar la licitación.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 p-2 rounded-lg">
            <Gavel className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Nuevo Estudio de Costos</h1>
            <p className="text-muted-foreground">Configuración inicial para licitación</p>
          </div>
        </div>
        <Button variant="outline" onClick={() => router.back()}>Cancelar</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Identificación del Proyecto</CardTitle>
          <CardDescription>Datos básicos para la propuesta comercial.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Nombre de la Licitación</Label>
            <Input id="name" name="name" placeholder="Ej: Licitación Pública Edificio Central" value={formData.name} onChange={handleInputChange} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="location">Ubicación</Label>
            <Input id="location" name="location" placeholder="Ciudad, Provincia..." value={formData.location} onChange={handleInputChange} />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="totalBudgetAmount">Precio Objetivo de Venta ($)</Label>
              <Input id="totalBudgetAmount" name="totalBudgetAmount" type="number" placeholder="0.00" value={formData.totalBudgetAmount} onChange={handleInputChange} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="marginPercentage">Margen de Beneficio Proyectado (%)</Label>
              <div className="relative">
                <Input id="marginPercentage" name="marginPercentage" type="number" placeholder="15" className="pr-8" value={formData.marginPercentage} onChange={handleInputChange} />
                <Percent className="absolute right-3 top-3 w-4 h-4 text-muted-foreground" />
              </div>
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="description">Notas de la Propuesta</Label>
            <Textarea id="description" name="description" placeholder="Detalles técnicos o condiciones comerciales..." value={formData.description} onChange={handleInputChange} />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-4">
        <Button variant="outline" onClick={() => router.back()}>Descartar</Button>
        <Button className="gap-2 bg-primary" onClick={handleSubmit} disabled={loading}>
          {loading ? 'Guardando...' : <Save className="w-4 h-4" />} Guardar Licitación
        </Button>
      </div>
    </div>
  );
}
