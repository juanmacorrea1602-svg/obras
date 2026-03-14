
"use client"

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import { Truck, Search, Plus, Filter, Calendar, Bell, DollarSign } from 'lucide-react';

export default function SuppliersPage() {
  const { firestore } = useFirebase();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const suppliersQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'suppliers'), orderBy('name'));
  }, [firestore]);

  const { data: suppliers, isLoading } = useCollection(suppliersQuery);

  if (!mounted) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Proveedores & Subcontratos</h1>
          <p className="text-muted-foreground">Gestión de facturación, cuentas corrientes y vencimientos.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2">
            <Bell className="w-4 h-4" /> Vencimientos
          </Button>
          <Button className="gap-2 bg-primary">
            <Plus className="w-4 h-4" /> Nuevo Proveedor
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-muted/50 border-border">
          <CardHeader className="p-4">
            <p className="text-[10px] font-bold text-muted-foreground uppercase">Deuda Total Proveedores</p>
            <CardTitle className="text-xl">$---</CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-muted/50 border-border">
          <CardHeader className="p-4">
            <p className="text-[10px] font-bold text-muted-foreground uppercase">Facturas Pendientes</p>
            <CardTitle className="text-xl">---</CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-red-50 border-red-200">
          <CardHeader className="p-4">
            <p className="text-[10px] font-bold text-red-600 uppercase">Vencimientos Próx. 72hs</p>
            <CardTitle className="text-xl text-red-700">---</CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader className="p-4">
            <p className="text-[10px] font-bold text-primary uppercase">Subcontratos en Curso</p>
            <CardTitle className="text-xl">---</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <CardTitle>Cuentas Corrientes de Acreedores</CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Buscar proveedor..." className="pl-8" />
              </div>
              <Button variant="outline" size="icon"><Filter className="w-4 h-4" /></Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Proveedor / Rubro</TableHead>
                <TableHead>CUIT</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead className="text-right">Saldo Pendiente</TableHead>
                <TableHead className="text-right">Último Pago</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {suppliers?.map((supplier) => (
                <TableRow key={supplier.id}>
                  <TableCell>
                    <div className="font-medium">{supplier.name}</div>
                    <div className="text-[10px] text-muted-foreground">Mar del Plata, PBA</div>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{supplier.cuit}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[10px]">{supplier.category}</Badge>
                  </TableCell>
                  <TableCell className="text-right font-bold">
                    ${(supplier.currentBalance || 0).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right text-xs text-muted-foreground">
                    --/--/--
                  </TableCell>
                </TableRow>
              ))}
              {(!suppliers || suppliers.length === 0) && !isLoading && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12 text-muted-foreground italic">
                    <Truck className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    No hay proveedores registrados.
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
