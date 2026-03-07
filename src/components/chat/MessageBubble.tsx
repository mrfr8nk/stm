import { useState } from "react";
import { Check, CheckCheck, Edit2, Trash2, MoreVertical, X } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

interface MessageBubbleProps {
  msg: any;
  isMine: boolean;
  senderName: string;
  senderAvatar?: string | null;
  isRead: boolean;
  onEdit: (id: string, content: string) => void;
  onDelete: (id: string, forEveryone: boolean) => void;
}

const MessageBubble = ({ msg, isMine, senderName, senderAvatar, isRead, onEdit, onDelete }: MessageBubbleProps) => {
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(msg.content);
  const [deleteDialog, setDeleteDialog] = useState(false);

  if (msg.deleted_at && !isMine) {
    return (
      <div className="flex justify-start">
        <div className="max-w-[70%] rounded-2xl px-4 py-2 bg-muted italic text-muted-foreground text-sm">
          🚫 This message was deleted
        </div>
      </div>
    );
  }

  if (msg.deleted_at && isMine) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[70%] rounded-2xl px-4 py-2 bg-muted italic text-muted-foreground text-sm">
          🚫 You deleted this message
        </div>
      </div>
    );
  }

  const handleSaveEdit = () => {
    if (editText.trim() && editText !== msg.content) {
      onEdit(msg.id, editText.trim());
    }
    setEditing(false);
  };

  return (
    <>
      <div className={`flex ${isMine ? "justify-end" : "justify-start"} group gap-2`}>
        {!isMine && (
          senderAvatar ? (
            <img src={senderAvatar} alt={senderName} className="w-7 h-7 rounded-full object-cover shrink-0 mt-1" />
          ) : (
            <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary shrink-0 mt-1">
              {senderName.charAt(0)}
            </div>
          )
        )}
        <div className={`max-w-[70%] rounded-2xl px-4 py-2 relative ${isMine ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
          {!isMine && <p className="text-xs font-medium mb-1 opacity-70">{senderName}</p>}

          {msg.image_url && (
            <img
              src={msg.image_url}
              alt="Shared image"
              className="rounded-lg max-w-full max-h-64 object-cover mb-2 cursor-pointer"
              onClick={() => window.open(msg.image_url, "_blank")}
            />
          )}

          {editing ? (
            <div className="flex gap-1 items-center">
              <Input
                value={editText}
                onChange={e => setEditText(e.target.value)}
                className="h-7 text-sm bg-background text-foreground"
                onKeyDown={e => e.key === "Enter" && handleSaveEdit()}
                autoFocus
              />
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleSaveEdit}>
                <Check className="w-3 h-3" />
              </Button>
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditing(false)}>
                <X className="w-3 h-3" />
              </Button>
            </div>
          ) : (
            <p className="text-sm">{msg.content}</p>
          )}

          <div className={`flex items-center gap-1 mt-1 ${isMine ? "justify-end" : ""}`}>
            {msg.edited_at && <span className="text-[10px] opacity-50">edited</span>}
            <span className={`text-[10px] ${isMine ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
              {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
            {isMine && (
              isRead
                ? <CheckCheck className="w-3 h-3 text-blue-400" />
                : <Check className="w-3 h-3 opacity-50" />
            )}
          </div>

          {isMine && !editing && (
            <div className="absolute -left-8 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="icon" variant="ghost" className="h-6 w-6">
                    <MoreVertical className="w-3 h-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => { setEditText(msg.content); setEditing(true); }}>
                    <Edit2 className="w-3 h-3 mr-2" /> Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setDeleteDialog(true)} className="text-destructive">
                    <Trash2 className="w-3 h-3 mr-2" /> Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
      </div>

      <Dialog open={deleteDialog} onOpenChange={setDeleteDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete Message</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">How would you like to delete this message?</p>
          <DialogFooter className="flex gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => { onDelete(msg.id, false); setDeleteDialog(false); }}>
              Delete for me
            </Button>
            <Button variant="destructive" onClick={() => { onDelete(msg.id, true); setDeleteDialog(false); }}>
              Delete for everyone
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default MessageBubble;
