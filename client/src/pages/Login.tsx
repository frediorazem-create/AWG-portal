import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Home, Lock, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";

export default function Login() {
  const { login } = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      toast({ title: "Eingabe fehlt", description: "Bitte E-Mail und Passwort angeben.", variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      await login(email.trim(), password);
    } catch (err: any) {
      const msg = String(err?.message || "");
      const friendly = msg.includes("401") ? "E-Mail oder Passwort ist falsch." : "Anmeldung fehlgeschlagen.";
      toast({ title: "Anmeldung fehlgeschlagen", description: friendly, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary text-primary-foreground">
              <Home className="w-5 h-5" />
            </div>
            <div>
              <CardTitle className="text-base leading-tight">AWG Portal</CardTitle>
              <p className="text-xs text-muted-foreground">Allengerechtes Wohnen</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground pt-2 flex items-center gap-1">
            <Lock className="w-3.5 h-3.5" /> Bitte anmelden
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-Mail</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.de"
                data-testid="input-login-email"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Passwort</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  data-testid="input-login-password"
                  className="pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
                  aria-label={showPassword ? "Passwort verbergen" : "Passwort anzeigen"}
                  data-testid="button-toggle-password"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={busy} data-testid="button-login">
              {busy ? "Anmeldung läuft…" : "Anmelden"}
            </Button>
            <p className="text-[11px] text-muted-foreground text-center pt-2">
              Zugang nur für Mitglieder. Bei Problemen den Vorstand kontaktieren.
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
