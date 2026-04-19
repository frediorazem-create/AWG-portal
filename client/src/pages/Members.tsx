import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Users, Search, Mail, Phone, Pencil, UserPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Member } from "@shared/schema";

const roleColor: Record<string, string> = {
  Vorstand: "default",
  Aufsichtsrat: "default",
  "Gründungsmitglied": "secondary",
  Mitglied: "secondary",
  Interessent: "outline",
};

const ROLES = [
  "Vorstand",
  "Aufsichtsrat",
  "Gründungsmitglied",
  "Mitglied",
  "Interessent",
];

const emptyForm = { name: "", email: "", phone: "", role: "Mitglied" };

export default function Members() {
  const [search, setSearch] = useState("");
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [editForm, setEditForm] = useState(emptyForm);
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState(emptyForm);
  const { toast } = useToast();

  const { data: members, isLoading } = useQuery<Member[]>({
    queryKey: ["/api/members"],
  });

  // ── Update mutation ──
  const updateMutation = useMutation({
    mutationFn: async (data: { id: string; updates: Partial<Member> }) => {
      const res = await apiRequest("PATCH", `/api/members/${data.id}`, data.updates);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/members"] });
      setEditingMember(null);
      toast({ title: "Gespeichert", description: "Mitglied wurde aktualisiert." });
    },
    onError: () => {
      toast({ title: "Fehler", description: "Änderung konnte nicht gespeichert werden.", variant: "destructive" });
    },
  });

  // ── Create mutation ──
  const createMutation = useMutation({
    mutationFn: async (data: { name: string; email: string; phone: string | null; role: string; avatar: string; joinedAt: string }) => {
      const res = await apiRequest("POST", "/api/members", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/members"] });
      setAddOpen(false);
      setAddForm(emptyForm);
      toast({ title: "Hinzugefügt", description: "Neues Mitglied wurde eingetragen." });
    },
    onError: () => {
      toast({ title: "Fehler", description: "Mitglied konnte nicht hinzugefügt werden.", variant: "destructive" });
    },
  });

  const openEdit = (member: Member) => {
    setEditingMember(member);
    setEditForm({
      name: member.name,
      email: member.email,
      phone: member.phone || "",
      role: member.role,
    });
  };

  const handleSave = () => {
    if (!editingMember) return;
    if (!editForm.name.trim() || !editForm.email.trim()) {
      toast({ title: "Fehler", description: "Name und E-Mail dürfen nicht leer sein.", variant: "destructive" });
      return;
    }
    updateMutation.mutate({
      id: editingMember.id,
      updates: {
        name: editForm.name.trim(),
        email: editForm.email.trim(),
        phone: editForm.phone.trim() || null,
        role: editForm.role,
      },
    });
  };

  const handleAdd = () => {
    if (!addForm.name.trim() || !addForm.email.trim()) {
      toast({ title: "Fehler", description: "Name und E-Mail sind Pflichtfelder.", variant: "destructive" });
      return;
    }
    const nameParts = addForm.name.trim().split(" ");
    const avatar = nameParts.map((n) => n[0]).join("").toUpperCase().slice(0, 2);
    createMutation.mutate({
      name: addForm.name.trim(),
      email: addForm.email.trim(),
      phone: addForm.phone.trim() || null,
      role: addForm.role,
      avatar,
      joinedAt: new Date().toISOString().slice(0, 10),
    });
  };

  const filtered =
    members?.filter(
      (m) =>
        m.name.toLowerCase().includes(search.toLowerCase()) ||
        m.role.toLowerCase().includes(search.toLowerCase()) ||
        m.email.toLowerCase().includes(search.toLowerCase())
    ) ?? [];

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-xl font-semibold flex items-center gap-2"
            data-testid="text-members-title"
          >
            <Users className="w-5 h-5" /> Mitglieder
          </h1>
          <p className="text-sm text-muted-foreground">
            {members?.length ?? 0} Mitglieder und Interessenten
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => { setAddForm(emptyForm); setAddOpen(true); }}
          data-testid="button-add-member"
        >
          <UserPlus className="w-4 h-4 mr-1" /> Hinzufügen
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Mitglieder suchen..."
          className="pl-9"
          data-testid="input-search-members"
        />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((member) => (
            <Card
              key={member.id}
              className="group cursor-pointer hover:ring-1 hover:ring-primary/30 transition-all"
              data-testid={`member-card-${member.id}`}
              onClick={() => openEdit(member)}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Avatar className="w-10 h-10">
                    <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                      {member.avatar ||
                        member.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">
                        {member.name}
                      </span>
                      <Pencil className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                    </div>
                    <Badge
                      variant={roleColor[member.role] as any}
                      className="text-[10px]"
                    >
                      {member.role}
                    </Badge>
                    <div className="space-y-0.5 pt-1">
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Mail className="w-3 h-3 shrink-0" />
                        <span className="truncate">{member.email}</span>
                      </p>
                      {member.phone && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Phone className="w-3 h-3 shrink-0" /> {member.phone}
                        </p>
                      )}
                    </div>
                    {member.joinedAt && (
                      <p className="text-[10px] text-muted-foreground">
                        Mitglied seit{" "}
                        {new Date(member.joinedAt).toLocaleDateString("de-DE", {
                          month: "long",
                          year: "numeric",
                        })}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!isLoading && filtered.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">
          Keine Mitglieder gefunden.
        </p>
      )}

      {/* ── Edit Dialog ── */}
      <Dialog open={!!editingMember} onOpenChange={(open) => { if (!open) setEditingMember(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Mitglied bearbeiten</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={editForm.name}
                onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Vor- und Nachname"
                data-testid="input-edit-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-email">E-Mail</Label>
              <Input
                id="edit-email"
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="email@example.de"
                data-testid="input-edit-email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-phone">Telefon</Label>
              <Input
                id="edit-phone"
                type="tel"
                value={editForm.phone}
                onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))}
                placeholder="Optional"
                data-testid="input-edit-phone"
              />
            </div>
            <div className="space-y-2">
              <Label>Rolle</Label>
              <Select
                value={editForm.role}
                onValueChange={(val) => setEditForm((f) => ({ ...f, role: val }))}
              >
                <SelectTrigger data-testid="select-edit-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setEditingMember(null)} data-testid="button-cancel-edit">
              Abbrechen
            </Button>
            <Button onClick={handleSave} disabled={updateMutation.isPending} data-testid="button-save-member">
              {updateMutation.isPending ? "Speichert..." : "Speichern"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Add Dialog ── */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Neues Mitglied hinzufügen</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="add-name">Name</Label>
              <Input
                id="add-name"
                value={addForm.name}
                onChange={(e) => setAddForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Vor- und Nachname"
                data-testid="input-add-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-email">E-Mail</Label>
              <Input
                id="add-email"
                type="email"
                value={addForm.email}
                onChange={(e) => setAddForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="email@example.de"
                data-testid="input-add-email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-phone">Telefon</Label>
              <Input
                id="add-phone"
                type="tel"
                value={addForm.phone}
                onChange={(e) => setAddForm((f) => ({ ...f, phone: e.target.value }))}
                placeholder="Optional"
                data-testid="input-add-phone"
              />
            </div>
            <div className="space-y-2">
              <Label>Rolle</Label>
              <Select
                value={addForm.role}
                onValueChange={(val) => setAddForm((f) => ({ ...f, role: val }))}
              >
                <SelectTrigger data-testid="select-add-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setAddOpen(false)} data-testid="button-cancel-add">
              Abbrechen
            </Button>
            <Button onClick={handleAdd} disabled={createMutation.isPending} data-testid="button-submit-member">
              {createMutation.isPending ? "Speichert..." : "Hinzufügen"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
