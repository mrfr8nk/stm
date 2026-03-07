import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { FileText, Search, CheckCircle, XCircle, Clock, Eye } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const AdminApplications = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [applications, setApplications] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    const { data } = await supabase.from("applications").select("*").order("created_at", { ascending: false });
    setApplications(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("applications").update({
      status,
      reviewed_by: user?.id,
      reviewed_at: new Date().toISOString(),
    }).eq("id", id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else {
      toast({ title: `Application ${status}` });
      fetchData();
      setDetailOpen(false);
    }
  };

  const filtered = (status?: string) => {
    return applications.filter(a => {
      const matchStatus = !status || a.status === status;
      const matchSearch = (a.full_name || "").toLowerCase().includes(search.toLowerCase()) ||
        (a.email || "").toLowerCase().includes(search.toLowerCase());
      return matchStatus && matchSearch;
    });
  };

  const statusBadge = (status: string) => {
    const map: Record<string, { color: string; icon: React.ElementType }> = {
      pending: { color: "bg-yellow-100 text-yellow-700", icon: Clock },
      approved: { color: "bg-green-100 text-green-700", icon: CheckCircle },
      rejected: { color: "bg-red-100 text-red-700", icon: XCircle },
    };
    const s = map[status] || map.pending;
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium inline-flex items-center gap-1 ${s.color}`}>
        <s.icon className="w-3 h-3" /> {status}
      </span>
    );
  };

  const stats = {
    total: applications.length,
    pending: applications.filter(a => a.status === "pending").length,
    approved: applications.filter(a => a.status === "approved").length,
    rejected: applications.filter(a => a.status === "rejected").length,
  };

  const AppTable = ({ data }: { data: any[] }) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Level</TableHead>
          <TableHead>Form</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Date</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {loading ? (
          <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
        ) : data.length === 0 ? (
          <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No applications found.</TableCell></TableRow>
        ) : (
          data.map(a => (
            <TableRow key={a.id}>
              <TableCell className="font-medium">{a.full_name}</TableCell>
              <TableCell className="text-sm">{a.email}</TableCell>
              <TableCell>{a.level?.replace("_", " ").toUpperCase()}</TableCell>
              <TableCell>Form {a.form}</TableCell>
              <TableCell>{statusBadge(a.status)}</TableCell>
              <TableCell className="text-sm text-muted-foreground">{new Date(a.created_at).toLocaleDateString()}</TableCell>
              <TableCell>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={() => { setSelected(a); setDetailOpen(true); }}>
                    <Eye className="w-4 h-4" />
                  </Button>
                  {a.status === "pending" && (
                    <>
                      <Button variant="ghost" size="sm" onClick={() => updateStatus(a.id, "approved")}>
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => updateStatus(a.id, "rejected")}>
                        <XCircle className="w-4 h-4 text-destructive" />
                      </Button>
                    </>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );

  return (
    <DashboardLayout role="admin">
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Applications</h1>
          <p className="text-muted-foreground text-sm">Review student enrollment applications</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total", value: stats.total, icon: FileText, color: "text-primary" },
            { label: "Pending", value: stats.pending, icon: Clock, color: "text-yellow-600" },
            { label: "Approved", value: stats.approved, icon: CheckCircle, color: "text-green-600" },
            { label: "Rejected", value: stats.rejected, icon: XCircle, color: "text-destructive" },
          ].map(s => (
            <Card key={s.label}>
              <CardContent className="flex items-center gap-3 p-4">
                <div className={`p-2 rounded-lg bg-muted ${s.color}`}><s.icon className="w-5 h-5" /></div>
                <div><p className="text-xl font-bold">{s.value}</p><p className="text-xs text-muted-foreground">{s.label}</p></div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search applications..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>

        <Tabs defaultValue="pending">
          <TabsList>
            <TabsTrigger value="pending">Pending ({stats.pending})</TabsTrigger>
            <TabsTrigger value="approved">Approved ({stats.approved})</TabsTrigger>
            <TabsTrigger value="rejected">Rejected ({stats.rejected})</TabsTrigger>
            <TabsTrigger value="all">All ({stats.total})</TabsTrigger>
          </TabsList>
          <TabsContent value="pending"><Card><CardContent className="p-0"><AppTable data={filtered("pending")} /></CardContent></Card></TabsContent>
          <TabsContent value="approved"><Card><CardContent className="p-0"><AppTable data={filtered("approved")} /></CardContent></Card></TabsContent>
          <TabsContent value="rejected"><Card><CardContent className="p-0"><AppTable data={filtered("rejected")} /></CardContent></Card></TabsContent>
          <TabsContent value="all"><Card><CardContent className="p-0"><AppTable data={filtered()} /></CardContent></Card></TabsContent>
        </Tabs>

        {/* Detail Dialog */}
        <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Application Details</DialogTitle></DialogHeader>
            {selected && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-lg font-bold">{selected.full_name}</p>
                  {statusBadge(selected.status)}
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-muted-foreground">Email:</span> {selected.email}</div>
                  <div><span className="text-muted-foreground">Phone:</span> {selected.phone || "—"}</div>
                  <div><span className="text-muted-foreground">DOB:</span> {selected.date_of_birth || "—"}</div>
                  <div><span className="text-muted-foreground">Level:</span> {selected.level?.replace("_", " ").toUpperCase()}</div>
                  <div><span className="text-muted-foreground">Form:</span> {selected.form}</div>
                  <div><span className="text-muted-foreground">Previous School:</span> {selected.previous_school || "—"}</div>
                  <div><span className="text-muted-foreground">Guardian:</span> {selected.guardian_name || "—"}</div>
                  <div><span className="text-muted-foreground">Guardian Phone:</span> {selected.guardian_phone || "—"}</div>
                  <div><span className="text-muted-foreground">Guardian Email:</span> {selected.guardian_email || "—"}</div>
                  <div className="col-span-2"><span className="text-muted-foreground">Address:</span> {selected.address || "—"}</div>
                  <div className="col-span-2"><span className="text-muted-foreground">Notes:</span> {selected.notes || "—"}</div>
                  <div><span className="text-muted-foreground">Applied:</span> {new Date(selected.created_at).toLocaleString()}</div>
                  {selected.reviewed_at && <div><span className="text-muted-foreground">Reviewed:</span> {new Date(selected.reviewed_at).toLocaleString()}</div>}
                </div>
                {selected.status === "pending" && (
                  <div className="flex gap-3 pt-2">
                    <Button className="flex-1" onClick={() => updateStatus(selected.id, "approved")}>
                      <CheckCircle className="w-4 h-4 mr-2" /> Approve
                    </Button>
                    <Button variant="destructive" className="flex-1" onClick={() => updateStatus(selected.id, "rejected")}>
                      <XCircle className="w-4 h-4 mr-2" /> Reject
                    </Button>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default AdminApplications;
