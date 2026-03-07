const TypingIndicator = ({ name }: { name: string }) => (
  <div className="flex justify-start">
    <div className="bg-muted rounded-2xl px-4 py-2">
      <p className="text-xs text-muted-foreground mb-1">{name}</p>
      <div className="flex gap-1">
        <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: "0ms" }} />
        <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: "150ms" }} />
        <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: "300ms" }} />
      </div>
    </div>
  </div>
);

export default TypingIndicator;
