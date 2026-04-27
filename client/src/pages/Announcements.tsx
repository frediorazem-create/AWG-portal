import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Megaphone, Pin, Plus } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import type { Announcement } from "@shared/schema";

export default function Announcements() {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [priority, setPriority] = useState("Normal");

  const { data: announcements, isLoading } = useQuery<Announcement[]>({ queryKey: ["/api/announcements"] });
  const { isAdmin } = useAuth();

  const createMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/announcements", {
        title,
        content,
        priority,
        pinned: false,
        authorId: "current",
        authorName: "Fredi Orazem",
        createdAt: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/announcements"] });
      setOpen(false);
      setTitle("");
      setContent("");
      setPriority("Normal");
    },
  });

  const priorityVariant = (p: string) => {
    switch (p) {
      case "Dringend": return "destructive" as const;
      case "Wichtig": return "default" as const;
      default: return "secondary" as const;
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2" data-testid="text-announcements-title">
            <Megaphone className="w-5 h-5" /> Ankündigungen
          </h1>
          <p className="text-sm text-muted-foreground">Wichtige Neuigkeiten der Genossenschaft</p>
        </div>
        {isAdmin && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" data-testid="button-new-announcement">
              <Plus className="w-4 h-4 mr-1" /> Neue Ankündigung
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Neue Ankündigung erstellen</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Titel</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Titel der Ankündigung" data-testid="input-announcement-title" />
              </div>
              <div>
                <Label>Inhalt</Label>
                <Textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Beschreibung..." rows={4} data-testid="input-announcement-content" />
              </div>
              <div>
                <Label>Priorität</Label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger data-testid="select-priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Normal">Normal</SelectItem>
                    <SelectItem value="Wichtig">Wichtig</SelectItem>
                    <SelectItem value="Dringend">Dringend</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={() => createMutation.mutate()} disabled={!title || !content || createMutation.isPending} className="w-full" data-testid="button-submit-announcement">
                Veröffentlichen
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        )}
      </div>

      <div className="space-y-3">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)
        ) : (
          announcements?.map((a) => (
            <Card key={a.id} data-testid={`announcement-${a.id}`}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  {a.pinned && <Pin className="w-4 h-4 text-primary mt-0.5 shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold">{a.title}</span>
                      <Badge variant={priorityVariant(a.priority)} className="text-[10px]">{a.priority}</Badge>
                    </div>
                    <p className="text-sm text-foreground/80 mt-1">{a.content}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      von {a.authorName} · {new Date(a.createdAt).toLocaleDateString("de-DE", { day: "numeric", month: "long", year: "numeric" })}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
