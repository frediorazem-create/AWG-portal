import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Settings2, Plus, Pencil, Trash2, Bookmark } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { SidebarItem } from "@shared/schema";

type FormState = {
  label: string;
  description: string;
  content: string;
  url: string;
  sortOrder: number;
};

const emptyForm: FormState = { label: "", description: "", content: "", url: "", sortOrder: 0 };

export default function SidebarManage() {
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const { toast } = useToast();

  const { data: items, isLoading } = useQuery<SidebarItem[]>({ queryKey: ["/api/sidebar-items"] });

  const openNew = () => {
    setEditingId(null);
    setForm({ ...emptyForm, sortOrder: (items?.length ?? 0) + 1 });
    setOpen(true);
  };

  const openEdit = (item: SidebarItem) => {
    setEditingId(item.id);
    setForm({
      label: item.label,
      description: item.description ?? "",
      content: item.content ?? "",
      url: item.url ?? "",
      sortOrder: item.sortOrder ?? 0,
    });
    setOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        label: form.label.trim(),
        description: form.description.trim() || null,
        content: form.content.trim() || null,
        url: form.url.trim() || null,
        sortOrder: form.sortOrder || 0,
      };
      if (editingId) {
        await apiRequest("PATCH", `/api/sidebar-items/${editingId}`, payload);
      } else {
        await apiRequest("POST", "/api/sidebar-items", payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sidebar-items"] });
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
      await apiRequest("DELETE", `/api/sidebar-items/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sidebar-items"] });
      setOpen(false);
      setEditingId(null);
      setForm(emptyForm);
    },
  });

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2" data-testid="text-sidebar-manage-title">
            <Settings2 className="w-5 h-5" /> Bereiche verwalten
          </h1>
          <p className="text-sm text-muted-foreground">
            Eigene Themenbereiche in der Seitenleiste anlegen, bearbeiten oder löschen
          </p>
        </div>
        <Button size="sm" onClick={openNew} data-testid="button-new-area">
          <Plus className="w-4 h-4 mr-1" /> Neuer Bereich
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
        </div>
      ) : !items || items.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-sm text-muted-foreground">
            Noch keine eigenen Bereiche angelegt. Mit „Neuer Bereich" kannst du zum Beispiel
            Notizen, externe Links oder Themenseiten in der Seitenleiste ergänzen.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <Card key={item.id} data-testid={`area-row-${item.id}`}>
              <CardContent className="flex items-center gap-3 p-3">
                <Bookmark className="w-5 h-5 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{item.label}</p>
                  {item.description && (
                    <p className="text-xs text-muted-foreground truncate">{item.description}</p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => openEdit(item)}
                  data-testid={`button-edit-area-${item.id}`}
                  title="Bearbeiten"
                >
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    if (confirm(`Bereich „${item.label}" wirklich löschen?`)) deleteMutation.mutate(item.id);
                  }}
                  data-testid={`button-delete-area-${item.id}`}
                  title="Löschen"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setEditingId(null); setForm(emptyForm); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Bereich bearbeiten" : "Neuen Bereich anlegen"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Name</Label>
              <Input
                value={form.label}
                onChange={(e) => setForm({ ...form, label: e.target.value })}
                placeholder="z. B. Notizen Vorstand"
                data-testid="input-area-label"
              />
            </div>
            <div>
              <Label>Kurzbeschreibung (optional)</Label>
              <Input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Erscheint als Untertitel"
                data-testid="input-area-description"
              />
            </div>
            <div>
              <Label>Externer Link (optional)</Label>
              <Input
                value={form.url}
                onChange={(e) => setForm({ ...form, url: e.target.value })}
                placeholder="https://…"
                data-testid="input-area-url"
              />
            </div>
            <div>
              <Label>Inhalt (optional, Markdown möglich)</Label>
              <Textarea
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                rows={6}
                placeholder="Texte, Listen, Links … (# für Überschriften, - für Listen)"
                data-testid="input-area-content"
              />
            </div>
            <div>
              <Label>Sortierung</Label>
              <Input
                type="number"
                value={form.sortOrder}
                onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })}
                data-testid="input-area-sort"
              />
            </div>
            <div className="flex items-center gap-2 pt-2">
              <Button
                onClick={() => saveMutation.mutate()}
                disabled={!form.label.trim() || saveMutation.isPending}
                className="flex-1"
                data-testid="button-submit-area"
              >
                {editingId ? "Speichern" : "Anlegen"}
              </Button>
              {editingId && (
                <Button
                  variant="destructive"
                  size="icon"
                  onClick={() => {
                    if (confirm("Bereich wirklich löschen?")) deleteMutation.mutate(editingId);
                  }}
                  disabled={deleteMutation.isPending}
                  data-testid="button-delete-area-dialog"
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
