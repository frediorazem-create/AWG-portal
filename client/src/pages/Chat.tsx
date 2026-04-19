import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Hash, Send, MessageCircle } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Channel, Message } from "@shared/schema";

export default function Chat() {
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null);
  const [messageText, setMessageText] = useState("");
  const [mobileShowMessages, setMobileShowMessages] = useState(false);

  const { data: channels, isLoading: loadingChannels } = useQuery<Channel[]>({ queryKey: ["/api/channels"] });

  const activeChannelId = selectedChannel || channels?.[0]?.id || "";
  const activeChannel = channels?.find((c) => c.id === activeChannelId);

  const { data: messages, isLoading: loadingMessages } = useQuery<Message[]>({
    queryKey: ["/api/channels", activeChannelId, "messages"],
    enabled: !!activeChannelId,
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/channels/${activeChannelId}/messages`);
      return res.json();
    },
  });

  const sendMutation = useMutation({
    mutationFn: async (content: string) => {
      await apiRequest("POST", "/api/messages", {
        channelId: activeChannelId,
        memberId: "current",
        memberName: "Fredi Orazem",
        content,
        createdAt: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/channels", activeChannelId, "messages"] });
      setMessageText("");
    },
  });

  const handleSend = () => {
    if (!messageText.trim()) return;
    sendMutation.mutate(messageText.trim());
  };

  return (
    <div className="flex h-full">
      {/* Channel list */}
      <div className={`w-full md:w-60 border-r border-border shrink-0 flex flex-col ${mobileShowMessages ? "hidden md:flex" : "flex"}`}>
        <div className="px-4 py-3 border-b border-border">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <MessageCircle className="w-4 h-4" /> Kanäle
          </h2>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-0.5">
            {loadingChannels ? (
              Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-9 w-full" />)
            ) : (
              channels?.map((ch) => (
                <button
                  key={ch.id}
                  onClick={() => {
                    setSelectedChannel(ch.id);
                    setMobileShowMessages(true);
                  }}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
                    ch.id === activeChannelId
                      ? "bg-accent text-accent-foreground font-medium"
                      : "text-muted-foreground hover:bg-accent/60"
                  }`}
                  data-testid={`channel-${ch.name}`}
                >
                  <Hash className="w-3.5 h-3.5 shrink-0" />
                  <span>{ch.name}</span>
                </button>
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Messages area */}
      <div className={`flex-1 flex flex-col min-w-0 ${!mobileShowMessages ? "hidden md:flex" : "flex"}`}>
        {/* Channel header */}
        <div className="px-4 py-3 border-b border-border flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="md:hidden"
            onClick={() => setMobileShowMessages(false)}
            data-testid="back-to-channels"
          >
            ←
          </Button>
          <Hash className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-semibold">{activeChannel?.name || "Kanal wählen"}</span>
          {activeChannel?.description && (
            <span className="text-xs text-muted-foreground hidden sm:inline ml-2">— {activeChannel.description}</span>
          )}
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {loadingMessages ? (
              Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)
            ) : messages?.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Noch keine Nachrichten in diesem Kanal.</p>
            ) : (
              messages?.map((msg) => (
                <div key={msg.id} className="flex gap-3" data-testid={`message-${msg.id}`}>
                  <Avatar className="w-8 h-8 shrink-0">
                    <AvatarFallback className="text-xs bg-primary/10 text-primary">
                      {msg.memberName
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className="text-sm font-medium">{msg.memberName}</span>
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(msg.createdAt).toLocaleString("de-DE", {
                          day: "2-digit",
                          month: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <p className="text-sm text-foreground/90">{msg.content}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        {/* Input */}
        <div className="p-3 border-t border-border">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex gap-2"
          >
            <Input
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder={`Nachricht an #${activeChannel?.name || ""}...`}
              className="flex-1"
              data-testid="input-message"
            />
            <Button type="submit" size="icon" disabled={!messageText.trim() || sendMutation.isPending} data-testid="button-send">
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
