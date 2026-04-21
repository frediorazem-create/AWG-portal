import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageCircle, ExternalLink, Shield, Smartphone, Info } from "lucide-react";

const SIGNAL_GROUP_URL = "https://signal.group/";

export default function Chat() {
  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-xl font-semibold flex items-center gap-2">
          <MessageCircle className="w-5 h-5" />
          Chat & Austausch
        </h1>
        <p className="text-sm text-muted-foreground">
          Für die laufende Kommunikation der Genossenschaft nutzen wir Signal — sicher, werbefrei und datenschutzkonform.
        </p>
      </div>

      <Card className="p-6 space-y-5">
        <div className="flex items-start gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 text-primary shrink-0">
            <Shield className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h2 className="text-base font-semibold">Signal-Gruppe „AWG — Allengerechtes Wohnen“</h2>
            <p className="text-sm text-muted-foreground">
              Ende-zu-Ende verschlüsselt. Keine Telefonnummer für andere Mitglieder sichtbar, wenn ein Benutzername gesetzt ist.
            </p>
          </div>
        </div>

        <div className="border-t border-border pt-5 space-y-3">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Smartphone className="w-4 h-4" />
            So trittst du bei
          </h3>
          <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
            <li>
              Installiere Signal auf deinem Smartphone: {" "}
              <a
                href="https://signal.org/download/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
                data-testid="link-signal-download"
              >
                signal.org/download
              </a>
            </li>
            <li>Richte Signal mit deiner Telefonnummer ein.</li>
            <li>Klicke unten auf „Der Gruppe beitreten“ — Signal öffnet sich automatisch.</li>
            <li>Bestätige den Beitritt in der Signal-App.</li>
          </ol>
        </div>

        <div className="border-t border-border pt-5">
          <Button
            asChild
            className="w-full sm:w-auto"
            data-testid="button-join-signal"
          >
            <a href={SIGNAL_GROUP_URL} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="w-4 h-4 mr-2" />
              Der Signal-Gruppe beitreten
            </a>
          </Button>
          <p className="text-xs text-muted-foreground mt-3">
            Hinweis: Der Einladungs-Link wird vom Vorstand gepflegt. Falls der Link nicht funktioniert, wende dich an Fredi Orazem.
          </p>
        </div>
      </Card>

      <Card className="p-5 bg-muted/40 border-dashed">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
          <div className="space-y-2 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">Warum Signal und nicht WhatsApp?</p>
            <ul className="space-y-1 list-disc list-inside">
              <li>Keine Weitergabe von Metadaten an Dritte.</li>
              <li>Gehört einer gemeinnützigen Stiftung, nicht einem Konzern.</li>
              <li>Open-Source und extern geprüft.</li>
              <li>Für offizielle Ankündigungen nutzen wir weiterhin den E-Mail-Verteiler im Portal.</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
}
