import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Users, Search, Mail, Phone } from "lucide-react";
import type { Member } from "@shared/schema";

const roleColor: Record<string, string> = {
  "Vorstand": "default",
  "Aufsichtsrat": "default",
  "Gründungsmitglied": "secondary",
  "Mitglied": "secondary",
  "Interessent": "outline",
};

export default function Members() {
  const [search, setSearch] = useState("");
  const { data: members, isLoading } = useQuery<Member[]>({ queryKey: ["/api/members"] });

  const filtered = members?.filter((m) =>
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    m.role.toLowerCase().includes(search.toLowerCase()) ||
    m.email.toLowerCase().includes(search.toLowerCase())
  ) ?? [];

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl">
      <div>
        <h1 className="text-xl font-semibold flex items-center gap-2" data-testid="text-members-title">
          <Users className="w-5 h-5" /> Mitglieder
        </h1>
        <p className="text-sm text-muted-foreground">
          {members?.length ?? 0} Mitglieder und Interessenten
        </p>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Mitglieder suchen..."
          className="pl-9"
          data-testid="input-search-members"
        />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-32 w-full" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((member) => (
            <Card key={member.id} data-testid={`member-card-${member.id}`}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Avatar className="w-10 h-10">
                    <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                      {member.avatar || member.name.split(" ").map((n) => n[0]).join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">{member.name}</span>
                    </div>
                    <Badge variant={roleColor[member.role] as any} className="text-[10px]">{member.role}</Badge>
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
                    </div>
                    {member.joinedAt && (
                      <p className="text-[10px] text-muted-foreground">
                        Mitglied seit {new Date(member.joinedAt).toLocaleDateString("de-DE", { month: "long", year: "numeric" })}
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
    </div>
  );
}
