import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Video,
  Users,
  Plus,
  ExternalLink,
  MonitorPlay,
  Phone,
  Copy,
  Check,
  X,
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { MeetingRoom } from "@shared/schema";

/* ── Jitsi Meeting Embed ── */
function JitsiMeeting({
  roomName,
  displayName,
  onClose,
}: {
  roomName: string;
  displayName: string;
  onClose: () => void;
}) {
  // Sanitize room name for Jitsi URL
  const jitsiRoom = `AWG-${roomName.replace(/[^a-zA-Z0-9-]/g, "")}`;
  const jitsiUrl = `https://meet.jit.si/${jitsiRoom}#userInfo.displayName="${encodeURIComponent(displayName)}"&config.prejoinConfig.enabled=false`;

  return (
    <div className="fixed inset-0 z-50 bg-black">
      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 py-2 bg-black/80 backdrop-blur-sm">
        <div className="flex items-center gap-2 text-white">
          <Video className="w-4 h-4" />
          <span className="text-sm font-medium">{roomName}</span>
          <Badge variant="secondary" className="text-[10px]">
            Jitsi Meet
          </Badge>
        </div>
        <Button
          variant="destructive"
          size="sm"
          onClick={onClose}
          data-testid="button-leave-meeting"
        >
          <Phone className="w-4 h-4 mr-1 rotate-[135deg]" />
          Verlassen
        </Button>
      </div>
      {/* Jitsi iframe */}
      <iframe
        src={jitsiUrl}
        className="w-full h-full border-0"
        allow="camera;microphone;fullscreen;display-capture;autoplay;clipboard-write"
        title="Videokonferenz"
      />
    </div>
  );
}

/* ── Share Link Button ── */
function ShareLinkButton({ roomName }: { roomName: string }) {
  const [copied, setCopied] = useState(false);
  const jitsiRoom = `AWG-${roomName.replace(/[^a-zA-Z0-9-]/g, "")}`;
  const shareUrl = `https://meet.jit.si/${jitsiRoom}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: open in new tab
      window.open(shareUrl, "_blank");
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      className="text-xs gap-1"
      onClick={handleCopy}
      data-testid={`copy-link-${roomName}`}
    >
      {copied ? (
        <>
          <Check className="w-3 h-3" /> Kopiert
        </>
      ) : (
        <>
          <Copy className="w-3 h-3" /> Link teilen
        </>
      )}
    </Button>
  );
}

/* ── Main Page ── */
export default function VideoConference() {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", description: "" });
  const [activeMeeting, setActiveMeeting] = useState<string | null>(null);
  const [activeMeetingName, setActiveMeetingName] = useState("");

  const { data: rooms, isLoading } = useQuery<MeetingRoom[]>({
    queryKey: ["/api/meeting-rooms"],
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const jitsiRoom = `AWG-${form.name.replace(/[^a-zA-Z0-9-]/g, "")}`;
      await apiRequest("POST", "/api/meeting-rooms", {
        ...form,
        url: `https://meet.jit.si/${jitsiRoom}`,
        isActive: false,
        participants: 0,
        createdBy: "Fredi Orazem",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/meeting-rooms"] });
      setOpen(false);
      setForm({ name: "", description: "" });
    },
  });

  const joinMeeting = (room: MeetingRoom) => {
    setActiveMeeting(room.id);
    setActiveMeetingName(room.name);
  };

  const leaveMeeting = () => {
    setActiveMeeting(null);
    setActiveMeetingName("");
  };

  // Show Jitsi fullscreen when in a meeting
  if (activeMeeting) {
    return (
      <JitsiMeeting
        roomName={activeMeetingName}
        displayName="Fredi Orazem"
        onClose={leaveMeeting}
      />
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-xl font-semibold flex items-center gap-2"
            data-testid="text-video-title"
          >
            <Video className="w-5 h-5" /> Videokonferenz
          </h1>
          <p className="text-sm text-muted-foreground">
            Jitsi Meet — Videokonferenzen direkt in der App
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" data-testid="button-new-room">
              <Plus className="w-4 h-4 mr-1" /> Neuer Raum
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Neuen Konferenzraum erstellen</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Raumname</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="z.B. AG Bauplanung"
                  data-testid="input-room-name"
                />
              </div>
              <div>
                <Label>Beschreibung</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  placeholder="Wofür ist dieser Raum?"
                  rows={2}
                  data-testid="input-room-description"
                />
              </div>
              <Button
                onClick={() => createMutation.mutate()}
                disabled={!form.name || createMutation.isPending}
                className="w-full"
                data-testid="button-submit-room"
              >
                Raum erstellen
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Info banner */}
      <div className="rounded-lg border bg-primary/5 dark:bg-primary/10 p-4">
        <p className="text-sm text-muted-foreground">
          <strong className="text-foreground">So funktioniert's:</strong> Tippe auf
          "Beitreten" um die Videokonferenz direkt in der App zu starten. Kein
          Download nötig — funktioniert im Browser. Teile den Link mit
          Teilnehmern, die nicht in der App eingeloggt sind.
        </p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-48 w-full" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {rooms?.map((room) => {
            const jitsiRoom = `AWG-${room.name.replace(/[^a-zA-Z0-9-]/g, "")}`;
            return (
              <Card
                key={room.id}
                data-testid={`room-${room.id}`}
                className="overflow-hidden"
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                      <MonitorPlay className="w-4 h-4" />
                      {room.name}
                    </CardTitle>
                    <ShareLinkButton roomName={room.name} />
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {room.description && (
                    <p className="text-sm text-muted-foreground">
                      {room.description}
                    </p>
                  )}
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>Erstellt von {room.createdBy}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      className="w-full"
                      onClick={() => joinMeeting(room)}
                      data-testid={`join-room-${room.id}`}
                    >
                      <Video className="w-4 h-4 mr-2" />
                      Beitreten
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() =>
                        window.open(
                          `https://meet.jit.si/${jitsiRoom}`,
                          "_blank"
                        )
                      }
                      data-testid={`external-room-${room.id}`}
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Im Tab
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {!isLoading && (!rooms || rooms.length === 0) && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Video className="w-12 h-12 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">
              Noch keine Konferenzräume erstellt.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
