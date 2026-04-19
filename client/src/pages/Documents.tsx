import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FolderOpen, FileText, Upload, Search, Folder, ArrowLeft } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Folder as FolderType, Document as DocType } from "@shared/schema";

const fileIcon: Record<string, string> = {
  pdf: "text-red-500",
  docx: "text-blue-500",
  xlsx: "text-green-600",
};

export default function Documents() {
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadForm, setUploadForm] = useState({ name: "", type: "pdf", size: "100 KB", folderId: "" });

  const { data: folders, isLoading: loadingFolders } = useQuery<FolderType[]>({ queryKey: ["/api/folders"] });
  const { data: allDocs, isLoading: loadingDocs } = useQuery<DocType[]>({ queryKey: ["/api/documents"] });

  const currentFolder = folders?.find((f) => f.id === selectedFolder);

  const filteredDocs = allDocs?.filter((d) => {
    const matchFolder = selectedFolder ? d.folderId === selectedFolder : true;
    const matchSearch = search ? d.name.toLowerCase().includes(search.toLowerCase()) : true;
    return matchFolder && matchSearch;
  }) ?? [];

  const uploadMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/documents", {
        ...uploadForm,
        folderId: uploadForm.folderId || (selectedFolder || folders?.[0]?.id || ""),
        uploadedBy: "Fredi Orazem",
        uploadedAt: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      setUploadOpen(false);
      setUploadForm({ name: "", type: "pdf", size: "100 KB", folderId: "" });
    },
  });

  const folderDocCount = (folderId: string) => allDocs?.filter((d) => d.folderId === folderId).length ?? 0;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2" data-testid="text-documents-title">
            <FolderOpen className="w-5 h-5" /> Dokumente
          </h1>
          <p className="text-sm text-muted-foreground">Dateien und Ordner der Genossenschaft</p>
        </div>
        <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
          <DialogTrigger asChild>
            <Button size="sm" data-testid="button-upload">
              <Upload className="w-4 h-4 mr-1" /> Hochladen
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Dokument hochladen</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Dateiname</Label>
                <Input value={uploadForm.name} onChange={(e) => setUploadForm({ ...uploadForm, name: e.target.value })} placeholder="Dateiname.pdf" data-testid="input-doc-name" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Dateityp</Label>
                  <Select value={uploadForm.type} onValueChange={(v) => setUploadForm({ ...uploadForm, type: v })}>
                    <SelectTrigger data-testid="select-doc-type"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pdf">PDF</SelectItem>
                      <SelectItem value="docx">Word</SelectItem>
                      <SelectItem value="xlsx">Excel</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Ordner</Label>
                  <Select value={uploadForm.folderId || selectedFolder || ""} onValueChange={(v) => setUploadForm({ ...uploadForm, folderId: v })}>
                    <SelectTrigger data-testid="select-doc-folder"><SelectValue placeholder="Ordner wählen" /></SelectTrigger>
                    <SelectContent>
                      {folders?.map((f) => (
                        <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button onClick={() => uploadMutation.mutate()} disabled={!uploadForm.name || uploadMutation.isPending} className="w-full" data-testid="button-submit-upload">
                Hochladen
              </Button>
            </div>
          </DialogContent>
        </Dialog>
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
              filteredDocs.map((doc) => (
                <Card key={doc.id} data-testid={`doc-${doc.id}`}>
                  <CardContent className="flex items-center gap-3 p-3">
                    <FileText className={`w-5 h-5 shrink-0 ${fileIcon[doc.type] || "text-muted-foreground"}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{doc.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {doc.size} · {doc.uploadedBy} · {new Date(doc.uploadedAt).toLocaleDateString("de-DE")}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-[10px] uppercase shrink-0">{doc.type}</Badge>
                  </CardContent>
                </Card>
              ))
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
    </div>
  );
}
