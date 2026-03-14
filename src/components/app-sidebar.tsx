
'use client';

import { useState, useEffect } from 'react';
import { 
  FilePlus2, HardHat, ClipboardCheck, Settings2, Clock, 
  Calculator, Users, Truck, Wallet, FileBarChart, 
  UserCircle, ScrollText, ShieldCheck
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from '@/components/ui/sidebar';
import Link from 'next/link';
import { cn } from '@/lib/utils';

const navGroups = [
  {
    label: 'Nueva Entrada',
    items: [
      {
        title: 'Nueva Obra / Licitación',
        url: '/projects/new',
        icon: FilePlus2,
        highlight: true,
      },
    ]
  },
  {
    label: 'Operación PMO',
    items: [
      { title: 'Obras Activas', url: '/projects', icon: HardHat },
      { title: 'Pendiente de Aprobación', url: '/projects/pending', icon: Clock },
      { title: 'Registro de Gasto', url: '/expenses/new', icon: Calculator },
      { title: 'Certificación de Campo', url: '/progress', icon: ClipboardCheck },
    ]
  },
  {
    label: 'Administración',
    items: [
      { title: 'Clientes & Cobranzas', url: '/admin/clients', icon: Users },
      { title: 'Proveedores & Subcontratos', url: '/admin/suppliers', icon: Truck },
      { title: 'Documentación de Obra', url: '/admin/documents', icon: ScrollText },
    ]
  },
  {
    label: 'Finanzas & Tesorería',
    items: [
      { title: 'Caja & Pagos', url: '/finance/treasury', icon: Wallet },
      { title: 'Contabilidad & Bancos', url: '/finance/accounting', icon: FileBarChart },
    ]
  },
  {
    label: 'Recursos Humanos',
    items: [
      { title: 'Legajos & RRHH', url: '/hr/personnel', icon: UserCircle },
    ]
  },
  {
    label: 'Configuración',
    items: [
      { title: 'Sala de Máquinas', url: '/settings/costs', icon: Settings2 },
    ]
  }
];

export function AppSidebar() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Sidebar collapsible="icon">
        <SidebarHeader className="p-4 border-b border-sidebar-border/50">
          <div className="flex items-center gap-3">
            <div className="bg-white rounded-lg p-2 flex items-center justify-center shadow-sm">
              <HardHat className="text-primary w-5 h-5" />
            </div>
            <span className="font-bold text-xl tracking-tight text-white group-data-[collapsible=icon]:hidden">ObraControlIA</span>
          </div>
        </SidebarHeader>
        <SidebarContent />
      </Sidebar>
    );
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-4 border-b border-sidebar-border/50">
        <div className="flex items-center gap-3">
          <div className="bg-white rounded-lg p-2 flex items-center justify-center shadow-sm">
            <HardHat className="text-primary w-5 h-5" />
          </div>
          <span className="font-bold text-xl tracking-tight text-white group-data-[collapsible=icon]:hidden">ObraControlIA</span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        {navGroups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel className="text-sidebar-foreground/50 uppercase text-[9px] font-bold tracking-widest group-data-[collapsible=icon]:hidden px-2 mb-1">
              {group.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="gap-0.5">
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton 
                      asChild 
                      tooltip={item.title}
                      className={cn(
                        "transition-all duration-200",
                        item.highlight 
                          ? "bg-accent text-accent-foreground font-bold hover:bg-accent/90 hover:text-accent-foreground shadow-sm mb-2 py-5 ring-1 ring-white/10" 
                          : "text-sidebar-foreground/80 hover:bg-white/10 hover:text-white h-9"
                      )}
                    >
                      <Link href={item.url}>
                        <item.icon className={cn("w-4 h-4", item.highlight ? "text-accent-foreground" : "text-sidebar-foreground/60")} />
                        <span className="text-xs">{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter className="p-4 border-t border-sidebar-border/50 group-data-[collapsible=icon]:hidden">
        <div className="bg-sidebar-accent/30 rounded-lg p-3 border border-white/5">
          <p className="text-[10px] uppercase font-bold text-sidebar-foreground/40 mb-1">Analista Operativo</p>
          <p className="text-sm font-semibold text-white truncate">Panel de Control Central</p>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
