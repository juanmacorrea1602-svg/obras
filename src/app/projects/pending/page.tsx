"use client"

import { useEffect, useState } from 'react';
import { useFirebase, useCollection, useMemoFirebase, updateDocumentNonBlocking } from '@/firebase';
import { collection, query, where, doc } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, CheckCircle2, XCircle, Search, Loader2, Gavel, Info } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export default function PendingProjectsPage() {
  const { user, firestore } = useFirebase();
  const { toast } = useToast();
  const [mounted, setMounted] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const pendingQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return query(
      collection(firestore, 'projects'),
      where('responsibleAnalystId', '==', user.uid),
      where('currentStatus', '==', 'PENDIENTE_APROBACION')
    );
  }, [user, firestore]);

  const { data: projects, isLoading } = useCollection(pendingQuery);

  if (!mounted) return null;

  const handleApprove = async (projectId: string) => {
    if (!firestore) return;
    setProcessingId(projectId);
    try {
      const projectRef = doc(firestore, 'projects', projectId);
      await updateDocumentNonBlocking(projectRef, {
        currentStatus: 'OK',
        approvalDate: new Date().toISOString()
      });
      toast({
        title: "Obra Aprobada",
        description: "El proyecto ha pasado a fase de ejecución activa.",
      });
    } catch (e) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo aprobar la obra.",
      });
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Pendiente de Aprobación</h1>
          <p className="text-muted-foreground">Revisiones técnicas y financieras antes de la adjudicación final.</p>
        </div>
        <div className="bg-orange-100 text-orange-700 px-4 py-2 rounded-full flex items-center gap-2 border border-orange-200">
          <Clock className="w-4 h-4 animate-pulse" />
          <span className="text-xs font-bold uppercase">Estado: Filtro PMO</span>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary opacity-20" />
          <p className="text-muted-foreground mt-4">Cargando revisiones pendientes...</p>
        </div>
      ) : projects && projects.length > 0 ? (
        <div className="grid gap-6">
          {projects.map((project: any) => (
            <Card key={project.id} className="shadow-sm border-l-4 border-l-orange-400 overflow-hidden">
              <CardHeader className="bg-orange-50/50">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-xl">{project.name}</CardTitle>
                      <Badge variant="outline" className="bg-white border-orange-200 text-orange-700 uppercase text-[10px]">
                        {project.type?.replace('_', ' ')}
                      </Badge>
                    </div>
                    <CardDescription className="mt-1">
                      Creado el: {project.creationDate ? new Date(project.creationDate).toLocaleDateString() : '---'}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      onClick={() => handleApprove(project.id)} 
                      disabled={processingId === project.id}
                      className="bg-accent hover:bg-accent/90 gap-2"
                    >
                      {processingId === project.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                      Aprobar e Iniciar Obra
                    </Button>
                    <Button asChild variant="outline" size="sm" className="gap-2">
                      <Link href={`/projects/${project.id}?tab=general`}>
                        <Info className="w-4 h-4" /> Revisar Detalles
                      </Link>
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid md:grid-cols-4 gap-4 text-sm">
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase">Monto Proyectado</p>
                    <p className="font-bold text-lg">${Number(project.totalBudgetAmount || 0).toLocaleString('es-AR')}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase">Ubicación</p>
                    <p>{project.location || 'No especificada'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase">Margen Estimado</p>
                    <p className="font-bold text-accent">{project.marginPercentage || 0}%</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase">Incidencias Configuradas</p>
                    <div className="flex gap-2">
                      <Badge variant="secondary" className="text-[9px]">ART: {project.costConfig?.artPercentage}%</Badge>
                      <Badge variant="secondary" className="text-[9px]">Cese: {project.costConfig?.fondoCese}%</Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="bg-muted/5 border-t px-6 py-3 flex items-center gap-4">
                <p className="text-[10px] text-muted-foreground flex items-center gap-1 italic">
                  <Gavel className="w-3 h-3" /> La aprobación consolidará este presupuesto como línea base.
                </p>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed rounded-xl bg-muted/10">
          <Clock className="w-12 h-12 text-muted-foreground mb-4 opacity-20" />
          <p className="text-muted-foreground text-center max-w-xs">
            No hay obras pendientes de aprobación. Todas las entradas nuevas aparecerán aquí para tu revisión final.
          </p>
          <Button asChild variant="outline" className="mt-4">
            <Link href="/projects/new">Crear Nueva Entrada</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
