
"use client"

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, limit } from 'firebase/firestore';
import { Wallet, DollarSign, ArrowUpCircle, ArrowDownCircle, Banknote, CreditCard, History } from 'lucide-react';

export default function TreasuryPage() {
  const { firestore } = useFirebase();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const paymentsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'payment_orders'), orderBy('paymentDate', 'desc'), limit(10));
  }, [firestore]);

  const { data: payments, isLoading } = useCollection(paymentsQuery);

  if (!mounted) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tesorería & Pagos</h1>
          <p className="text-muted-foreground">Control de fondos fijos, órdenes de pago y flujo de caja.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2">
            <History className="w-4 h-4" /> Arqueo de Caja
          </Button>
          <Button className="gap-2 bg-primary">
            <DollarSign className="w-4 h-4" /> Nueva Orden de Pago
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-primary text-white shadow-lg">
          <CardHeader className="pb-2">
            <CardDescription className="text-white/70 uppercase text-[10px] font-bold">Saldo Disponible (Bancos)</CardDescription>
            <CardTitle className="text-2xl">$---</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-center gap-2 text-[10px] opacity-80">
              <CreditCard className="w-3 h-3" /> Conciliado al: {new Date().toLocaleDateString()}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-accent text-white shadow-lg">
          <CardHeader className="pb-2">
            <CardDescription className="text-white/70 uppercase text-[10px] font-bold">Fondo Fijo de Obra</CardDescription>
            <CardTitle className="text-2xl">$---</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-center gap-2 text-[10px] opacity-80">
              <Banknote className="w-3 h-3" /> Disponible para gastos menores
            </div>
          </CardContent>
        </Card>
        <Card className="bg-muted border-border">
          <CardHeader className="pb-2">
            <CardDescription className="text-muted-foreground uppercase text-[10px] font-bold">Pagos Pendientes (Semana)</CardDescription>
            <CardTitle className="text-2xl">$---</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground italic">
              <ArrowDownCircle className="w-3 h-3" /> Proyección de egresos
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Últimas Órdenes de Pago</CardTitle>
            <CardDescription>Egresos confirmados y pendientes.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Beneficiario</TableHead>
                  <TableHead>Monto</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments?.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell className="text-xs font-medium">---</TableCell>
                    <TableCell className="text-xs font-bold">${payment.amount?.toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[9px]">{payment.status}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {(!payments || payments.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-8 text-muted-foreground italic text-xs">
                      No hay pagos registrados recientemente.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Conciliaciones Bancarias</CardTitle>
            <CardDescription>Resumen de estados de cuenta.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="bg-primary/10 p-2 rounded">
                    <Banknote className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-bold">Banco Provincia</p>
                    <p className="text-[10px] text-muted-foreground">Cta Cte en Pesos</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" className="text-xs">Conciliar</Button>
              </div>
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="bg-primary/10 p-2 rounded">
                    <CreditCard className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-bold">E-Cheqs</p>
                    <p className="text-[10px] text-muted-foreground">Cartera de cheques electrónicos</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" className="text-xs">Ver Cartera</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
