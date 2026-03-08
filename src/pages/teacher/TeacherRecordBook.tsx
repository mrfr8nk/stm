import { useState, useEffect, useCallback } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Plus, Trash2, Save, BookOpen, Columns3, ArrowLeft, GripVertical } from "lucide-react";

interface RecordBook {
  id: string;
  name: string;
  class_id: string | null;
  subject_id: string | null;
  academic_year: number;
  created_at: string;
}

interface RecordColumn {
  id: string;
  record_book_id: string;
  name: string;
  column_type: string;
  display_order: number;
}

interface RecordEntry {
  id: string;
  column_id: string;
  student_id: string;
  value: string | null;
}

interface StudentInfo {
  user_id: string;
  full_name: string;
  student_id: string | null;
}

interface ClassInfo {
  id: string;
  name: string;
}

interface SubjectInfo {
  id: string;
  name: string;
}

const TeacherRecordBook = () => {
  const { user } = useAuth();
  const [recordBooks, setRecordBooks] = useState<RecordBook[]>([]);
  const [selectedBook, setSelectedBook] = useState<RecordBook | null>(null);
  const [columns, setColumns] = useState<RecordColumn[]>([]);
  const [entries, setEntries] = useState<RecordEntry[]>([]);
  const [students, setStudents] = useState<StudentInfo[]>([]);
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [subjects, setSubjects] = useState<SubjectInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // New book form
  const [showNewBook, setShowNewBook] = useState(false);
  const [newBookName, setNewBookName] = useState("");
  const [newBookClassId, setNewBookClassId] = useState("");
  const [newBookSubjectId, setNewBookSubjectId] = useState("");

  // New column dialog
  const [showNewColumn, setShowNewColumn] = useState(false);
  const [newColName, setNewColName] = useState("");
  const [newColType, setNewColType] = useState("number");

  // Cell edits buffer
  const [editBuffer, setEditBuffer] = useState<Record<string, string>>({});

  const currentYear = new Date().getFullYear();

  useEffect(() => {
    if (user) {
      loadInitialData();
    }
  }, [user]);

  const loadInitialData = async () => {
    setLoading(true);
    const [booksRes, classesRes, subjectsRes] = await Promise.all([
      supabase.from("record_books").select("*").eq("teacher_id", user!.id).order("created_at", { ascending: false }),
      supabase.from("classes").select("id, name").is("deleted_at", null).order("name"),
      supabase.from("subjects").select("id, name").is("deleted_at", null).order("name"),
    ]);
    if (booksRes.data) setRecordBooks(booksRes.data as RecordBook[]);
    if (classesRes.data) setClasses(classesRes.data);
    if (subjectsRes.data) setSubjects(subjectsRes.data);
    setLoading(false);
  };

  const loadBookData = useCallback(async (book: RecordBook) => {
    setSelectedBook(book);
    setLoading(true);

    const [colsRes, studentsRes] = await Promise.all([
      supabase.from("record_book_columns").select("*").eq("record_book_id", book.id).order("display_order"),
      book.class_id
        ? supabase
            .from("student_profiles")
            .select("user_id, class_id")
            .eq("class_id", book.class_id)
            .eq("is_active", true)
        : Promise.resolve({ data: [] }),
    ]);

    const cols = (colsRes.data || []) as RecordColumn[];
    setColumns(cols);

    // Load student names
    const studentUserIds = (studentsRes.data || []).map((s: any) => s.user_id);
    let studentInfos: StudentInfo[] = [];
    if (studentUserIds.length > 0) {
      const profilesRes = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", studentUserIds);

      const spRes = await supabase
        .from("student_profiles")
        .select("user_id, student_id")
        .in("user_id", studentUserIds);

      const spMap = new Map((spRes.data || []).map((s: any) => [s.user_id, s.student_id]));

      studentInfos = (profilesRes.data || []).map((p: any) => ({
        user_id: p.user_id,
        full_name: p.full_name,
        student_id: spMap.get(p.user_id) || null,
      }));
      studentInfos.sort((a, b) => a.full_name.localeCompare(b.full_name));
    }
    setStudents(studentInfos);

    // Load entries
    if (cols.length > 0) {
      const entriesRes = await supabase
        .from("record_book_entries")
        .select("*")
        .eq("record_book_id", book.id);
      setEntries((entriesRes.data || []) as RecordEntry[]);
    } else {
      setEntries([]);
    }

    setEditBuffer({});
    setLoading(false);
  }, []);

  const createBook = async () => {
    if (!newBookName.trim()) return toast.error("Enter a book name");
    const { data, error } = await supabase.from("record_books").insert({
      teacher_id: user!.id,
      name: newBookName.trim(),
      class_id: newBookClassId || null,
      subject_id: newBookSubjectId || null,
      academic_year: currentYear,
    }).select().single();

    if (error) return toast.error(error.message);
    setRecordBooks([data as RecordBook, ...recordBooks]);
    setNewBookName("");
    setNewBookClassId("");
    setNewBookSubjectId("");
    setShowNewBook(false);
    toast.success("Record book created");
  };

  const deleteBook = async (id: string) => {
    if (!confirm("Delete this record book and all its data?")) return;
    const { error } = await supabase.from("record_books").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setRecordBooks(recordBooks.filter(b => b.id !== id));
    if (selectedBook?.id === id) setSelectedBook(null);
    toast.success("Record book deleted");
  };

  const addColumn = async () => {
    if (!newColName.trim() || !selectedBook) return;
    const maxOrder = columns.length > 0 ? Math.max(...columns.map(c => c.display_order)) + 1 : 0;
    const { data, error } = await supabase.from("record_book_columns").insert({
      record_book_id: selectedBook.id,
      name: newColName.trim(),
      column_type: newColType,
      display_order: maxOrder,
    }).select().single();

    if (error) return toast.error(error.message);
    setColumns([...columns, data as RecordColumn]);
    setNewColName("");
    setNewColType("number");
    setShowNewColumn(false);
    toast.success("Column added");
  };

  const deleteColumn = async (colId: string) => {
    if (!confirm("Delete this column and all its data?")) return;
    const { error } = await supabase.from("record_book_columns").delete().eq("id", colId);
    if (error) return toast.error(error.message);
    setColumns(columns.filter(c => c.id !== colId));
    setEntries(entries.filter(e => e.column_id !== colId));
    toast.success("Column deleted");
  };

  const cellKey = (studentId: string, colId: string) => `${studentId}__${colId}`;

  const getCellValue = (studentId: string, colId: string): string => {
    const key = cellKey(studentId, colId);
    if (key in editBuffer) return editBuffer[key];
    const entry = entries.find(e => e.student_id === studentId && e.column_id === colId);
    return entry?.value || "";
  };

  const setCellValue = (studentId: string, colId: string, value: string) => {
    setEditBuffer(prev => ({ ...prev, [cellKey(studentId, colId)]: value }));
  };

  const saveAll = async () => {
    if (!selectedBook) return;
    const keys = Object.keys(editBuffer);
    if (keys.length === 0) return toast.info("No changes to save");

    setSaving(true);
    const upserts = keys.map(key => {
      const [studentId, colId] = key.split("__");
      return {
        record_book_id: selectedBook.id,
        column_id: colId,
        student_id: studentId,
        value: editBuffer[key] || null,
      };
    });

    const { error } = await supabase
      .from("record_book_entries")
      .upsert(upserts, { onConflict: "column_id,student_id" });

    if (error) {
      toast.error(error.message);
    } else {
      // Refresh entries
      const entriesRes = await supabase
        .from("record_book_entries")
        .select("*")
        .eq("record_book_id", selectedBook.id);
      setEntries((entriesRes.data || []) as RecordEntry[]);
      setEditBuffer({});
      toast.success(`Saved ${keys.length} cell(s)`);
    }
    setSaving(false);
  };

  const hasUnsavedChanges = Object.keys(editBuffer).length > 0;

  // Book list view
  if (!selectedBook) {
    return (
      <DashboardLayout role="teacher">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Record Books</h1>
              <p className="text-muted-foreground">Track student performance with custom columns</p>
            </div>
            <Dialog open={showNewBook} onOpenChange={setShowNewBook}>
              <DialogTrigger asChild>
                <Button><Plus className="w-4 h-4 mr-2" /> New Record Book</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Record Book</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Book Name *</Label>
                    <Input value={newBookName} onChange={e => setNewBookName(e.target.value)} placeholder="e.g. Term 1 Continuous Assessment" />
                  </div>
                  <div>
                    <Label>Class (optional)</Label>
                    <Select value={newBookClassId} onValueChange={setNewBookClassId}>
                      <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                      <SelectContent>
                        {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Subject (optional)</Label>
                    <Select value={newBookSubjectId} onValueChange={setNewBookSubjectId}>
                      <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
                      <SelectContent>
                        {subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={createBook}>Create</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {loading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1,2,3].map(i => <Skeleton key={i} className="h-40" />)}
            </div>
          ) : recordBooks.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <BookOpen className="w-12 h-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold text-foreground">No Record Books Yet</h3>
                <p className="text-muted-foreground mt-1">Create a record book to start tracking student data with custom columns.</p>
                <Button className="mt-4" onClick={() => setShowNewBook(true)}>
                  <Plus className="w-4 h-4 mr-2" /> Create First Book
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {recordBooks.map(book => {
                const cls = classes.find(c => c.id === book.class_id);
                const subj = subjects.find(s => s.id === book.subject_id);
                return (
                  <Card key={book.id} className="cursor-pointer hover:shadow-md transition-shadow group" onClick={() => loadBookData(book)}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-base">{book.name}</CardTitle>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="opacity-0 group-hover:opacity-100 h-8 w-8 text-destructive"
                          onClick={e => { e.stopPropagation(); deleteBook(book.id); }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {cls && <Badge variant="secondary">{cls.name}</Badge>}
                        {subj && <Badge variant="outline">{subj.name}</Badge>}
                        <Badge variant="outline">{book.academic_year}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-3">
                        Created {new Date(book.created_at).toLocaleDateString()}
                      </p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </DashboardLayout>
    );
  }

  // Record book detail view (spreadsheet)
  const cls = classes.find(c => c.id === selectedBook.class_id);
  const subj = subjects.find(s => s.id === selectedBook.subject_id);

  return (
    <DashboardLayout role="teacher">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center gap-4 flex-wrap">
          <Button variant="ghost" size="icon" onClick={() => { if (hasUnsavedChanges && !confirm("Discard unsaved changes?")) return; setSelectedBook(null); }}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-foreground truncate">{selectedBook.name}</h1>
            <div className="flex gap-2 mt-1">
              {cls && <Badge variant="secondary">{cls.name}</Badge>}
              {subj && <Badge variant="outline">{subj.name}</Badge>}
            </div>
          </div>
          <div className="flex gap-2">
            <Dialog open={showNewColumn} onOpenChange={setShowNewColumn}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm"><Columns3 className="w-4 h-4 mr-2" /> Add Column</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Column</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Column Name *</Label>
                    <Input value={newColName} onChange={e => setNewColName(e.target.value)} placeholder="e.g. Quiz 1, Homework, Behavior" />
                  </div>
                  <div>
                    <Label>Type</Label>
                    <Select value={newColType} onValueChange={setNewColType}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="number">Number</SelectItem>
                        <SelectItem value="text">Text</SelectItem>
                        <SelectItem value="grade">Grade (A-F)</SelectItem>
                        <SelectItem value="checkbox">Yes/No</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={addColumn}>Add Column</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Button onClick={saveAll} disabled={!hasUnsavedChanges || saving} size="sm">
              <Save className="w-4 h-4 mr-2" /> {saving ? "Saving..." : "Save All"}
            </Button>
          </div>
        </div>

        {hasUnsavedChanges && (
          <div className="bg-accent/50 border border-accent rounded-lg px-4 py-2 text-sm text-accent-foreground">
            You have unsaved changes in {Object.keys(editBuffer).length} cell(s).
          </div>
        )}

        {/* Data grid */}
        {loading ? (
          <Skeleton className="h-96" />
        ) : !selectedBook.class_id ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <p>This record book has no class assigned. Assign a class to load students.</p>
            </CardContent>
          </Card>
        ) : students.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <p>No students found in this class.</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <ScrollArea className="w-full">
              <div className="min-w-[600px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="sticky left-0 bg-card z-10 min-w-[50px]">#</TableHead>
                      <TableHead className="sticky left-[50px] bg-card z-10 min-w-[180px]">Student</TableHead>
                      <TableHead className="min-w-[100px]">ID</TableHead>
                      {columns.map(col => (
                        <TableHead key={col.id} className="min-w-[120px]">
                          <div className="flex items-center gap-1">
                            <span>{col.name}</span>
                            <Badge variant="outline" className="text-[10px] px-1 py-0">{col.column_type}</Badge>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5 text-destructive opacity-50 hover:opacity-100"
                              onClick={() => deleteColumn(col.id)}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {students.map((student, idx) => (
                      <TableRow key={student.user_id}>
                        <TableCell className="sticky left-0 bg-card z-10 text-muted-foreground font-mono text-xs">{idx + 1}</TableCell>
                        <TableCell className="sticky left-[50px] bg-card z-10 font-medium">{student.full_name}</TableCell>
                        <TableCell className="text-muted-foreground text-xs font-mono">{student.student_id || "—"}</TableCell>
                        {columns.map(col => (
                          <TableCell key={col.id} className="p-1">
                            {col.column_type === "checkbox" ? (
                              <select
                                className="w-full h-8 bg-background border border-input rounded px-2 text-sm"
                                value={getCellValue(student.user_id, col.id)}
                                onChange={e => setCellValue(student.user_id, col.id, e.target.value)}
                              >
                                <option value="">—</option>
                                <option value="Yes">Yes</option>
                                <option value="No">No</option>
                              </select>
                            ) : col.column_type === "grade" ? (
                              <select
                                className="w-full h-8 bg-background border border-input rounded px-2 text-sm"
                                value={getCellValue(student.user_id, col.id)}
                                onChange={e => setCellValue(student.user_id, col.id, e.target.value)}
                              >
                                <option value="">—</option>
                                {["A", "B", "C", "D", "E", "F", "U", "O"].map(g => (
                                  <option key={g} value={g}>{g}</option>
                                ))}
                              </select>
                            ) : (
                              <Input
                                type={col.column_type === "number" ? "number" : "text"}
                                className="h-8 text-sm"
                                value={getCellValue(student.user_id, col.id)}
                                onChange={e => setCellValue(student.user_id, col.id, e.target.value)}
                              />
                            )}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </ScrollArea>
          </Card>
        )}

        {columns.length === 0 && students.length > 0 && (
          <Card>
            <CardContent className="py-8 text-center">
              <Columns3 className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">Add columns to start recording data (e.g. Quiz 1, Homework, Participation)</p>
              <Button className="mt-4" variant="outline" onClick={() => setShowNewColumn(true)}>
                <Plus className="w-4 h-4 mr-2" /> Add First Column
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default TeacherRecordBook;
