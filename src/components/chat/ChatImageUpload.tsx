import { useRef, useState } from "react";
import { ImagePlus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ChatImageUploadProps {
  onImageUploaded: (url: string) => void;
  disabled?: boolean;
}

const ChatImageUpload = ({ onImageUploaded, disabled }: ChatImageUploadProps) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({ title: "Invalid file", description: "Please select an image file", variant: "destructive" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "File too large", description: "Max 5MB allowed", variant: "destructive" });
      return;
    }

    setUploading(true);
    setProgress(10);

    const ext = file.name.split(".").pop();
    const path = `${crypto.randomUUID()}.${ext}`;

    // Simulate progress since Supabase SDK doesn't expose upload progress
    const progressInterval = setInterval(() => {
      setProgress(prev => Math.min(prev + 15, 85));
    }, 200);

    const { error } = await supabase.storage
      .from("chat-attachments")
      .upload(path, file);

    clearInterval(progressInterval);

    if (error) {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
      setUploading(false);
      setProgress(0);
      return;
    }

    setProgress(100);
    const { data: urlData } = supabase.storage
      .from("chat-attachments")
      .getPublicUrl(path);

    setTimeout(() => {
      onImageUploaded(urlData.publicUrl);
      setUploading(false);
      setProgress(0);
      if (fileRef.current) fileRef.current.value = "";
    }, 300);
  };

  return (
    <div className="relative">
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      <Button
        type="button"
        size="icon"
        variant="ghost"
        onClick={() => fileRef.current?.click()}
        disabled={disabled || uploading}
      >
        {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4" />}
      </Button>
      {uploading && (
        <div className="absolute -bottom-2 left-0 right-0">
          <Progress value={progress} className="h-1" />
        </div>
      )}
    </div>
  );
};

export default ChatImageUpload;
