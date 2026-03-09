'use client';

import { useEffect } from 'react';
import { useFirebase, initiateAnonymousSignIn } from '@/firebase';
import { Loader2 } from 'lucide-react';

/**
 * AuthGate asegura que siempre haya un usuario autenticado (aunque sea anónimo)
 * antes de renderizar la aplicación, evitando errores de permisos en Firestore.
 */
export function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, auth, isUserLoading } = useFirebase();

  useEffect(() => {
    if (!isUserLoading && !user) {
      initiateAnonymousSignIn(auth);
    }
  }, [user, auth, isUserLoading]);

  if (isUserLoading && !user) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary opacity-20" />
          <p className="text-sm font-medium text-muted-foreground animate-pulse">Iniciando sesión segura...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
