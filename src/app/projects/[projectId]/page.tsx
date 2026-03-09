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
import { Plus, Trash2, BarChart3, ArrowLeft, Loader2, Save } from 'lucide-react';
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
  
  // Refs
  const projectRef = useMemoFirebase(() => firestore ? doc(firestore, 'projects', projectId) : null, [firestore, projectId]);
  const stagesRef = useMemoFirebase(() => firestore ? collection(firestore, `projects/${projectId}/stages`) : null, [firestore, projectId]);
  const budgetRef = useMemoFirebase(() => firestore ? collection(firestore, `projects/${projectId}/budgetItems`) : null, [firestore, projectId]);
  const expensesRef = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, `projects/${projectId}/expenses`), orderBy('expenseDate', 'desc'));
  }, [firestore, projectId]);

  // Data
  const { data: project, isLoading: projectLoading } = useDoc(projectRef);
  const { data: stages } = useCollection(stagesRef);
  const { data: budgetItems } = useCollection(budgetRef);
  const { data: expenses, isLoading: expensesLoading } = useCollection(expensesRef);

  if (!mounted) return null;

  // Totals
  const totalIncurred = expenses?.reduce((acc, exp) => acc + (exp.totalAmount || 0), 0) || 0;

  // Handlers
  const handleUpdateProject = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!projectRef) return;
    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get('name') as string,
      description: formData.get('description') as string,
      location: formData.get('location') as string,
      totalBudgetAmount: Number(formData.get('totalBudgetAmount')),
      plannedEndDate: formData.get('plannedEndDate') as string,
    };
    updateDocumentNonBlocking(projectRef, data);
    toast({ title: "Cambios guardados", description: "La información de la obra ha sido actualizada." });
  };

  const handleAddBudgetItem = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!firestore || !user) return;

    const formData = new FormData(e.currentTarget);
    const quantity = Number(formData.get('quantity'));
    const unitPrice = Number(formData.get('unitPrice'));

    const newItem = {
      projectId,
      stageId: formData.get('stageId') as string,
      code: formData.get('code') as string,
      name: formData.get('name') as string,
      budgetedQuantity: quantity,
      budgetedUnit: formData.get('unit') as string,
      budgetedUnitPrice: unitPrice,
      budgetedTotalAmount: quantity * unitPrice,
      plannedStartDate: new Date().toISOString(),
      plannedEndDate: project?.plannedEndDate || new Date().toISOString(),
      currentPhysicalProgressPercentage: 0,
      accumulatedActualCost: 0,
      lastUpdateDate: new Date().toISOString(),
      responsibleAnalystId: user.uid,
      projectMembers: { [user.uid]: 'admin' }
    };

    try {
      await addDocumentNonBlocking(collection(firestore, `projects/${projectId}/budgetItems`), newItem);
      toast({ title: "Ítem creado", description: "El ítem ha sido añadido al presupuesto base." });
      setIsAddItemOpen(false);
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "No se pudo crear el ítem." });
    }
  };

  const handleDeleteExpense = (expenseId: string) => {
    if (!firestore) return;
    deleteDocumentNonBlocking(doc(firestore, `projects/${projectId}/expenses`, expenseId));
    toast({ title: "Gasto Eliminado" });
  };

  if (projectLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <Loader2 className="w-10 h-10 animate-spin text-primary opacity-20" />
        <p className="mt-4 text-muted-foreground">Cargando gestión de obra...</p>
      </div>
    );
  }

  if (!project) return <div className="p-8 text-center">Obra no encontrada</div>;

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => router.push('/projects')}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{project.name}</h1>
            <p className="text-muted-foreground">Centro de Control de Obra</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild className="gap-2">
            <Link href="/dashboard">
              <BarChart3 className="w-4 h-4" /> Dashboard
            </Link>
          </Button>
          <Button asChild className="bg-accent hover:bg-accent/90 gap-2">
            <Link href="/expenses/new">
              <Plus className="w-4 h-4" /> Nuevo Gasto
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-primary text-white">
          <CardHeader className="pb-2">
            <CardDescription className="text-white/70 uppercase text-[10px] font-bold">Presupuesto Objetivo</CardDescription>
            <CardTitle className="text-2xl">${(project.totalBudgetAmount || 0).toLocaleString()}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-accent text-white">
          <CardHeader className="pb-2">
            <CardDescription className="text-white/70 uppercase text-[10px] font-bold">Costo Incurrido Total</CardDescription>
            <CardTitle className="text-2xl">${totalIncurred.toLocaleString()}</CardTitle>
          </CardHeader>
        </Card>
        <Card className={cn((project.totalBudgetAmount || 0) - totalIncurred < 0 ? "bg-destructive text-white" : "bg-muted")}>
          <CardHeader className="pb-2">
            <CardDescription className={cn("uppercase text-[10px] font-bold", (project.totalBudgetAmount || 0) - totalIncurred < 0 ? "text-white/70" : "text-muted-foreground")}>Saldo Restante</CardDescription>
            <CardTitle className="text-2xl">${((project.totalBudgetAmount || 0) - totalIncurred).toLocaleString()}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Tabs defaultValue="costs" className="w-full">
        <TabsList className="grid w-full grid-cols-4 mb-8">
          <TabsTrigger value="costs">Gestión de Costos</TabsTrigger>
          <TabsTrigger value="budget">Presupuesto Base</TabsTrigger>
          <TabsTrigger value="stages">Cronograma</TabsTrigger>
          <TabsTrigger value="general">Info General</TabsTrigger>
        </TabsList>

        <TabsContent value="costs">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Historial de Transacciones</CardTitle>
                <CardDescription>Gastos e imputaciones registradas en esta obra.</CardDescription>
              </div>
              <Button asChild variant="outline" size="sm">
                <Link href={`/expenses/new`}>Registrar Nuevo</Link>
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Proveedor</TableHead>
                    <TableHead>Ítem</TableHead>
                    <TableHead>Monto</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expensesLoading ? (
                    <TableRow><TableCell colSpan={6} className="text-center">Cargando...</TableCell></TableRow>
                  ) : expenses?.map((exp) => (
                    <TableRow key={exp.id}>
                      <TableCell className="text-xs">{exp.expenseDate ? format(new Date(exp.expenseDate), 'dd/MM/yy') : '---'}</TableCell>
                      <TableCell className="font-medium">{exp.supplierName}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {budgetItems?.find(i => i.id === exp.budgetItemId)?.name || 'Sin imputar'}
                      </TableCell>
                      <TableCell className="font-bold">${(exp.totalAmount || 0).toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px]">{exp.resourceType}</Badge>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDeleteExpense(exp.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!expenses || expenses.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground italic">
                        No hay gastos registrados. Presiona "Registrar Nuevo" para comenzar.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="budget">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Cómputo y Presupuesto Detallado</CardTitle>
                <CardDescription>Lista de ítems de obra vinculados al contrato.</CardDescription>
              </div>
              
              <Dialog open={isAddItemOpen} onOpenChange={setIsAddItemOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-2 bg-accent hover:bg-accent/90">
                    <Plus className="w-4 h-4" /> Nuevo Ítem
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <form onSubmit={handleAddBudgetItem}>
                    <DialogHeader>
                      <DialogTitle>Añadir Ítem de Presupuesto</DialogTitle>
                      <DialogDescription>Completa los datos técnicos para el cómputo base.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="stageId" className="text-right">Etapa</Label>
                        <div className="col-span-3">
                          <Select name="stageId" required>
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccionar etapa..." />
                            </SelectTrigger>
                            <SelectContent>
                              {stages?.map(s => (
                                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="code" className="text-right">Código</Label>
                        <Input id="code" name="code" placeholder="Ej: 02.01.A" className="col-span-3" required />
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="name" className="text-right">Descripción</Label>
                        <Input id="name" name="name" placeholder="Ej: Mampostería ladrillo 12" className="col-span-3" required />
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="quantity" className="text-right">Cantidad</Label>
                        <Input id="quantity" name="quantity" type="number" step="0.01" placeholder="0.00" className="col-span-3" required />
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="unit" className="text-right">Unidad</Label>
                        <Input id="unit" name="unit" placeholder="Ej: m2, m3, kg" className="col-span-3" required />
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="unitPrice" className="text-right">Precio Unit.</Label>
                        <Input id="unitPrice" name="unitPrice" type="number" step="0.01" placeholder="0.00" className="col-span-3" required />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button type="submit" className="gap-2">
                        <Save className="w-4 h-4" /> Guardar Ítem
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead>Total Presup.</TableHead>
                    <TableHead>Incurrido</TableHead>
                    <TableHead>Avance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {budgetItems?.map((item) => {
                    const itemIncurred = expenses?.filter(e => e.budgetItemId === item.id).reduce((a, b) => a + (b.totalAmount || 0), 0) || 0;
                    return (
                      <TableRow key={item.id}>
                        <TableCell className="font-mono text-xs">{item.code}</TableCell>
                        <TableCell className="text-sm">{item.name}</TableCell>
                        <TableCell className="text-sm font-medium">${(item.budgetedTotalAmount || 0).toLocaleString()}</TableCell>
                        <TableCell className={cn("text-sm", itemIncurred > (item.budgetedTotalAmount || 0) ? "text-destructive font-bold" : "")}>
                          ${itemIncurred.toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                              <div className="h-full bg-primary" style={{ width: `${item.currentPhysicalProgressPercentage || 0}%` }} />
                            </div>
                            <span className="text-[10px]">{item.currentPhysicalProgressPercentage || 0}%</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {(!budgetItems || budgetItems.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground italic">
                        Sin ítems cargados. Pulsa "Nuevo Ítem" para iniciar el cómputo.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stages">
          <Card>
             <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Cronograma de Etapas</CardTitle>
                <CardDescription>Planificación temporal de la obra.</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
               <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Etapa</TableHead>
                    <TableHead>Inicio Planificado</TableHead>
                    <TableHead>Fin Planificado</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stages?.map((stage) => (
                    <TableRow key={stage.id}>
                      <TableCell className="font-medium">{stage.name}</TableCell>
                      <TableCell className="text-xs">{stage.plannedStartDate ? format(new Date(stage.plannedStartDate), 'dd/MM/yyyy') : '---'}</TableCell>
                      <TableCell className="text-xs">{stage.plannedEndDate ? format(new Date(stage.plannedEndDate), 'dd/MM/yyyy') : '---'}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{stage.status}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="general">
          <Card>
            <form onSubmit={handleUpdateProject}>
              <CardHeader><CardTitle>Información Fundamental</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2">
                  <Label>Nombre del Proyecto</Label>
                  <Input name="name" defaultValue={project.name} />
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Presupuesto Base ($)</Label>
                    <Input name="totalBudgetAmount" type="number" defaultValue={project.totalBudgetAmount} />
                  </div>
                  <div className="grid gap-2">
                    <Label>Ubicación</Label>
                    <Input name="location" defaultValue={project.location} />
                  </div>
                </div>
              </CardContent>
              <CardFooter className="justify-end"><Button type="submit">Guardar Cambios</Button></CardFooter>
            </form>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
