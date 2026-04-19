import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, CheckSquare, Calendar, Megaphone, Plus, Pin } from "lucide-react";
import type { Member, Task, Event as CalEvent, Announcement } from "@shared/schema";

export default function Dashboard() {
  const { data: members, isLoading: loadingMembers } = useQuery<Member[]>({ queryKey: ["/api/members"] });
  const { data: tasks, isLoading: loadingTasks } = useQuery<Task[]>({ queryKey: ["/api/tasks"] });
  const { data: events, isLoading: loadingEvents } = useQuery<CalEvent[]>({ queryKey: ["/api/events"] });
  const { data: announcements, isLoading: loadingAnn } = useQuery<Announcement[]>({ queryKey: ["/api/announcements"] });

  const openTasks = tasks?.filter((t) => t.status !== "Erledigt").length ?? 0;
  const upcomingEvents = events?.filter((e) => e.date >= "2026-03-16").length ?? 0;
  const latestAnnouncements = announcements?.slice(0, 5) ?? [];

  const priorityColor = (p: string) => {
    switch (p) {
      case "Dringend": return "destructive";
      case "Wichtig": return "default";
      default: return "secondary";
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-6xl">
      {/* Welcome */}
      <div>
        <h1 className="text-xl font-semibold" data-testid="text-welcome">Willkommen, Fredi!</h1>
        <p className="text-sm text-muted-foreground">Allengerechtes Wohnen e.G. — Übersicht</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card data-testid="stat-members">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold tabular-nums">{loadingMembers ? <Skeleton className="h-7 w-8" /> : members?.length}</p>
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
              <p className="text-2xl font-bold tabular-nums">{loadingTasks ? <Skeleton className="h-7 w-8" /> : openTasks}</p>
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
              <p className="text-2xl font-bold tabular-nums">{loadingEvents ? <Skeleton className="h-7 w-8" /> : upcomingEvents}</p>
              <p className="text-xs text-muted-foreground">Termine</p>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="stat-announcements">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-chart-5/10">
              <Megaphone className="w-5 h-5 text-chart-5" />
            </div>
            <div>
              <p className="text-2xl font-bold tabular-nums">{loadingAnn ? <Skeleton className="h-7 w-8" /> : announcements?.length}</p>
              <p className="text-xs text-muted-foreground">Ankündigungen</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-2">
        <Button size="sm" data-testid="action-new-announcement">
          <Plus className="w-4 h-4 mr-1" /> Neue Ankündigung
        </Button>
        <Button size="sm" variant="secondary" data-testid="action-new-task">
          <Plus className="w-4 h-4 mr-1" /> Neue Aufgabe
        </Button>
        <Button size="sm" variant="secondary" data-testid="action-new-meeting">
          <Plus className="w-4 h-4 mr-1" /> Meeting planen
        </Button>
      </div>

      {/* Announcements Feed */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Megaphone className="w-4 h-4" /> Aktuelle Ankündigungen
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loadingAnn ? (
            Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)
          ) : (
            latestAnnouncements.map((a) => (
              <div
                key={a.id}
                className="flex flex-col gap-1 p-3 rounded-lg border bg-card"
                data-testid={`announcement-card-${a.id}`}
              >
                <div className="flex items-center gap-2">
                  {a.pinned && <Pin className="w-3 h-3 text-primary shrink-0" />}
                  <span className="text-sm font-medium">{a.title}</span>
                  <Badge variant={priorityColor(a.priority)} className="text-[10px] ml-auto shrink-0">
                    {a.priority}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">{a.content}</p>
                <p className="text-[10px] text-muted-foreground">
                  {a.authorName} · {new Date(a.createdAt).toLocaleDateString("de-DE")}
                </p>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
