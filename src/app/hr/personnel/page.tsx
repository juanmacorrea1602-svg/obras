
"use client"

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useFirebase, useCollection, useMemoFirebase, addDocumentNonBlocking } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import { UserCircle, Search, Plus, FileText, ShieldCheck, HeartPulse, UserPlus, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

export default function PersonnelPage() {
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const [mounted, setMounted] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const hrFilesQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'hr_files'), orderBy('fullName'));
  }, [firestore]);

  const { data: hrFiles, isLoading } = useCollection(hrFilesQuery);

  const handleAddPersonnel = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!firestore) return;

    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);
    
    const newPerson = {
      fullName: formData.get('fullName') as string,
      dni: formData.get('dni') as string,
      category: formData.get('category') as string,
      entryDate: formData.get('entryDate') as string,
      status: 'ACTIVO',
      creationDate: new Date().toISOString()
    };

    try {
      await addDocumentNonBlocking(collection(firestore, 'hr_files'), newPerson);
      toast({
        title: "Personal Registrado",
        description: `${newPerson.fullName} ha sido dado de alta correctamente.`,
      });
      setIsDialogOpen(false);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo registrar el nuevo legajo.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!mounted) return null;

  const filteredFiles = hrFiles?.filter(person => 
    person.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    person.dni.includes(searchTerm)
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Capital Humano & Legajos</h1>
          <p className="text-muted-foreground">Gestión administrativa de personal UOCRA/UECARA y novedades.</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 bg-primary">
              <UserPlus className="w-4 h-4" /> Alta de Personal
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <form onSubmit={handleAddPersonnel}>
              <DialogHeader>
                <DialogTitle>Nuevo Legajo de Obra</DialogTitle>
                <DialogDescription> Complete los datos básicos del trabajador para iniciar su gestión administrativa. </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="fullName">Nombre Completo</Label>
                  <Input id="fullName" name="fullName" placeholder="Ej: Juan Pérez" required />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="dni">DNI / CUIL</Label>
                  <Input id="dni" name="dni" placeholder="20-XXXXXXXX-X" required />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="category">Categoría / Convenio</Label>
                  <Select name="category" defaultValue="Oficial Especializado (UOCRA)">
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccione categoría" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Oficial Especializado (UOCRA)">Oficial Especializado (UOCRA)</SelectItem>
                      <SelectItem value="Oficial (UOCRA)">Oficial (UOCRA)</SelectItem>
                      <SelectItem value="Medio Oficial (UOCRA)">Medio Oficial (UOCRA)</SelectItem>
                      <SelectItem value="Ayudante (UOCRA)">Ayudante (UOCRA)</SelectItem>
                      <SelectItem value="Administrativo de Obra (UECARA)">Administrativo (UECARA)</SelectItem>
                      <SelectItem value="Técnico de Obra (UECARA)">Técnico (UECARA)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="entryDate">Fecha de Ingreso</Label>
                  <Input id="entryDate" name="entryDate" type="date" required />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Confirmar Alta
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
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
                <Input 
                  placeholder="Buscar por apellido o DNI..." 
                  className="pl-8" 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
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
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : filteredFiles?.map((person) => (
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
              {(!filteredFiles || filteredFiles.length === 0) && !isLoading && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground italic">
                    {searchTerm ? "No se encontraron resultados para la búsqueda." : "Cargue el primer legajo para iniciar la gestión de RRHH."}
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
