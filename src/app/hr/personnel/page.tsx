
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
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useFirebase, useCollection, useMemoFirebase, addDocumentNonBlocking, setDocumentNonBlocking } from '@/firebase';
import { collection, query, orderBy, doc } from 'firebase/firestore';
import { UserCircle, Search, Plus, FileText, ShieldCheck, HeartPulse, UserPlus, Loader2, Calendar, AlertTriangle, CheckCircle2, XCircle, Upload, HardHat } from 'lucide-react';
import { format, isAfter, isBefore, addDays, parseISO } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

// Definición de requerimientos por categoría
const REQUIRED_DOCS = {
  common: [
    { id: 'dni', name: 'DNI (Frente y Dorso)', expiry: false },
    { id: 'cuil', name: 'Constancia de CUIL', expiry: false },
    { id: 'alta_afip', name: 'Alta Temprana AFIP', expiry: false },
    { id: 'art', name: 'Certificado de Cobertura ART', expiry: true },
    { id: 'licencia', name: 'Licencia de Conducir', expiry: true },
  ],
  uocra: [
    { id: 'ieric', name: 'Credencial IERIC', expiry: true },
    { id: 'epp', name: 'Entrega de Ropa y EPP', expiry: true },
    { id: 'psico', name: 'Examen Psicotécnico', expiry: true },
  ],
  uecara: [
    { id: 'titulo', name: 'Título Habilitante', expiry: false },
    { id: 'seguro_vida', name: 'Seguro de Vida Adicional', expiry: true },
  ]
};

