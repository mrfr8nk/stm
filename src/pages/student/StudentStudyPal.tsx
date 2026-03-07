import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Brain, Send, Trash2, Sparkles, BookOpen, Calculator, FlaskConical, Globe, ImagePlus, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import ReactMarkdown from "react-markdown";
import { supabase } from "@/integrations/supabase/client";

type MsgContent = string | Array<{ type: string; text?: string; image_url?: { url: string } }>;
type Msg = { role: "user" | "assistant"; content: MsgContent; displayContent?: string; imageUrl?: string };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/study-pal`;

const quickPrompts = [
  { label: "Explain a topic", icon: BookOpen, prompt: "Can you explain the concept of photosynthesis in detail?" },
  { label: "Solve math", icon: Calculator, prompt: "Help me solve this quadratic equation: 2x² + 5x - 3 = 0" },
  { label: "Science help", icon: FlaskConical, prompt: "What is the difference between exothermic and endothermic reactions?" },
  { label: "History/Geography", icon: Globe, prompt: "Summarize the main causes of World War 1" },
];

const StudentStudyPal = () => {
  const { toast } = useToast();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({ title: "Invalid file", description: "Please select an image", variant: "destructive" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "File too large", description: "Max 5MB", variant: "destructive" });
      return;
    }

    setUploadingImage(true);
    const ext = file.name.split(".").pop();
    const path = `study-pal/${crypto.randomUUID()}.${ext}`;

    const { error } = await supabase.storage.from("chat-attachments").upload(path, file);
    if (error) {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
      setUploadingImage(false);
      return;
    }

    const { data: urlData } = supabase.storage.from("chat-attachments").getPublicUrl(path);
    setPendingImage(urlData.publicUrl);
    setUploadingImage(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const streamChat = async (allMessages: Msg[]) => {
    // Convert messages to API format
    const apiMessages = allMessages.map(m => ({
      role: m.role,
      content: m.content,
    }));

    const resp = await fetch(CHAT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({ messages: apiMessages }),
    });

    if (!resp.ok) {
      const errData = await resp.json().catch(() => ({}));
      throw new Error(errData.error || `Error ${resp.status}`);
    }
    if (!resp.body) throw new Error("No response body");

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let textBuffer = "";
    let assistantSoFar = "";

    const updateAssistant = (chunk: string) => {
      assistantSoFar += chunk;
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant") {
          return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantSoFar, displayContent: assistantSoFar } : m));
        }
        return [...prev, { role: "assistant", content: assistantSoFar, displayContent: assistantSoFar }];
      });
    };

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      textBuffer += decoder.decode(value, { stream: true });

      let newlineIndex: number;
      while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
        let line = textBuffer.slice(0, newlineIndex);
        textBuffer = textBuffer.slice(newlineIndex + 1);
        if (line.endsWith("\r")) line = line.slice(0, -1);
        if (line.startsWith(":") || line.trim() === "") continue;
        if (!line.startsWith("data: ")) continue;
        const jsonStr = line.slice(6).trim();
        if (jsonStr === "[DONE]") break;
        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) updateAssistant(content);
        } catch {
          textBuffer = line + "\n" + textBuffer;
          break;
        }
      }
    }
  };

  const send = async (text: string) => {
    if ((!text.trim() && !pendingImage) || isLoading) return;

    let userContent: MsgContent;
    let displayText = text.trim();
    const imageUrl = pendingImage;

    if (pendingImage) {
      userContent = [
        { type: "text", text: text.trim() || "Please analyze this image and help me solve/understand it." },
        { type: "image_url", image_url: { url: pendingImage } },
      ];
      if (!displayText) displayText = "📷 Analyze this image";
    } else {
      userContent = text.trim();
    }

    const userMsg: Msg = { role: "user", content: userContent, displayContent: displayText, imageUrl: imageUrl || undefined };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput("");
    setPendingImage(null);
    setIsLoading(true);

    try {
      await streamChat(updatedMessages);
    } catch (e: any) {
      toast({ title: "AI Error", description: e.message || "Failed to get response", variant: "destructive" });
      setMessages(prev => prev.slice(0, -1));
    }
    setIsLoading(false);
  };

  const getDisplayContent = (msg: Msg): string => {
    if (msg.displayContent) return msg.displayContent;
    if (typeof msg.content === "string") return msg.content;
    const textPart = msg.content.find((p: any) => p.type === "text");
    return textPart?.text || "";
  };

  return (
    <DashboardLayout role="student">
      <div className="space-y-4 flex flex-col h-[calc(100vh-8rem)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Brain className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="font-display text-xl font-bold text-foreground">Study Pal AI</h1>
              <p className="text-xs text-muted-foreground">Your personal AI tutor — ask anything or upload images of problems</p>
            </div>
          </div>
          {messages.length > 0 && (
            <Button variant="outline" size="sm" onClick={() => setMessages([])}>
              <Trash2 className="w-4 h-4 mr-1" /> Clear
            </Button>
          )}
        </div>

        <Card className="flex-1 flex flex-col overflow-hidden">
          <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-10">
                <Sparkles className="w-12 h-12 text-primary/30 mb-4" />
                <h2 className="font-display text-lg font-bold text-foreground mb-2">Hi! I'm Study Pal 👋</h2>
                <p className="text-sm text-muted-foreground mb-2 max-w-md">
                  I can help you with homework, explain concepts, solve problems, and prepare for exams.
                </p>
                <p className="text-sm text-primary font-medium mb-6 max-w-md">
                  📷 NEW: Upload photos of your homework or textbook problems and I'll solve them!
                </p>
                <div className="grid grid-cols-2 gap-3 w-full max-w-md">
                  {quickPrompts.map((qp) => (
                    <button key={qp.label} onClick={() => send(qp.prompt)}
                      className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors text-left border border-transparent hover:border-border">
                      <qp.icon className="w-4 h-4 text-primary shrink-0" />
                      <span className="text-sm font-medium">{qp.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[80%] rounded-lg px-4 py-3 ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  }`}>
                    {msg.imageUrl && (
                      <img
                        src={msg.imageUrl}
                        alt="Uploaded"
                        className="rounded-lg max-w-full max-h-48 object-cover mb-2"
                      />
                    )}
                    {msg.role === "assistant" ? (
                      <div className="prose prose-sm max-w-none dark:prose-invert">
                        <ReactMarkdown>{getDisplayContent(msg)}</ReactMarkdown>
                      </div>
                    ) : (
                      <p className="text-sm whitespace-pre-wrap">{getDisplayContent(msg)}</p>
                    )}
                  </div>
                </div>
              ))
            )}
            {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-lg px-4 py-3">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: "0ms" }} />
                    <div className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: "150ms" }} />
                    <div className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </CardContent>

          <div className="border-t border-border p-4">
            {pendingImage && (
              <div className="mb-2 relative inline-block">
                <img src={pendingImage} className="h-20 rounded-lg object-cover" />
                <button
                  onClick={() => setPendingImage(null)}
                  className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
            <form onSubmit={e => { e.preventDefault(); send(input); }} className="flex gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageUpload}
              />
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading || uploadingImage}
              >
                <ImagePlus className="w-4 h-4" />
              </Button>
              <Input
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder={pendingImage ? "Describe what you need help with..." : "Ask Study Pal anything..."}
                disabled={isLoading}
                className="flex-1"
              />
              <Button type="submit" disabled={isLoading || (!input.trim() && !pendingImage)}>
                <Send className="w-4 h-4" />
              </Button>
            </form>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default StudentStudyPal;
