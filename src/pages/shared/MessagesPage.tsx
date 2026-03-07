import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { MessageSquare, Send, Plus, Search, Users } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

const MessagesPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedConv, setSelectedConv] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [profiles, setProfiles] = useState<any[]>([]);
  const [participants, setParticipants] = useState<any[]>([]);
  const [newDialogOpen, setNewDialogOpen] = useState(false);
  const [searchUser, setSearchUser] = useState("");
  const [selectedRecipient, setSelectedRecipient] = useState<any>(null);
  const [convTitle, setConvTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    fetchConversations();
    supabase.from("profiles").select("*").then(({ data }) => setProfiles(data || []));
  }, [user]);

  const fetchConversations = async () => {
    if (!user) return;
    setLoading(true);
    // Get user's participations
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

      // Get all participants for these conversations
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
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  };

  // Realtime subscription
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
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [selectedConv]);

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConv || !user) return;
    const { error } = await supabase.from("messages").insert({
      conversation_id: selectedConv.id,
      sender_id: user.id,
      content: newMessage.trim(),
    });
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else {
      setNewMessage("");
      await supabase.from("conversations").update({ updated_at: new Date().toISOString() }).eq("id", selectedConv.id);
    }
  };

  const createConversation = async () => {
    if (!selectedRecipient || !user) return;
    // Check if direct conversation already exists
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

    const { data: conv, error } = await supabase.from("conversations").insert({
      title: convTitle || null,
      type: "direct",
    }).select().single();

    if (error || !conv) {
      toast({ title: "Error", description: error?.message, variant: "destructive" });
      return;
    }

    await supabase.from("conversation_participants").insert([
      { conversation_id: conv.id, user_id: user.id },
      { conversation_id: conv.id, user_id: selectedRecipient.user_id },
    ]);

    setNewDialogOpen(false);
    setSelectedRecipient(null);
    setConvTitle("");
    setSearchUser("");
    await fetchConversations();
    setSelectedConv(conv);
  };

  const getName = (uid: string) => profiles.find(p => p.user_id === uid)?.full_name || "User";
  const getAvatar = (uid: string) => {
    const p = profiles.find(p => p.user_id === uid);
    return p?.avatar_url;
  };

  const getConvName = (conv: any) => {
    if (conv.title) return conv.title;
    const parts = participants.filter(p => p.conversation_id === conv.id && p.user_id !== user?.id);
    return parts.map(p => getName(p.user_id)).join(", ") || "Conversation";
  };

  const filteredUsers = profiles.filter(p =>
    p.user_id !== user?.id &&
    p.full_name.toLowerCase().includes(searchUser.toLowerCase())
  );

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
            conversations.map(conv => (
              <button
                key={conv.id}
                onClick={() => setSelectedConv(conv)}
                className={`w-full text-left px-3 py-3 border-b border-border/50 hover:bg-muted/50 transition-colors ${selectedConv?.id === conv.id ? "bg-primary/10" : ""}`}
              >
                <p className="font-medium text-sm truncate">{getConvName(conv)}</p>
                <p className="text-xs text-muted-foreground">{new Date(conv.updated_at).toLocaleDateString()}</p>
              </button>
            ))
          )}
        </ScrollArea>
      </Card>

      {/* Messages Area */}
      <Card className="flex-1 flex flex-col">
        {selectedConv ? (
          <>
            <CardHeader className="p-3 border-b border-border">
              <CardTitle className="text-base">{getConvName(selectedConv)}</CardTitle>
            </CardHeader>
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-3">
                {messages.map(msg => {
                  const isMine = msg.sender_id === user?.id;
                  return (
                    <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[70%] rounded-2xl px-4 py-2 ${isMine ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                        {!isMine && <p className="text-xs font-medium mb-1 opacity-70">{getName(msg.sender_id)}</p>}
                        <p className="text-sm">{msg.content}</p>
                        <p className={`text-[10px] mt-1 ${isMine ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>
            </ScrollArea>
            <div className="p-3 border-t border-border flex gap-2">
              <Input
                placeholder="Type a message..."
                value={newMessage}
                onChange={e => setNewMessage(e.target.value)}
                onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendMessage()}
                className="flex-1"
              />
              <Button onClick={sendMessage} disabled={!newMessage.trim()}><Send className="w-4 h-4" /></Button>
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
                  {p.avatar_url ? (
                    <img src={p.avatar_url} className="w-8 h-8 rounded-full object-cover" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-bold">{p.full_name.charAt(0)}</div>
                  )}
                  <span className="text-sm font-medium">{p.full_name}</span>
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