export default function PersonnelPage() {
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const [mounted, setMounted] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Detalle de Legajo
  const [selectedPerson, setSelectedPerson] = useState<any | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const hrFilesQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'hr_files'), orderBy('fullName'));
  }, [firestore]);

  const { data: hrFiles, isLoading } = useCollection(hrFilesQuery);

  // Consulta de documentos del legajo seleccionado
  const docsQuery = useMemoFirebase(() => {
    if (!firestore || !selectedPerson) return null;
    return collection(firestore, `hr_files/${selectedPerson.id}/documents`);
  }, [firestore, selectedPerson]);

  const { data: currentDocs } = useCollection(docsQuery);

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

  const handleUploadDoc = async (requirementId: string, expiryDate?: string) => {
    if (!firestore || !selectedPerson) return;

    const docRef = doc(firestore, `hr_files/${selectedPerson.id}/documents`, requirementId);
    const docData = {
      requirementId,
      status: 'CARGADO',
      uploadDate: new Date().toISOString(),
      expiryDate: expiryDate || null,
      fileUrl: 'https://placehold.co/400x600?text=Documento+Escaneado' // Mock URL
    };

    try {
      setDocumentNonBlocking(docRef, docData, { merge: true });
      toast({ title: "Documento Actualizado" });
    } catch (e) {
      toast({ variant: "destructive", title: "Error al cargar" });
    }
  };

  const getDocStatus = (requirementId: string) => {
    const doc = currentDocs?.find(d => d.requirementId === requirementId);
    if (!doc) return { label: 'Faltante', color: 'text-destructive', icon: XCircle };

    if (doc.expiryDate) {
      const expiry = parseISO(doc.expiryDate);
      const today = new Date();
      const warningThreshold = addDays(today, 15);

      if (isBefore(expiry, today)) return { label: 'VENCIDO', color: 'text-red-600 font-black', icon: AlertTriangle };
      if (isBefore(expiry, warningThreshold)) return { label: 'Por Vencer', color: 'text-orange-500 font-bold', icon: AlertTriangle };
    }

    return { label: 'Vigente', color: 'text-green-600', icon: CheckCircle2 };
  };

  if (!mounted) return null;

  const filteredFiles = hrFiles?.filter(person => 
    person.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    person.dni.includes(searchTerm)
  );

  const getRequirements = (category: string) => {
    const isUocra = category.includes('UOCRA');
    return [...REQUIRED_DOCS.common, ...(isUocra ? REQUIRED_DOCS.uocra : REQUIRED_DOCS.uecara)];
  };

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
        <Card className="bg-red-50 border-red-100">
          <CardHeader className="p-4 flex flex-row items-center justify-between space-y-0">
            <p className="text-[10px] font-bold text-red-600 uppercase">Doc. Vencida / Alerta</p>
            <FileText className="w-4 h-4 text-red-600" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-2xl font-bold text-red-700">3</p>
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
            <p className="text-[10px] font-bold text-muted-foreground uppercase">Fondo Cese (%)</p>
            <ShieldCheck className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-2xl font-bold">12%</p>
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
                <TableHead>Documentación</TableHead>
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
                    <Badge variant="outline" className="text-[9px] gap-1">
                      <ShieldCheck className="w-3 h-3 text-green-600" /> 80% Completo
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-primary font-bold hover:bg-primary/5"
                      onClick={() => {
                        setSelectedPerson(person);
                        setIsSheetOpen(true);
                      }}
                    >
                      Ver Legajo Digital
                    </Button>
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

      {/* Panel Detalle de Legajo */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent className="sm:max-w-xl overflow-y-auto">
          <SheetHeader className="border-b pb-4 mb-6">
            <div className="flex items-center gap-4">
              <div className="bg-primary/10 p-3 rounded-full">
                <UserCircle className="w-8 h-8 text-primary" />
              </div>
              <div>
                <SheetTitle className="text-xl">{selectedPerson?.fullName}</SheetTitle>
                <SheetDescription className="flex items-center gap-2">
                  <Badge variant="secondary" asChild>
                    <span>{selectedPerson?.category}</span>
                  </Badge>
                  <span className="text-[10px] uppercase font-bold text-muted-foreground">CUIL: {selectedPerson?.dni}</span>
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>

          <Tabs defaultValue="docs" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="info">Info. General</TabsTrigger>
              <TabsTrigger value="docs">Documentación Digital</TabsTrigger>
            </TabsList>

            <TabsContent value="info" className="space-y-4">
              <div className="grid gap-4 p-4 bg-muted/30 rounded-lg border">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <Label className="text-[10px] text-muted-foreground uppercase">Fecha Ingreso</Label>
                    <p className="font-medium">{selectedPerson?.entryDate ? format(new Date(selectedPerson.entryDate), 'PPP') : '---'}</p>
                  </div>
                  <div>
                    <Label className="text-[10px] text-muted-foreground uppercase">Estado Laboral</Label>
                    <Badge className="block w-fit bg-green-100 text-green-700 hover:bg-green-100 border-green-200" asChild>
                      <span>ACTIVO</span>
                    </Badge>
                  </div>
                  <div>
                    <Label className="text-[10px] text-muted-foreground uppercase">Convenio</Label>
                    <p className="font-medium">{selectedPerson?.category?.includes('UOCRA') ? 'CCT 76/75' : 'CCT 660/13'}</p>
                  </div>
                  <div>
                    <Label className="text-[10px] text-muted-foreground uppercase">Zona Salarial</Label>
                    <p className="font-medium">Zona A (PBA)</p>
                  </div>
                </div>
              </div>
              <div className="p-4 border-2 border-dashed rounded-lg text-center bg-muted/5">
                <HardHat className="w-8 h-8 mx-auto text-muted-foreground opacity-30 mb-2" />
                <p className="text-xs text-muted-foreground">Historial de Obra y Novedades (Proximamente)</p>
              </div>
            </TabsContent>

            <TabsContent value="docs" className="space-y-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-bold uppercase tracking-tight text-primary">Requerimientos Obligatorios</h3>
                <div className="flex items-center gap-2 text-[10px] font-bold">
                  <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-green-500" /> OK</span>
                  <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-orange-500" /> Vence</span>
                  <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-500" /> Faltante</span>
                </div>
              </div>

              <div className="space-y-3">
                {selectedPerson && getRequirements(selectedPerson.category).map((req) => {
                  const status = getDocStatus(req.id);
                  const isUploaded = currentDocs?.some(d => d.requirementId === req.id);
                  const docData = currentDocs?.find(d => d.requirementId === req.id);

                  return (
                    <div key={req.id} className="p-3 border rounded-lg hover:bg-muted/10 transition-colors">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <status.icon className={cn("w-5 h-5", status.color)} />
                          <div>
                            <p className="text-xs font-bold leading-none">{req.name}</p>
                            <p className={cn("text-[10px] mt-1 uppercase tracking-tighter", status.color)}>{status.label}</p>
                          </div>
                        </div>
                        {isUploaded ? (
                          <div className="flex gap-1">
                            <Button variant="outline" size="sm" className="h-7 text-[10px]">Ver Archivo</Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-primary" onClick={() => handleUploadDoc(req.id, docData?.expiryDate)}><Upload className="w-3 h-3" /></Button>
                          </div>
                        ) : (
                          <Button 
                            variant="secondary" 
                            size="sm" 
                            className="h-7 text-[10px] gap-1"
                            onClick={() => handleUploadDoc(req.id)}
                          >
                            <Upload className="w-3 h-3" /> Cargar
                          </Button>
                        )}
                      </div>
                      
                      {req.expiry && (
                        <div className="flex items-center gap-4 pl-8">
                          <div className="flex-1">
                            <Label className="text-[9px] uppercase text-muted-foreground">Fecha Vencimiento</Label>
                            <Input 
                              type="date" 
                              className="h-7 text-[10px]" 
                              defaultValue={docData?.expiryDate || ''}
                              onBlur={(e) => handleUploadDoc(req.id, e.target.value)}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </TabsContent>
          </Tabs>

          <SheetFooter className="mt-8 pt-4 border-t">
            <div className="flex items-center gap-3 w-full">
              <div className="bg-orange-50 p-3 rounded border border-orange-100 flex-1 flex gap-3">
                <AlertTriangle className="w-5 h-5 text-orange-600 shrink-0" />
                <p className="text-[10px] text-orange-800 leading-tight">
                  <span className="font-bold">Protocolo SRT:</span> El personal no debe ingresar a obra si la ART o el Seguro de Vida están vencidos.
                </p>
              </div>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
