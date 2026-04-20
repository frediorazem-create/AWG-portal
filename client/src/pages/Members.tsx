import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { Users, Search, Mail, Phone, Pencil, UserPlus, MapPin, Globe, Camera, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Member } from "@shared/schema";

const roleColor: Record<string, string> = {
  Vorstand: "default",
  Aufsichtsrat: "default",
  "Gründungsmitglied": "secondary",
  Mitglied: "secondary",
  "Unterstützer": "secondary",
  Interessent: "outline",
};

const ROLES = [
  "Vorstand",
  "Aufsichtsrat",
  "Gründungsmitglied",
  "Mitglied",
  "Unterstützer",
  "Interessent",
];

interface MemberForm {
  name: string;
  email: string;
  phone: string;
  role: string;
  address: string;
  website: string;
  profileImage: string;
}

const emptyForm: MemberForm = { name: "", email: "", phone: "", role: "Mitglied", address: "", website: "", profileImage: "" };

/* ── Profile Image Picker ── */
function ProfileImagePicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      alert("Bild darf maximal 2 MB groß sein.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") onChange(reader.result);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="flex items-center gap-4">
      <div className="relative">
        <Avatar className="w-16 h-16">
          {value ? (
            <AvatarImage src={value} alt="Profilbild" />
          ) : (
            <AvatarFallback className="bg-muted text-muted-foreground">
              <Camera className="w-6 h-6" />
            </AvatarFallback>
          )}
        </Avatar>
        {value && (
          <button
            type="button"
            className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full w-5 h-5 flex items-center justify-center"
            onClick={() => onChange("")}
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>
      <div>
        <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
          <Camera className="w-3 h-3 mr-1" /> Bild wählen
        </Button>
        <p className="text-[10px] text-muted-foreground mt-1">JPG oder PNG, max. 2 MB</p>
      </div>
      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleFile} />
    </div>
  );
}

/* ── Member Form Fields (shared between Edit & Add) ── */
function MemberFormFields({ form, setForm }: { form: MemberForm; setForm: React.Dispatch<React.SetStateAction<MemberForm>> }) {
  return (
    <div className="space-y-4 py-2">
      <ProfileImagePicker value={form.profileImage} onChange={(v) => setForm((f) => ({ ...f, profileImage: v }))} />
      <div className="space-y-2">
        <Label>Name</Label>
        <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Vor- und Nachname" data-testid="input-form-name" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>E-Mail</Label>
          <Input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="email@example.de" data-testid="input-form-email" />
        </div>
        <div className="space-y-2">
          <Label>Telefon</Label>
          <Input type="tel" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder="Optional" data-testid="input-form-phone" />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Adresse</Label>
        <Input value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} placeholder="Straße, PLZ Ort" data-testid="input-form-address" />
      </div>
      <div className="space-y-2">
        <Label>Website</Label>
        <Input type="url" value={form.website} onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))} placeholder="https://www.example.de" data-testid="input-form-website" />
      </div>
      <div className="space-y-2">
        <Label>Rolle</Label>
        <Select value={form.role} onValueChange={(val) => setForm((f) => ({ ...f, role: val }))}>
          <SelectTrigger data-testid="select-form-role">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ROLES.map((r) => (
              <SelectItem key={r} value={r}>{r}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

export default function Members() {
  const [search, setSearch] = useState("");
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [editForm, setEditForm] = useState<MemberForm>(emptyForm);
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState<MemberForm>(emptyForm);
  const { toast } = useToast();

  const { data: members, isLoading } = useQuery<Member[]>({
    queryKey: ["/api/members"],
  });

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

  const createMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
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
      address: (member as any).address || "",
      website: (member as any).website || "",
      profileImage: (member as any).profileImage || "",
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
        address: editForm.address.trim() || null,
        website: editForm.website.trim() || null,
        profileImage: editForm.profileImage || null,
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
      address: addForm.address.trim() || null,
      website: addForm.website.trim() || null,
      profileImage: addForm.profileImage || null,
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
          <h1 className="text-xl font-semibold flex items-center gap-2" data-testid="text-members-title">
            <Users className="w-5 h-5" /> Mitglieder
          </h1>
          <p className="text-sm text-muted-foreground">
            {members?.length ?? 0} Mitglieder und Interessenten
          </p>
        </div>
        <Button size="sm" onClick={() => { setAddForm(emptyForm); setAddOpen(true); }} data-testid="button-add-member">
          <UserPlus className="w-4 h-4 mr-1" /> Hinzufügen
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Mitglieder suchen..." className="pl-9" data-testid="input-search-members" />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-36 w-full" />
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
                  <Avatar className="w-11 h-11">
                    {(member as any).profileImage ? (
                      <AvatarImage src={(member as any).profileImage} alt={member.name} />
                    ) : null}
                    <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                      {member.avatar || member.name.split(" ").map((n) => n[0]).join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">{member.name}</span>
                      <Pencil className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                    </div>
                    <Badge variant={roleColor[member.role] as any} className="text-[10px]">
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
                      {(member as any).address && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <MapPin className="w-3 h-3 shrink-0" />
                          <span className="truncate">{(member as any).address}</span>
                        </p>
                      )}
                      {(member as any).website && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Globe className="w-3 h-3 shrink-0" />
                          <a
                            href={(member as any).website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="truncate hover:underline text-primary"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {(member as any).website.replace(/^https?:\/\//, "")}
                          </a>
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
        <p className="text-sm text-muted-foreground text-center py-8">Keine Mitglieder gefunden.</p>
      )}

      {/* ── Edit Dialog ── */}
      <Dialog open={!!editingMember} onOpenChange={(open) => { if (!open) setEditingMember(null); }}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Mitglied bearbeiten</DialogTitle>
          </DialogHeader>
          <MemberFormFields form={editForm} setForm={setEditForm} />
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setEditingMember(null)}>Abbrechen</Button>
            <Button onClick={handleSave} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Speichert..." : "Speichern"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Add Dialog ── */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Neues Mitglied hinzufügen</DialogTitle>
          </DialogHeader>
          <MemberFormFields form={addForm} setForm={setAddForm} />
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setAddOpen(false)}>Abbrechen</Button>
            <Button onClick={handleAdd} disabled={createMutation.isPending}>
              {createMutation.isPending ? "Speichert..." : "Hinzufügen"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
