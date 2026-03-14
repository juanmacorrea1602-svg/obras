
"use client"

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import { UserCircle, Search, Plus, FileText, ShieldCheck, HeartPulse, UserPlus } from 'lucide-react';
import { format } from 'date-fns';

export default function PersonnelPage() {
  const { firestore } = useFirebase();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const hrFilesQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'hr_files'), orderBy('fullName'));
  }, [firestore]);

  const { data: hrFiles, isLoading } = useCollection(hrFilesQuery);

  if (!mounted) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Capital Humano & Legajos</h1>
          <p className="text-muted-foreground">Gestión administrativa de personal UOCRA/UECARA y novedades.</p>
        </div>
        <Button className="gap-2 bg-primary">
          <UserPlus className="w-4 h-4" /> Alta de Personal
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="p-4 flex flex-row items-center justify-between space-y-0">
            <p className="text-[10px] font-bold text-muted-foreground uppercase">Plantilla Activa</p>
            <UserCircle className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-2xl font-bold">{hrFiles?.length || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="p-4 flex flex-row items-center justify-between space-y-0">
            <p className="text-[10px] font-bold text-muted-foreground uppercase">Doc. Vencida</p>
            <FileText className="w-4 h-4 text-destructive" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-2xl font-bold text-destructive">0</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="p-4 flex flex-row items-center justify-between space-y-0">
            <p className="text-[10px] font-bold text-muted-foreground uppercase">Exámenes Médicos</p>
            <HeartPulse className="w-4 h-4 text-accent" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-2xl font-bold text-accent">Al día</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="p-4 flex flex-row items-center justify-between space-y-0">
            <p className="text-[10px] font-bold text-muted-foreground uppercase">Credenciales SRT</p>
            <ShieldCheck className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-2xl font-bold">---</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <CardTitle>Legajos de Obra</CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Buscar por apellido o DNI..." className="pl-8" />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre y Apellido</TableHead>
                <TableHead>DNI</TableHead>
                <TableHead>Categoría / Convenio</TableHead>
                <TableHead>Ingreso</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {hrFiles?.map((person) => (
                <TableRow key={person.id}>
                  <TableCell className="font-medium">{person.fullName}</TableCell>
                  <TableCell className="font-mono text-xs">{person.dni}</TableCell>
                  <TableCell className="text-xs">{person.category}</TableCell>
                  <TableCell className="text-xs">
                    {person.entryDate ? format(new Date(person.entryDate), 'dd/MM/yy') : '---'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={person.status === 'ACTIVO' ? 'secondary' : 'outline'} className="text-[10px]">
                      {person.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm">Ver Legajo</Button>
                  </TableCell>
                </TableRow>
              ))}
              {(!hrFiles || hrFiles.length === 0) && !isLoading && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground italic">
                    Cargue el primer legajo para iniciar la gestión de RRHH.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
