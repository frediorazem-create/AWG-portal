import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FolderOpen, FileText, Upload, Search, Folder, ArrowLeft, ExternalLink, Download, FolderPlus, Eye, Trash2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import type { Folder as FolderType, Document as DocType } from "@shared/schema";

const fileIcon: Record<string, string> = {
  pdf: "text-red-500",
  docx: "text-blue-500",
  doc: "text-blue-500",
  xlsx: "text-green-600",
  xls: "text-green-600",
  pptx: "text-orange-500",
  ppt: "text-orange-500",
  md: "text-violet-600",
  png: "text-pink-500",
  jpg: "text-pink-500",
  jpeg: "text-pink-500",
  gif: "text-pink-500",
  txt: "text-muted-foreground",
};

// Sehr einfacher Markdown→HTML-Renderer (Headings, Bold, Italic, Links, Listen, Code).
// Wird nur noch für Alt-Dokumente mit "content" verwendet.
function renderMarkdown(md: string): string {
  let html = md.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  html = html.replace(/^---[\s\S]*?---\n+/, "");
  html = html.replace(/^###### (.+)$/gm, "<h6>$1</h6>");
  html = html.replace(/^##### (.+)$/gm, "<h5>$1</h5>");
  html = html.replace(/^#### (.+)$/gm, "<h4>$1</h4>");
  html = html.replace(/^### (.+)$/gm, "<h3>$1</h3>");
  html = html.replace(/^## (.+)$/gm, "<h2>$1</h2>");
  html = html.replace(/^# (.+)$/gm, "<h1>$1</h1>");
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  html = html.replace(/^\s*[-*] (.+)$/gm, "<li>$1</li>");
  html = html.replace(/(<li>.*<\/li>\n?)+/g, (m) => `<ul>${m}</ul>`);
  html = html.replace(/^---+$/gm, "<hr/>");
  html = html.split(/\n{2,}/).map((para) => {
    const t = para.trim();
    if (!t) return "";
    if (/^<(h\d|ul|ol|hr|pre|table)/.test(t)) return t;
    return `<p>${t.replace(/\n/g, "<br/>")}</p>`;
  }).join("\n");
  return html;
}

export default function Documents() {
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [selectedDoc, setSelectedDoc] = useState<DocType | null>(null);
  const [search, setSearch] = useState("");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [uploadFolderId, setUploadFolderId] = useState<string>("");
  const [uploadProgress, setUploadProgress] = useState<{ done: number; total: number; current?: string } | null>(null);
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { isAdmin } = useAuth();

  const { data: folders, isLoading: loadingFolders } = useQuery<FolderType[]>({ queryKey: ["/api/folders"] });
  const { data: allDocs, isLoading: loadingDocs } = useQuery<DocType[]>({ queryKey: ["/api/documents"] });

  const currentFolder = folders?.find((f) => f.id === selectedFolder);

  const filteredDocs = allDocs?.filter((d) => {
    const matchFolder = selectedFolder ? d.folderId === selectedFolder : true;
    const matchSearch = search ? d.name.toLowerCase().includes(search.toLowerCase()) : true;
    return matchFolder && matchSearch;
  }) ?? [];

  const folderDocCount = (folderId: string) => allDocs?.filter((d) => d.folderId === folderId).length ?? 0;

  const formatSize = (bytes: number) =>
    bytes >= 1024 * 1024
      ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
      : `${Math.max(1, Math.round(bytes / 1024))} KB`;

  const createFolderMutation = useMutation({
    mutationFn: async (name: string) => {
      const res = await apiRequest("POST", "/api/folders", { name });
      return res.json();
    },
    onSuccess: (folder: FolderType) => {
      queryClient.invalidateQueries({ queryKey: ["/api/folders"] });
      setNewFolderOpen(false);
      setNewFolderName("");
      toast({ title: "Ordner angelegt", description: folder.name });
    },
    onError: (err: any) => {
      toast({ title: "Fehler", description: err?.message || "Ordner konnte nicht angelegt werden", variant: "destructive" });
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (uploadFiles.length === 0) throw new Error("Bitte zuerst Dateien ausw\u00e4hlen");
      const folderId = uploadFolderId || selectedFolder;
      if (!folderId) throw new Error("Bitte einen Ordner w\u00e4hlen");

      const failed: string[] = [];
      setUploadProgress({ done: 0, total: uploadFiles.length });

      // Sequentiell hochladen — vermeidet Memory-Spikes auf Render Starter (512 MB)
      for (let i = 0; i < uploadFiles.length; i++) {
        const file = uploadFiles[i];
        setUploadProgress({ done: i, total: uploadFiles.length, current: file.name });
        const fd = new FormData();
        fd.append("file", file);
        fd.append("folderId", folderId);
        fd.append("uploadedBy", "Fredi Orazem");
        try {
          const res = await fetch("/api/documents/upload", { method: "POST", body: fd });
          if (!res.ok) {
            const text = await res.text().catch(() => "");
            failed.push(`${file.name}: ${text || res.status}`);
          }
        } catch (err: any) {
          failed.push(`${file.name}: ${err?.message || "Netzwerkfehler"}`);
        }
      }
      return { total: uploadFiles.length, failed };
    },
    onSuccess: ({ total, failed }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      setUploadProgress(null);
      if (failed.length === 0) {
        toast({ title: "Hochgeladen", description: total === 1 ? "Die Datei wurde gespeichert." : `${total} Dateien gespeichert.` });
        setUploadOpen(false);
        setUploadFiles([]);
        setUploadFolderId("");
        if (fileInputRef.current) fileInputRef.current.value = "";
      } else {
        const ok = total - failed.length;
        toast({
          title: `${ok}/${total} hochgeladen`,
          description: `Fehlgeschlagen: ${failed.slice(0, 3).join("; ")}${failed.length > 3 ? " \u2026" : ""}`,
          variant: "destructive",
        });
      }
    },
    onError: (err: any) => {
      setUploadProgress(null);
      toast({ title: "Upload fehlgeschlagen", description: err?.message || "Unbekannter Fehler", variant: "destructive" });
    },
  });

  const [docToDelete, setDocToDelete] = useState<DocType | null>(null);

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/documents/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      setDocToDelete(null);
      toast({ title: "Gelöscht", description: "Dokument wurde entfernt." });
    },
    onError: (err: any) => {
      toast({ title: "Fehler", description: err?.message || "Löschen fehlgeschlagen", variant: "destructive" });
    },
  });

  const handleDownload = (doc: DocType) => {
    // Direkt als Browser-Download triggern
    const a = window.document.createElement("a");
    a.href = `/api/documents/${doc.id}/download`;
    a.download = doc.name;
    window.document.body.appendChild(a);
    a.click();
    a.remove();
  };

  // Datei-Typen, die der Browser direkt anzeigen kann
  const isInlineViewable = (mime?: string | null) => {
    if (!mime) return false;
    return (
      mime === "application/pdf" ||
      mime.startsWith("image/") ||
      mime.startsWith("text/") ||
      mime === "application/json"
    );
  };

  const handleOpen = (doc: DocType) => {
    window.open(`/api/documents/${doc.id}/view`, "_blank", "noopener");
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2" data-testid="text-documents-title">
            <FolderOpen className="w-5 h-5" /> Dokumente
          </h1>
          <p className="text-sm text-muted-foreground">Dateien und Ordner der Genossenschaft</p>
        </div>
        {isAdmin && (
        <div className="flex items-center gap-2">
        <Dialog open={newFolderOpen} onOpenChange={(open) => {
          setNewFolderOpen(open);
          if (!open) setNewFolderName("");
        }}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline" data-testid="button-new-folder">
              <FolderPlus className="w-4 h-4 mr-1" /> Neuer Ordner
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Neuen Ordner anlegen</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="folder-name">Ordnername</Label>
                <Input
                  id="folder-name"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="z.\u202fB. Protokolle, F\u00f6rderantrag..."
                  data-testid="input-folder-name"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newFolderName.trim() && !createFolderMutation.isPending) {
                      createFolderMutation.mutate(newFolderName.trim());
                    }
                  }}
                  autoFocus
                />
              </div>
              <Button
                onClick={() => createFolderMutation.mutate(newFolderName.trim())}
                disabled={!newFolderName.trim() || createFolderMutation.isPending}
                className="w-full"
                data-testid="button-create-folder"
              >
                {createFolderMutation.isPending ? "Lege an\u2026" : "Anlegen"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        <Dialog open={uploadOpen} onOpenChange={(open) => {
          if (uploadMutation.isPending) return; // während Upload nicht schließen
          setUploadOpen(open);
          if (!open) {
            setUploadFiles([]);
            setUploadFolderId("");
            setUploadProgress(null);
            if (fileInputRef.current) fileInputRef.current.value = "";
          }
        }}>
          <DialogTrigger asChild>
            <Button size="sm" data-testid="button-upload">
              <Upload className="w-4 h-4 mr-1" /> Hochladen
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Dateien hochladen</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="file-input">Dateien vom Computer (mehrere auswählbar)</Label>
                <Input
                  id="file-input"
                  ref={fileInputRef}
                  type="file"
                  multiple
                  onChange={(e) => setUploadFiles(Array.from(e.target.files ?? []))}
                  data-testid="input-file"
                />
                {uploadFiles.length > 0 && (
                  <div className="text-xs text-muted-foreground mt-2 space-y-0.5 max-h-32 overflow-y-auto">
                    <p className="font-medium">{uploadFiles.length} Datei{uploadFiles.length !== 1 ? "en" : ""} ausgewählt</p>
                    {uploadFiles.map((f, i) => (
                      <p key={i} className="truncate">• {f.name} · {formatSize(f.size)}</p>
                    ))}
                  </div>
                )}
                <p className="text-xs text-muted-foreground mt-1">Maximal 15&nbsp;MB pro Datei.</p>
              </div>
              <div>
                <Label>Ordner</Label>
                <Select
                  value={uploadFolderId || selectedFolder || undefined}
                  onValueChange={(v) => setUploadFolderId(v)}
                >
                  <SelectTrigger data-testid="select-doc-folder"><SelectValue placeholder="Ordner wählen" /></SelectTrigger>
                  <SelectContent>
                    {(folders ?? []).length === 0 ? (
                      <div className="px-2 py-2 text-xs text-muted-foreground">Noch kein Ordner. Bitte zuerst einen anlegen.</div>
                    ) : (
                      folders!.map((f) => (
                        <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              {uploadProgress && (
                <div className="text-xs text-muted-foreground">
                  Lädt {uploadProgress.done + 1}/{uploadProgress.total} hoch…
                  {uploadProgress.current && <span className="block truncate">{uploadProgress.current}</span>}
                </div>
              )}
              <Button
                onClick={() => uploadMutation.mutate()}
                disabled={uploadFiles.length === 0 || uploadMutation.isPending || (!uploadFolderId && !selectedFolder)}
                className="w-full"
                data-testid="button-submit-upload"
              >
                {uploadMutation.isPending
                  ? `Lädt hoch… (${(uploadProgress?.done ?? 0)}/${uploadProgress?.total ?? uploadFiles.length})`
                  : uploadFiles.length > 1
                    ? `${uploadFiles.length} Dateien hochladen`
                    : "Hochladen"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        </div>
        )}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Dokumente suchen..."
          className="pl-9"
          data-testid="input-search-docs"
        />
      </div>

      {/* Folder view vs. file list */}
      {selectedFolder ? (
        <div className="space-y-4">
          <Button variant="ghost" size="sm" onClick={() => setSelectedFolder(null)} data-testid="button-back-folders">
            <ArrowLeft className="w-4 h-4 mr-1" /> Zurück zu Ordnern
          </Button>
          <h2 className="text-base font-semibold flex items-center gap-2">
            <Folder className="w-4 h-4" /> {currentFolder?.name}
          </h2>
          <div className="space-y-2">
            {loadingDocs ? (
              Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)
            ) : filteredDocs.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">Keine Dokumente in diesem Ordner.</p>
            ) : (
              filteredDocs.map((doc) => {
                const hasContent = !!doc.content;
                const hasFile = !!(doc as any).mimeType; // mimeType ist gesetzt, wenn echtes File hochgeladen wurde
                return (
                  <Card
                    key={doc.id}
                    data-testid={`doc-${doc.id}`}
                    className={hasContent ? "cursor-pointer hover:bg-accent/40 transition-colors" : ""}
                    onClick={() => hasContent && setSelectedDoc(doc)}
                  >
                    <CardContent className="flex items-center gap-3 p-3">
                      <FileText className={`w-5 h-5 shrink-0 ${fileIcon[doc.type] || "text-muted-foreground"}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{doc.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {doc.size} · {doc.uploadedBy} · {new Date(doc.uploadedAt).toLocaleDateString("de-DE")}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-[10px] uppercase shrink-0">{doc.type}</Badge>
                      {hasFile && isInlineViewable((doc as any).mimeType) && (
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={(e) => { e.stopPropagation(); handleOpen(doc); }}
                          data-testid={`button-open-${doc.id}`}
                          title="Öffnen"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      )}
                      {hasFile && (
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={(e) => { e.stopPropagation(); handleDownload(doc); }}
                          data-testid={`button-download-${doc.id}`}
                          title="Herunterladen"
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                      )}
                      {isAdmin && (
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={(e) => { e.stopPropagation(); setDocToDelete(doc); }}
                          data-testid={`button-delete-${doc.id}`}
                          title="Löschen"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {loadingFolders ? (
            Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)
          ) : (
            folders?.map((folder) => (
              <Card
                key={folder.id}
                className="cursor-pointer hover:bg-accent/40 transition-colors"
                onClick={() => setSelectedFolder(folder.id)}
                data-testid={`folder-${folder.id}`}
              >
                <CardContent className="flex items-center gap-3 p-4">
                  <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
                    <Folder className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{folder.name}</p>
                    <p className="text-xs text-muted-foreground">{folderDocCount(folder.id)} Dateien</p>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Lösch-Bestätigung */}
      <AlertDialog open={!!docToDelete} onOpenChange={(o) => { if (!o) setDocToDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Dokument löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              „{docToDelete?.name}“ wird endgültig entfernt. Das lässt sich nicht rückgängig machen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
              onClick={() => docToDelete && deleteMutation.mutate(docToDelete.id)}
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? "Löscht…" : "Löschen"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Markdown-Vorschau-Dialog (nur für Dokumente mit content) */}
      <Dialog open={!!selectedDoc} onOpenChange={(o) => !o && setSelectedDoc(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="pr-8">{selectedDoc?.name}</DialogTitle>
            {selectedDoc?.notionUrl && (
              <a
                href={selectedDoc.notionUrl}
                target="_blank"
                rel="noopener"
                className="text-xs text-muted-foreground hover:text-primary inline-flex items-center gap-1"
              >
                Original in Notion <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </DialogHeader>
          <div
            className="prose prose-sm dark:prose-invert max-w-none [&_h1]:text-xl [&_h2]:text-lg [&_h3]:text-base [&_a]:text-primary [&_a]:underline [&_code]:bg-muted [&_code]:px-1 [&_code]:rounded"
            dangerouslySetInnerHTML={{ __html: selectedDoc?.content ? renderMarkdown(selectedDoc.content) : "" }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
