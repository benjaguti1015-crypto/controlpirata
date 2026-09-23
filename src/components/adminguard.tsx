import { useState, type ReactNode } from "react";
import { Lock, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";

const PASSWORD_ADMIN = "rey123"; // Puedes cambiar esta contraseña por la que prefieras

export function AdminGuard({ children }: { children: ReactNode }) {
  const [autenticado, setAutenticado] = useState(() => {
    return sessionStorage.getItem("admin_auth") === "true";
  });
  const [password, setPassword] = useState("");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === PASSWORD_ADMIN) {
      sessionStorage.setItem("admin_auth", "true");
      setAutenticado(true);
      toast.success("¡Bienvenido al panel, capitán!");
    } else {
      toast.error("Contraseña incorrecta");
    }
  };

  if (!autenticado) {
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
              <Button type="submit" className="w-full">
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