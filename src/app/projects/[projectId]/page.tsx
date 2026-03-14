
"use client"

import { useState, use, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useFirebase, useDoc, useCollection, useMemoFirebase, updateDocumentNonBlocking, deleteDocumentNonBlocking, addDocumentNonBlocking } from '@/firebase';
import { doc, collection, query, orderBy } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, BarChart3, ArrowLeft, Loader2, Save, ScrollText, ShieldCheck, FileText } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

export default function ProjectDetailPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = use(params);
  const { user, firestore } = useFirebase();
  const { toast } = useToast();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [isAddItemOpen, setIsAddItemOpen] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);
  
  const projectRef = useMemoFirebase(() => firestore ? doc(firestore, 'projects', projectId) : null, [firestore, projectId]);
  const stagesRef = useMemoFirebase(() => firestore ? collection(firestore, `projects/${projectId}/stages`) : null, [firestore, projectId]);
  const budgetRef = useMemoFirebase(() => firestore ? collection(firestore, `projects/${projectId}/budgetItems`) : null, [firestore, projectId]);
  const expensesRef = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, `projects/${projectId}/expenses`), orderBy('expenseDate', 'desc'));
  }, [firestore, projectId]);
  const docsRef = useMemoFirebase(() => firestore ? collection(firestore, `projects/${projectId}/documents`) : null, [firestore, projectId]);

  const { data: project, isLoading: projectLoading } = useDoc(projectRef);
  const { data: stages } = useCollection(stagesRef);
  const { data: budgetItems } = useCollection(budgetRef);
  const { data: expenses, isLoading: expensesLoading } = useCollection(expensesRef);
  const { data: projectDocs } = useCollection(docsRef);

  if (!mounted) return null;

  const totalIncurred = expenses?.reduce((acc, exp) => acc + (exp.totalAmount || 0), 0) || 0;

  const handleUpdateProject = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!projectRef) return;
    const formData = new FormData(e.currentTarget);
    updateDocumentNonBlocking(projectRef, {
      name: formData.get('name') as string,
      location: formData.get('location') as string,
      totalBudgetAmount: Number(formData.get('totalBudgetAmount')),
    });
    toast({ title: "Cambios guardados" });
  };

  if (projectLoading) return <div className="flex h-screen items-center justify-center"><Loader2 className="w-8 h-8 animate-spin" /></div>;
  if (!project) return <div className="p-8 text-center">Obra no encontrada</div>;

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => router.push('/projects')}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{project.name}</h1>
            <p className="text-xs text-muted-foreground font-mono uppercase tracking-widest">{project.type}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild className="gap-2">
            <Link href="/reports"><BarChart3 className="w-4 h-4" /> Generar Reporte</Link>
          </Button>
          <Button asChild className="bg-accent hover:bg-accent/90 gap-2">
            <Link href="/expenses/new"><Plus className="w-4 h-4" /> Nuevo Gasto</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-primary text-white border-none"><CardHeader className="p-4"><CardDescription className="text-white/70 text-[10px] font-bold uppercase">Presupuesto</CardDescription><CardTitle className="text-xl">${(project.totalBudgetAmount || 0).toLocaleString()}</CardTitle></CardHeader></Card>
        <Card className="bg-accent text-white border-none"><CardHeader className="p-4"><CardDescription className="text-white/70 text-[10px] font-bold uppercase">Incurrido</CardDescription><CardTitle className="text-xl">${totalIncurred.toLocaleString()}</CardTitle></CardHeader></Card>
        <Card className="bg-muted border-none"><CardHeader className="p-4"><CardDescription className="text-muted-foreground text-[10px] font-bold uppercase">Saldo</CardDescription><CardTitle className="text-xl">${((project.totalBudgetAmount || 0) - totalIncurred).toLocaleString()}</CardTitle></CardHeader></Card>
      </div>

      <Tabs defaultValue="costs" className="w-full">
        <TabsList className="grid w-full grid-cols-5 h-12 mb-6">
          <TabsTrigger value="costs">Costos</TabsTrigger>
          <TabsTrigger value="budget">Presupuesto</TabsTrigger>
          <TabsTrigger value="docs">Documentación</TabsTrigger>
          <TabsTrigger value="stages">Etapas</TabsTrigger>
          <TabsTrigger value="general">Info</TabsTrigger>
        </TabsList>

        <TabsContent value="costs">
          <Card>
            <CardHeader className="pb-4"><CardTitle className="text-lg">Transacciones de Obra</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Fecha</TableHead><TableHead>Proveedor</TableHead><TableHead>Monto</TableHead><TableHead>Tipo</TableHead></TableRow></TableHeader>
                <TableBody>
                  {expenses?.map(exp => (
                    <TableRow key={exp.id}>
                      <TableCell className="text-[10px]">{exp.expenseDate ? format(new Date(exp.expenseDate), 'dd/MM/yy') : '---'}</TableCell>
                      <TableCell className="text-xs font-medium">{exp.supplierName}</TableCell>
                      <TableCell className="text-xs font-bold">${(exp.totalAmount || 0).toLocaleString()}</TableCell>
                      <TableCell><Badge variant="outline" className="text-[8px] uppercase">{exp.resourceType}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="docs">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2"><ScrollText className="w-5 h-5 text-primary" /> Contratos y OC</CardTitle>
                  <Button variant="ghost" size="sm"><Plus className="w-4 h-4" /></Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {projectDocs?.filter(d => d.category === 'Contratos')?.map(doc => (
                  <div key={doc.id} className="flex items-center justify-between p-2 border rounded text-xs">
                    <div className="flex items-center gap-2"><FileText className="w-4 h-4 text-muted-foreground" /> {doc.fileName}</div>
                    <Badge variant="secondary" className="text-[8px]">{doc.uploadDate}</Badge>
                  </div>
                ))}
                {(!projectDocs || projectDocs.length === 0) && <p className="text-xs text-muted-foreground italic text-center py-4">Sin documentos contractuales.</p>}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2"><ShieldCheck className="w-5 h-5 text-accent" /> Pólizas de Obra</CardTitle>
                  <Button variant="ghost" size="sm"><Plus className="w-4 h-4" /></Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                 <div className="p-3 border rounded-lg bg-accent/5 border-accent/20 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold">Responsabilidad Civil</p>
                      <p className="text-[10px] text-muted-foreground">Vencimiento: --/--/----</p>
                    </div>
                    <Badge variant="outline" className="text-[8px] text-accent border-accent/30">ACTIVA</Badge>
                 </div>
                 <div className="p-3 border rounded-lg opacity-50 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold">Caución Mantenimiento Oferta</p>
                      <p className="text-[10px] text-muted-foreground">Finalizada</p>
                    </div>
                    <Badge variant="secondary" className="text-[8px]">BAJA</Badge>
                 </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="budget">
           <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Cómputo Base</CardTitle>
              <Button size="sm" variant="outline" onClick={() => setIsAddItemOpen(true)}>Añadir Ítem</Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Ítem</TableHead><TableHead>Presupuesto</TableHead><TableHead>Progreso</TableHead></TableRow></TableHeader>
                <TableBody>
                  {budgetItems?.map(item => (
                    <TableRow key={item.id}>
                      <TableCell className="text-xs font-medium">{item.name}</TableCell>
                      <TableCell className="text-xs font-bold">${(item.budgetedTotalAmount || 0).toLocaleString()}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden"><div className="h-full bg-primary" style={{ width: `${item.currentPhysicalProgressPercentage || 0}%` }} /></div>
                          <span className="text-[9px] font-bold">{item.currentPhysicalProgressPercentage || 0}%</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stages">
          <Card>
            <CardHeader><CardTitle className="text-lg">Cronograma</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stages?.map(stage => (
                  <div key={stage.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="text-sm font-bold">{stage.name}</p>
                      <p className="text-[10px] text-muted-foreground">Fin: {stage.plannedEndDate ? format(new Date(stage.plannedEndDate), 'dd/MM/yyyy') : '---'}</p>
                    </div>
                    <Badge variant="secondary" className="text-[9px]">{stage.status}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="general">
          <Card>
            <form onSubmit={handleUpdateProject}>
              <CardHeader><CardTitle className="text-lg">Identificación</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2"><Label className="text-xs">Nombre</Label><Input name="name" defaultValue={project.name} /></div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="grid gap-2"><Label className="text-xs">Presupuesto ($)</Label><Input name="totalBudgetAmount" type="number" defaultValue={project.totalBudgetAmount} /></div>
                  <div className="grid gap-2"><Label className="text-xs">Ubicación</Label><Input name="location" defaultValue={project.location} /></div>
                </div>
              </CardContent>
              <CardFooter className="justify-end"><Button type="submit" size="sm">Guardar</Button></CardFooter>
            </form>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
