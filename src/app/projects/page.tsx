
"use client"

import { useEffect, useState } from 'react';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PlusCircle, Settings2, ExternalLink, HardHat, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function ProjectsPage() {
  const { user, firestore } = useFirebase();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const projectsQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return query(
      collection(firestore, 'projects'),
      where('responsibleAnalystId', '==', user.uid)
    );
  }, [user, firestore]);

  const { data: projects, isLoading, error } = useCollection(projectsQuery);

  if (!mounted) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Mis Obras</h1>
          <p className="text-muted-foreground">Gestión de Cómputo, Presupuesto y Cronogramas</p>
        </div>
        <Button asChild className="gap-2 bg-primary">
          <Link href="/projects/new">
            <PlusCircle className="w-4 h-4" /> Nueva Obra
          </Link>
        </Button>
      </div>

      {error && (
        <Card className="border-destructive bg-destructive/5">
          <CardContent className="p-4 text-sm text-destructive">
            <p className="font-bold">Error de Acceso:</p>
            <p>{error.message}</p>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="flex flex-col items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary opacity-20" />
          <p className="text-muted-foreground mt-4">Cargando proyectos...</p>
        </div>
      ) : projects && projects.length > 0 ? (
        <div className="grid gap-6">
          {projects.map((project: any) => (
            <Card key={project.id} className="shadow-sm border-border overflow-hidden">
              <CardHeader className="bg-muted/30">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>{project.name}</CardTitle>
                    <CardDescription>
                      Inicio: {project.startDate ? new Date(project.startDate).toLocaleDateString() : 'N/A'} | 
                      Presupuesto: ${Number(project.totalBudgetAmount || 0).toLocaleString('es-AR')}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button asChild variant="outline" size="sm" className="gap-2">
                      <Link href={`/projects/${project.id}`}>
                        <Settings2 className="w-4 h-4" /> Configurar
                      </Link>
                    </Button>
                    <Button asChild variant="ghost" size="sm" className="gap-2">
                      <Link href={`/projects/${project.id}`}>
                        <ExternalLink className="w-4 h-4" /> Detalle
                      </Link>
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="p-4 border rounded-lg bg-background">
                    <p className="text-xs font-bold text-muted-foreground uppercase">Ubicación</p>
                    <p className="text-sm font-medium">{project.location || 'No especificada'}</p>
                  </div>
                  <div className="p-4 border rounded-lg bg-background">
                    <p className="text-xs font-bold text-muted-foreground uppercase">Estado General</p>
                    <Badge className="mt-1" variant={project.currentStatus === 'ALERTA' ? 'destructive' : 'default'}>
                      {project.currentStatus || 'OK'}
                    </Badge>
                  </div>
                  <div className="p-4 border rounded-lg bg-background">
                    <p className="text-xs font-bold text-muted-foreground uppercase">Entrega Estimada</p>
                    <p className="text-sm font-medium">
                      {project.plannedEndDate ? new Date(project.plannedEndDate).toLocaleDateString() : 'N/A'}
                    </p>
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
            Aún no tienes obras registradas. Comienza creando tu primera obra para gestionar presupuestos y avances.
          </p>
          <Button asChild variant="outline" className="mt-4">
            <Link href="/projects/new">Crear mi primera obra</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
