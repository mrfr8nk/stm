import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Camera } from "lucide-react";

interface AvatarUploadProps {
  userId: string;
  currentUrl: string | null;
  name: string;
  size?: "sm" | "md" | "lg";
  onUploaded: (url: string) => void;
}

const sizes = { sm: "w-10 h-10 text-sm", md: "w-16 h-16 text-xl", lg: "w-20 h-20 text-3xl" };

const AvatarUpload = ({ userId, currentUrl, name, size = "lg", onUploaded }: AvatarUploadProps) => {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast({ title: "Please select an image", variant: "destructive" }); return; }
    if (file.size > 2 * 1024 * 1024) { toast({ title: "Image must be under 2MB", variant: "destructive" }); return; }

    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${userId}/avatar.${ext}`;

    const { error: uploadErr } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (uploadErr) { toast({ title: "Upload failed", description: uploadErr.message, variant: "destructive" }); setUploading(false); return; }

    const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
    const url = `${publicUrl}?t=${Date.now()}`;

    await supabase.from("profiles").update({ avatar_url: url }).eq("user_id", userId);
    onUploaded(url);
    toast({ title: "Profile picture updated!" });
    setUploading(false);
  };

  return (
    <div className="relative group cursor-pointer" onClick={() => fileRef.current?.click()}>
      {currentUrl ? (
        <img src={currentUrl} alt={name} className={`${sizes[size]} rounded-full object-cover border-2 border-border`} />
      ) : (
        <div className={`${sizes[size]} rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold`}>
          {(name || "U").charAt(0)}
        </div>
      )}
      <div className={`absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity ${uploading ? "opacity-100" : ""}`}>
        {uploading ? (
          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
        ) : (
          <Camera className="w-4 h-4 text-white" />
        )}
      </div>
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
    </div>
  );
};

export default AvatarUpload;
