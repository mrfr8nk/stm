import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { FileText, Download, Printer, GraduationCap, Award, TrendingUp } from "lucide-react";

const TeacherReports = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [assignments, setAssignments] = useState<any[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [grades, setGrades] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [term, setTerm] = useState("term_1");
  const [year, setYear] = useState(new Date().getFullYear());
  const [generating, setGenerating] = useState(false);
  const [schoolInfo] = useState({
    name: "St. Mary's High School",
    motto: "Excellence Through Knowledge",
    address: "P.O. Box 123, Harare, Zimbabwe",
    phone: "+263 242 123 456",
  });

  useEffect(() => {
    if (!user) return;
    supabase.from("teacher_assignments").select("*, classes(*), subjects(*)").eq("teacher_id", user.id)
      .then(({ data }) => setAssignments(data || []));
  }, [user]);

  const uniqueClasses = Array.from(new Map(assignments.map(a => [a.class_id, a.classes])).values()).filter(Boolean);

  useEffect(() => {
    if (!selectedClassId) return;
    const fetchData = async () => {
      const [studentsRes, gradesRes, subjectsRes] = await Promise.all([
        supabase.from("student_profiles").select("*, profiles!student_profiles_user_id_fkey(full_name)").eq("class_id", selectedClassId).eq("is_active", true),
        supabase.from("grades").select("*, subjects(name, code)").eq("class_id", selectedClassId).eq("term", term as any).eq("academic_year", year).is("deleted_at", null),
        supabase.from("subjects").select("*").is("deleted_at", null),
      ]);
      setStudents(studentsRes.data || []);
      setGrades(gradesRes.data || []);
      setSubjects(subjectsRes.data || []);
    };
    fetchData();
  }, [selectedClassId, term, year]);

  const getGradeLetter = (mark: number, level: string) => {
    if (level === "a_level") {
      if (mark >= 76) return "A"; if (mark >= 67) return "B"; if (mark >= 55) return "C";
      if (mark >= 45) return "D"; if (mark >= 35) return "E"; return "O";
    } else if (level === "zjc") {
      if (mark >= 75) return "A"; if (mark >= 65) return "B"; if (mark >= 50) return "C";
      if (mark >= 40) return "D"; return "U";
    }
    if (mark >= 70) return "A"; if (mark >= 60) return "B"; if (mark >= 50) return "C";
    if (mark >= 40) return "D"; if (mark >= 30) return "E"; return "U";
  };

  const getComment = (avg: number) => {
    if (avg >= 80) return "Outstanding performance. Keep up the excellent work!";
    if (avg >= 70) return "Very good performance. Shows great potential for excellence.";
    if (avg >= 60) return "Good performance. Consistent effort is noted.";
    if (avg >= 50) return "Satisfactory performance. Room for improvement exists.";
    if (avg >= 40) return "Below average. Needs to put in more effort and seek help.";
    return "Unsatisfactory. Immediate intervention and support required.";
  };

  const generateReport = (student: any) => {
    const studentGrades = grades.filter(g => g.student_id === student.user_id);
    const classForStudent = uniqueClasses.find(c => c.id === selectedClassId);
    const level = student.level || classForStudent?.level || "o_level";
    
    // Calculate class position
    const allStudentAverages = students.map(s => {
      const sg = grades.filter(g => g.student_id === s.user_id);
      const avg = sg.length > 0 ? sg.reduce((sum, g) => sum + Number(g.mark), 0) / sg.length : 0;
      return { userId: s.user_id, avg };
    }).sort((a, b) => b.avg - a.avg);
    
    const position = allStudentAverages.findIndex(s => s.userId === student.user_id) + 1;
    const totalStudents = students.length;
    const avg = studentGrades.length > 0 ? Math.round(studentGrades.reduce((sum, g) => sum + Number(g.mark), 0) / studentGrades.length) : 0;
    const serialNo = `RPT-${year}-${term.replace("term_", "T")}-${Date.now().toString(36).toUpperCase()}`;
    const termLabel = term.replace("_", " ").toUpperCase();

    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Report Card - ${student.profiles?.full_name}</title>
<style>
  @page { size: A4; margin: 15mm; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Georgia', 'Times New Roman', serif; color: #1a1a2e; background: white; font-size: 11pt; }
  .report { max-width: 210mm; margin: 0 auto; position: relative; padding: 20px; }
  .watermark { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-30deg); font-size: 80pt; color: rgba(0,0,0,0.03); font-weight: bold; letter-spacing: 10px; z-index: 0; pointer-events: none; }
  .header { text-align: center; border-bottom: 3px double #1a1a2e; padding-bottom: 15px; margin-bottom: 15px; position: relative; }
  .header h1 { font-size: 22pt; letter-spacing: 3px; text-transform: uppercase; color: #0a3d62; margin-bottom: 4px; }
  .header .motto { font-style: italic; color: #555; font-size: 10pt; margin-bottom: 4px; }
  .header .address { font-size: 8pt; color: #777; }
  .header .crest { width: 70px; height: 70px; background: linear-gradient(135deg, #0a3d62, #1e6f9f); border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 20pt; margin-bottom: 8px; border: 3px solid #0a3d62; }
  .report-title { background: #0a3d62; color: white; text-align: center; padding: 8px; font-size: 14pt; letter-spacing: 4px; text-transform: uppercase; margin-bottom: 15px; }
  .serial { position: absolute; top: 10px; right: 10px; font-size: 7pt; color: #999; font-family: 'Courier New', monospace; }
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 20px; margin-bottom: 15px; font-size: 10pt; }
  .info-grid .label { font-weight: bold; color: #0a3d62; }
  .info-grid .value { border-bottom: 1px dotted #ccc; padding-bottom: 2px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
  th { background: #0a3d62; color: white; padding: 8px 6px; text-align: left; font-size: 9pt; text-transform: uppercase; letter-spacing: 1px; }
  td { padding: 7px 6px; border-bottom: 1px solid #e0e0e0; font-size: 10pt; }
  tr:nth-child(even) { background: #f8f9fa; }
  .mark-cell { text-align: center; font-weight: bold; }
  .grade-a { color: #0a8f3c; } .grade-b { color: #1e6f9f; } .grade-c { color: #b8860b; }
  .grade-d { color: #cc6600; } .grade-e { color: #cc3300; } .grade-f { color: #cc0000; }
  .summary-box { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 15px; }
  .summary-item { text-align: center; padding: 10px; border: 1px solid #e0e0e0; border-radius: 4px; }
  .summary-item .num { font-size: 18pt; font-weight: bold; color: #0a3d62; }
  .summary-item .lbl { font-size: 8pt; color: #777; text-transform: uppercase; letter-spacing: 1px; }
  .comment-box { border: 1px solid #e0e0e0; padding: 12px; margin-bottom: 15px; border-radius: 4px; }
  .comment-box .title { font-weight: bold; color: #0a3d62; font-size: 9pt; text-transform: uppercase; margin-bottom: 5px; }
  .signatures { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; margin-top: 30px; }
  .sig-line { border-top: 1px solid #333; padding-top: 5px; text-align: center; font-size: 9pt; color: #555; }
  .footer { text-align: center; margin-top: 20px; padding-top: 10px; border-top: 2px solid #0a3d62; font-size: 7pt; color: #999; }
  .security-strip { background: repeating-linear-gradient(45deg, transparent, transparent 5px, rgba(10,61,98,0.05) 5px, rgba(10,61,98,0.05) 10px); padding: 4px 10px; text-align: center; font-size: 7pt; color: #aaa; font-family: 'Courier New', monospace; margin-top: 10px; }
  .grading-key { font-size: 8pt; color: #777; margin-bottom: 10px; }
  .grading-key td { padding: 2px 8px; border: 1px solid #e0e0e0; }
  @media print { .no-print { display: none; } body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style></head><body>
<div class="watermark">${schoolInfo.name.split(" ")[0]?.toUpperCase()}</div>
<div class="report">
  <div class="serial">${serialNo}</div>
  <div class="header">
    <div class="crest">SM</div>
    <h1>${schoolInfo.name}</h1>
    <div class="motto">"${schoolInfo.motto}"</div>
    <div class="address">${schoolInfo.address} | Tel: ${schoolInfo.phone}</div>
  </div>
  
  <div class="report-title">Student Report Card</div>
  
  <div class="info-grid">
    <div><span class="label">Student Name:</span> <span class="value">${student.profiles?.full_name || "—"}</span></div>
    <div><span class="label">Student ID:</span> <span class="value">${student.student_id || "—"}</span></div>
    <div><span class="label">Class:</span> <span class="value">${classForStudent?.name || "—"}</span></div>
    <div><span class="label">Level:</span> <span class="value">${level.replace("_", " ").toUpperCase()}</span></div>
    <div><span class="label">Academic Year:</span> <span class="value">${year}</span></div>
    <div><span class="label">Term:</span> <span class="value">${termLabel}</span></div>
    <div><span class="label">DOB:</span> <span class="value">${student.date_of_birth || "—"}</span></div>
    <div><span class="label">Guardian:</span> <span class="value">${student.guardian_name || "—"}</span></div>
  </div>
  
  <table>
    <thead><tr><th>#</th><th>Subject</th><th>Code</th><th>Mark (%)</th><th>Grade</th><th>Comment</th></tr></thead>
    <tbody>
      ${studentGrades.map((g, i) => {
        const grade = getGradeLetter(Number(g.mark), level);
        const gradeClass = grade === "A" ? "grade-a" : grade === "B" ? "grade-b" : grade === "C" ? "grade-c" : grade === "D" ? "grade-d" : "grade-f";
        return `<tr>
          <td>${i + 1}</td>
          <td>${g.subjects?.name || "—"}</td>
          <td>${g.subjects?.code || "—"}</td>
          <td class="mark-cell">${g.mark}</td>
          <td class="mark-cell ${gradeClass}"><strong>${grade}</strong></td>
          <td>${g.comment || "—"}</td>
        </tr>`;
      }).join("")}
      ${studentGrades.length === 0 ? '<tr><td colspan="6" style="text-align:center;color:#999;padding:20px;">No grades recorded for this term</td></tr>' : ''}
    </tbody>
  </table>
  
  <div class="summary-box">
    <div class="summary-item"><div class="num">${avg}%</div><div class="lbl">Average</div></div>
    <div class="summary-item"><div class="num">${position}${position === 1 ? "st" : position === 2 ? "nd" : position === 3 ? "rd" : "th"}</div><div class="lbl">Position</div></div>
    <div class="summary-item"><div class="num">${totalStudents}</div><div class="lbl">Out of</div></div>
    <div class="summary-item"><div class="num">${studentGrades.length}</div><div class="lbl">Subjects</div></div>
  </div>
  
  <div class="comment-box">
    <div class="title">Class Teacher's Comment</div>
    <p>${getComment(avg)}</p>
  </div>
  
  <table class="grading-key"><tr>
    ${level === "a_level" ? '<td><strong>A</strong> 76-100</td><td><strong>B</strong> 67-75</td><td><strong>C</strong> 55-66</td><td><strong>D</strong> 45-54</td><td><strong>E</strong> 35-44</td><td><strong>O</strong> 0-34</td>'
    : level === "zjc" ? '<td><strong>A</strong> 75-100</td><td><strong>B</strong> 65-74</td><td><strong>C</strong> 50-64</td><td><strong>D</strong> 40-49</td><td><strong>U</strong> 0-39</td>'
    : '<td><strong>A</strong> 70-100</td><td><strong>B</strong> 60-69</td><td><strong>C</strong> 50-59</td><td><strong>D</strong> 40-49</td><td><strong>E</strong> 30-39</td><td><strong>U</strong> 0-29</td>'}
  </tr></table>
  
  <div class="signatures">
    <div><div class="sig-line">Class Teacher</div></div>
    <div><div class="sig-line">Headmaster</div></div>
    <div><div class="sig-line">Parent/Guardian</div></div>
  </div>
  
  <div class="security-strip">
    OFFICIAL DOCUMENT | Serial: ${serialNo} | Generated: ${new Date().toLocaleString()} | This report is computer-generated and valid without signature.
  </div>
  
  <div class="footer">
    <p>${schoolInfo.name} — ${schoolInfo.address}</p>
    <p>This is an official academic record. Any alteration renders this document void.</p>
  </div>
  
  <div class="no-print" style="text-align:center;margin-top:20px;">
    <button onclick="window.print()" style="padding:10px 30px;font-size:14px;background:#0a3d62;color:white;border:none;border-radius:4px;cursor:pointer;">Print Report Card</button>
  </div>
</div></body></html>`;

    const w = window.open("", "_blank");
    if (w) { w.document.write(html); w.document.close(); }
  };

  const generateAll = () => {
    setGenerating(true);
    students.forEach((s, i) => {
      setTimeout(() => generateReport(s), i * 500);
    });
    setTimeout(() => {
      setGenerating(false);
      toast({ title: "Reports Generated", description: `Generated ${students.length} report cards.` });
    }, students.length * 500 + 500);
  };

  return (
    <DashboardLayout role="teacher">
      <div className="space-y-6">
        <h1 className="font-display text-2xl font-bold text-foreground">Report Cards</h1>

        <div className="flex flex-wrap gap-3">
          <select className="border border-input rounded-lg px-3 py-2 bg-background text-foreground text-sm" value={term} onChange={e => setTerm(e.target.value)}>
            <option value="term_1">Term 1</option>
            <option value="term_2">Term 2</option>
            <option value="term_3">Term 3</option>
          </select>
          <select className="border border-input rounded-lg px-3 py-2 bg-background text-foreground text-sm" value={year} onChange={e => setYear(Number(e.target.value))}>
            {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <div className="flex gap-2">
            {uniqueClasses.map((cls: any) => (
              <Button key={cls.id} variant={selectedClassId === cls.id ? "default" : "outline"} onClick={() => setSelectedClassId(cls.id)} size="sm">
                {cls.name}
              </Button>
            ))}
          </div>
        </div>

        {selectedClassId && students.length > 0 && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-3">
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" /> Student Reports ({students.length})
              </CardTitle>
              <Button onClick={generateAll} disabled={generating}>
                <Printer className="w-4 h-4 mr-2" /> {generating ? "Generating..." : "Generate All Reports"}
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {students.map((s, i) => {
                  const studentGrades = grades.filter(g => g.student_id === s.user_id);
                  const avg = studentGrades.length > 0 ? Math.round(studentGrades.reduce((sum, g) => sum + Number(g.mark), 0) / studentGrades.length) : 0;
                  const gradeColor = avg >= 70 ? "text-green-600" : avg >= 50 ? "text-yellow-600" : "text-red-600";

                  return (
                    <div key={s.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                      <span className="w-8 text-sm text-muted-foreground">{i + 1}.</span>
                      <span className="flex-1 font-medium text-foreground">{s.profiles?.full_name || "Student"}</span>
                      <Badge variant="outline">{s.student_id || "—"}</Badge>
                      <span className={`text-sm font-bold ${gradeColor}`}>{avg}%</span>
                      <Badge variant="secondary">{studentGrades.length} subjects</Badge>
                      <Button variant="outline" size="sm" onClick={() => generateReport(s)}>
                        <Download className="w-4 h-4 mr-1" /> Report
                      </Button>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {selectedClassId && students.length === 0 && (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              No students found in this class.
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default TeacherReports;
