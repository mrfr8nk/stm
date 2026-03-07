import { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { MessageSquare, Send, Plus, Search } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import MessageBubble from "@/components/chat/MessageBubble";
import ChatImageUpload from "@/components/chat/ChatImageUpload";
import TypingIndicator from "@/components/chat/TypingIndicator";
import { usePresence } from "@/hooks/usePresence";

const MessagesPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  usePresence();

  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedConv, setSelectedConv] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [participants, setParticipants] = useState<any[]>([]);
  const [newDialogOpen, setNewDialogOpen] = useState(false);
  const [searchUser, setSearchUser] = useState("");
  const [selectedRecipient, setSelectedRecipient] = useState<any>(null);
  const [convTitle, setConvTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [readStatus, setReadStatus] = useState<Record<string, boolean>>({});
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const bottomRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (!user) return;
    fetchConversations();
    supabase.from("profiles").select("*").then(({ data }) => setProfiles(data || []));
    fetchOnlineUsers();

    // Subscribe to presence changes
    const presenceChannel = supabase
      .channel("presence-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "user_presence" }, () => {
        fetchOnlineUsers();
      })
      .subscribe();

    return () => { supabase.removeChannel(presenceChannel); };
  }, [user]);

  const fetchOnlineUsers = async () => {
    const { data } = await supabase.from("user_presence" as any).select("user_id, is_online").eq("is_online", true);
    if (data) setOnlineUsers(new Set((data as any[]).map((d: any) => d.user_id)));
  };

  const fetchConversations = async () => {
    if (!user) return;
    setLoading(true);
    const { data: myParts } = await supabase
      .from("conversation_participants")
      .select("conversation_id")
      .eq("user_id", user.id);

    if (myParts && myParts.length > 0) {
      const convIds = myParts.map(p => p.conversation_id);
      const { data: convs } = await supabase
        .from("conversations")
        .select("*")
        .in("id", convIds)
        .order("updated_at", { ascending: false });

      const { data: allParts } = await supabase
        .from("conversation_participants")
        .select("*")
        .in("conversation_id", convIds);

      setConversations(convs || []);
      setParticipants(allParts || []);
    } else {
      setConversations([]);
      setParticipants([]);
    }
    setLoading(false);
  };

  const fetchMessages = async (convId: string) => {
    const { data } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", convId)
      .order("created_at", { ascending: true });
    setMessages(data || []);

    // Mark messages as read
    if (data && user) {
      const unreadIds = data
        .filter(m => m.sender_id !== user.id)
        .map(m => m.id);
      if (unreadIds.length > 0) {
        const reads = unreadIds.map(mid => ({ message_id: mid, user_id: user.id }));
        await supabase.from("message_reads" as any).upsert(reads as any, { onConflict: "message_id,user_id" });
      }
    }

    // Fetch read status for my messages
    if (data && user) {
      const myMsgIds = data.filter(m => m.sender_id === user.id).map(m => m.id);
      if (myMsgIds.length > 0) {
        const { data: reads } = await supabase
          .from("message_reads" as any)
          .select("message_id")
          .in("message_id", myMsgIds);
        const readMap: Record<string, boolean> = {};
        (reads as any[] || []).forEach((r: any) => { readMap[r.message_id] = true; });
        setReadStatus(readMap);
      }
    }

    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  };

  // Realtime for messages
  useEffect(() => {
    if (!selectedConv) return;
    fetchMessages(selectedConv.id);

    const channel = supabase
      .channel(`messages-${selectedConv.id}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `conversation_id=eq.${selectedConv.id}`,
      }, (payload) => {
        setMessages(prev => [...prev, payload.new]);
        // Auto-mark as read
        if (user && payload.new.sender_id !== user.id) {
          supabase.from("message_reads" as any).upsert(
            { message_id: payload.new.id, user_id: user.id } as any,
            { onConflict: "message_id,user_id" }
          );
        }
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
      })
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "messages",
        filter: `conversation_id=eq.${selectedConv.id}`,
      }, (payload) => {
        setMessages(prev => prev.map(m => m.id === payload.new.id ? payload.new : m));
      })
      .subscribe();

    // Realtime for read receipts
    const readChannel = supabase
      .channel(`reads-${selectedConv.id}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "message_reads",
      }, (payload: any) => {
        setReadStatus(prev => ({ ...prev, [payload.new.message_id]: true }));
      })
      .subscribe();

    // Typing indicator channel (broadcast)
    const typingChannel = supabase
      .channel(`typing-${selectedConv.id}`)
      .on("broadcast", { event: "typing" }, ({ payload }: any) => {
        if (payload.user_id !== user?.id) {
          setTypingUsers(prev => new Set([...prev, payload.user_id]));
          setTimeout(() => {
            setTypingUsers(prev => {
              const next = new Set(prev);
              next.delete(payload.user_id);
              return next;
            });
          }, 3000);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(readChannel);
      supabase.removeChannel(typingChannel);
    };
  }, [selectedConv]);

  const broadcastTyping = useCallback(() => {
    if (!selectedConv || !user) return;
    clearTimeout(typingTimeoutRef.current);
    supabase.channel(`typing-${selectedConv.id}`).send({
      type: "broadcast",
      event: "typing",
      payload: { user_id: user.id },
    });
  }, [selectedConv, user]);

  const sendMessage = async () => {
    if ((!newMessage.trim() && !pendingImage) || !selectedConv || !user) return;
    const payload: any = {
      conversation_id: selectedConv.id,
      sender_id: user.id,
      content: newMessage.trim() || (pendingImage ? "📷 Image" : ""),
    };
    if (pendingImage) payload.image_url = pendingImage;

    const { error } = await supabase.from("messages").insert(payload);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else {
      setNewMessage("");
      setPendingImage(null);
      await supabase.from("conversations").update({ updated_at: new Date().toISOString() }).eq("id", selectedConv.id);
    }
  };

  const editMessage = async (msgId: string, content: string) => {
    await supabase.from("messages").update({ content, edited_at: new Date().toISOString() }).eq("id", msgId);
  };

  const deleteMessage = async (msgId: string, forEveryone: boolean) => {
    if (forEveryone) {
      await supabase.from("messages").update({ deleted_at: new Date().toISOString(), content: "" }).eq("id", msgId);
    } else {
      // For "delete for me" we just remove from local state
      setMessages(prev => prev.filter(m => m.id !== msgId));
    }
  };

  const createConversation = async () => {
    if (!selectedRecipient || !user) return;
    const existingConv = conversations.find(c => {
      const parts = participants.filter(p => p.conversation_id === c.id);
      return c.type === "direct" && parts.length === 2 &&
        parts.some(p => p.user_id === selectedRecipient.user_id);
    });
    if (existingConv) {
      setSelectedConv(existingConv);
      setNewDialogOpen(false);
      return;
    }

    const { data: conversationId, error } = await supabase.rpc("create_direct_conversation", {
      _recipient_id: selectedRecipient.user_id,
      _title: convTitle || null,
    });

    if (error || !conversationId) {
      toast({ title: "Error", description: error?.message || "Failed to create conversation", variant: "destructive" });
      return;
    }

    setNewDialogOpen(false);
    setSelectedRecipient(null);
    setConvTitle("");
    setSearchUser("");
    await fetchConversations();
    setSelectedConv({ id: conversationId, title: convTitle || null, type: "direct", created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
  };

  const getName = (uid: string) => profiles.find(p => p.user_id === uid)?.full_name || "User";

  const getConvName = (conv: any) => {
    if (conv.title) return conv.title;
    const parts = participants.filter(p => p.conversation_id === conv.id && p.user_id !== user?.id);
    return parts.map(p => getName(p.user_id)).join(", ") || "Conversation";
  };

  const getOtherUserId = (conv: any) => {
    const parts = participants.filter(p => p.conversation_id === conv.id && p.user_id !== user?.id);
    return parts[0]?.user_id;
  };

  const filteredUsers = profiles.filter(p =>
    p.user_id !== user?.id &&
    p.full_name.toLowerCase().includes(searchUser.toLowerCase())
  );

  const typingNames = Array.from(typingUsers).map(uid => getName(uid));

  return (
    <div className="flex gap-4 h-[calc(100vh-10rem)]">
      {/* Conversation List */}
      <Card className="w-80 shrink-0 flex flex-col">
        <CardHeader className="p-3 border-b border-border">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2"><MessageSquare className="w-4 h-4" /> Chats</CardTitle>
            <Button size="sm" variant="ghost" onClick={() => setNewDialogOpen(true)}><Plus className="w-4 h-4" /></Button>
          </div>
        </CardHeader>
        <ScrollArea className="flex-1">
          {loading ? (
            <div className="p-4 text-center text-muted-foreground text-sm">Loading...</div>
          ) : conversations.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground text-sm">No conversations yet. Start one!</div>
          ) : (
            conversations.map(conv => {
              const otherId = getOtherUserId(conv);
              const isOnline = otherId ? onlineUsers.has(otherId) : false;
              return (
                <button
                  key={conv.id}
                  onClick={() => setSelectedConv(conv)}
                  className={`w-full text-left px-3 py-3 border-b border-border/50 hover:bg-muted/50 transition-colors ${selectedConv?.id === conv.id ? "bg-primary/10" : ""}`}
                >
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                        {getConvName(conv).charAt(0)}
                      </div>
                      {isOnline && (
                        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-500 border-2 border-background" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{getConvName(conv)}</p>
                      <p className="text-xs text-muted-foreground">
                        {isOnline ? "Online" : new Date(conv.updated_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </ScrollArea>
      </Card>

      {/* Messages Area */}
      <Card className="flex-1 flex flex-col">
        {selectedConv ? (
          <>
            <CardHeader className="p-3 border-b border-border">
              <div className="flex items-center gap-2">
                <div className="relative">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                    {getConvName(selectedConv).charAt(0)}
                  </div>
                  {getOtherUserId(selectedConv) && onlineUsers.has(getOtherUserId(selectedConv)) && (
                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-500 border-2 border-background" />
                  )}
                </div>
                <div>
                  <CardTitle className="text-base">{getConvName(selectedConv)}</CardTitle>
                  <p className="text-xs text-muted-foreground">
                    {getOtherUserId(selectedConv) && onlineUsers.has(getOtherUserId(selectedConv)) ? "Online" : "Offline"}
                  </p>
                </div>
              </div>
            </CardHeader>
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-3">
                {messages.map(msg => (
                  <MessageBubble
                    key={msg.id}
                    msg={msg}
                    isMine={msg.sender_id === user?.id}
                    senderName={getName(msg.sender_id)}
                    isRead={!!readStatus[msg.id]}
                    onEdit={editMessage}
                    onDelete={deleteMessage}
                  />
                ))}
                {typingNames.length > 0 && <TypingIndicator name={typingNames.join(", ")} />}
                <div ref={bottomRef} />
              </div>
            </ScrollArea>
            <div className="border-t border-border p-3">
              {pendingImage && (
                <div className="mb-2 relative inline-block">
                  <img src={pendingImage} className="h-20 rounded-lg object-cover" />
                  <button
                    onClick={() => setPendingImage(null)}
                    className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs"
                  >×</button>
                </div>
              )}
              <div className="flex gap-2">
                <ChatImageUpload onImageUploaded={setPendingImage} />
                <Input
                  placeholder="Type a message..."
                  value={newMessage}
                  onChange={e => { setNewMessage(e.target.value); broadcastTyping(); }}
                  onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendMessage()}
                  className="flex-1"
                />
                <Button onClick={sendMessage} disabled={!newMessage.trim() && !pendingImage}><Send className="w-4 h-4" /></Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Select a conversation or start a new one</p>
            </div>
          </div>
        )}
      </Card>

      {/* New Conversation Dialog */}
      <Dialog open={newDialogOpen} onOpenChange={setNewDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Conversation</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search users..." value={searchUser} onChange={e => setSearchUser(e.target.value)} className="pl-9" />
            </div>
            <ScrollArea className="h-48">
              {filteredUsers.map(p => (
                <button
                  key={p.user_id}
                  onClick={() => setSelectedRecipient(p)}
                  className={`w-full text-left px-3 py-2 rounded-lg hover:bg-muted transition-colors flex items-center gap-3 ${selectedRecipient?.user_id === p.user_id ? "bg-primary/10 ring-1 ring-primary" : ""}`}
                >
                  <div className="relative">
                    {p.avatar_url ? (
                      <img src={p.avatar_url} className="w-8 h-8 rounded-full object-cover" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-bold">{p.full_name.charAt(0)}</div>
                    )}
                    {onlineUsers.has(p.user_id) && (
                      <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-green-500 border-2 border-background" />
                    )}
                  </div>
                  <div>
                    <span className="text-sm font-medium">{p.full_name}</span>
                    <span className="text-xs text-muted-foreground ml-2">{onlineUsers.has(p.user_id) ? "Online" : ""}</span>
                  </div>
                </button>
              ))}
            </ScrollArea>
            {selectedRecipient && (
              <Button className="w-full" onClick={createConversation}>
                <MessageSquare className="w-4 h-4 mr-2" /> Start Chat with {selectedRecipient.full_name}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MessagesPage;
