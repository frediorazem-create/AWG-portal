import { useState, type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useTheme } from "./ThemeProvider";
import {
  LayoutDashboard,
  MessageCircle,
  Calendar,
  CheckSquare,
  FolderOpen,
  Vote,
  Users,
  Video,
  Mail,
  Inbox,
  Sun,
  Moon,
  Menu,
  X,
  Home,
  Bookmark,
  Settings2,
  LogOut,
  KeyRound,
  ShieldCheck,
  Eye,
  EyeOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { PerplexityAttribution } from "@/components/PerplexityAttribution";
import { useAuth } from "@/lib/auth";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { SidebarItem } from "@shared/schema";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/chat", label: "Chat", icon: MessageCircle },
  { href: "/calendar", label: "Kalender", icon: Calendar },
  { href: "/tasks", label: "Aufgaben", icon: CheckSquare },
  { href: "/documents", label: "Dokumente", icon: FolderOpen },
  { href: "/voting", label: "Abstimmungen", icon: Vote },
  { href: "/members", label: "Mitglieder", icon: Users },
  { href: "/video", label: "Videokonferenz", icon: Video },
  { href: "/mailing", label: "E-Mail-Verteiler", icon: Mail },
  { href: "/posteingang", label: "Posteingang", icon: Inbox },
];

function PwInput({ value, onChange, testId }: { value: string; onChange: (v: string) => void; testId: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="pr-10"
        data-testid={testId}
      />
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
        aria-label={show ? "Passwort verbergen" : "Passwort anzeigen"}
        tabIndex={-1}
      >
        {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  );
}

function ChangePasswordDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [oldPw, setOldPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();

  const submit = async () => {
    if (newPw.length < 8) {
      toast({ title: "Zu kurz", description: "Das neue Passwort muss mindestens 8 Zeichen haben.", variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      await apiRequest("POST", "/api/auth/change-password", { currentPassword: oldPw, newPassword: newPw });
      toast({ title: "Passwort geändert", description: "Ab sofort gilt das neue Passwort." });
      setOldPw("");
      setNewPw("");
      onOpenChange(false);
    } catch (err: any) {
      const msg = String(err?.message || "");
      const friendly = msg.includes("401") || msg.includes("403")
        ? "Das alte Passwort stimmt nicht."
        : "Passwort konnte nicht geändert werden.";
      toast({ title: "Fehler", description: friendly, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Mein Passwort ändern</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-2">
            <Label>Aktuelles Passwort</Label>
            <PwInput value={oldPw} onChange={setOldPw} testId="input-old-password" />
          </div>
          <div className="space-y-2">
            <Label>Neues Passwort</Label>
            <PwInput value={newPw} onChange={setNewPw} testId="input-new-password" />
            <p className="text-[11px] text-muted-foreground">Mindestens 8 Zeichen.</p>
          </div>
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Abbrechen</Button>
          <Button onClick={submit} disabled={busy} data-testid="button-save-password">
            {busy ? "Speichere…" : "Speichern"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function Layout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const { theme, toggleTheme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);
  const { user, isAdmin, logout } = useAuth();
  const { data: customItems } = useQuery<SidebarItem[]>({ queryKey: ["/api/sidebar-items"] });

  const initials = (user?.name || "")
    .split(" ")
    .map((n) => n[0])
    .filter(Boolean)
    .join("")
    .slice(0, 2)
    .toUpperCase() || "?";

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
          onClick={() => setSidebarOpen(false)}
          data-testid="sidebar-overlay"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-40 flex flex-col w-64 bg-sidebar border-r border-sidebar-border transition-transform duration-200 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
        data-testid="sidebar"
      >
        {/* Logo area */}
        <div className="flex items-center gap-2 px-4 h-14 border-b border-sidebar-border shrink-0">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary text-primary-foreground">
            <Home className="w-4 h-4" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-sidebar-foreground leading-tight">AWG Portal</span>
            <span className="text-[10px] text-muted-foreground leading-tight">Allengerechtes Wohnen</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="ml-auto md:hidden"
            onClick={() => setSidebarOpen(false)}
            data-testid="sidebar-close"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5" data-testid="sidebar-nav">
          {navItems.map((item) => {
            const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href}>
                <div
                  className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer ${
                    isActive
                      ? "bg-sidebar-accent text-sidebar-primary"
                      : "text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
                  }`}
                  onClick={() => setSidebarOpen(false)}
                  data-testid={`nav-${item.href.replace("/", "") || "dashboard"}`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </div>
              </Link>
            );
          })}

          {/* Eigene Bereiche */}
          {(customItems && customItems.length > 0) && (
            <div className="pt-4">
              <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Meine Bereiche</p>
              {customItems.map((item) => {
                const href = `/bereich/${item.id}`;
                const isActive = location === href;
                return (
                  <Link key={item.id} href={href}>
                    <div
                      className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer ${
                        isActive
                          ? "bg-sidebar-accent text-sidebar-primary"
                          : "text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
                      }`}
                      onClick={() => setSidebarOpen(false)}
                      data-testid={`nav-bereich-${item.id}`}
                    >
                      <Bookmark className="w-4 h-4 shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}

          {/* Verwalten-Eintrag — nur Admins */}
          {isAdmin && (
            <div className="pt-2">
              <Link href="/sidebar-verwalten">
                <div
                  className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer ${
                    location === "/sidebar-verwalten"
                      ? "bg-sidebar-accent text-sidebar-primary"
                      : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
                  }`}
                  onClick={() => setSidebarOpen(false)}
                  data-testid="nav-sidebar-verwalten"
                >
                  <Settings2 className="w-4 h-4 shrink-0" />
                  <span>Bereiche verwalten</span>
                </div>
              </Link>
            </div>
          )}
        </nav>

        {/* Footer */}
        <div className="border-t border-sidebar-border px-3 py-3 space-y-2 shrink-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Avatar className="w-7 h-7 shrink-0">
                <AvatarFallback className="text-xs bg-primary/10 text-primary">{initials}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col min-w-0">
                <span className="text-xs text-sidebar-foreground font-medium truncate" data-testid="text-current-user">
                  {user?.name || "Mitglied"}
                </span>
                {isAdmin && (
                  <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4 w-fit gap-0.5" data-testid="badge-admin">
                    <ShieldCheck className="w-2.5 h-2.5" /> Admin
                  </Badge>
                )}
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0"
              onClick={toggleTheme}
              data-testid="theme-toggle"
              title={theme === "dark" ? "Helles Design" : "Dunkles Design"}
            >
              {theme === "dark" ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            </Button>
          </div>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 h-7 text-[11px] gap-1"
              onClick={() => setPwOpen(true)}
              data-testid="button-change-password"
            >
              <KeyRound className="w-3 h-3" /> Passwort
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1 h-7 text-[11px] gap-1"
              onClick={() => logout()}
              data-testid="button-logout"
            >
              <LogOut className="w-3 h-3" /> Abmelden
            </Button>
          </div>
          <PerplexityAttribution />
        </div>
      </aside>

      <ChangePasswordDialog open={pwOpen} onOpenChange={setPwOpen} />

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile header */}
        <header className="flex md:hidden items-center gap-3 h-14 px-4 border-b border-border shrink-0 bg-background">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(true)}
            data-testid="sidebar-open"
          >
            <Menu className="w-5 h-5" />
          </Button>
          <span className="text-sm font-semibold">AWG Portal</span>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
