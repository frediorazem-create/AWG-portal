import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Inbox as InboxIcon,
  Search,
  RefreshCw,
  Star,
  Trash2,
  Paperclip,
  ArrowLeft,
  Reply,
  Send,
  AlertCircle,
  Mail,
  MailOpen,
  Download,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Addr { name?: string; address: string; }
interface MailListItem {
  uid: number;
  messageId: string;
  subject: string;
  from: Addr;
  to: Addr[];
  date: string;
  unread: boolean;
  flagged: boolean;
  hasAttachments: boolean;
}
interface MailDetail extends MailListItem {
  html: string | null;
  text: string | null;
  cc: Addr[];
  attachments: { filename: string; contentType: string; size: number; partId: string }[];
  references: string[];
  inReplyTo: string | null;
}

function formatDate(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
  const thisYear = d.getFullYear() === now.getFullYear();
  return d.toLocaleDateString("de-DE", { day: "2-digit", month: "short", year: thisYear ? undefined : "numeric" });
}

function formatSize(bytes: number) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / 1024 / 1024).toFixed(1) + " MB";
}

function displayFrom(f: Addr) {
  return f.name || f.address || "(unbekannt)";
}

export default function Inbox() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [selectedUid, setSelectedUid] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const [imapStatus, setImapStatus] = useState<{ ok: boolean; error?: string } | null>(null);
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyBody, setReplyBody] = useState("");
  const [replyFiles, setReplyFiles] = useState<File[]>([]);
  const [sendingReply, setSendingReply] = useState(false);

  useEffect(() => {
    apiRequest("GET", "/api/inbox/status")
      .then(r => r.json())
      .then(s => setImapStatus(s))
      .catch(() => setImapStatus({ ok: false, error: "Status konnte nicht abgerufen werden" }));
  }, []);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const listQuery = useQuery<{ items: MailListItem[]; total: number; unseen: number }>({
    queryKey: ["/api/inbox", searchDebounced],
    queryFn: async () => {
      const url = "/api/inbox" + (searchDebounced ? `?search=${encodeURIComponent(searchDebounced)}` : "");
      const r = await apiRequest("GET", url);
      return r.json();
    },
    enabled: !!imapStatus?.ok,
    refetchInterval: 60_000, // auto-refresh alle 60 s
  });

  const detailQuery = useQuery<MailDetail>({
    queryKey: ["/api/inbox", selectedUid],
    queryFn: async () => {
      const r = await apiRequest("GET", `/api/inbox/${selectedUid}`);
      return r.json();
    },
    enabled: !!selectedUid && !!imapStatus?.ok,
  });

  const flagsMutation = useMutation({
    mutationFn: async ({ uid, flags }: { uid: number; flags: { seen?: boolean; flagged?: boolean; deleted?: boolean } }) => {
      const r = await apiRequest("POST", `/api/inbox/${uid}/flags`, flags);
      return r.json();
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["/api/inbox"] });
      if (vars.flags.deleted) setSelectedUid(null);
    },
  });

  // Auto-mark as read when opening
  useEffect(() => {
    if (detailQuery.data && detailQuery.data.unread) {
      flagsMutation.mutate({ uid: detailQuery.data.uid, flags: { seen: true } });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detailQuery.data?.uid]);

  const list = listQuery.data?.items || [];

  async function handleReply() {
    if (!detailQuery.data) return;
    if (!replyBody.trim()) {
      toast({ title: "Leere Antwort", description: "Bitte Text eingeben.", variant: "destructive" });
      return;
    }
    setSendingReply(true);
    try {
      const mail = detailQuery.data;
      const subject = mail.subject.startsWith("Re:") ? mail.subject : "Re: " + mail.subject;
      const fd = new FormData();
      fd.append("recipients", mail.from.address);
      fd.append("subject", subject);
      fd.append("body", replyBody + "\n\n---\nUrsprüngliche Nachricht von " + displayFrom(mail.from) + ":\n" + (mail.text || "").slice(0, 2000));
      fd.append("useBcc", "false");
      if (mail.messageId) fd.append("inReplyTo", mail.messageId);
      const refs = [...(mail.references || [])];
      if (mail.messageId) refs.push(mail.messageId);
      refs.forEach(r => fd.append("references", r));
      replyFiles.forEach(f => fd.append("attachments", f, f.name));

      const res = await fetch((import.meta.env.VITE_API_BASE || "") + "/api/mailing/send", {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: "Antwort versendet" });
        setReplyOpen(false);
        setReplyBody("");
        setReplyFiles([]);
      } else {
        toast({ title: "Versand fehlgeschlagen", description: data.error, variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "Fehler", description: err.message, variant: "destructive" });
    } finally {
      setSendingReply(false);
    }
  }

  if (imapStatus && !imapStatus.ok) {
    return (
      <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-4">
        <div className="flex items-center gap-2">
          <InboxIcon className="w-5 h-5 text-primary" />
          <h1 className="text-xl font-semibold">Posteingang</h1>
        </div>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Posteingang nicht verfügbar: {imapStatus.error}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto h-[calc(100vh-2rem)] flex flex-col">
      <div className="flex items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          <InboxIcon className="w-5 h-5 text-primary" />
          <h1 className="text-xl font-semibold" data-testid="text-inbox-title">Posteingang</h1>
          {listQuery.data && (
            <Badge variant="secondary" className="ml-1">
              {listQuery.data.unseen} ungelesen / {listQuery.data.total}
            </Badge>
          )}
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => listQuery.refetch()}
          disabled={listQuery.isFetching}
          data-testid="button-refresh"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${listQuery.isFetching ? "animate-spin" : ""}`} />
          Aktualisieren
        </Button>
      </div>

      <div className="grid md:grid-cols-[340px_1fr] gap-4 flex-1 min-h-0">
        {/* List */}
        <Card className={`flex flex-col min-h-0 ${selectedUid ? "hidden md:flex" : ""}`}>
          <div className="p-3 border-b">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Suchen (Absender, Betreff)..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9"
                data-testid="input-search"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto divide-y">
            {listQuery.isLoading && <div className="p-4 text-sm text-muted-foreground">Lade Nachrichten...</div>}
            {!listQuery.isLoading && list.length === 0 && (
              <div className="p-6 text-center text-sm text-muted-foreground">Keine Nachrichten im Posteingang.</div>
            )}
            {list.map(m => (
              <button
                key={m.uid}
                onClick={() => setSelectedUid(m.uid)}
                className={`w-full text-left p-3 hover:bg-accent/40 transition-colors ${selectedUid === m.uid ? "bg-accent/60" : ""} ${m.unread ? "bg-primary/5" : ""}`}
                data-testid={`row-mail-${m.uid}`}
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <span className={`text-sm truncate ${m.unread ? "font-semibold" : ""}`}>
                    {displayFrom(m.from)}
                  </span>
                  <span className="text-xs text-muted-foreground shrink-0">{formatDate(m.date)}</span>
                </div>
                <div className={`text-sm truncate ${m.unread ? "font-medium" : "text-muted-foreground"}`}>
                  {m.subject}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  {m.unread && <span className="w-2 h-2 rounded-full bg-primary" />}
                  {m.flagged && <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />}
                  {m.hasAttachments && <Paperclip className="w-3 h-3 text-muted-foreground" />}
                </div>
              </button>
            ))}
          </div>
        </Card>

        {/* Detail */}
        <Card className={`flex flex-col min-h-0 ${!selectedUid ? "hidden md:flex" : ""}`}>
          {!selectedUid && (
            <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm p-6">
              Wähle eine Nachricht aus der Liste.
            </div>
          )}
          {selectedUid && detailQuery.isLoading && (
            <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm p-6">
              Lade Nachricht...
            </div>
          )}
          {selectedUid && detailQuery.data && (
            <>
              <div className="p-4 border-b space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="md:hidden -ml-2"
                    onClick={() => setSelectedUid(null)}
                    data-testid="button-back"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </Button>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-base font-semibold break-words" data-testid="text-subject">
                      {detailQuery.data.subject}
                    </h2>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      Von <span className="font-medium text-foreground">{displayFrom(detailQuery.data.from)}</span>
                      <span className="ml-1">&lt;{detailQuery.data.from.address}&gt;</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      An {detailQuery.data.to.map(a => a.address).join(", ")}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(detailQuery.data.date).toLocaleString("de-DE")}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Button size="sm" onClick={() => setReplyOpen(v => !v)} data-testid="button-reply">
                    <Reply className="w-4 h-4 mr-2" />
                    Antworten
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => flagsMutation.mutate({ uid: detailQuery.data!.uid, flags: { flagged: !detailQuery.data!.flagged } })}
                    data-testid="button-star"
                  >
                    <Star className={`w-4 h-4 mr-2 ${detailQuery.data.flagged ? "text-yellow-500 fill-yellow-500" : ""}`} />
                    {detailQuery.data.flagged ? "Markierung entfernen" : "Markieren"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => flagsMutation.mutate({ uid: detailQuery.data!.uid, flags: { seen: !detailQuery.data!.unread ? false : true } })}
                    data-testid="button-toggle-read"
                  >
                    {detailQuery.data.unread ? <MailOpen className="w-4 h-4 mr-2" /> : <Mail className="w-4 h-4 mr-2" />}
                    {detailQuery.data.unread ? "Als gelesen" : "Als ungelesen"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      if (confirm("Diese Nachricht in den Papierkorb verschieben?")) {
                        flagsMutation.mutate({ uid: detailQuery.data!.uid, flags: { deleted: true } });
                      }
                    }}
                    data-testid="button-delete"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Löschen
                  </Button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {detailQuery.data.attachments.length > 0 && (
                  <div className="border rounded-md divide-y">
                    {detailQuery.data.attachments.map((a, i) => (
                      <a
                        key={i}
                        href={`${import.meta.env.VITE_API_BASE || ""}/api/inbox/${detailQuery.data!.uid}/attachments/${encodeURIComponent(a.partId)}`}
                        className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent/40"
                        data-testid={`link-attachment-${i}`}
                        download={a.filename}
                      >
                        <Paperclip className="w-4 h-4 text-muted-foreground" />
                        <span className="flex-1 truncate">{a.filename}</span>
                        <span className="text-xs text-muted-foreground">{formatSize(a.size)}</span>
                        <Download className="w-4 h-4 text-muted-foreground" />
                      </a>
                    ))}
                  </div>
                )}

                {detailQuery.data.html ? (
                  <div
                    className="prose prose-sm max-w-none dark:prose-invert"
                    dangerouslySetInnerHTML={{ __html: sanitizeHtml(detailQuery.data.html) }}
                    data-testid="content-html"
                  />
                ) : (
                  <pre
                    className="text-sm whitespace-pre-wrap font-sans"
                    data-testid="content-text"
                  >
                    {detailQuery.data.text || "(Kein Textinhalt)"}
                  </pre>
                )}
              </div>

              {replyOpen && (
                <div className="border-t p-4 space-y-3 bg-muted/30">
                  <div className="text-xs text-muted-foreground">
                    Antwort an: <span className="font-medium text-foreground">{detailQuery.data.from.address}</span>
                  </div>
                  <Textarea
                    value={replyBody}
                    onChange={e => setReplyBody(e.target.value)}
                    placeholder="Antworttext..."
                    rows={6}
                    data-testid="textarea-reply"
                  />
                  <label className="inline-flex items-center gap-2 px-3 py-1.5 text-sm border border-dashed border-border rounded-md cursor-pointer hover:bg-accent/40">
                    <Paperclip className="w-4 h-4" />
                    Anhang
                    <input
                      type="file"
                      multiple
                      className="hidden"
                      onChange={e => {
                        const files = Array.from(e.target.files || []);
                        setReplyFiles(f => [...f, ...files]);
                      }}
                    />
                  </label>
                  {replyFiles.length > 0 && (
                    <div className="text-xs text-muted-foreground">
                      {replyFiles.length} Anhang/Anhänge: {replyFiles.map(f => f.name).join(", ")}
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Button onClick={handleReply} disabled={sendingReply} data-testid="button-send-reply">
                      <Send className="w-4 h-4 mr-2" />
                      {sendingReply ? "Sende..." : "Antwort senden"}
                    </Button>
                    <Button variant="ghost" onClick={() => { setReplyOpen(false); setReplyBody(""); setReplyFiles([]); }}>
                      Abbrechen
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </Card>
      </div>
    </div>
  );
}

// Minimal HTML sanitizer — strips script/style/on*/iframe/object.
// Good enough for display; not a security boundary (server-trusted content anyway).
function sanitizeHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, "")
    .replace(/<object[\s\S]*?<\/object>/gi, "")
    .replace(/\son\w+="[^"]*"/gi, "")
    .replace(/\son\w+='[^']*'/gi, "")
    .replace(/javascript:/gi, "");
}
