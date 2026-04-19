import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Calendar, ChevronLeft, ChevronRight, Plus, MapPin, Clock } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Event as CalEvent } from "@shared/schema";

const MONTHS = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];
const WEEKDAYS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  const day = new Date(year, month, 1).getDay();
  return day === 0 ? 6 : day - 1; // Monday-indexed
}

const categoryColor: Record<string, string> = {
  "Workshop": "bg-chart-3/15 text-chart-3",
  "Versammlung": "bg-chart-1/15 text-chart-1",
  "Treffen": "bg-chart-2/15 text-chart-2",
  "Sonstiges": "bg-muted text-muted-foreground",
};

export default function CalendarPage() {
  const [currentMonth, setCurrentMonth] = useState(2); // March (0-indexed)
  const [currentYear, setCurrentYear] = useState(2026);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", date: "", time: "", endTime: "", location: "", category: "Treffen" });

  const { data: events, isLoading } = useQuery<CalEvent[]>({ queryKey: ["/api/events"] });

  const createMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/events", form);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      setOpen(false);
      setForm({ title: "", description: "", date: "", time: "", endTime: "", location: "", category: "Treffen" });
    },
  });

  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth);

  const monthEvents = events?.filter((e) => {
    const d = new Date(e.date);
    return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
  }) ?? [];

  const eventsOnDay = (day: number) => {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return monthEvents.filter((e) => e.date === dateStr);
  };

  const navigateMonth = (delta: number) => {
    let m = currentMonth + delta;
    let y = currentYear;
    if (m < 0) { m = 11; y--; }
    if (m > 11) { m = 0; y++; }
    setCurrentMonth(m);
    setCurrentYear(y);
  };

  const upcomingEvents = events
    ?.filter((e) => e.date >= "2026-03-16")
    .slice(0, 5) ?? [];

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-6xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2" data-testid="text-calendar-title">
            <Calendar className="w-5 h-5" /> Kalender
          </h1>
          <p className="text-sm text-muted-foreground">Termine und Veranstaltungen</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" data-testid="button-new-event">
              <Plus className="w-4 h-4 mr-1" /> Neuer Termin
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Neuen Termin erstellen</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Titel</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} data-testid="input-event-title" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Datum</Label>
                  <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} data-testid="input-event-date" />
                </div>
                <div>
                  <Label>Kategorie</Label>
                  <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                    <SelectTrigger data-testid="select-event-category"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Workshop">Workshop</SelectItem>
                      <SelectItem value="Versammlung">Versammlung</SelectItem>
                      <SelectItem value="Treffen">Treffen</SelectItem>
                      <SelectItem value="Sonstiges">Sonstiges</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Uhrzeit</Label>
                  <Input type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} data-testid="input-event-time" />
                </div>
                <div>
                  <Label>Ende</Label>
                  <Input type="time" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} data-testid="input-event-end-time" />
                </div>
              </div>
              <div>
                <Label>Ort</Label>
                <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} data-testid="input-event-location" />
              </div>
              <div>
                <Label>Beschreibung</Label>
                <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} data-testid="input-event-description" />
              </div>
              <Button onClick={() => createMutation.mutate()} disabled={!form.title || !form.date || createMutation.isPending} className="w-full" data-testid="button-submit-event">
                Termin erstellen
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar Grid */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <Button variant="ghost" size="icon" onClick={() => navigateMonth(-1)} data-testid="button-prev-month">
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <CardTitle className="text-base font-semibold" data-testid="text-current-month">
                {MONTHS[currentMonth]} {currentYear}
              </CardTitle>
              <Button variant="ghost" size="icon" onClick={() => navigateMonth(1)} data-testid="button-next-month">
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : (
              <div className="grid grid-cols-7 gap-px">
                {WEEKDAYS.map((d) => (
                  <div key={d} className="text-center text-xs font-medium text-muted-foreground py-2">{d}</div>
                ))}
                {Array.from({ length: firstDay }).map((_, i) => (
                  <div key={`empty-${i}`} className="h-16 md:h-20" />
                ))}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const dayEvents = eventsOnDay(day);
                  const isToday = day === 16 && currentMonth === 2 && currentYear === 2026;
                  return (
                    <div
                      key={day}
                      className={`h-16 md:h-20 p-1 rounded-md border ${isToday ? "border-primary bg-primary/5" : "border-transparent hover:bg-accent/40"}`}
                      data-testid={`calendar-day-${day}`}
                    >
                      <span className={`text-xs font-medium ${isToday ? "text-primary" : ""}`}>{day}</span>
                      <div className="space-y-0.5 mt-0.5">
                        {dayEvents.slice(0, 2).map((e) => (
                          <div key={e.id} className={`text-[9px] leading-tight px-1 py-0.5 rounded truncate ${categoryColor[e.category] || "bg-muted"}`}>
                            {e.title}
                          </div>
                        ))}
                        {dayEvents.length > 2 && (
                          <div className="text-[9px] text-muted-foreground">+{dayEvents.length - 2} weitere</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Events */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Nächste Termine</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)
            ) : (
              upcomingEvents.map((e) => (
                <div key={e.id} className="p-3 rounded-lg border space-y-1" data-testid={`event-card-${e.id}`}>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={`text-[10px] ${categoryColor[e.category] || ""}`}>{e.category}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(e.date).toLocaleDateString("de-DE", { day: "numeric", month: "short" })}
                    </span>
                  </div>
                  <p className="text-sm font-medium">{e.title}</p>
                  {e.time && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {e.time}{e.endTime ? ` – ${e.endTime}` : ""} Uhr
                    </p>
                  )}
                  {e.location && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> {e.location}
                    </p>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
