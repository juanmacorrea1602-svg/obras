
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useFirebase, useCollection, useMemoFirebase, addDocumentNonBlocking, setDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { collection, query, orderBy, doc, where, increment } from 'firebase/firestore';
import { 
  Users, Search, Plus, Filter, ArrowUpRight, MessageSquare, 
  Wallet, Loader2, FileText, Scale, CreditCard, Banknote, 
  History, Upload, CheckCircle2, AlertCircle, Briefcase, Building2,
  FileSpreadsheet, Receipt, HandCoins, ArrowRightLeft, Target, Camera,
  Trash2, Info
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const CLIENT_GENERAL_DOCS = [
  { id: 'constancia_afip', name: 'Constancia de Inscripción AFIP' },
  { id: 'iibb', name: 'Constancia de IIBB / Convenio Multilateral' },
];

const CLIENT_PROJECT_DOCS = [
  { id: 'contrato', name: 'Contrato de Obra Firmado' },
  { id: 'seguro_caucion', name: 'Póliza de Caución (Anticipo/Ejecución)' },
  { id: 'acta_inicio', name: 'Acta de Inicio de Obra' },
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

  // Estados de Transacción
  const [isTxDialogOpen, setIsTxDialogOpen] = useState(false);
  const [txType, setTxType] = useState<"FACTURA" | "PAGO">("FACTURA");
  const [isConciliateOpen, setIsConciliateOpen] = useState(false);
  const [allocationType, setAllocationType] = useState<string>("a_cuenta");

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

  const clientProjectsQuery = useMemoFirebase(() => {
    if (!firestore || !selectedClient) return null;
    return query(collection(firestore, 'projects'), where('clientId', '==', selectedClient.id));
  }, [firestore, selectedClient]);

  const { data: currentDocs } = useCollection(docsQuery);
  const { data: transactions } = useCollection(txQuery);
  const { data: clientProjects } = useCollection(clientProjectsQuery);

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

  const handleAddTransaction = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!firestore || !selectedClient) return;

    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);
    const amount = Number(formData.get('amount'));
    const projectId = formData.get('projectId') as string;
    const targetInvoiceId = formData.get('targetInvoiceId') as string;
    
    let remainingAmount = amount;
    let status = 'PENDIENTE';

    // Si es un cobro directo a factura
    if (txType === 'PAGO' && allocationType === 'directo' && targetInvoiceId) {
      const invoice = transactions?.find(t => t.id === targetInvoiceId);
      if (invoice) {
        const amountToApply = Math.min(amount, invoice.remainingAmount);
        remainingAmount = amount - amountToApply;
        status = remainingAmount <= 0 ? 'CONCILIADO' : 'PARCIAL';

        // Actualizar la factura destino
        const invoiceRef = doc(firestore, `clients/${selectedClient.id}/transactions`, targetInvoiceId);
        const newInvoiceRemaining = invoice.remainingAmount - amountToApply;
        updateDocumentNonBlocking(invoiceRef, {
          remainingAmount: newInvoiceRemaining,
          status: newInvoiceRemaining <= 0 ? 'CONCILIADO' : 'PARCIAL'
        });
      }
    }

    const newTx = {
      type: txType,
      date: new Date().toISOString(),
      amount: amount,
      remainingAmount: remainingAmount,
      reference: formData.get('reference') as string,
      method: (formData.get('method') as string) || 'N/A',
      status: status,
      projectId: projectId || 'general',
      creationDate: new Date().toISOString()
    };

    try {
      await addDocumentNonBlocking(collection(firestore, `clients/${selectedClient.id}/transactions`), newTx);
      
      const balanceChange = (txType === 'PAGO') ? -amount : amount;
      const clientRef = doc(firestore, 'clients', selectedClient.id);
      await updateDocumentNonBlocking(clientRef, {
        currentBalance: increment(balanceChange)
      });

      toast({ 
        title: "Movimiento Registrado", 
        description: txType === 'PAGO' 
          ? (allocationType === 'directo' ? "Cobro aplicado correctamente." : "Cobro ingresado a cuenta.") 
          : "Factura cargada a la cuenta corriente." 
      });
      setIsTxDialogOpen(false);
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "No se pudo procesar la transacción." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConciliate = async (invoiceId: string, paymentId: string, amountToApply: number) => {
    if (!firestore || !selectedClient) return;

    const invoiceRef = doc(firestore, `clients/${selectedClient.id}/transactions`, invoiceId);
    const paymentRef = doc(firestore, `clients/${selectedClient.id}/transactions`, paymentId);

    const invoice = transactions?.find(t => t.id === invoiceId);
    const payment = transactions?.find(t => t.id === paymentId);

    if (!invoice || !payment) return;

    const newInvoiceRemaining = invoice.remainingAmount - amountToApply;
    const newPaymentRemaining = payment.remainingAmount - amountToApply;

    try {
      await updateDocumentNonBlocking(invoiceRef, {
        remainingAmount: newInvoiceRemaining,
        status: newInvoiceRemaining <= 0 ? 'CONCILIADO' : 'PARCIAL'
      });

      await updateDocumentNonBlocking(paymentRef, {
        remainingAmount: newPaymentRemaining,
        status: newPaymentRemaining <= 0 ? 'CONCILIADO' : 'PARCIAL'
      });

      toast({ title: "Imputación Exitosa", description: `Se aplicaron $${amountToApply.toLocaleString()} a la factura.` });
    } catch (e) {
      toast({ variant: "destructive", title: "Error al conciliar" });
    }
  };

  const handleUploadDoc = async (docId: string, projectId: string = "general") => {
    if (!firestore || !selectedClient) return;
    const finalDocId = projectId === "general" ? docId : `${docId}_${projectId}`;
    const docRef = doc(firestore, `clients/${selectedClient.id}/documents`, finalDocId);
    
    try {
      await setDocumentNonBlocking(docRef, {
        id: finalDocId,
        typeId: docId,
        projectId: projectId,
        status: 'CARGADO',
        uploadDate: new Date().toISOString(),
        fileUrl: 'https://placehold.co/400x600?text=Doc+Escaneado'
      }, { merge: true });
      toast({ title: "Documento Actualizado", description: "El archivo ha sido procesado correctamente." });
    } catch (e) {
      toast({ variant: "destructive", title: "Error al subir" });
    }
  };

  const handleDeleteDoc = async (docId: string, projectId: string = "general") => {
    if (!firestore || !selectedClient) return;
    const finalDocId = projectId === "general" ? docId : `${docId}_${projectId}`;
    const docRef = doc(firestore, `clients/${selectedClient.id}/documents`, finalDocId);
    
    try {
      await deleteDocumentNonBlocking(docRef);
      toast({ title: "Documento Anulado", description: "Se ha eliminado el documento del legajo." });
    } catch (e) {
      toast({ variant: "destructive", title: "Error al eliminar" });
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
          <h1 className="text-3xl font-bold tracking-tight">Gestión de Clientes</h1>
          <p className="text-muted-foreground">Cartera de clientes, legajos fiscales por obra y conciliación de saldos.</p>
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
        <Card className="bg-primary/5 border-primary/20 shadow-none">
          <CardHeader className="pb-2">
            <CardDescription className="text-primary font-bold uppercase text-[10px]">Deuda Total Cartera</CardDescription>
            <CardTitle className="text-2xl">${clients?.reduce((acc, c) => acc + (c.currentBalance || 0), 0).toLocaleString()}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-orange-50 border-orange-200 shadow-none">
          <CardHeader className="pb-2">
            <CardDescription className="text-orange-600 font-bold uppercase text-[10px]">Facturas Pendientes</CardDescription>
            <CardTitle className="text-2xl text-orange-700">---</CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-accent/5 border-accent/20 shadow-none">
          <CardHeader className="pb-2">
            <CardDescription className="text-accent font-bold uppercase text-[10px]">Cobros a Imputar</CardDescription>
            <CardTitle className="text-2xl text-accent">---</CardTitle>
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
                      <Button variant="ghost" size="sm" className="gap-2 text-primary font-bold hover:bg-primary/5" onClick={() => {
                        setSelectedClient(client);
                        setIsSheetOpen(true);
                      }}>
                        Gestionar <ArrowUpRight className="w-4 h-4" />
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
        <SheetContent className="sm:max-w-3xl overflow-y-auto">
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Card className="bg-muted/30 border-none shadow-none">
                  <CardContent className="p-4">
                    <p className="text-[10px] uppercase font-bold text-muted-foreground">Saldo Deudor Total</p>
                    <p className="text-2xl font-black">${(selectedClient?.currentBalance || 0).toLocaleString()}</p>
                  </CardContent>
                </Card>
                <Card className="bg-accent/5 border-dashed border-accent/20 shadow-none">
                  <CardContent className="p-4">
                    <p className="text-[10px] uppercase font-bold text-accent">Disponible a Imputar</p>
                    <p className="text-2xl font-black text-accent">
                      ${transactions?.filter(t => t.type === 'PAGO').reduce((acc, t) => acc + (t.remainingAmount || 0), 0).toLocaleString()}
                    </p>
                  </CardContent>
                </Card>
              </div>

              <div className="flex flex-wrap gap-2 justify-end">
                <Button variant="outline" size="sm" className="gap-2 text-xs" onClick={() => { setTxType("FACTURA"); setIsTxDialogOpen(true); }}>
                  <Receipt className="w-3 h-3" /> Cargar Factura
                </Button>
                <Button className="gap-2 text-xs bg-accent hover:bg-accent/90" size="sm" onClick={() => { 
                  setTxType("PAGO"); 
                  setAllocationType("a_cuenta");
                  setIsTxDialogOpen(true); 
                }}>
                  <HandCoins className="w-3 h-3" /> Registrar Cobro
                </Button>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold uppercase tracking-tight text-primary">Movimientos de Cuenta</h3>
                  <Button variant="ghost" size="sm" className="h-7 text-[10px] gap-2 border" onClick={() => setIsConciliateOpen(true)}>
                    <ArrowRightLeft className="w-3 h-3" /> Módulo de Imputación
                  </Button>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="h-8 text-[10px]">Fecha</TableHead>
                      <TableHead className="h-8 text-[10px]">Detalle</TableHead>
                      <TableHead className="h-8 text-[10px]">Estado</TableHead>
                      <TableHead className="h-8 text-right text-[10px]">Monto</TableHead>
                      <TableHead className="h-8 text-right text-[10px]">Pendiente</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions?.map((tx) => (
                      <TableRow key={tx.id}>
                        <TableCell className="text-[10px]">{format(new Date(tx.date), 'dd/MM/yy')}</TableCell>
                        <TableCell className="text-[10px]">
                          <span className="font-bold flex items-center gap-1">
                            {tx.type === 'FACTURA' && <Receipt className="w-3 h-3 text-muted-foreground" />}
                            {tx.type === 'PAGO' && <HandCoins className="w-3 h-3 text-accent" />}
                            {tx.type === 'CONTRATO' && <Target className="w-3 h-3 text-primary" />}
                            {tx.type}
                          </span>
                          <p className="text-muted-foreground truncate max-w-[150px]">{tx.reference}</p>
                        </TableCell>
                        <TableCell>
                          <Badge variant={tx.status === 'CONCILIADO' ? 'default' : 'outline'} className="text-[8px] uppercase">
                            {tx.status || 'PENDIENTE'}
                          </Badge>
                        </TableCell>
                        <TableCell className={cn(
                          "text-right text-xs font-bold",
                          tx.type === 'PAGO' ? "text-accent" : "text-foreground"
                        )}>
                          {tx.type === 'PAGO' ? '-' : '+'}${tx.amount.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right text-xs font-mono opacity-70">
                          ${(tx.remainingAmount || 0).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                    {(!transactions || transactions.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground italic text-xs">
                          Sin movimientos financieros.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            <TabsContent value="docs" className="space-y-8">
              <div className="space-y-6">
                <div className="border-b pb-2">
                  <h3 className="text-sm font-black uppercase tracking-widest text-primary flex items-center gap-2">
                    <Building2 className="w-4 h-4" /> Legajo Institucional
                  </h3>
                  <p className="text-[10px] text-muted-foreground">Documentación fiscal base de la razón social</p>
                </div>
                
                <div className="grid gap-3">
                  {CLIENT_GENERAL_DOCS.map((docReq) => {
                    const isUploaded = currentDocs?.find(d => d.typeId === docReq.id && d.projectId === "general");
                    return (
                      <div key={docReq.id} className="p-4 border rounded-lg flex items-center justify-between hover:bg-muted/5 transition-colors bg-background">
                        <div className="flex items-center gap-3">
                          {isUploaded ? <CheckCircle2 className="w-5 h-5 text-accent" /> : <AlertCircle className="w-5 h-5 text-orange-400" />}
                          <div>
                            <p className="text-xs font-bold">{docReq.name}</p>
                            <p className="text-[10px] text-muted-foreground">
                              {isUploaded ? `Cargado el ${format(new Date(isUploaded.uploadDate), 'dd/MM/yyyy')}` : 'Documento requerido'}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <label className="cursor-pointer">
                            <Button variant={isUploaded ? "outline" : "secondary"} size="sm" className="h-8 text-[10px] gap-2 pointer-events-none">
                              {isUploaded ? <Camera className="w-3 h-3" /> : <Upload className="w-3 h-3" />}
                              {isUploaded ? "Re-escanear" : "Subir / Escanear"}
                            </Button>
                            <input 
                              type="file" 
                              className="hidden" 
                              accept="image/*,application/pdf" 
                              onChange={(e) => {
                                if (e.target.files?.[0]) handleUploadDoc(docReq.id, "general");
                              }} 
                            />
                          </label>
                          {isUploaded && (
                            <>
                              <Button variant="ghost" size="sm" className="h-8 text-[10px] text-primary" asChild>
                                <a href={isUploaded.fileUrl} target="_blank" rel="noopener noreferrer">Ver</a>
                              </Button>
                              <Button variant="ghost" size="sm" className="h-8 text-[10px] text-destructive hover:bg-destructive/10" onClick={() => handleDeleteDoc(docReq.id, "general")}>
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {clientProjects && clientProjects.length > 0 && (
                <div className="space-y-6">
                  <div className="border-b pb-2">
                    <h3 className="text-sm font-black uppercase tracking-widest text-primary flex items-center gap-2">
                      <Briefcase className="w-4 h-4" /> Legajos Específicos por Obra
                    </h3>
                    <p className="text-[10px] text-muted-foreground">Contratos y pólizas vinculadas a cada proyecto activo</p>
                  </div>
                  
                  {clientProjects.map((project) => (
                    <div key={project.id} className="space-y-3 pl-4 border-l-2 border-primary/10">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="bg-primary/5 text-primary text-[9px] font-bold border-primary/20">OBRA: {project.name}</Badge>
                      </div>
                      <div className="grid gap-2">
                        {CLIENT_PROJECT_DOCS.map((docReq) => {
                          const isUploaded = currentDocs?.find(d => d.typeId === docReq.id && d.projectId === project.id);
                          return (
                            <div key={`${project.id}-${docReq.id}`} className="p-3 border rounded-lg flex items-center justify-between hover:bg-muted/5 transition-colors bg-background/50">
                              <div className="flex items-center gap-3">
                                {isUploaded ? <CheckCircle2 className="w-4 h-4 text-accent" /> : <AlertCircle className="w-4 h-4 text-orange-400" />}
                                <div>
                                  <p className="text-[11px] font-bold">{docReq.name}</p>
                                  <p className="text-[9px] text-muted-foreground italic">
                                    {isUploaded ? `Vigente desde: ${format(new Date(isUploaded.uploadDate), 'dd/MM/yy')}` : 'Faltante en legajo técnico'}
                                  </p>
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <label className="cursor-pointer">
                                  <Button variant={isUploaded ? "outline" : "secondary"} size="sm" className="h-7 text-[9px] gap-2 pointer-events-none">
                                    <Upload className="w-2.5 h-2.5" /> {isUploaded ? "Actualizar" : "Subir / Escanear"}
                                  </Button>
                                  <input 
                                    type="file" 
                                    className="hidden" 
                                    accept="image/*,application/pdf" 
                                    onChange={(e) => {
                                      if (e.target.files?.[0]) handleUploadDoc(docReq.id, project.id);
                                    }} 
                                  />
                                </label>
                                {isUploaded && (
                                  <Button variant="ghost" size="sm" className="h-7 text-[9px] text-destructive hover:bg-destructive/10" onClick={() => handleDeleteDoc(docReq.id, project.id)}>
                                    <Trash2 className="w-2.5 h-2.5" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>

          <SheetFooter className="mt-8 pt-4 border-t">
            <div className="flex flex-col gap-2 w-full">
              <Button variant="ghost" className="w-full text-xs text-muted-foreground">
                <MessageSquare className="w-3 h-3 mr-2" /> Contactar Administración del Cliente
              </Button>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Diálogo Nueva Transacción */}
      <Dialog open={isTxDialogOpen} onOpenChange={setIsTxDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <form onSubmit={handleAddTransaction}>
            <DialogHeader>
              <DialogTitle>Registro de {txType}</DialogTitle>
              <DialogDescription>Incorpore un movimiento financiero a la cuenta corriente del cliente.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Vincular a Obra (Opcional)</Label>
                <Select name="projectId">
                  <SelectTrigger><SelectValue placeholder="Seleccione proyecto..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">Legajo Institucional</SelectItem>
                    {clientProjects?.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Monto ($)</Label>
                <Input name="amount" type="number" step="0.01" placeholder="0.00" required />
              </div>
              <div className="grid gap-2">
                <Label>Referencia / Nº Factura / Concepto</Label>
                <Input name="reference" placeholder="Ej: Factura A 0001-00001234" required />
              </div>
              {txType === 'PAGO' && (
                <>
                  <div className="grid gap-2">
                    <Label>Destino del Cobro</Label>
                    <Select name="allocationType" defaultValue="a_cuenta" onValueChange={setAllocationType}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="a_cuenta">A Cuenta (Sin imputar)</SelectItem>
                        <SelectItem value="directo">Aplicar a Factura Pendiente</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {allocationType === 'directo' && (
                    <div className="grid gap-2 animate-in fade-in slide-in-from-top-1">
                      <Label>Seleccionar Factura a Cancelar</Label>
                      <Select name="targetInvoiceId" required={allocationType === 'directo'}>
                        <SelectTrigger><SelectValue placeholder="Elija factura con saldo..." /></SelectTrigger>
                        <SelectContent>
                          {transactions?.filter(t => (t.type === 'FACTURA' || t.type === 'CONTRATO') && t.remainingAmount > 0).map(inv => (
                            <SelectItem key={inv.id} value={inv.id}>
                              {inv.reference} (Saldo: ${inv.remainingAmount.toLocaleString()})
                            </SelectItem>
                          ))}
                          {(!transactions || transactions.filter(t => (t.type === 'FACTURA' || t.type === 'CONTRATO') && t.remainingAmount > 0).length === 0) && (
                            <SelectItem value="none" disabled>Sin facturas pendientes</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="grid gap-2">
                    <Label>Medio de Cobro</Label>
                    <Select name="method" defaultValue="Transferencia">
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Transferencia">Transferencia Bancaria</SelectItem>
                        <SelectItem value="E-Cheq">E-Cheq (Cheque Electrónico)</SelectItem>
                        <SelectItem value="Efectivo">Efectivo (Caja Chica)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
            </div>
            <DialogFooter>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Confirmar Registro
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Diálogo de Conciliación Mejorado */}
      <Dialog open={isConciliateOpen} onOpenChange={setIsConciliateOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Módulo de Imputación de Cobros</DialogTitle>
            <DialogDescription>Aplique los cobros registrados "A Cuenta" a las facturas pendientes para regularizar saldos por comprobante.</DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Columna Facturas */}
              <div className="space-y-3">
                <Label className="text-xs font-black uppercase text-primary flex items-center gap-2">
                  <Receipt className="w-3 h-3" /> Facturas Pendientes
                </Label>
                <div className="border rounded-md overflow-hidden bg-muted/5">
                  <Table>
                    <TableHeader className="bg-muted/50"><TableRow><TableHead className="h-8 text-[9px]">Comprobante</TableHead><TableHead className="h-8 text-right text-[9px]">Saldo</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {transactions?.filter(t => (t.type === 'FACTURA' || t.type === 'CONTRATO') && t.remainingAmount > 0).map(inv => (
                        <TableRow key={inv.id} className="cursor-default hover:bg-muted/20">
                          <TableCell className="text-[10px] py-2">
                            <p className="font-bold">{inv.reference}</p>
                            <p className="text-[8px] text-muted-foreground">{format(new Date(inv.date), 'dd/MM/yy')}</p>
                          </TableCell>
                          <TableCell className="text-[10px] text-right font-mono">${inv.remainingAmount.toLocaleString()}</TableCell>
                        </TableRow>
                      ))}
                      {(!transactions || transactions.filter(t => (t.type === 'FACTURA' || t.type === 'CONTRATO') && t.remainingAmount > 0).length === 0) && (
                        <TableRow><TableCell colSpan={2} className="text-center py-4 text-[10px] italic text-muted-foreground">Sin facturas pendientes</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Columna Cobros */}
              <div className="space-y-3">
                <Label className="text-xs font-black uppercase text-accent flex items-center gap-2">
                  <HandCoins className="w-3 h-3" /> Cobros a Imputar
                </Label>
                <div className="border rounded-md overflow-hidden bg-muted/5">
                  <Table>
                    <TableHeader className="bg-muted/50"><TableRow><TableHead className="h-8 text-[9px]">Cobro</TableHead><TableHead className="h-8 text-right text-[9px]">Disponible</TableHead><TableHead className="h-8 text-right text-[9px]">Acción</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {transactions?.filter(t => t.type === 'PAGO' && t.remainingAmount > 0).map(pay => (
                        <TableRow key={pay.id} className="hover:bg-muted/20">
                          <TableCell className="text-[10px] py-2">
                            <p className="font-bold">{pay.reference}</p>
                            <p className="text-[8px] text-muted-foreground">{format(new Date(pay.date), 'dd/MM/yy')}</p>
                          </TableCell>
                          <TableCell className="text-[10px] text-right font-mono">${pay.remainingAmount.toLocaleString()}</TableCell>
                          <TableCell className="text-right">
                            <Button 
                              size="sm" 
                              className="h-6 text-[8px] bg-accent hover:bg-accent/90" 
                              onClick={() => {
                                const invoice = transactions?.find(t => (t.type === 'FACTURA' || t.type === 'CONTRATO') && t.remainingAmount > 0);
                                if (invoice) {
                                  handleConciliate(invoice.id, pay.id, Math.min(invoice.remainingAmount, pay.remainingAmount));
                                } else {
                                  toast({ title: "No hay facturas pendientes", description: "No se encontró ningún comprobante de deuda para aplicar el cobro." });
                                }
                              }}
                            >
                              Aplicar
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      {(!transactions || transactions.filter(t => t.type === 'PAGO' && t.remainingAmount > 0).length === 0) && (
                        <TableRow><TableCell colSpan={3} className="text-center py-4 text-[10px] italic text-muted-foreground">Sin cobros pendientes de aplicación</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
            <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 flex gap-2">
              <Info className="w-4 h-4 text-blue-600 shrink-0" />
              <p className="text-[10px] text-blue-800 leading-tight">
                Al hacer clic en "Aplicar", el sistema descontará el monto del cobro disponible de la factura más antigua con saldo pendiente de forma automática.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsConciliateOpen(false)}>Finalizar Tareas</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
