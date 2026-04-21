import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Mail, Send, Users, AlertCircle, CheckCircle2, Video } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Member } from "@shared/schema";

type Template = {
  id: string;
  label: string;
  subject: string;
  body: string;
};

const templates: Template[] = [
  {
    id: "blank",
    label: "Leere Nachricht",
    subject: "",
    body: "",
  },
  {
    id: "videomeeting",
    label: "Einladung zur Videokonferenz",
    subject: "Einladung zur Videokonferenz der AllenGeRechtes Wohnen eG",
    body: `Liebe Mitglieder und Unterstützer,

hiermit lade ich euch herzlich zu unserer nächsten Videokonferenz ein.

📅 Termin: [DATUM], [UHRZEIT] Uhr
🎥 Videoraum: https://meet.ffmuc.net/AWG-Vorstandssitzung

Tagesordnung:
1. [Punkt 1]
2. [Punkt 2]
3. Sonstiges

Bitte tretet dem Raum pünktlich bei. Es ist kein Login erforderlich — einfach den Link öffnen.

Bei Fragen gerne vorab melden.

Herzliche Grüße
Fredi Orazem
Vorstand AllenGeRechtes Wohnen eG`,
  },
  {
    id: "besprechung",
    label: "Einladung zur Besprechung",
    subject: "Einladung zur Besprechung der AllenGeRechtes Wohnen eG",
    body: `Liebe Mitglieder und Unterstützer,

wir möchten euch zu einer Besprechung einladen.

📅 Termin: [DATUM], [UHRZEIT] Uhr
📍 Ort: [ORT]

Themen:
- [Thema 1]
- [Thema 2]

Bitte gebt uns kurz Bescheid, ob ihr teilnehmen könnt.

Herzliche Grüße
Fredi Orazem
Vorstand AllenGeRechtes Wohnen eG`,
  },
  {
    id: "update",
    label: "Info / Update an alle",
    subject: "Aktuelles aus der AllenGeRechtes Wohnen eG",
    body: `Liebe Mitglieder und Unterstützer,

kurzes Update zum aktuellen Stand unserer Genossenschaft:

[INHALT]

Bei Fragen meldet euch gerne.

Herzliche Grüße
Fredi Orazem
Vorstand AllenGeRechtes Wohnen eG`,
  },
];

