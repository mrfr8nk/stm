import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Settings, Save } from "lucide-react";

const AdminSettings = () => {
  const { toast } = useToast();
  const [scales, setScales] = useState<any[]>([]);

  useEffect(() => {
    supabase.from("grading_scales").select("*").order("level").order("min_mark", { ascending: false })
      .then(({ data }) => setScales(data || []));
  }, []);

  return (
    <DashboardLayout role="admin">
      <div className="space-y-6">
        <h1 className="font-display text-2xl font-bold text-foreground">System Settings</h1>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Settings className="w-5 h-5" /> Grading Scales</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow><TableHead>Level</TableHead><TableHead>Grade</TableHead><TableHead>Min Mark</TableHead><TableHead>Max Mark</TableHead><TableHead>Description</TableHead></TableRow>
              </TableHeader>
              <TableBody>
                {scales.map(s => (
                  <TableRow key={s.id}>
                    <TableCell>{s.level.replace("_", " ").toUpperCase()}</TableCell>
                    <TableCell className="font-bold">{s.grade_letter}</TableCell>
                    <TableCell>{s.min_mark}</TableCell>
                    <TableCell>{s.max_mark}</TableCell>
                    <TableCell className="text-muted-foreground">{s.description}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default AdminSettings;
