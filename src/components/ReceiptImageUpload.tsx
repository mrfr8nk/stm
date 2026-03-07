import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Camera, Upload, X, Loader2, Image, ZoomIn } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

interface ReceiptImageUploadProps {
  value?: string | null;
  onChange: (url: string | null) => void;
  folder?: string;
}

const ReceiptImageUpload = ({ value, onChange, folder = "petty-cash" }: ReceiptImageUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const upload = async (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "File too large", description: "Max 5MB allowed", variant: "destructive" });
      return;
    }

    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const { error } = await supabase.storage.from("receipts").upload(path, file);
    if (error) {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage.from("receipts").getPublicUrl(path);
    onChange(urlData.publicUrl);
    setUploading(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) upload(file);
    e.target.value = "";
  };

  const handleCapture = () => {
    // Create a separate input for camera capture
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.capture = "environment";
    input.onchange = (e: any) => {
      const file = e.target.files?.[0];
      if (file) upload(file);
    };
    input.click();
  };

  const remove = () => onChange(null);

  if (value) {
    return (
      <div className="space-y-2">
        <label className="text-xs font-medium text-muted-foreground">Proof of Payment</label>
        <div className="relative group w-full rounded-lg overflow-hidden border border-border bg-muted">
          <img src={value} alt="Receipt" className="w-full h-32 object-cover" />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <Button variant="secondary" size="sm" onClick={() => setPreviewOpen(true)}>
              <ZoomIn className="w-4 h-4" />
            </Button>
            <Button variant="destructive" size="sm" onClick={remove}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
        <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
          <DialogContent className="max-w-2xl p-2">
            <img src={value} alt="Receipt full" className="w-full rounded-lg" />
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <label className="text-xs font-medium text-muted-foreground">Proof of Payment (Photo)</label>
      <div className="flex gap-2">
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="flex-1"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Upload className="w-4 h-4 mr-1" />}
          Upload
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="flex-1"
          onClick={handleCapture}
          disabled={uploading}
        >
          <Camera className="w-4 h-4 mr-1" /> Take Photo
        </Button>
      </div>
    </div>
  );
};

export default ReceiptImageUpload;