export default function Mailing() {
  const { toast } = useToast();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [templateId, setTemplateId] = useState("blank");
  const [smtpStatus, setSmtpStatus] = useState<{ ok: boolean; error?: string } | null>(null);

  const { data: members = [], isLoading } = useQuery<Member[]>({ queryKey: ["/api/members"] });

  // Check SMTP status on load
  useEffect(() => {
    apiRequest("GET", "/api/mailing/status")
      .then((r) => r.json())
      .then((s) => setSmtpStatus(s))
      .catch(() => setSmtpStatus({ ok: false, error: "Status konnte nicht abgerufen werden" }));
  }, []);

  // Filter to members with valid emails
  const membersWithEmail = useMemo(
    () => members.filter((m) => m.email && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(m.email)),
    [members]
  );

  const selectedMembers = useMemo(
    () => membersWithEmail.filter((m) => selectedIds.has(m.id)),
    [membersWithEmail, selectedIds]
  );

  // Group by role for quick selection
  const groupedByRole = useMemo(() => {
    const groups: Record<string, Member[]> = {};
    membersWithEmail.forEach((m) => {
      const role = m.role || "Sonstige";
      if (!groups[role]) groups[role] = [];
      groups[role].push(m);
    });
    return groups;
  }, [membersWithEmail]);

  function toggleMember(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll() {
    setSelectedIds(new Set(membersWithEmail.map((m) => m.id)));
  }

  function selectNone() {
    setSelectedIds(new Set());
  }

  function selectByRole(role: string) {
    const ids = new Set(selectedIds);
    const membersOfRole = groupedByRole[role] || [];
    const allSelected = membersOfRole.every((m) => ids.has(m.id));
    if (allSelected) {
      membersOfRole.forEach((m) => ids.delete(m.id));
    } else {
      membersOfRole.forEach((m) => ids.add(m.id));
    }
    setSelectedIds(ids);
  }

  function applyTemplate(id: string) {
    setTemplateId(id);
    const tpl = templates.find((t) => t.id === id);
    if (tpl) {
      setSubject(tpl.subject);
      setBody(tpl.body);
    }
  }

  async function handleSend() {
    if (selectedMembers.length === 0) {
      toast({ title: "Keine Empfänger", description: "Bitte wähle mindestens einen Empfänger aus.", variant: "destructive" });
      return;
    }
    if (!subject.trim() || !body.trim()) {
      toast({ title: "Unvollständig", description: "Betreff und Nachricht sind erforderlich.", variant: "destructive" });
      return;
    }

    setSending(true);
    try {
      const res = await apiRequest("POST", "/api/mailing/send", {
        recipients: selectedMembers.map((m) => m.email),
        subject,
        body,
      });
      const data = await res.json();
      if (data.success) {
        toast({
          title: "E-Mails versendet",
          description: `${data.sent} Nachrichten erfolgreich versendet.`,
        });
        setSubject("");
        setBody("");
        setSelectedIds(new Set());
        setTemplateId("blank");
      } else {
        toast({
          title: "Versand fehlgeschlagen",
          description: data.error || "Unbekannter Fehler",
          variant: "destructive",
        });
      }
    } catch (err: any) {
      toast({
        title: "Versand fehlgeschlagen",
        description: err.message || "Netzwerkfehler",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <Mail className="w-5 h-5 text-primary" />
          <h1 className="text-xl font-semibold" data-testid="text-mailing-title">E-Mail-Verteiler</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Rundmails an Mitglieder und Unterstützer verschicken — z.B. Einladungen zu Videokonferenzen oder wichtige Infos.
        </p>
      </div>

      {/* SMTP Status */}
      {smtpStatus && (
        <Alert variant={smtpStatus.ok ? "default" : "destructive"} data-testid="alert-smtp-status">
          {smtpStatus.ok ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          <AlertDescription>
            {smtpStatus.ok
              ? "E-Mail-Versand aktiv (team@allengerechteswohnen.de via IONOS)"
              : `E-Mail-Versand nicht verfügbar: ${smtpStatus.error || "SMTP nicht konfiguriert"}`}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {/* Recipients */}
        <Card data-testid="card-recipients">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="w-4 h-4" />
              Empfänger ({selectedMembers.length} von {membersWithEmail.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Quick filters */}
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={selectAll} data-testid="button-select-all">
                Alle
              </Button>
              <Button variant="outline" size="sm" onClick={selectNone} data-testid="button-select-none">
                Keine
              </Button>
              {Object.keys(groupedByRole).map((role) => (
                <Button
                  key={role}
                  variant="outline"
                  size="sm"
                  onClick={() => selectByRole(role)}
                  data-testid={`button-role-${role}`}
                >
                  {role}
                </Button>
              ))}
            </div>

            {/* Member list */}
            <div className="border rounded-md divide-y max-h-[360px] overflow-y-auto">
              {isLoading ? (
                <div className="p-4 text-sm text-muted-foreground">Lade Mitglieder...</div>
              ) : membersWithEmail.length === 0 ? (
                <div className="p-4 text-sm text-muted-foreground">Keine Mitglieder mit E-Mail-Adresse.</div>
              ) : (
                membersWithEmail.map((m) => (
                  <label
                    key={m.id}
                    className="flex items-center gap-3 p-3 cursor-pointer hover:bg-accent/40"
                    data-testid={`row-member-${m.id}`}
                  >
                    <Checkbox
                      checked={selectedIds.has(m.id)}
                      onCheckedChange={() => toggleMember(m.id)}
                      data-testid={`checkbox-member-${m.id}`}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium truncate">{m.name}</span>
                        <Badge variant="secondary" className="text-[10px]">{m.role}</Badge>
                      </div>
                      <div className="text-xs text-muted-foreground truncate">{m.email}</div>
                    </div>
                  </label>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Message */}
        <Card data-testid="card-message">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Nachricht</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="template" className="text-xs">Vorlage wählen</Label>
              <Select value={templateId} onValueChange={applyTemplate}>
                <SelectTrigger id="template" data-testid="select-template">
                  <SelectValue placeholder="Vorlage auswählen..." />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.id === "videomeeting" && <Video className="inline w-3.5 h-3.5 mr-2" />}
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="subject" className="text-xs">Betreff</Label>
              <Input
                id="subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Betreff der E-Mail"
                data-testid="input-subject"
              />
            </div>

            <div>
              <Label htmlFor="body" className="text-xs">Nachricht</Label>
              <Textarea
                id="body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Text der E-Mail..."
                rows={12}
                className="font-mono text-sm"
                data-testid="textarea-body"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <div className="text-xs text-muted-foreground">
                Absender: team@allengerechteswohnen.de
              </div>
              <Button
                onClick={handleSend}
                disabled={sending || selectedMembers.length === 0 || !smtpStatus?.ok}
                data-testid="button-send"
              >
                <Send className="w-4 h-4 mr-2" />
                {sending ? "Sende..." : `An ${selectedMembers.length} senden`}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
