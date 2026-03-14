import type {Metadata} from 'next';
import './globals.css';
import {SidebarProvider, SidebarInset} from '@/components/ui/sidebar';
import {AppSidebar} from '@/components/app-sidebar';
import {Header} from '@/components/header';
import {Toaster} from '@/components/ui/toaster';
import {FirebaseClientProvider} from '@/firebase/client-provider';
import {AuthGate} from '@/components/auth-gate';

export const metadata: Metadata = {
  title: 'ObraControlIA - Gestión Inteligente de Obras',
  description: 'Arquitectura de Sistemas Expert en Control de Gestión de Obras',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased bg-background text-foreground">
        <FirebaseClientProvider>
          <AuthGate>
            <SidebarProvider>
              <AppSidebar />
              <SidebarInset className="overflow-x-hidden flex flex-col">
                <Header />
                <main className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full">
                  {children}
                </main>
              </SidebarInset>
            </SidebarProvider>
          </AuthGate>
          <Toaster />
        </FirebaseClientProvider>
      </body>
    </html>
  );
}
