import { useState, useEffect, useCallback } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { BookOpen, ArrowLeft, Search } from "lucide-react";

interface RecordBook {
  id: string;
  name: string;
  teacher_id: string;
  class_id: string | null;
  subject_id: string | null;
  academic_year: number;
  created_at: string;
}

interface RecordColumn {
  id: string;
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

const AdminRecordBooks = () => {
  const [recordBooks, setRecordBooks] = useState<RecordBook[]>([]);
  const [selectedBook, setSelectedBook] = useState<RecordBook | null>(null);
  const [columns, setColumns] = useState<RecordColumn[]>([]);
  const [entries, setEntries] = useState<RecordEntry[]>([]);
  const [students, setStudents] = useState<StudentInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Lookup maps
  const [teacherNames, setTeacherNames] = useState<Record<string, string>>({});
  const [classNames, setClassNames] = useState<Record<string, string>>({});
  const [subjectNames, setSubjectNames] = useState<Record<string, string>>({});

  useEffect(() => {
    loadBooks();
  }, []);

  const loadBooks = async () => {
    setLoading(true);
    const [booksRes, classesRes, subjectsRes] = await Promise.all([
      supabase.from("record_books").select("*").order("created_at", { ascending: false }),
      supabase.from("classes").select("id, name").is("deleted_at", null),
      supabase.from("subjects").select("id, name").is("deleted_at", null),
    ]);

    const books = (booksRes.data || []) as RecordBook[];
    setRecordBooks(books);
    setClassNames(Object.fromEntries((classesRes.data || []).map(c => [c.id, c.name])));
    setSubjectNames(Object.fromEntries((subjectsRes.data || []).map(s => [s.id, s.name])));

    // Load teacher names
    const teacherIds = [...new Set(books.map(b => b.teacher_id))];
    if (teacherIds.length > 0) {
      const { data } = await supabase.from("profiles").select("user_id, full_name").in("user_id", teacherIds);
      setTeacherNames(Object.fromEntries((data || []).map(p => [p.user_id, p.full_name])));
    }
    setLoading(false);
  };

  const loadBookData = useCallback(async (book: RecordBook) => {
    setSelectedBook(book);
    setLoading(true);

    const [colsRes, studentsRes] = await Promise.all([
      supabase.from("record_book_columns").select("*").eq("record_book_id", book.id).order("display_order"),
      book.class_id
        ? supabase.from("student_profiles").select("user_id").eq("class_id", book.class_id).eq("is_active", true)
        : Promise.resolve({ data: [] }),
    ]);

    const cols = (colsRes.data || []) as RecordColumn[];
    setColumns(cols);

    const studentUserIds = (studentsRes.data || []).map((s: any) => s.user_id);
    let studentInfos: StudentInfo[] = [];
    if (studentUserIds.length > 0) {
      const [profilesRes, spRes] = await Promise.all([
        supabase.from("profiles").select("user_id, full_name").in("user_id", studentUserIds),
        supabase.from("student_profiles").select("user_id, student_id").in("user_id", studentUserIds),
      ]);
      const spMap = new Map((spRes.data || []).map((s: any) => [s.user_id, s.student_id]));
      studentInfos = (profilesRes.data || []).map((p: any) => ({
        user_id: p.user_id,
        full_name: p.full_name,
        student_id: spMap.get(p.user_id) || null,
      }));
      studentInfos.sort((a, b) => a.full_name.localeCompare(b.full_name));
    }
    setStudents(studentInfos);

    if (cols.length > 0) {
      const { data } = await supabase.from("record_book_entries").select("*").eq("record_book_id", book.id);
      setEntries((data || []) as RecordEntry[]);
    } else {
      setEntries([]);
    }
    setLoading(false);
  }, []);

  const getCellValue = (studentId: string, colId: string): string => {
    return entries.find(e => e.student_id === studentId && e.column_id === colId)?.value || "—";
  };

  const filtered = recordBooks.filter(b => {
    const q = search.toLowerCase();
    if (!q) return true;
    return b.name.toLowerCase().includes(q) ||
      (teacherNames[b.teacher_id] || "").toLowerCase().includes(q) ||
      (b.class_id && (classNames[b.class_id] || "").toLowerCase().includes(q)) ||
      (b.subject_id && (subjectNames[b.subject_id] || "").toLowerCase().includes(q));
  });

  if (selectedBook) {
    return (
      <DashboardLayout role="admin">
        <div className="space-y-4">
          <div className="flex items-center gap-4 flex-wrap">
            <Button variant="ghost" size="icon" onClick={() => setSelectedBook(null)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold text-foreground truncate">{selectedBook.name}</h1>
              <div className="flex gap-2 mt-1 flex-wrap">
                <Badge variant="secondary">{teacherNames[selectedBook.teacher_id] || "Unknown Teacher"}</Badge>
                {selectedBook.class_id && <Badge variant="outline">{classNames[selectedBook.class_id]}</Badge>}
                {selectedBook.subject_id && <Badge variant="outline">{subjectNames[selectedBook.subject_id]}</Badge>}
              </div>
            </div>
          </div>

          {loading ? <Skeleton className="h-96" /> : students.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">No students in this class.</CardContent></Card>
          ) : columns.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">No columns defined in this record book yet.</CardContent></Card>
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
                            <TableCell key={col.id}>{getCellValue(student.user_id, col.id)}</TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </ScrollArea>
            </Card>
          )}
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="admin">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">All Record Books</h1>
          <p className="text-muted-foreground">View record books created by all teachers</p>
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search by name, teacher, class..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1,2,3].map(i => <Skeleton key={i} className="h-40" />)}
          </div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <BookOpen className="w-12 h-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold text-foreground">{search ? "No matching record books" : "No Record Books Yet"}</h3>
              <p className="text-muted-foreground mt-1">Teachers haven't created any record books yet.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map(book => (
              <Card key={book.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => loadBookData(book)}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">{book.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    <Badge>{teacherNames[book.teacher_id] || "Unknown"}</Badge>
                    {book.class_id && <Badge variant="secondary">{classNames[book.class_id]}</Badge>}
                    {book.subject_id && <Badge variant="outline">{subjectNames[book.subject_id]}</Badge>}
                    <Badge variant="outline">{book.academic_year}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-3">Created {new Date(book.created_at).toLocaleDateString()}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default AdminRecordBooks;
