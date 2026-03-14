import {LayoutDashboard, FilePlus2, BarChart3, HardHat, ClipboardCheck, Gavel, Calculator, Settings2, Clock} from 'lucide-react';
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

const items = [
  {
    title: 'Dashboard',
    url: '/dashboard',
    icon: LayoutDashboard,
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
    icon: FilePlus2,
  },
  {
    title: 'Certificación de Campo',
    url: '/progress',
    icon: ClipboardCheck,
  },
  {
    title: 'Reportes Semanales',
    url: '/reports',
    icon: BarChart3,
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
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <div className="bg-accent rounded-lg p-2 flex items-center justify-center">
            <HardHat className="text-white w-5 h-5" />
          </div>
          <span className="font-bold text-xl tracking-tight group-data-[collapsible=icon]:hidden">ObraControlIA</span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/60 uppercase text-[10px] font-bold tracking-widest group-data-[collapsible=icon]:hidden">
            Gestión PMO
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild tooltip={item.title}>
                    <Link href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-4 group-data-[collapsible=icon]:hidden">
        <div className="bg-sidebar-accent/50 rounded-lg p-3">
          <p className="text-xs text-sidebar-foreground/70 font-medium">Analista Senior</p>
          <p className="text-sm font-semibold truncate">Juan Manuel Correa</p>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
