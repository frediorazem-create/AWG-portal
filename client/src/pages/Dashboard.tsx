import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, CheckSquare, Calendar } from "lucide-react";
import type { Member, Task, Event as CalEvent } from "@shared/schema";
import { useAuth } from "@/lib/auth";

export default function Dashboard() {
  const { user } = useAuth();
  const { data: members, isLoading: loadingMembers } = useQuery<Member[]>({ queryKey: ["/api/members"] });
  const { data: tasks, isLoading: loadingTasks } = useQuery<Task[]>({ queryKey: ["/api/tasks"] });
  const { data: events, isLoading: loadingEvents } = useQuery<CalEvent[]>({ queryKey: ["/api/events"] });

  const openTasks = tasks?.filter((t) => t.status !== "Erledigt").length ?? 0;
  const upcomingEvents = events?.filter((e) => e.date >= "2026-03-16").length ?? 0;

  const firstName = user?.name?.split(" ")[0] ?? "";

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-6xl">
      {/* Welcome */}
      <div>
        <h1 className="text-xl font-semibold" data-testid="text-welcome">
          {firstName ? `Willkommen, ${firstName}!` : "Willkommen!"}
        </h1>
        <p className="text-sm text-muted-foreground">Allengerechtes Wohnen — Übersicht</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card data-testid="stat-members">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold tabular-nums">
                {loadingMembers ? <Skeleton className="h-7 w-8" /> : members?.length}
              </p>
              <p className="text-xs text-muted-foreground">Mitglieder</p>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="stat-tasks">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-chart-2/10">
              <CheckSquare className="w-5 h-5 text-chart-2" />
            </div>
            <div>
              <p className="text-2xl font-bold tabular-nums">
                {loadingTasks ? <Skeleton className="h-7 w-8" /> : openTasks}
              </p>
              <p className="text-xs text-muted-foreground">Offene Aufgaben</p>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="stat-events">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-chart-3/10">
              <Calendar className="w-5 h-5 text-chart-3" />
            </div>
            <div>
              <p className="text-2xl font-bold tabular-nums">
                {loadingEvents ? <Skeleton className="h-7 w-8" /> : upcomingEvents}
              </p>
              <p className="text-xs text-muted-foreground">Termine</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
