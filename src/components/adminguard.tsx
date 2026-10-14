import { useState, type ReactNode } from "react";
import { Lock, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { useStore } from "@/lib/store";

// La contraseña se verifica en Supabase Auth, nunca en el navegador.
// Para cambiarla: Lovable Cloud -> Users -> admin@reypirata.app.
export function AdminGuard({ children }: { children: ReactNode }) {
  const { sesion, iniciarSesion } = useStore();
  const [password, setPassword] = useState("");
  const [enviando, setEnviando] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setEnviando(true);
    const ok = await iniciarSesion(password);
    setEnviando(false);
    if (ok) {
      setPassword("");
      toast.success("¡Bienvenido al panel, capitán!");
    } else {
      toast.error("Contraseña incorrecta");
    }
  };

  if (sesion === null) {
    return <div className="min-h-screen bg-secondary/30" />;
  }

  if (!sesion) {
    return (
      <div className="min-h-screen bg-secondary/30 flex items-center justify-center p-4">
        <Card className="max-w-sm w-full shadow-lg">
          <CardHeader className="text-center space-y-2">
            <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center">
              <Lock className="w-6 h-6" />
            </div>
            <CardTitle className="text-xl">Panel Protegido</CardTitle>
            <CardDescription>
              Ingresa la contraseña de administrador para acceder al control interno.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <div className="relative">
                  <KeyRound className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="password"
                    placeholder="Contraseña"
                    className="pl-9"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoFocus
                  />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={enviando || !password}>
                Entrar al panel
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
