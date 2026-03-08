import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RefreshCw, Settings2, Save, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface FeeStructure {
  [level: string]: { tuition: number; levy: number };
}

interface Props {
  feeStructure: FeeStructure;
  zigRate: number;
  onFeeStructureChange: (fs: FeeStructure) => void;
  onZigRateChange: (rate: number) => void;
}

const FeeStructureCard = ({ feeStructure, zigRate, onFeeStructureChange, onZigRateChange }: Props) => {
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<FeeStructure>(feeStructure);
  const [draftRate, setDraftRate] = useState(zigRate);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    const userId = (await supabase.auth.getUser()).data.user?.id;

    // Save both rate and fee structure to system_settings
    const saves = [
      supabase.from("system_settings").upsert({
        key: "zig_rate",
        value: String(draftRate),
        updated_by: userId,
        updated_at: new Date().toISOString(),
      } as any, { onConflict: "key" }),
      supabase.from("system_settings").upsert({
        key: "fee_structure",
        value: JSON.stringify(draft),
        updated_by: userId,
        updated_at: new Date().toISOString(),
      } as any, { onConflict: "key" }),
    ];

    const results = await Promise.all(saves);
    const hasError = results.some((r) => r.error);

    if (hasError) {
      toast({ title: "Error saving settings", variant: "destructive" });
    } else {
      onFeeStructureChange(draft);
      onZigRateChange(draftRate);
      toast({ title: "Settings Saved", description: `ZIG rate: ${draftRate}, fee structure updated.` });
    }
    setSaving(false);
    setEditing(false);
  };

  const levelLabels: Record<string, string> = {
    zjc: "ZJC",
    o_level: "O Level",
    a_level: "A Level",
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-sm">Fee Structure (per term)</CardTitle>
        <Button variant="ghost" size="sm" disabled={saving} onClick={() => {
          if (editing) handleSave();
          else { setDraft({ ...feeStructure }); setDraftRate(zigRate); setEditing(true); }
        }}>
          {saving ? "Saving..." : editing ? <><Save className="w-4 h-4 mr-1" /> Save</> : <><Settings2 className="w-4 h-4 mr-1" /> Edit</>}
        </Button>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Object.entries(editing ? draft : feeStructure).map(([level, fees]) => {
            const total = fees.tuition + fees.levy;
            return (
              <div key={level} className="p-3 rounded-lg bg-muted space-y-2">
                <span className="font-semibold text-foreground">{levelLabels[level] || level}</span>
                {editing ? (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="w-16 text-muted-foreground">Tuition:</span>
                      <Input type="number" className="h-8 w-24" value={draft[level].tuition}
                        onChange={e => setDraft({ ...draft, [level]: { ...draft[level], tuition: Number(e.target.value) } })} />
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="w-16 text-muted-foreground">Levy:</span>
                      <Input type="number" className="h-8 w-24" value={draft[level].levy}
                        onChange={e => setDraft({ ...draft, [level]: { ...draft[level], levy: Number(e.target.value) } })} />
                    </div>
                    <p className="text-xs text-muted-foreground">Total: ${draft[level].tuition + draft[level].levy}</p>
                  </div>
                ) : (
                  <div className="text-right space-y-0.5">
                    <p className="text-xs text-muted-foreground">Tuition: ${fees.tuition} | Levy: ${fees.levy}</p>
                    <p className="font-bold text-foreground">${total} USD</p>
                    <p className="text-xs text-muted-foreground">ZIG {(total * zigRate).toLocaleString()}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div className="flex items-center gap-3 mt-4 p-3 rounded-lg bg-muted/50">
          <RefreshCw className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Exchange Rate: 1 USD =</span>
          {editing ? (
            <Input type="number" value={draftRate} onChange={e => setDraftRate(Number(e.target.value) || 1)} className="w-24" />
          ) : (
            <span className="font-bold text-foreground">{zigRate}</span>
          )}
          <span className="text-sm text-muted-foreground">ZIG</span>
          {!editing && (
            <span className="text-xs text-muted-foreground ml-auto flex items-center gap-1">
              <Check className="w-3 h-3 text-green-600" /> Saved
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default FeeStructureCard;
