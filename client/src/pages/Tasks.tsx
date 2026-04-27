import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { CheckSquare, Plus, ArrowRight, Calendar, User, Trash2 } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Task, Member } from "@shared/schema";

const columns = ["Offen", "In Bearbeitung", "Erledigt"];

const priorityColor: Record<string, string> = {
  "Hoch": "destructive",
  "Mittel": "default",
  "Niedrig": "secondary",
};

type FormState = {
  title: string;
  description: string;
  priority: string;
  status: string;
  assigneeId: string;
  assigneeName: string;
  dueDate: string;
};

const emptyForm: FormState = {
  title: "",
  description: "",
  priority: "Mittel",
  status: "Offen",
  assigneeId: "",
  assigneeName: "",
  dueDate: "",
};

export default function Tasks() {
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const { toast } = useToast();

  const { data: tasks, isLoading } = useQuery<Task[]>({ queryKey: ["/api/tasks"] });
  const { data: members } = useQuery<Member[]>({ queryKey: ["/api/members"] });

  const openNew = () => {
    setEditingId(null);
    setForm(emptyForm);
    setOpen(true);
  };

  const openEdit = (task: Task) => {
    setEditingId(task.id);
    setForm({
      title: task.title,
      description: task.description ?? "",
      priority: task.priority,
      status: task.status,
      assigneeId: task.assigneeId ?? "",
      assigneeName: task.assigneeName ?? "",
      dueDate: task.dueDate ? task.dueDate.slice(0, 10) : "",
    });
    setOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        title: form.title,
        description: form.description || null,
        priority: form.priority,
        status: form.status,
        dueDate: form.dueDate || null,
        assigneeId: form.assigneeId || null,
        assigneeName: form.assigneeName || null,
      };
      if (editingId) {
        await apiRequest("PATCH", `/api/tasks/${editingId}`, payload);
      } else {
        await apiRequest("POST", "/api/tasks", { ...payload, createdAt: new Date().toISOString() });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      setOpen(false);
      setEditingId(null);
      setForm(emptyForm);
    },
    onError: (err: any) => {
      toast({ title: "Speichern fehlgeschlagen", description: err?.message || "Unbekannter Fehler", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/tasks/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      setOpen(false);
      setEditingId(null);
      setForm(emptyForm);
    },
  });

  const moveMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      await apiRequest("PATCH", `/api/tasks/${id}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
    },
  });

  const getNextStatus = (current: string) => {
    const idx = columns.indexOf(current);
    return idx < columns.length - 1 ? columns[idx + 1] : null;
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2" data-testid="text-tasks-title">
            <CheckSquare className="w-5 h-5" /> Aufgaben
          </h1>
          <p className="text-sm text-muted-foreground">Klick auf eine Karte zum Bearbeiten</p>
        </div>
        <Button size="sm" data-testid="button-new-task" onClick={openNew}>
          <Plus className="w-4 h-4 mr-1" /> Neue Aufgabe
        </Button>
      </div>

      {/* Kanban Board */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {columns.map((col) => (
            <Skeleton key={col} className="h-96 w-full" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {columns.map((col) => {
            const colTasks = tasks?.filter((t) => t.status === col) ?? [];
            return (
              <div key={col} className="space-y-2" data-testid={`column-${col}`}>
                <div className="flex items-center gap-2 pb-2">
                  <h3 className="text-sm font-semibold">{col}</h3>
                  <Badge variant="secondary" className="text-[10px]">{colTasks.length}</Badge>
                </div>
                <div className="space-y-2 min-h-[200px] p-2 rounded-lg bg-muted/40">
                  {colTasks.map((task) => (
                    <Card
                      key={task.id}
                      data-testid={`task-card-${task.id}`}
                      className="cursor-pointer hover:bg-accent/40 transition-colors"
                      onClick={() => openEdit(task)}
                    >
                      <CardContent className="p-3 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-sm font-medium leading-tight">{task.title}</span>
                          <Badge variant={priorityColor[task.priority] as any} className="text-[10px] shrink-0">
                            {task.priority}
                          </Badge>
                        </div>
                        {task.description && (
                          <p className="text-xs text-muted-foreground line-clamp-2">{task.description}</p>
                        )}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            {task.assigneeName && (
                              <span className="flex items-center gap-1">
                                <User className="w-3 h-3" /> {task.assigneeName}
                              </span>
                            )}
                            {task.dueDate && (
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {new Date(task.dueDate).toLocaleDateString("de-DE", { day: "numeric", month: "short" })}
                              </span>
                            )}
                          </div>
                          {getNextStatus(task.status) && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={(e) => {
                                e.stopPropagation();
                                moveMutation.mutate({ id: task.id, status: getNextStatus(task.status)! });
                              }}
                              data-testid={`move-task-${task.id}`}
                              title={`Verschieben nach „${getNextStatus(task.status)}"`}
                            >
                              <ArrowRight className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Dialog für Neu + Bearbeiten */}
      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setEditingId(null); setForm(emptyForm); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Aufgabe bearbeiten" : "Neue Aufgabe erstellen"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Titel</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} data-testid="input-task-title" />
            </div>
            <div>
              <Label>Beschreibung</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} data-testid="input-task-description" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger data-testid="select-task-status"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {columns.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Priorität</Label>
                <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                  <SelectTrigger data-testid="select-task-priority"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Niedrig">Niedrig</SelectItem>
                    <SelectItem value="Mittel">Mittel</SelectItem>
                    <SelectItem value="Hoch">Hoch</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Fällig am</Label>
                <Input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} data-testid="input-task-due-date" />
              </div>
              <div>
                <Label>Zugewiesen an</Label>
                <Select
                  value={form.assigneeId || "none"}
                  onValueChange={(v) => {
                    if (v === "none") {
                      setForm({ ...form, assigneeId: "", assigneeName: "" });
                    } else {
                      const m = members?.find((x) => x.id === v);
                      setForm({ ...form, assigneeId: v, assigneeName: m?.name || "" });
                    }
                  }}
                >
                  <SelectTrigger data-testid="select-task-assignee">
                    <SelectValue placeholder="Mitglied wählen" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Niemand</SelectItem>
                    {members?.map((m) => (
                      <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <Button
                onClick={() => saveMutation.mutate()}
                disabled={!form.title || saveMutation.isPending}
                className="flex-1"
                data-testid="button-submit-task"
              >
                {editingId ? "Speichern" : "Erstellen"}
              </Button>
              {editingId && (
                <Button
                  variant="destructive"
                  size="icon"
                  onClick={() => {
                    if (confirm("Aufgabe wirklich löschen?")) deleteMutation.mutate(editingId);
                  }}
                  disabled={deleteMutation.isPending}
                  data-testid="button-delete-task"
                  title="Löschen"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
