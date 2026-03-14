import { FilePlus2, HardHat, ClipboardCheck, Settings2, Clock, Calculator } from 'lucide-react';
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

const items = [
  {
    title: 'Nueva Entrada de Obra',
    url: '/projects/new',
    icon: FilePlus2,
    highlight: true,
  },
  {
    title: 'Obras Activas',
    url: '/projects',
    icon: HardHat,
  },
  {
    title: 'Pendiente de Aprobación',
    url: '/projects/pending',
    icon: Clock,
  },
  {
    title: 'Simulador Rápido',
    url: '/tenders/simulator',
    icon: Calculator,
  },
  {
    title: 'Registro de Gasto',
    url: '/expenses/new',
    icon: Calculator,
  },
  {
    title: 'Certificación de Campo',
    url: '/progress',
    icon: ClipboardCheck,
  },
  {
    title: 'Sala de Máquinas',
    url: '/settings/costs',
    icon: Settings2,
  },
];

export function AppSidebar() {
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
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/50 uppercase text-[10px] font-bold tracking-widest group-data-[collapsible=icon]:hidden px-2 mb-2">
            Operación PMO
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild 
                    tooltip={item.title}
                    className={cn(
                      "transition-all duration-200",
                      item.highlight 
                        ? "bg-accent text-accent-foreground font-bold hover:bg-accent/90 hover:text-accent-foreground shadow-md my-2 py-6 ring-1 ring-white/20" 
                        : "text-sidebar-foreground/80 hover:bg-white/10 hover:text-white"
                    )}
                  >
                    <Link href={item.url}>
                      <item.icon className={cn("w-5 h-5", item.highlight ? "text-accent-foreground" : "text-sidebar-foreground/60")} />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-4 border-t border-sidebar-border/50 group-data-[collapsible=icon]:hidden">
        <div className="bg-sidebar-accent/30 rounded-lg p-3 border border-white/5">
          <p className="text-[10px] uppercase font-bold text-sidebar-foreground/40 mb-1">Analista Senior</p>
          <p className="text-sm font-semibold text-white truncate">Juan Manuel Correa</p>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
