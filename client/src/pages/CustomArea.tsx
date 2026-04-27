import { useQuery } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Bookmark, ExternalLink, Settings2 } from "lucide-react";
import type { SidebarItem } from "@shared/schema";

// Sehr einfacher Markdown-Renderer (Headings, Listen, Links, Absätze)
function renderMarkdown(md: string): string {
  let html = md
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  html = html.replace(/^###\s+(.*)$/gm, '<h3 class="text-base font-semibold mt-4 mb-1">$1</h3>');
  html = html.replace(/^##\s+(.*)$/gm, '<h2 class="text-lg font-semibold mt-5 mb-2">$1</h2>');
  html = html.replace(/^#\s+(.*)$/gm, '<h1 class="text-xl font-semibold mt-6 mb-3">$1</h1>');
  html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener" class="text-primary underline">$1</a>');
  // Listen
  html = html.replace(/(^|\n)(- .*(?:\n- .*)*)/g, (_m, p, block) => {
    const items = block.split("\n").map((l: string) => l.replace(/^- /, "").trim()).filter(Boolean);
    return p + '<ul class="list-disc pl-5 my-2 space-y-1">' + items.map((i: string) => `<li>${i}</li>`).join("") + "</ul>";
  });
  // Absätze (Doppelzeilen)
  html = html
    .split(/\n{2,}/)
    .map((block) => (/^<(h\d|ul|ol|p)/.test(block.trim()) ? block : `<p class="my-2 leading-relaxed">${block.replace(/\n/g, "<br/>")}</p>`))
    .join("\n");
  return html;
}

export default function CustomArea() {
  const [, params] = useRoute("/bereich/:id");
  const id = params?.id;
  const { data: item, isLoading } = useQuery<SidebarItem>({
    queryKey: ["/api/sidebar-items", id],
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="p-4 md:p-6 space-y-4 max-w-3xl">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!item) {
    return (
      <div className="p-4 md:p-6 space-y-4 max-w-3xl">
        <p className="text-sm text-muted-foreground">Bereich nicht gefunden.</p>
        <Link href="/sidebar-verwalten">
          <Button size="sm" variant="outline">Bereiche verwalten</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-3xl">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2" data-testid="text-area-title">
            <Bookmark className="w-5 h-5" /> {item.label}
          </h1>
          {item.description && (
            <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
          )}
        </div>
        <Link href="/sidebar-verwalten">
          <Button size="sm" variant="outline" data-testid="button-edit-area">
            <Settings2 className="w-4 h-4 mr-1" /> Bearbeiten
          </Button>
        </Link>
      </div>

      {item.url && (
        <Card>
          <CardContent className="p-4">
            <a
              href={item.url}
              target="_blank"
              rel="noopener"
              className="inline-flex items-center gap-2 text-sm text-primary underline"
              data-testid="link-area-url"
            >
              <ExternalLink className="w-4 h-4" /> {item.url}
            </a>
          </CardContent>
        </Card>
      )}

      {item.content ? (
        <Card>
          <CardContent className="p-4 prose prose-sm max-w-none dark:prose-invert">
            <div dangerouslySetInnerHTML={{ __html: renderMarkdown(item.content) }} />
          </CardContent>
        </Card>
      ) : !item.url ? (
        <p className="text-sm text-muted-foreground">Kein Inhalt hinterlegt. Über „Bereiche verwalten" Inhalt oder Link ergänzen.</p>
      ) : null}
    </div>
  );
}
