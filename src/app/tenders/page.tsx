"use client"

import { useEffect, useState } from 'react';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PlusCircle, Calculator, Gavel, Loader2, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function TendersPage() {
  const { user, firestore } = useFirebase();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const tendersQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return query(
      collection(firestore, 'projects'),
      where('responsibleAnalystId', '==', user.uid),
      where('currentStatus', '==', 'LICITACION')
    );
  }, [user, firestore]);

  const { data: tenders, isLoading } = useCollection(tendersQuery);

  if (!mounted) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Licitaciones y Presupuestos</h1>
          <p className="text-muted-foreground">Estudio de costos y configuración de márgenes comerciales</p>
        </div>
        <Button asChild className="gap-2 bg-primary">
          <Link href="/tenders/new">
            <PlusCircle className="w-4 h-4" /> Nueva Licitación
          </Link>
        </Button>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary opacity-20" />
          <p className="text-muted-foreground mt-4">Cargando estudios de costos...</p>
        </div>
      ) : tenders && tenders.length > 0 ? (
        <div className="grid gap-6">
          {tenders.map((tender: any) => (
            <Card key={tender.id} className="shadow-sm border-border overflow-hidden">
              <CardHeader className="bg-muted/30">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <Gavel className="w-4 h-4 text-primary" />
                      <CardTitle>{tender.name}</CardTitle>
                    </div>
                    <CardDescription>
                      Márgen Aplicado: <span className="font-bold text-accent">{tender.marginPercentage || 0}%</span> | 
                      Presupuesto de Venta: ${(Number(tender.totalBudgetAmount || 0)).toLocaleString('es-AR')}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button asChild variant="outline" size="sm" className="gap-2">
                      <Link href={`/tenders/${tender.id}`}>
                        <Calculator className="w-4 h-4" /> Configurar Precios
                      </Link>
                    </Button>
                    <Button asChild size="sm" className="gap-2 bg-accent hover:bg-accent/90">
                      <Link href={`/tenders/${tender.id}?tab=promote`}>
                        Adjudicar Obra <ArrowRight className="w-4 h-4" />
                      </Link>
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="p-4 border rounded-lg bg-background">
                    <p className="text-xs font-bold text-muted-foreground uppercase">Costo de Mercado (Base)</p>
                    <p className="text-sm font-medium">
                      ${(Number(tender.totalBudgetAmount || 0) / (1 + (tender.marginPercentage || 0) / 100)).toLocaleString('es-AR')}
                    </p>
                  </div>
                  <div className="p-4 border rounded-lg bg-background">
                    <p className="text-xs font-bold text-muted-foreground uppercase">Beneficio Proyectado</p>
                    <p className="text-sm font-bold text-accent">
                      ${(Number(tender.totalBudgetAmount || 0) - (Number(tender.totalBudgetAmount || 0) / (1 + (tender.marginPercentage || 0) / 100))).toLocaleString('es-AR')}
                    </p>
                  </div>
                  <div className="p-4 border rounded-lg bg-background">
                    <p className="text-xs font-bold text-muted-foreground uppercase">Ubicación</p>
                    <p className="text-sm font-medium">{tender.location || 'No especificada'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed rounded-xl bg-muted/10">
          <Calculator className="w-12 h-12 text-muted-foreground mb-4 opacity-20" />
          <p className="text-muted-foreground text-center max-w-xs">
            No hay licitaciones en estudio. Crea una nueva licitación para configurar márgenes y precios de mercado.
          </p>
          <Button asChild variant="outline" className="mt-4">
            <Link href="/tenders/new">Iniciar estudio de costos</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
