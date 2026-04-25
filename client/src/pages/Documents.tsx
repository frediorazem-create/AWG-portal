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
import { FolderOpen, FileText, Upload, Search, Folder, ArrowLeft, ExternalLink, Download, FolderPlus } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
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
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadFolderId, setUploadFolderId] = useState<string>("");
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

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
      if (!uploadFile) throw new Error("Bitte zuerst eine Datei auswählen");
      const folderId = uploadFolderId || selectedFolder || folders?.[0]?.id;
      if (!folderId) throw new Error("Bitte einen Ordner wählen");

      const fd = new FormData();
      fd.append("file", uploadFile);
      fd.append("folderId", folderId);
      fd.append("uploadedBy", "Fredi Orazem");

      const res = await fetch("/api/documents/upload", { method: "POST", body: fd });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Upload fehlgeschlagen (${res.status})`);
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      setUploadOpen(false);
      setUploadFile(null);
      setUploadFolderId("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      toast({ title: "Hochgeladen", description: "Die Datei wurde gespeichert." });
    },
    onError: (err: any) => {
      toast({ title: "Upload fehlgeschlagen", description: err?.message || "Unbekannter Fehler", variant: "destructive" });
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

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2" data-testid="text-documents-title">
            <FolderOpen className="w-5 h-5" /> Dokumente
          </h1>
          <p className="text-sm text-muted-foreground">Dateien und Ordner der Genossenschaft</p>
        </div>
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
          setUploadOpen(open);
          if (!open) {
            setUploadFile(null);
            setUploadFolderId("");
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
              <DialogTitle>Datei hochladen</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="file-input">Datei vom Computer</Label>
                <Input
                  id="file-input"
                  ref={fileInputRef}
                  type="file"
                  onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
                  data-testid="input-file"
                />
                {uploadFile && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {uploadFile.name} · {formatSize(uploadFile.size)}
                  </p>
                )}
                <p className="text-xs text-muted-foreground mt-1">Maximal 15&nbsp;MB pro Datei.</p>
              </div>
              <div>
                <Label>Ordner</Label>
                <Select
                  value={uploadFolderId || selectedFolder || ""}
                  onValueChange={(v) => setUploadFolderId(v)}
                >
                  <SelectTrigger data-testid="select-doc-folder"><SelectValue placeholder="Ordner wählen" /></SelectTrigger>
                  <SelectContent>
                    {folders?.map((f) => (
                      <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={() => uploadMutation.mutate()}
                disabled={!uploadFile || uploadMutation.isPending}
                className="w-full"
                data-testid="button-submit-upload"
              >
                {uploadMutation.isPending ? "Lädt hoch…" : "Hochladen"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        </div>
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
