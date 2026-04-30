import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, CheckSquare, Calendar, ArrowRight } from "lucide-react";
import type { Member, Task, Event as CalEvent } from "@shared/schema";
import { useAuth } from "@/lib/auth";

export default function Dashboard() {
  const { user } = useAuth();
  const { data: members, isLoading: loadingMembers } = useQuery<Member[]>({ queryKey: ["/api/members"] });
  const { data: tasks, isLoading: loadingTasks } = useQuery<Task[]>({ queryKey: ["/api/tasks"] });
  const { data: events, isLoading: loadingEvents } = useQuery<CalEvent[]>({ queryKey: ["/api/events"] });

  const openTasks = tasks?.filter((t) => t.status !== "Erledigt").length ?? 0;
  // Heutiges Datum als YYYY-MM-DD (lokale Zeit)
  const today = new Date().toISOString().slice(0, 10);
  const upcomingEvents = events?.filter((e) => e.date >= today).length ?? 0;

  const firstName = user?.name?.split(" ")[0] ?? "";

  const cards = [
    {
      href: "/members",
      label: "Mitglieder",
      value: members?.length,
      loading: loadingMembers,
      icon: Users,
      iconBg: "bg-primary/10",
      iconColor: "text-primary",
      testId: "stat-members",
    },
    {
      href: "/tasks",
      label: "Offene Aufgaben",
      value: openTasks,
      loading: loadingTasks,
      icon: CheckSquare,
      iconBg: "bg-chart-2/10",
      iconColor: "text-chart-2",
      testId: "stat-tasks",
    },
    {
      href: "/calendar",
      label: "Anstehende Termine",
      value: upcomingEvents,
      loading: loadingEvents,
      icon: Calendar,
      iconBg: "bg-chart-3/10",
      iconColor: "text-chart-3",
      testId: "stat-events",
    },
  ] as const;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-6xl">
      {/* Welcome */}
      <div>
        <h1 className="text-xl font-semibold" data-testid="text-welcome">
          {firstName ? `Willkommen, ${firstName}!` : "Willkommen!"}
        </h1>
        <p className="text-sm text-muted-foreground">Allengerechtes Wohnen — Übersicht</p>
      </div>

      {/* Stats Cards (anklickbar) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {cards.map((c) => (
          <Link key={c.href} href={c.href}>
            <a
              className="block group focus:outline-none"
              data-testid={`link-${c.testId}`}
            >
              <Card className="cursor-pointer transition-all hover:ring-1 hover:ring-primary/40 hover:shadow-md group-focus-visible:ring-2 group-focus-visible:ring-primary">
                <CardContent className="flex items-center gap-3 p-4">
                  <div className={`flex items-center justify-center w-10 h-10 rounded-lg ${c.iconBg}`}>
                    <c.icon className={`w-5 h-5 ${c.iconColor}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-2xl font-bold tabular-nums">
                      {c.loading ? <Skeleton className="h-7 w-8" /> : c.value}
                    </p>
                    <p className="text-xs text-muted-foreground">{c.label}</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                </CardContent>
              </Card>
            </a>
          </Link>
        ))}
      </div>
    </div>
  );
}
