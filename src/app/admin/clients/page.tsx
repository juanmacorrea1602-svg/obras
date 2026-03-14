
"use client"

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useFirebase, useCollection, useMemoFirebase, addDocumentNonBlocking, setDocumentNonBlocking } from '@/firebase';
import { collection, query, orderBy, doc } from 'firebase/firestore';
import { 
  Users, Search, Plus, Filter, ArrowUpRight, MessageSquare, 
  Wallet, Loader2, FileText, Scale, CreditCard, Banknote, 
  History, Upload, CheckCircle2, XCircle, AlertCircle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const CLIENT_REQUIRED_DOCS = [
  { id: 'constancia_afip', name: 'Constancia de Inscripción AFIP' },
  { id: 'iibb', name: 'Constancia de IIBB / Convenio Multilateral' },
  { id: 'contrato', name: 'Contrato de Obra Firmado' },
  { id: 'seguro_caucion', name: 'Póliza de Caución (Anticipo/Ejecución)' },
];

export default function ClientsPage() {
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const [mounted, setMounted] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Detalle de Cliente
  const [selectedClient, setSelectedClient] = useState<any | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const clientsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'clients'), orderBy('name'));
  }, [firestore]);

  const { data: clients, isLoading } = useCollection(clientsQuery);

  // Consultas de detalle (Memoizadas)
  const docsQuery = useMemoFirebase(() => {
    if (!firestore || !selectedClient) return null;
    return collection(firestore, `clients/${selectedClient.id}/documents`);
  }, [firestore, selectedClient]);

  const txQuery = useMemoFirebase(() => {
    if (!firestore || !selectedClient) return null;
    return query(collection(firestore, `clients/${selectedClient.id}/transactions`), orderBy('date', 'desc'));
  }, [firestore, selectedClient]);

  const { data: currentDocs } = useCollection(docsQuery);
  const { data: transactions } = useCollection(txQuery);

  if (!mounted) return null;

  const handleAddClient = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!firestore) return;

    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);
    
    const newClient = {
      name: formData.get('name') as string,
      cuit: formData.get('cuit') as string,
      contactPerson: formData.get('contactPerson') as string,
      email: formData.get('email') as string,
      phone: formData.get('phone') as string,
      status: 'ACTIVO',
      currentBalance: 0,
      creationDate: new Date().toISOString()
    };

    try {
      await addDocumentNonBlocking(collection(firestore, 'clients'), newClient);
      toast({ title: "Cliente Registrado", description: `${newClient.name} ha sido dado de alta.` });
      setIsDialogOpen(false);
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "No se pudo registrar el cliente." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUploadDoc = async (docId: string) => {
    if (!firestore || !selectedClient) return;
    const docRef = doc(firestore, `clients/${selectedClient.id}/documents`, docId);
    try {
      await setDocumentNonBlocking(docRef, {
        id: docId,
        status: 'CARGADO',
        uploadDate: new Date().toISOString(),
        fileUrl: 'https://placehold.co/400x600?text=Doc+Fiscal'
      }, { merge: true });
      toast({ title: "Documento Actualizado" });
    } catch (e) {
      toast({ variant: "destructive", title: "Error al subir" });
    }
  };

  const filteredClients = clients?.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.cuit?.includes(searchTerm)
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Administración de Clientes</h1>
          <p className="text-muted-foreground">Gestión de cartera, documentación legal y cuentas corrientes.</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 bg-primary">
              <Plus className="w-4 h-4" /> Nuevo Cliente
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <form onSubmit={handleAddClient}>
              <DialogHeader>
                <DialogTitle>Alta de Cliente</DialogTitle>
                <DialogDescription>
                  Complete la información fiscal y de contacto para la gestión administrativa.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Razón Social / Nombre</Label>
                  <Input id="name" name="name" placeholder="Ej: Constructora del Sud S.A." required />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="cuit">CUIT</Label>
                  <Input id="cuit" name="cuit" placeholder="30-XXXXXXXX-X" required />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="contactPerson">Persona de Contacto</Label>
                  <Input id="contactPerson" name="contactPerson" placeholder="Ej: Ing. Alberto Rossi" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="email">Email Administración</Label>
                    <Input id="email" name="email" type="email" placeholder="admin@cliente.com" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="phone">Teléfono</Label>
                    <Input id="phone" name="phone" placeholder="+54 9..." />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Registrar Cliente
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader className="pb-2">
            <CardDescription className="text-primary font-bold uppercase text-[10px]">Deuda Total Cartera</CardDescription>
            <CardTitle className="text-2xl">${clients?.reduce((acc, c) => acc + (c.currentBalance || 0), 0).toLocaleString()}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-orange-50 border-orange-200">
          <CardHeader className="pb-2">
            <CardDescription className="text-orange-600 font-bold uppercase text-[10px]">Facturación Pendiente</CardDescription>
            <CardTitle className="text-2xl text-orange-700">---</CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-accent/5 border-accent/20">
          <CardHeader className="pb-2">
            <CardDescription className="text-accent font-bold uppercase text-[10px]">Cobranza del Mes</CardDescription>
            <CardTitle className="text-2xl text-accent">94.2%</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <CardTitle>Listado de Clientes</CardTitle>
            <div className="flex items-center gap-2 w-full md:w-auto">
              <div className="relative flex-1 md:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Buscar por nombre o CUIT..." 
                  className="pl-8" 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Button variant="outline" size="icon"><Filter className="w-4 h-4" /></Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Razón Social / Cliente</TableHead>
                <TableHead>CUIT</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Saldo Deudor</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : filteredClients?.map((client) => (
                <TableRow key={client.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold uppercase">
                        {client.name.substring(0, 2)}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{client.name}</p>
                        <p className="text-[10px] text-muted-foreground">{client.contactPerson || 'Sin contacto'}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{client.cuit}</TableCell>
                  <TableCell>
                    <Badge variant={client.status === 'MOROSO' ? 'destructive' : 'secondary'} className="text-[10px]">
                      {client.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-bold text-sm">
                    ${(client.currentBalance || 0).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" title="Cuenta Corriente" onClick={() => {
                        setSelectedClient(client);
                        setIsSheetOpen(true);
                      }}>
                        <Wallet className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" title="Ver Legajo" onClick={() => {
                        setSelectedClient(client);
                        setIsSheetOpen(true);
                      }}>
                        <ArrowUpRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Panel Detalle de Cliente */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent className="sm:max-w-2xl overflow-y-auto">
          <SheetHeader className="border-b pb-4 mb-6">
            <div className="flex items-center gap-4">
              <div className="bg-primary/10 p-3 rounded-full">
                <Users className="w-8 h-8 text-primary" />
              </div>
              <div>
                <SheetTitle className="text-xl">{selectedClient?.name}</SheetTitle>
                <SheetDescription className="flex items-center gap-2">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground">CUIT: {selectedClient?.cuit}</span>
                  <Badge variant="outline" className="text-[9px]">{selectedClient?.status}</Badge>
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>

          <Tabs defaultValue="account" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="account" className="gap-2"><History className="w-4 h-4" /> Cuenta Corriente</TabsTrigger>
              <TabsTrigger value="docs" className="gap-2"><FileText className="w-4 h-4" /> Legajo Fiscal</TabsTrigger>
            </TabsList>

            <TabsContent value="account" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Card className="bg-muted/30 border-none shadow-none">
                  <CardContent className="p-4">
                    <p className="text-[10px] uppercase font-bold text-muted-foreground">Saldo Actual</p>
                    <p className="text-xl font-bold">${(selectedClient?.currentBalance || 0).toLocaleString()}</p>
                  </CardContent>
                </Card>
                <Card className="bg-accent/10 border-none shadow-none">
                  <CardContent className="p-4">
                    <p className="text-[10px] uppercase font-bold text-accent">Último Pago</p>
                    <p className="text-xl font-bold text-accent">---</p>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-3">
                <h3 className="text-sm font-bold uppercase tracking-tight text-primary">Movimientos Recientes</h3>
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="h-8 text-[10px]">Fecha</TableHead>
                      <TableHead className="h-8 text-[10px]">Tipo / Ref</TableHead>
                      <TableHead className="h-8 text-[10px]">Metodo</TableHead>
                      <TableHead className="h-8 text-right text-[10px]">Monto</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions?.map((tx) => (
                      <TableRow key={tx.id}>
                        <TableCell className="text-[10px]">{format(new Date(tx.date), 'dd/MM/yy')}</TableCell>
                        <TableCell className="text-[10px]">
                          <span className="font-bold">{tx.type}</span>
                          <p className="text-muted-foreground">{tx.reference}</p>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[8px] uppercase">{tx.method || '---'}</Badge>
                        </TableCell>
                        <TableCell className={cn(
                          "text-right text-xs font-bold",
                          tx.type === 'PAGO' ? "text-accent" : "text-destructive"
                        )}>
                          {tx.type === 'PAGO' ? '-' : '+'}${tx.amount.toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                    {(!transactions || transactions.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8 text-muted-foreground italic text-xs">
                          No se registran movimientos en la cuenta corriente.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            <TabsContent value="docs" className="space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-tight text-primary">Documentación Respaldatoria</h3>
              <div className="grid gap-3">
                {CLIENT_REQUIRED_DOCS.map((docReq) => {
                  const isUploaded = currentDocs?.find(d => d.id === docReq.id);
                  return (
                    <div key={docReq.id} className="p-4 border rounded-lg flex items-center justify-between hover:bg-muted/5 transition-colors">
                      <div className="flex items-center gap-3">
                        {isUploaded ? (
                          <CheckCircle2 className="w-5 h-5 text-accent" />
                        ) : (
                          <AlertCircle className="w-5 h-5 text-orange-400" />
                        )}
                        <div>
                          <p className="text-xs font-bold">{docReq.name}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {isUploaded ? `Cargado el ${format(new Date(isUploaded.uploadDate), 'dd/MM/yyyy')}` : 'Documento faltante'}
                          </p>
                        </div>
                      </div>
                      <Button 
                        variant={isUploaded ? "outline" : "secondary"} 
                        size="sm" 
                        className="h-8 text-[10px] gap-2"
                        onClick={() => handleUploadDoc(docReq.id)}
                      >
                        {isUploaded ? <FileText className="w-3 h-3" /> : <Upload className="w-3 h-3" />}
                        {isUploaded ? "Ver Archivo" : "Cargar"}
                      </Button>
                    </div>
                  );
                })}
              </div>
            </TabsContent>
          </Tabs>

          <SheetFooter className="mt-8 pt-4 border-t">
            <div className="flex flex-col gap-2 w-full">
              <Button className="w-full bg-accent hover:bg-accent/90 gap-2">
                <Banknote className="w-4 h-4" /> Registrar Cobranza
              </Button>
              <Button variant="ghost" className="w-full text-xs text-muted-foreground">
                <MessageSquare className="w-3 h-3 mr-2" /> Contactar Administración Cliente
              </Button>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
