"use client"

import { useEffect, useState } from 'react';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PlusCircle, Settings2, ExternalLink, HardHat, Loader2, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export default function ProjectsPage() {
  const { user, firestore } = useFirebase();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const projectsQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    // Mostrar solo obras activas (OK o FINALIZADO)
    return query(
      collection(firestore, 'projects'),
      where('responsibleAnalystId', '==', user.uid),
      where('currentStatus', 'in', ['OK', 'FINALIZADO', 'ALERTA'])
    );
  }, [user, firestore]);

  const { data: projects, isLoading } = useCollection(projectsQuery);

  if (!mounted) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Obras Activas</h1>
          <p className="text-muted-foreground">Gestión y control de ejecución física y financiera.</p>
        </div>
        <Button asChild className="gap-2 bg-primary">
          <Link href="/projects/new">
            <PlusCircle className="w-4 h-4" /> Nueva Entrada
          </Link>
        </Button>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary opacity-20" />
          <p className="text-muted-foreground mt-4">Cargando portafolio activo...</p>
        </div>
      ) : projects && projects.length > 0 ? (
        <div className="grid gap-6">
          {projects.map((project: any) => (
            <Card key={project.id} className="shadow-sm border-l-4 border-l-primary overflow-hidden">
              <CardHeader className="bg-muted/10">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-xl">{project.name}</CardTitle>
                      <Badge variant={project.currentStatus === 'ALERTA' ? 'destructive' : 'default'} className="gap-1">
                        <TrendingUp className="w-3 h-3" /> {project.currentStatus}
                      </Badge>
                    </div>
                    <CardDescription className="mt-1">
                      Tipo: <span className="font-bold uppercase text-[10px]">{project.type?.replace('_', ' ')}</span> | 
                      Trabajo: <span className="font-bold">{project.workType?.replace('_', ' ')}</span>
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button asChild variant="outline" size="sm" className="gap-2">
                      <Link href={`/projects/${project.id}`}>
                        <Settings2 className="w-4 h-4" /> Gestionar
                      </Link>
                    </Button>
                    <Button asChild variant="ghost" size="sm" className="gap-2">
                      <Link href={`/projects/${project.id}`}>
                        <ExternalLink className="w-4 h-4" /> Ver Detalle
                      </Link>
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid md:grid-cols-4 gap-4 text-sm">
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase">Presupuesto</p>
                    <p className="font-bold">${Number(project.totalBudgetAmount || 0).toLocaleString('es-AR')}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase">Ubicación</p>
                    <p className="truncate">{project.location || 'MDP'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase">Margen Obj.</p>
                    <p className="font-bold text-accent">{project.marginPercentage || 0}%</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase">Incidencias</p>
                    <p>ART: {project.costConfig?.artPercentage || 0}% | Cese: {project.costConfig?.fondoCese || 0}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed rounded-xl bg-muted/10">
          <HardHat className="w-12 h-12 text-muted-foreground mb-4 opacity-20" />
          <p className="text-muted-foreground text-center max-w-xs">
            No hay obras activas en ejecución. Puedes aprobar una obra pendiente o crear una nueva entrada.
          </p>
          <Button asChild variant="outline" className="mt-4">
            <Link href="/projects/pending">Ver Pendientes de Aprobación</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
