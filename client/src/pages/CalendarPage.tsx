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
import { Calendar, ChevronLeft, ChevronRight, Plus, MapPin, Clock, Trash2 } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Event as CalEvent } from "@shared/schema";

type EventForm = { title: string; description: string; date: string; time: string; endTime: string; location: string; category: string };
const emptyForm: EventForm = { title: "", description: "", date: "", time: "", endTime: "", location: "", category: "Treffen" };

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
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<EventForm>(emptyForm);
  const { toast } = useToast();

  const { data: events, isLoading } = useQuery<CalEvent[]>({ queryKey: ["/api/events"] });

  const closeDialog = () => {
    setOpen(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const openNew = () => {
    setEditingId(null);
    setForm(emptyForm);
    setOpen(true);
  };

  const openEdit = (e: CalEvent) => {
    setEditingId(e.id);
    setForm({
      title: e.title,
      description: e.description || "",
      date: e.date,
      time: e.time || "",
      endTime: e.endTime || "",
      location: e.location || "",
      category: e.category,
    });
    setOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      // Leere Strings als null senden, damit nichts wie "" in optionalen Feldern landet
      const payload = {
        ...form,
        description: form.description || null,
        time: form.time || null,
        endTime: form.endTime || null,
        location: form.location || null,
      };
      if (editingId) {
        await apiRequest("PATCH", `/api/events/${editingId}`, payload);
      } else {
        await apiRequest("POST", "/api/events", payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      toast({ title: editingId ? "Termin aktualisiert" : "Termin erstellt" });
      closeDialog();
    },
    onError: (err: any) => {
      toast({ title: "Speichern fehlgeschlagen", description: err?.message || "Unbekannter Fehler", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/events/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      toast({ title: "Termin gel\u00f6scht" });
      closeDialog();
    },
    onError: (err: any) => {
      toast({ title: "L\u00f6schen fehlgeschlagen", description: err?.message || "Unbekannter Fehler", variant: "destructive" });
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

  // Heutiges Datum als YYYY-MM-DD für String-Vergleich auf den ISO-Datumsfeldern
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const upcomingEvents = events
    ?.filter((e) => e.date >= todayStr)
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
        <Button size="sm" data-testid="button-new-event" onClick={openNew}>
          <Plus className="w-4 h-4 mr-1" /> Neuer Termin
        </Button>
        <Dialog open={open} onOpenChange={(o) => { if (!o) closeDialog(); else setOpen(true); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingId ? "Termin bearbeiten" : "Neuen Termin erstellen"}</DialogTitle>
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
              <div className="flex flex-col-reverse sm:flex-row gap-2">
                {editingId && (
                  <Button
                    variant="destructive"
                    onClick={() => {
                      if (confirm("Diesen Termin wirklich l\u00f6schen?")) deleteMutation.mutate(editingId);
                    }}
                    disabled={deleteMutation.isPending}
                    data-testid="button-delete-event"
                    className="sm:flex-shrink-0"
                  >
                    <Trash2 className="w-4 h-4 mr-1" /> Löschen
                  </Button>
                )}
                <Button
                  onClick={() => saveMutation.mutate()}
                  disabled={!form.title || !form.date || saveMutation.isPending}
                  className="w-full"
                  data-testid="button-submit-event"
                >
                  {saveMutation.isPending ? "Speichere\u2026" : (editingId ? "\u00c4nderungen speichern" : "Termin erstellen")}
                </Button>
              </div>
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
                  const isToday =
                    day === today.getDate() &&
                    currentMonth === today.getMonth() &&
                    currentYear === today.getFullYear();
                  return (
                    <div
                      key={day}
                      className={`h-16 md:h-20 p-1 rounded-md border ${isToday ? "border-primary bg-primary/5" : "border-transparent hover:bg-accent/40"}`}
                      data-testid={`calendar-day-${day}`}
                    >
                      <span className={`text-xs font-medium ${isToday ? "text-primary" : ""}`}>{day}</span>
                      <div className="space-y-0.5 mt-0.5">
                        {dayEvents.slice(0, 2).map((e) => (
                          <button
                            key={e.id}
                            type="button"
                            onClick={() => openEdit(e)}
                            className={`block w-full text-left text-[9px] leading-tight px-1 py-0.5 rounded truncate cursor-pointer hover:opacity-80 ${categoryColor[e.category] || "bg-muted"}`}
                            data-testid={`event-pill-${e.id}`}
                            title={`${e.title} \u2014 zum Bearbeiten klicken`}
                          >
                            {e.title}
                          </button>
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
                <div
                  key={e.id}
                  className="p-3 rounded-lg border space-y-1 cursor-pointer hover:bg-accent/40 transition-colors"
                  data-testid={`event-card-${e.id}`}
                  onClick={() => openEdit(e)}
                  title="Zum Bearbeiten klicken"
                >
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
