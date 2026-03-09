
"use client"

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useFirebase, addDocumentNonBlocking } from '@/firebase';
import { collection } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { CalendarIcon, Plus, Trash2, Save, FileText, Image as ImageIcon, Users } from 'lucide-react';

export default function NewProjectPage() {
  const { user, firestore } = useFirebase();
  const { toast } = useToast();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    location: '',
    startDate: '',
    plannedEndDate: '',
    totalBudgetAmount: '',
    currentStatus: 'OK'
  });

  const [stages, setStages] = useState([{ name: '', description: '', plannedStartDate: '', plannedEndDate: '' }]);
  const [documents, setDocuments] = useState([{ fileName: '', fileType: 'application/pdf', category: 'Planificación', description: '' }]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const addStage = () => setStages([...stages, { name: '', description: '', plannedStartDate: '', plannedEndDate: '' }]);
  const removeStage = (index: number) => setStages(stages.filter((_, i) => i !== index));

  const addDocument = () => setDocuments([...documents, { fileName: '', fileType: 'application/pdf', category: 'Planificación', description: '' }]);
  const removeDocument = (index: number) => setDocuments(documents.filter((_, i) => i !== index));

  const handleSubmit = async () => {
    if (!user || !firestore) return;
    if (!formData.name || !formData.totalBudgetAmount) {
      toast({ variant: 'destructive', title: 'Error', description: 'El nombre y el presupuesto son obligatorios.' });
      return;
    }

    setLoading(true);
    try {
      const projectData = {
        ...formData,
        totalBudgetAmount: Number(formData.totalBudgetAmount),
        responsibleAnalystId: user.uid,
        projectMembers: { [user.uid]: 'admin' },
        creationDate: new Date().toISOString()
      };

      const projectRef = await addDocumentNonBlocking(collection(firestore, 'projects'), projectData);
      
      if (projectRef) {
        // Save stages
        for (const stage of stages) {
          if (stage.name) {
            await addDocumentNonBlocking(collection(firestore, `projects/${projectRef.id}/stages`), {
              ...stage,
              projectId: projectRef.id,
              responsibleAnalystId: user.uid,
              projectMembers: { [user.uid]: 'admin' },
              status: 'PENDIENTE'
            });
          }
        }

        // Save documents metadata
        for (const doc of documents) {
          if (doc.fileName) {
            await addDocumentNonBlocking(collection(firestore, `projects/${projectRef.id}/documents`), {
              ...doc,
              projectId: projectRef.id,
              responsibleAnalystId: user.uid,
              projectMembers: { [user.uid]: 'admin' },
              fileUrl: 'https://placehold.co/100', // Mock URL
              uploadDate: new Date().toISOString()
            });
          }
        }
      }

      toast({ title: 'Obra Creada', description: 'La obra se ha registrado correctamente.' });
      router.push('/projects');
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Hubo un fallo al guardar la obra.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Nueva Obra</h1>
          <p className="text-muted-foreground">Configura los parámetros fundamentales del proyecto.</p>
        </div>
        <Button variant="outline" onClick={() => router.back()}>Cancelar</Button>
      </div>

      <Tabs defaultValue="basic" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="basic">Información General</TabsTrigger>
          <TabsTrigger value="stages">Etapas y Presupuesto</TabsTrigger>
          <TabsTrigger value="docs">Documentos e Imágenes</TabsTrigger>
        </TabsList>

        <TabsContent value="basic">
          <Card>
            <CardHeader>
              <CardTitle>Datos de la Obra</CardTitle>
              <CardDescription>Identificación y localización del proyecto.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Nombre de la Obra</Label>
                <Input id="name" name="name" placeholder="Ej: Edificio Mirador del Parque" value={formData.name} onChange={handleInputChange} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Descripción Detallada</Label>
                <Textarea id="description" name="description" placeholder="Resumen del proyecto, alcances..." value={formData.description} onChange={handleInputChange} />
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="location">Ubicación / Ciudad</Label>
                  <Input id="location" name="location" placeholder="Ej: Mar del Plata, Buenos Aires" value={formData.location} onChange={handleInputChange} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="totalBudgetAmount">Presupuesto Total Estimado ($)</Label>
                  <Input id="totalBudgetAmount" name="totalBudgetAmount" type="number" placeholder="0.00" value={formData.totalBudgetAmount} onChange={handleInputChange} />
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="startDate">Fecha de Inicio Prevista</Label>
                  <Input id="startDate" name="startDate" type="date" value={formData.startDate} onChange={handleInputChange} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="plannedEndDate">Fecha de Entrega Estimada</Label>
                  <Input id="plannedEndDate" name="plannedEndDate" type="date" value={formData.plannedEndDate} onChange={handleInputChange} />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stages">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Etapas del Proyecto</CardTitle>
                  <CardDescription>Define las fases principales de ejecución.</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={addStage} className="gap-2">
                  <Plus className="w-4 h-4" /> Añadir Etapa
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {stages.map((stage, index) => (
                <div key={index} className="p-4 border rounded-lg space-y-4 bg-muted/30 relative">
                  <Button variant="ghost" size="icon" className="absolute top-2 right-2 text-destructive" onClick={() => removeStage(index)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                  <div className="grid gap-2">
                    <Label>Nombre de la Etapa</Label>
                    <Input placeholder="Ej: Fundaciones" value={stage.name} onChange={(e) => {
                      const newStages = [...stages];
                      newStages[index].name = e.target.value;
                      setStages(newStages);
                    }} />
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label>Inicio Planificado</Label>
                      <Input type="date" value={stage.plannedStartDate} onChange={(e) => {
                        const newStages = [...stages];
                        newStages[index].plannedStartDate = e.target.value;
                        setStages(newStages);
                      }} />
                    </div>
                    <div className="grid gap-2">
                      <Label>Fin Planificado</Label>
                      <Input type="date" value={stage.plannedEndDate} onChange={(e) => {
                        const newStages = [...stages];
                        newStages[index].plannedEndDate = e.target.value;
                        setStages(newStages);
                      }} />
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="docs">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Documentos y Permisos</CardTitle>
                  <CardDescription>Carga de planos, permisos municipales e imágenes.</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={addDocument} className="gap-2">
                  <Plus className="w-4 h-4" /> Añadir Archivo
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {documents.map((doc, index) => (
                <div key={index} className="flex gap-4 items-start p-4 border rounded-lg bg-background">
                  <div className="mt-2 text-primary">
                    <FileText className="w-8 h-8" />
                  </div>
                  <div className="flex-1 grid gap-4 sm:grid-cols-2">
                    <div className="grid gap-2">
                      <Label>Nombre del Documento</Label>
                      <Input placeholder="Ej: Plano Estructural V1" value={doc.fileName} onChange={(e) => {
                        const newDocs = [...documents];
                        newDocs[index].fileName = e.target.value;
                        setDocuments(newDocs);
                      }} />
                    </div>
                    <div className="grid gap-2">
                      <Label>Categoría</Label>
                      <Select value={doc.category} onValueChange={(val) => {
                        const newDocs = [...documents];
                        newDocs[index].category = val;
                        setDocuments(newDocs);
                      }}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Planificación">Planificación</SelectItem>
                          <SelectItem value="Permiso">Permiso Municipal</SelectItem>
                          <SelectItem value="Avance Obra">Imagen de Avance</SelectItem>
                          <SelectItem value="Otro">Otro</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="text-destructive mt-8" onClick={() => removeDocument(index)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              <div className="p-8 border-2 border-dashed rounded-xl flex flex-col items-center justify-center bg-muted/50">
                <ImageIcon className="w-10 h-10 text-muted-foreground opacity-30 mb-2" />
                <p className="text-sm text-muted-foreground font-medium text-center">
                  Zona de Carga Masiva<br/>
                  <span className="text-xs font-normal">Arrastra aquí planos o fotos de la obra (Prototipo: Simulado)</span>
                </p>
                <Button variant="secondary" size="sm" className="mt-4">Explorar Archivos</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end gap-4 pb-12">
        <Button variant="outline" onClick={() => router.back()}>Descartar</Button>
        <Button className="gap-2 bg-accent hover:bg-accent/90" onClick={handleSubmit} disabled={loading}>
          {loading ? 'Guardando...' : <Save className="w-4 h-4" />} Guardar Obra Completa
        </Button>
      </div>
    </div>
  );
}
