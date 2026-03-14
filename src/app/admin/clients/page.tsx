
"use client"

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import { Users, Search, Plus, Filter, ArrowUpRight, MessageSquare, Wallet, Loader2 } from 'lucide-react';

export default function ClientsPage() {
  const { firestore } = useFirebase();
  const [mounted, setMounted] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

  const clientsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'clients'), orderBy('name'));
  }, [firestore]);

  const { data: clients, isLoading } = useCollection(clientsQuery);

  if (!mounted) return null;

  const filteredClients = clients?.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.cuit?.includes(searchTerm)
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Clientes & Cobranzas</h1>
          <p className="text-muted-foreground">Administración de cuentas corrientes y seguimiento de cartera.</p>
        </div>
        <Button className="gap-2 bg-primary">
          <Plus className="w-4 h-4" /> Nuevo Cliente
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader className="pb-2">
            <CardDescription className="text-primary font-bold uppercase text-[10px]">Total Cartera Activa</CardDescription>
            <CardTitle className="text-2xl">${clients?.reduce((acc, c) => acc + (c.currentBalance || 0), 0).toLocaleString()}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-orange-50 border-orange-200">
          <CardHeader className="pb-2">
            <CardDescription className="text-orange-600 font-bold uppercase text-[10px]">Cobranzas Pendientes (+30d)</CardDescription>
            <CardTitle className="text-2xl text-orange-700">$---</CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-accent/5 border-accent/20">
          <CardHeader className="pb-2">
            <CardDescription className="text-accent font-bold uppercase text-[10px]">Efectividad de Cobro</CardDescription>
            <CardTitle className="text-2xl text-accent">94.2%</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <CardTitle>Listado de Cuentas Corrientes</CardTitle>
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
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold">
                        {client.name.substring(0, 2).toUpperCase()}
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
                      <Button variant="ghost" size="icon" title="Cta Cte"><Wallet className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" title="Contacto"><MessageSquare className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" title="Ver Detalle"><ArrowUpRight className="w-4 h-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {(!filteredClients || filteredClients.length === 0) && !isLoading && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12 text-muted-foreground italic">
                    <Users className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    No se encontraron clientes registrados.
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
