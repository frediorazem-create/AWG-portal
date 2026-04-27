import { useState, type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useTheme } from "./ThemeProvider";
import {
  LayoutDashboard,
  MessageCircle,
  Megaphone,
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { PerplexityAttribution } from "@/components/PerplexityAttribution";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/chat", label: "Chat", icon: MessageCircle },
  { href: "/announcements", label: "Ankündigungen", icon: Megaphone },
  { href: "/calendar", label: "Kalender", icon: Calendar },
  { href: "/tasks", label: "Aufgaben", icon: CheckSquare },
  { href: "/documents", label: "Dokumente", icon: FolderOpen },
  { href: "/voting", label: "Abstimmungen", icon: Vote },
  { href: "/members", label: "Mitglieder", icon: Users },
  { href: "/video", label: "Videokonferenz", icon: Video },
  { href: "/mailing", label: "E-Mail-Verteiler", icon: Mail },
  { href: "/posteingang", label: "Posteingang", icon: Inbox },
];

export function Layout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const { theme, toggleTheme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
        </nav>

        {/* Footer */}
        <div className="border-t border-sidebar-border px-3 py-3 space-y-2 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Avatar className="w-7 h-7">
                <AvatarFallback className="text-xs bg-primary/10 text-primary">FO</AvatarFallback>
              </Avatar>
              <span className="text-xs text-sidebar-foreground font-medium">Fredi Orazem</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={toggleTheme}
              data-testid="theme-toggle"
            >
              {theme === "dark" ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            </Button>
          </div>
          <PerplexityAttribution />
        </div>
      </aside>

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
