import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
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
import {
  Vote,
  CheckCircle2,
  Clock,
  Plus,
  X,
  BarChart3,
  Users,
  ChevronDown,
  ChevronUp,
  Check,
  Trash2,
} from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import type { Poll, PollOption } from "@shared/schema";

/* ── WhatsApp-style Poll Card ── */
function PollCard({ poll }: { poll: Poll }) {
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const { data: options, isLoading } = useQuery<PollOption[]>({
    queryKey: ["/api/polls", poll.id, "options"],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/polls/${poll.id}/options`);
      return res.json();
    },
  });

  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [showDescription, setShowDescription] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/polls/${poll.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/polls"] });
      setConfirmDelete(false);
      toast({ title: "Gelöscht", description: "Die Abstimmung wurde entfernt." });
    },
    onError: (err: any) => {
      toast({ title: "Fehler", description: err?.message || "Löschen fehlgeschlagen", variant: "destructive" });
    },
  });

  const voteMutation = useMutation({
    mutationFn: async (optionId: string) => {
      await apiRequest("POST", "/api/votes", {
        pollId: poll.id,
        optionId,
        memberId: "current-user",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/polls", poll.id, "options"],
      });
    },
  });

  const totalVotes =
    options?.reduce((sum, o) => sum + (o.votes || 0), 0) ?? 0;
  const isActive = poll.status === "Aktiv";
  const quorumMet = poll.quorum ? totalVotes >= poll.quorum : true;
  const maxVotes = options
    ? Math.max(...options.map((o) => o.votes || 0))
    : 0;

  const handleVote = (optionId: string) => {
    if (!isActive) return;
    setSelectedOption(optionId);
    voteMutation.mutate(optionId);
  };

  return (
    <Card
      data-testid={`poll-${poll.id}`}
      className="overflow-hidden border-0 shadow-md"
    >
      {/* Header band */}
      <div
        className={`px-4 py-3 ${isActive ? "bg-primary/10 dark:bg-primary/20" : "bg-muted/50"}`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div
              className={`rounded-full p-1.5 shrink-0 ${isActive ? "bg-primary/20 text-primary" : "bg-muted-foreground/20 text-muted-foreground"}`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
            </div>
            <h3 className="text-sm font-semibold truncate">{poll.title}</h3>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Badge
              variant={isActive ? "default" : "secondary"}
              className="text-[10px]"
            >
              {isActive ? (
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Aktiv
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Beendet
                </span>
              )}
            </Badge>
            {isAdmin && (
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                onClick={() => setConfirmDelete(true)}
                data-testid={`button-delete-poll-${poll.id}`}
                title="Abstimmung löschen"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        </div>
      </div>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Abstimmung löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              „{poll.title}“ wird mitsamt allen Optionen und Stimmen endgültig entfernt. Das lässt sich nicht rückgängig machen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
              onClick={() => deleteMutation.mutate()}
              data-testid={`button-confirm-delete-poll-${poll.id}`}
            >
              {deleteMutation.isPending ? "Löscht…" : "Löschen"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <CardContent className="p-0">
        {/* Description toggle */}
        {poll.description && (
          <button
            onClick={() => setShowDescription(!showDescription)}
            className="w-full px-4 py-2 flex items-center gap-1.5 text-xs text-muted-foreground hover:bg-muted/30 transition-colors border-b"
            data-testid={`toggle-desc-${poll.id}`}
          >
            {showDescription ? (
              <ChevronUp className="w-3 h-3" />
            ) : (
              <ChevronDown className="w-3 h-3" />
            )}
            {showDescription ? "Beschreibung ausblenden" : "Beschreibung anzeigen"}
          </button>
        )}
        {showDescription && poll.description && (
          <div className="px-4 py-3 bg-muted/20 border-b text-sm text-muted-foreground leading-relaxed">
            {poll.description}
          </div>
        )}

        {/* Options — WhatsApp-style tappable list */}
        <div className="divide-y">
          {isLoading
            ? Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="px-4 py-3">
                  <Skeleton className="h-6 w-full" />
                </div>
              ))
            : options?.map((opt) => {
                const pct =
                  totalVotes > 0
                    ? Math.round(((opt.votes || 0) / totalVotes) * 100)
                    : 0;
                const isWinner =
                  !isActive && (opt.votes || 0) === maxVotes && maxVotes > 0;
                const isSelected = selectedOption === opt.id;

                return (
                  <button
                    key={opt.id}
                    onClick={() => handleVote(opt.id)}
                    disabled={!isActive || voteMutation.isPending}
                    className={`w-full text-left px-4 py-3 transition-all relative overflow-hidden group ${
                      isActive
                        ? "hover:bg-primary/5 active:bg-primary/10 cursor-pointer"
                        : "cursor-default"
                    } ${isSelected ? "bg-primary/10" : ""}`}
                    data-testid={`option-${opt.id}`}
                  >
                    {/* Background progress bar */}
                    <div
                      className={`absolute inset-y-0 left-0 transition-all duration-500 ease-out ${
                        isWinner
                          ? "bg-primary/15 dark:bg-primary/25"
                          : "bg-muted/40 dark:bg-muted/30"
                      }`}
                      style={{ width: `${pct}%` }}
                    />

                    <div className="relative flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Radio-style circle */}
                        <div
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                            isSelected
                              ? "border-primary bg-primary text-primary-foreground"
                              : isWinner
                                ? "border-primary"
                                : "border-muted-foreground/30"
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3" />}
                          {isWinner && !isSelected && (
                            <div className="w-2 h-2 rounded-full bg-primary" />
                          )}
                        </div>

                        <span
                          className={`text-sm ${isWinner ? "font-semibold" : ""}`}
                        >
                          {opt.text}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs font-medium tabular-nums text-muted-foreground">
                          {opt.votes || 0}
                        </span>
                        <span
                          className={`text-xs tabular-nums font-semibold min-w-[2.5rem] text-right ${
                            isWinner ? "text-primary" : "text-muted-foreground"
                          }`}
                        >
                          {pct}%
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 bg-muted/20 border-t space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              {totalVotes} {totalVotes === 1 ? "Stimme" : "Stimmen"}
            </span>
            {poll.quorum && (
              <span
                className={`font-medium ${quorumMet ? "text-primary" : "text-destructive"}`}
              >
                Quorum: {totalVotes}/{poll.quorum}{" "}
                {quorumMet ? "✓" : "✗"}
              </span>
            )}
          </div>
          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
            <span>von {poll.createdBy}</span>
            <span>
              {new Date(poll.createdAt).toLocaleDateString("de-DE")}
              {poll.endsAt &&
                ` · bis ${new Date(poll.endsAt).toLocaleDateString("de-DE")}`}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* ── Create Poll Dialog ── */
function CreatePollDialog() {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [quorum, setQuorum] = useState("");

  const createMutation = useMutation({
    mutationFn: async () => {
      // Create poll
      const pollRes = await apiRequest("POST", "/api/polls", {
        title,
        description: description || null,
        type: "multiple-choice",
        status: "Aktiv",
        quorum: quorum ? parseInt(quorum) : null,
        createdBy: "Fredi Orazem",
        createdAt: new Date().toISOString(),
        endsAt: null,
      });
      const poll = await pollRes.json();

      // Create options
      for (const optText of options.filter((o) => o.trim())) {
        await apiRequest("POST", "/api/poll-options", {
          pollId: poll.id,
          text: optText.trim(),
          votes: 0,
        });
      }
      return poll;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/polls"] });
      setOpen(false);
      setTitle("");
      setDescription("");
      setOptions(["", ""]);
      setQuorum("");
    },
  });

  const addOption = () => {
    if (options.length < 10) setOptions([...options, ""]);
  };

  const removeOption = (idx: number) => {
    if (options.length > 2) setOptions(options.filter((_, i) => i !== idx));
  };

  const updateOption = (idx: number, val: string) => {
    const next = [...options];
    next[idx] = val;
    setOptions(next);
  };

  const canSubmit =
    title.trim() && options.filter((o) => o.trim()).length >= 2;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          className="gap-1.5"
          data-testid="button-create-poll"
        >
          <Plus className="w-4 h-4" />
          Neue Abstimmung
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base">Neue Abstimmung erstellen</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Title */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Frage / Titel
            </label>
            <Input
              placeholder="z.B. Wie soll unsere Genossenschaft heißen?"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              data-testid="input-poll-title"
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Beschreibung (optional)
            </label>
            <Textarea
              placeholder="Erläuterung, Kontext oder Hintergrundinformationen zur Abstimmung..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              data-testid="input-poll-description"
            />
          </div>

          {/* Options */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Optionen (mind. 2)
            </label>
            <div className="space-y-2">
              {options.map((opt, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full border-2 border-muted-foreground/30 shrink-0" />
                  <Input
                    placeholder={`Option ${idx + 1}`}
                    value={opt}
                    onChange={(e) => updateOption(idx, e.target.value)}
                    className="flex-1"
                    data-testid={`input-option-${idx}`}
                  />
                  {options.length > 2 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                      onClick={() => removeOption(idx)}
                      data-testid={`button-remove-option-${idx}`}
                    >
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
            {options.length < 10 && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground gap-1 mt-1"
                onClick={addOption}
                data-testid="button-add-option"
              >
                <Plus className="w-3 h-3" />
                Option hinzufügen
              </Button>
            )}
          </div>

          {/* Quorum */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Quorum (optional)
            </label>
            <Input
              type="number"
              placeholder="Min. Anzahl Stimmen für Gültigkeit"
              value={quorum}
              onChange={(e) => setQuorum(e.target.value)}
              min={1}
              data-testid="input-poll-quorum"
            />
          </div>

          {/* Submit */}
          <Button
            className="w-full"
            onClick={() => createMutation.mutate()}
            disabled={!canSubmit || createMutation.isPending}
            data-testid="button-submit-poll"
          >
            {createMutation.isPending
              ? "Wird erstellt..."
              : "Abstimmung erstellen"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ── Main Page ── */
export default function Voting() {
  const { data: polls, isLoading } = useQuery<Poll[]>({
    queryKey: ["/api/polls"],
  });
  const { isAdmin } = useAuth();

  const activePolls = polls?.filter((p) => p.status === "Aktiv") ?? [];
  const closedPolls = polls?.filter((p) => p.status === "Beendet") ?? [];

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-xl font-semibold flex items-center gap-2"
            data-testid="text-voting-title"
          >
            <Vote className="w-5 h-5" /> Abstimmungen
          </h1>
          <p className="text-sm text-muted-foreground">
            Umfragen und Entscheidungen der Genossenschaft
          </p>
        </div>
        {isAdmin && <CreatePollDialog />}
      </div>

      {isLoading ? (
        Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-48 w-full rounded-lg" />
        ))
      ) : (
        <>
          {activePolls.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Aktive Abstimmungen
              </h2>
              {activePolls.map((p) => (
                <PollCard key={p.id} poll={p} />
              ))}
            </div>
          )}
          {closedPolls.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Beendete Abstimmungen
              </h2>
              {closedPolls.map((p) => (
                <PollCard key={p.id} poll={p} />
              ))}
            </div>
          )}
          {!activePolls.length && !closedPolls.length && (
            <div className="text-center py-16 text-muted-foreground">
              <BarChart3 className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm">Noch keine Abstimmungen vorhanden</p>
              {isAdmin && (
                <p className="text-xs mt-1">
                  Erstelle die erste Abstimmung mit dem Button oben.
                </p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
