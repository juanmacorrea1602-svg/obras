
"use client"

import { useState, use, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useFirebase, useDoc, useCollection, useMemoFirebase, updateDocumentNonBlocking, addDocumentNonBlocking } from '@/firebase';
import { doc, collection, increment } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Calculator, ArrowLeft, Loader2, Save, Gavel, Percent, CheckCircle2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function TenderDetailPage({ params }: { params: Promise<{ tenderId: string }> }) {
  const { tenderId } = use(params);
  const searchParams = useSearchParams();
  const defaultTab = searchParams.get('tab') || 'pricing';
  
  const { user, firestore } = useFirebase();
  const { toast } = useToast();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [isPromoting, setIsPromoting] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const tenderRef = useMemoFirebase(() => firestore ? doc(firestore, 'projects', tenderId) : null, [firestore, tenderId]);
  const budgetRef = useMemoFirebase(() => firestore ? collection(firestore, `projects/${tenderId}/budgetItems`) : null, [firestore, tenderId]);

  const { data: tender, isLoading: tenderLoading } = useDoc(tenderRef);
  const { data: budgetItems } = useCollection(budgetRef);

  if (!mounted) return null;

  const totalMarketCost = budgetItems?.reduce((acc, item) => acc + (item.budgetedTotalAmount || 0), 0) || 0;
  const currentMargin = tender?.marginPercentage || 0;
  const totalPriceOffer = totalMarketCost * (1 + currentMargin / 100);

  const handlePromoteToProject = async () => {
    if (!tenderRef || !tender || !firestore) return;
    setIsPromoting(true);
    
    try {
      // 1. Actualizar estado del proyecto
      await updateDocumentNonBlocking(tenderRef, {
        currentStatus: 'OK', 
        adjudicationDate: new Date().toISOString(),
        totalBudgetAmount: totalPriceOffer // Fijar el presupuesto de venta como base
      });

      // 2. Aplicar contrato automáticamente al cliente vinculado
      if (tender.clientId) {
        const clientTxRef = collection(firestore, `clients/${tender.clientId}/transactions`);
        await addDocumentNonBlocking(clientTxRef, {
          type: 'CONTRATO',
          date: new Date().toISOString(),
          amount: totalPriceOffer,
          remainingAmount: totalPriceOffer,
          reference: `Adjudicación Licitación: ${tender.name}`,
          status: 'PENDIENTE',
          projectId: tenderId,
          creationDate: new Date().toISOString()
        });

        const clientDocRef = doc(firestore, 'clients', tender.clientId);
        await updateDocumentNonBlocking(clientDocRef, {
          currentBalance: increment(totalPriceOffer)
        });
      }
      
      toast({ 
        title: "¡Obra Adjudicada!", 
        description: "La licitación ha pasado a fase de ejecución y el contrato se aplicó al saldo del cliente.",
      });
      
      router.push(`/projects/${tenderId}`);
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "No se pudo realizar la adjudicación." });
    } finally {
      setIsPromoting(false);
    }
  };

  const handleUpdateMargin = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!tenderRef) return;
    const formData = new FormData(e.currentTarget);
    const margin = Number(formData.get('marginPercentage'));
    
    updateDocumentNonBlocking(tenderRef, { marginPercentage: margin });
    toast({ title: "Margen Actualizado", description: "Los precios de oferta han sido recalculados." });
  };

  if (tenderLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <Loader2 className="w-10 h-10 animate-spin text-primary opacity-20" />
        <p className="mt-4 text-muted-foreground">Cargando estudio de costos...</p>
      </div>
    );
  }

  if (!tender) return <div className="p-8 text-center">Licitación no encontrada</div>;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => router.push('/tenders')}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{tender.name}</h1>
            <p className="text-muted-foreground">Configuración de Precios y Licitación</p>
          </div>
        </div>
        <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 gap-2 px-4 py-1">
          <Gavel className="w-3 h-3" /> FASE: LICITACIÓN
        </Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-muted/50 border-border shadow-none">
          <CardHeader className="pb-2">
            <CardDescription className="uppercase text-[10px] font-bold">Costo Base de Mercado</CardDescription>
            <CardTitle className="text-2xl">${totalMarketCost.toLocaleString()}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-accent/10 border-accent/20 shadow-none">
          <CardHeader className="pb-2">
            <CardDescription className="text-accent uppercase text-[10px] font-bold">Margen Comercial ({currentMargin}%)</CardDescription>
            <CardTitle className="text-2xl text-accent">+${(totalPriceOffer - totalMarketCost).toLocaleString()}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-primary text-white shadow-md">
          <CardHeader className="pb-2">
            <CardDescription className="text-white/70 uppercase text-[10px] font-bold">Precio Final de Oferta</CardDescription>
            <CardTitle className="text-2xl">${totalPriceOffer.toLocaleString()}</CardTitle>
          </CardHeader>
        </div>
      </div>

      <Tabs defaultValue={defaultTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-8">
          <TabsTrigger value="pricing">Precios de Mercado</TabsTrigger>
          <TabsTrigger value="margin">Margen y Rentabilidad</TabsTrigger>
          <TabsTrigger value="promote">Adjudicación de Obra</TabsTrigger>
        </TabsList>

        <TabsContent value="pricing">
          <Card>
            <CardHeader>
              <CardTitle>Cómputo Base (Precios de Mercado)</CardTitle>
              <CardDescription>Defina los costos directos de la obra antes de aplicar márgenes.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ítem</TableHead>
                    <TableHead>Cantidad</TableHead>
                    <TableHead>Precio Mercado (Unit.)</TableHead>
                    <TableHead>Subtotal Mercado</TableHead>
                    <TableHead className="text-accent font-bold">Precio Oferta (+{currentMargin}%)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {budgetItems?.map((item) => {
                    const marketTotal = item.budgetedTotalAmount || 0;
                    const offerTotal = marketTotal * (1 + currentMargin / 100);
                    return (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell>{item.budgetedQuantity} {item.budgetedUnit}</TableCell>
                        <TableCell>${(item.budgetedUnitPrice || 0).toLocaleString()}</TableCell>
                        <TableCell>${marketTotal.toLocaleString()}</TableCell>
                        <TableCell className="text-accent font-bold">${offerTotal.toLocaleString()}</TableCell>
                      </TableRow>
                    );
                  })}
                  {(!budgetItems || budgetItems.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground italic">
                        No hay ítems cargados. Configure el cómputo en la sección de Proyectos.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="margin">
          <Card className="max-w-xl mx-auto">
            <form onSubmit={handleUpdateMargin}>
              <CardHeader>
                <CardTitle>Configuración de Rentabilidad</CardTitle>
                <CardDescription>Ajuste el margen general para recalcular los precios de venta.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="marginPercentage">Margen sobre Costo (%)</Label>
                    <div className="relative">
                      <Input id="marginPercentage" name="marginPercentage" type="number" defaultValue={currentMargin} className="text-lg font-bold pr-10" />
                      <Percent className="absolute right-3 top-3 w-5 h-5 text-muted-foreground" />
                    </div>
                  </div>
                  <div className="p-4 bg-muted/50 rounded-lg border space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Costo de Producción:</span>
                      <span className="font-mono">${totalMarketCost.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Contribución Marginal:</span>
                      <span className="font-mono text-accent">+${(totalPriceOffer - totalMarketCost).toLocaleString()}</span>
                    </div>
                    <div className="border-t pt-2 flex justify-between font-bold">
                      <span>Precio Sugerido de Venta:</span>
                      <span className="text-primary">${totalPriceOffer.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="justify-end gap-2">
                <Button type="submit" className="gap-2">
                  <Save className="w-4 h-4" /> Actualizar Precios
                </Button>
              </CardFooter>
            </form>
          </Card>
        </TabsContent>

        <TabsContent value="promote">
          <Card className="max-w-2xl mx-auto border-accent/20 bg-accent/5">
            <CardHeader className="text-center">
              <div className="mx-auto bg-accent/20 p-4 rounded-full w-fit mb-4">
                <CheckCircle2 className="w-12 h-12 text-accent" />
              </div>
              <CardTitle className="text-2xl">¿Licitación Ganada?</CardTitle>
              <CardDescription>
                Al adjudicar la obra, esta licitación se convertirá en un **Proyecto Activo**. 
                Se habilitará el control de gastos reales y la certificación de avance físico.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-background p-6 rounded-xl border-2 border-accent/20 shadow-sm">
                <h4 className="font-bold text-center mb-4 uppercase text-xs tracking-widest text-muted-foreground">Resumen de Contrato</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-black text-primary">${totalPriceOffer.toLocaleString()}</p>
                    <p className="text-[10px] font-bold text-muted-foreground">VALOR DE CONTRATO</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-black text-accent">{currentMargin}%</p>
                    <p className="text-[10px] font-bold text-muted-foreground">MARGEN OBJETIVO</p>
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-3 p-4 bg-orange-50 text-orange-700 rounded-lg border border-orange-100 text-sm">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <p>Esta acción es irreversible. El presupuesto de licitación se fijará como el presupuesto base para el control de gestión.</p>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-2">
              <Button 
                onClick={handlePromoteToProject} 
                disabled={isPromoting}
                className="w-full bg-accent hover:bg-accent/90 text-white font-bold h-12 text-lg shadow-lg"
              >
                {isPromoting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Gavel className="w-5 h-5 mr-2" />}
                Confirmar Adjudicación y Comenzar Obra
              </Button>
              <Button variant="ghost" onClick={() => router.push('/tenders')} className="text-xs">
                Mantener en fase de estudio
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
