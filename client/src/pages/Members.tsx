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
import { Users, Search, Mail, Phone, Pencil, UserPlus, MapPin, Globe, Camera, X, Shield, KeyRound } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Member } from "@shared/schema";
import { useAuth } from "@/lib/auth";

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

// Skaliert und komprimiert ein Bild zu einem quadratischen 512x512 JPEG (center-crop).
// Ergebnis: typischerweise 80-300 KB bei Qualität 0.85.
async function processImage(file: File): Promise<string> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    const url = URL.createObjectURL(file);
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };
    image.src = url;
  });

  const TARGET = 512;
  const canvas = document.createElement("canvas");
  canvas.width = TARGET;
  canvas.height = TARGET;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas nicht verfügbar");

  // Center-Crop: kürzere Seite als Basis, längere Seite mittig beschneiden
  const side = Math.min(img.width, img.height);
  const sx = (img.width - side) / 2;
  const sy = (img.height - side) / 2;

  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, TARGET, TARGET);
  ctx.drawImage(img, sx, sy, side, side, 0, 0, TARGET, TARGET);

  return canvas.toDataURL("image/jpeg", 0.85);
}

function ProfileImagePicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [processing, setProcessing] = useState(false);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Großzügiges Upload-Limit — wird eh komprimiert
    if (file.size > 15 * 1024 * 1024) {
      alert("Bild darf maximal 15 MB groß sein.");
      return;
    }
    if (!file.type.startsWith("image/")) {
      alert("Bitte eine Bild-Datei auswählen.");
      return;
    }
    setProcessing(true);
    try {
      const dataUrl = await processImage(file);
      onChange(dataUrl);
    } catch (err) {
      console.error(err);
      alert("Bild konnte nicht verarbeitet werden.");
    } finally {
      setProcessing(false);
      if (fileRef.current) fileRef.current.value = "";
    }
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
        <Button type="button" variant="outline" size="sm" disabled={processing} onClick={() => fileRef.current?.click()}>
          <Camera className="w-3 h-3 mr-1" /> {processing ? "Wird verarbeitet…" : "Bild wählen"}
        </Button>
        <p className="text-[10px] text-muted-foreground mt-1">JPG, PNG oder HEIC — wird automatisch auf 512×512 zugeschnitten</p>
      </div>
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
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
  const [pwOpen, setPwOpen] = useState(false);
  const [pwValue, setPwValue] = useState("");
  const { toast } = useToast();
  const { user, isAdmin } = useAuth();

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

  const setPasswordMutation = useMutation({
    mutationFn: async (data: { id: string; password: string }) => {
      const res = await apiRequest("POST", `/api/members/${data.id}/set-password`, { password: data.password });
      return res.json();
    },
    onSuccess: () => {
      setPwOpen(false);
      setPwValue("");
      toast({ title: "Passwort gesetzt", description: "Das neue Passwort ist sofort aktiv." });
    },
    onError: (err: Error) => {
      const msg = err.message.includes("400") ? "Passwort muss mindestens 8 Zeichen haben." : "Passwort konnte nicht gesetzt werden.";
      toast({ title: "Fehler", description: msg, variant: "destructive" });
    },
  });

  const setAdminMutation = useMutation({
    mutationFn: async (data: { id: string; isAdmin: boolean }) => {
      const res = await apiRequest("POST", `/api/members/${data.id}/set-admin`, { isAdmin: data.isAdmin });
      return res.json();
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["/api/members"] });
      // Editing-Member auch aktualisieren, damit der Toggle-Status korrekt bleibt
      if (editingMember && editingMember.id === vars.id) {
        setEditingMember({ ...editingMember, isAdmin: vars.isAdmin });
      }
      toast({ title: "Aktualisiert", description: vars.isAdmin ? "Mitglied ist jetzt Admin." : "Admin-Rechte entzogen." });
    },
    onError: (err: Error) => {
      const msg = err.message.includes("400") ? "Du kannst dir die Admin-Rechte nicht entziehen, wenn du der einzige Admin bist." : "Admin-Status konnte nicht geändert werden.";
      toast({ title: "Fehler", description: msg, variant: "destructive" });
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
        {isAdmin && (
          <Button size="sm" onClick={() => { setAddForm(emptyForm); setAddOpen(true); }} data-testid="button-add-member">
            <UserPlus className="w-4 h-4 mr-1" /> Hinzufügen
          </Button>
        )}
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
              className={`group transition-all ${isAdmin ? "cursor-pointer hover:ring-1 hover:ring-primary/30" : ""}`}
              data-testid={`member-card-${member.id}`}
              onClick={() => { if (isAdmin) openEdit(member); }}
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
                      {isAdmin && (
                        <Pencil className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                      )}
                    </div>
                    <div className="flex items-center gap-1 flex-wrap">
                      <Badge variant={roleColor[member.role] as any} className="text-[10px]">
                        {member.role}
                      </Badge>
                      {(member as any).isAdmin && (
                        <Badge variant="outline" className="text-[10px] border-primary/40 text-primary gap-1">
                          <Shield className="w-2.5 h-2.5" /> Admin
                        </Badge>
                      )}
                    </div>
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

      {/* ── Edit Dialog (nur Admin) ── */}
      <Dialog open={!!editingMember} onOpenChange={(open) => { if (!open) { setEditingMember(null); setPwOpen(false); setPwValue(""); } }}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Mitglied bearbeiten</DialogTitle>
          </DialogHeader>
          <MemberFormFields form={editForm} setForm={setEditForm} />

          {editingMember && (
            <div className="border-t pt-4 space-y-3">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Shield className="w-4 h-4" /> Admin-Bereich
              </h3>

              {/* Admin-Toggle */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1">
                  <p className="text-sm">Admin-Rechte</p>
                  <p className="text-xs text-muted-foreground">
                    Admins dürfen Inhalte erstellen, bearbeiten und löschen.
                  </p>
                </div>
                <Button
                  type="button"
                  variant={editingMember.isAdmin ? "default" : "outline"}
                  size="sm"
                  disabled={setAdminMutation.isPending}
                  onClick={() => setAdminMutation.mutate({ id: editingMember.id, isAdmin: !editingMember.isAdmin })}
                  data-testid="button-toggle-admin"
                >
                  {editingMember.isAdmin ? "Admin entziehen" : "Zu Admin machen"}
                </Button>
              </div>

              {/* Passwort-Setzen */}
              {!pwOpen ? (
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1">
                    <p className="text-sm">Passwort setzen</p>
                    <p className="text-xs text-muted-foreground">
                      Vergibt ein neues Passwort und ermöglicht Login (mind. 8 Zeichen).
                    </p>
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={() => { setPwValue(""); setPwOpen(true); }} data-testid="button-open-set-password">
                    <KeyRound className="w-3 h-3 mr-1" /> Setzen
                  </Button>
                </div>
              ) : (
                <div className="space-y-2 rounded-md border p-3 bg-muted/30">
                  <Label className="text-xs">Neues Passwort für {editingMember.name}</Label>
                  <Input
                    type="text"
                    value={pwValue}
                    onChange={(e) => setPwValue(e.target.value)}
                    placeholder="Mindestens 8 Zeichen"
                    autoFocus
                    data-testid="input-set-password"
                  />
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={() => { setPwOpen(false); setPwValue(""); }}>
                      Abbrechen
                    </Button>
                    <Button
                      size="sm"
                      disabled={pwValue.length < 8 || setPasswordMutation.isPending}
                      onClick={() => setPasswordMutation.mutate({ id: editingMember.id, password: pwValue })}
                      data-testid="button-confirm-set-password"
                    >
                      {setPasswordMutation.isPending ? "Speichert…" : "Speichern"}
                    </Button>
                  </div>
                </div>
              )}

              {user?.id === editingMember.id && (
                <p className="text-[11px] text-muted-foreground">
                  Hinweis: Das ist dein eigenes Konto. Wenn du der einzige Admin bist, kannst du dir die Rechte nicht entziehen.
                </p>
              )}
            </div>
          )}

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
