import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { FileText, Download, Printer } from "lucide-react";
import schoolLogo from "@/assets/school-logo.png";

const TeacherReports = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [assignments, setAssignments] = useState<any[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [grades, setGrades] = useState<any[]>([]);
  const [term, setTerm] = useState("term_1");
  const [year, setYear] = useState(new Date().getFullYear());
  const [generating, setGenerating] = useState(false);
  const [gradingScales, setGradingScales] = useState<any[]>([]);
  const [schoolInfo] = useState({
    name: "St. Mary's High School",
    motto: "Excellence Through Knowledge",
    address: "P.O. Box 123, Harare, Zimbabwe",
    phone: "+263 242 123 456",
    reg: "REG/2024/SM-001"
  });

  useEffect(() => {
    if (!user) return;
    Promise.all([
      supabase.from("teacher_assignments").select("*, classes(*), subjects(*)").eq("teacher_id", user.id),
      supabase.from("grading_scales").select("*"),
    ]).then(([assignRes, scalesRes]) => {
      setAssignments(assignRes.data || []);
      setGradingScales(scalesRes.data || []);
    });
  }, [user]);

  const uniqueClasses = Array.from(new Map(assignments.map(a => [a.class_id, a.classes])).values()).filter(Boolean);

  useEffect(() => {
    if (!selectedClassId) return;
    const fetchData = async () => {
      const [studentsRes, gradesRes] = await Promise.all([
        supabase.from("student_profiles").select("*, profiles!student_profiles_user_id_fkey(full_name)").eq("class_id", selectedClassId).eq("is_active", true),
        supabase.from("grades").select("*, subjects(name, code)").eq("class_id", selectedClassId).eq("term", term as any).eq("academic_year", year).is("deleted_at", null),
      ]);
      setStudents(studentsRes.data || []);
      setGrades(gradesRes.data || []);
    };
    fetchData();
  }, [selectedClassId, term, year]);

  const getGradeLetter = (mark: number, level: string) => {
    const scales = gradingScales.filter(s => s.level === level);
    if (scales.length > 0) {
      const match = scales.find(s => mark >= s.min_mark && mark <= s.max_mark);
      if (match) return match.grade_letter;
    }
    // Fallback
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
    if (avg >= 70) return "Very good performance. Shows great potential.";
    if (avg >= 60) return "Good performance. Consistent effort is noted.";
    if (avg >= 50) return "Satisfactory performance. Room for improvement.";
    if (avg >= 40) return "Below average. Needs to put in more effort.";
    return "Unsatisfactory. Immediate intervention required.";
  };

  // Convert school logo to base64 for embedding
  const getLogoBase64 = (): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0);
        resolve(canvas.toDataURL("image/png"));
      };
      img.onerror = () => resolve("");
      img.src = schoolLogo;
    });
  };

  const generateReport = async (student: any) => {
    const studentGrades = grades.filter(g => g.student_id === student.user_id);
    const classForStudent = uniqueClasses.find(c => c.id === selectedClassId);
    const level = student.level || classForStudent?.level || "o_level";
    const logoBase64 = await getLogoBase64();

    const allStudentAverages = students.map(s => {
      const sg = grades.filter(g => g.student_id === s.user_id);
      const avg = sg.length > 0 ? sg.reduce((sum, g) => sum + Number(g.mark), 0) / sg.length : 0;
      return { userId: s.user_id, avg };
    }).sort((a, b) => b.avg - a.avg);

    const position = allStudentAverages.findIndex(s => s.userId === student.user_id) + 1;
    const totalStudents = students.length;
    const avg = studentGrades.length > 0 ? Math.round(studentGrades.reduce((sum, g) => sum + Number(g.mark), 0) / studentGrades.length) : 0;
    const totalMark = studentGrades.reduce((sum, g) => sum + Number(g.mark), 0);
    const serialNo = `RPT-${year}-${term.replace("term_", "T")}-${Date.now().toString(36).toUpperCase()}`;
    const termLabel = term.replace("_", " ").toUpperCase();
    const dateGenerated = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });

    const getGradeScaleHTML = () => {
      const scales = gradingScales.filter(s => s.level === level).sort((a, b) => b.max_mark - a.max_mark);
      if (scales.length > 0) {
        return scales.map(s => `<td><strong>${s.grade_letter}</strong> ${s.min_mark}-${s.max_mark}</td>`).join("");
      }
      if (level === "a_level") return '<td><strong>A</strong> 76-100</td><td><strong>B</strong> 67-75</td><td><strong>C</strong> 55-66</td><td><strong>D</strong> 45-54</td><td><strong>E</strong> 35-44</td><td><strong>O</strong> 0-34</td>';
      if (level === "zjc") return '<td><strong>A</strong> 75-100</td><td><strong>B</strong> 65-74</td><td><strong>C</strong> 50-64</td><td><strong>D</strong> 40-49</td><td><strong>U</strong> 0-39</td>';
      return '<td><strong>A</strong> 70-100</td><td><strong>B</strong> 60-69</td><td><strong>C</strong> 50-59</td><td><strong>D</strong> 40-49</td><td><strong>E</strong> 30-39</td><td><strong>U</strong> 0-29</td>';
    };

    const ordinal = (n: number) => n === 1 ? "1st" : n === 2 ? "2nd" : n === 3 ? "3rd" : `${n}th`;

    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Report Card - ${student.profiles?.full_name}</title>
<style>
  @page { size: A4; margin: 12mm; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Georgia', 'Times New Roman', serif; color: #1a1a2e; background: white; font-size: 10pt; }
  .report { max-width: 210mm; margin: 0 auto; position: relative; padding: 15px; border: 2px solid #0a3d62; }
  .watermark { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-35deg); font-size: 72pt; color: rgba(10,61,98,0.04); font-weight: bold; letter-spacing: 10px; z-index: 0; pointer-events: none; }
  .header { display: flex; align-items: center; gap: 15px; border-bottom: 3px double #0a3d62; padding-bottom: 12px; margin-bottom: 12px; }
  .header-logo { width: 80px; height: 80px; border-radius: 50%; border: 3px solid #0a3d62; object-fit: contain; background: white; padding: 4px; }
  .header-logo-fallback { width: 80px; height: 80px; border-radius: 50%; border: 3px solid #0a3d62; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #0a3d62, #1e6f9f); color: white; font-weight: bold; font-size: 24pt; }
  .header-center { flex: 1; text-align: center; }
  .header-center h1 { font-size: 20pt; letter-spacing: 3px; text-transform: uppercase; color: #0a3d62; margin-bottom: 2px; }
  .header-center .motto { font-style: italic; color: #555; font-size: 9pt; margin-bottom: 2px; }
  .header-center .address { font-size: 7.5pt; color: #777; }
  .serial-box { text-align: right; font-size: 7pt; color: #999; font-family: 'Courier New', monospace; }
  .report-title { background: linear-gradient(135deg, #0a3d62, #1e6f9f); color: white; text-align: center; padding: 7px; font-size: 13pt; letter-spacing: 4px; text-transform: uppercase; margin-bottom: 12px; border-radius: 2px; }
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 20px; margin-bottom: 12px; font-size: 9.5pt; }
  .info-grid .row { display: flex; gap: 4px; }
  .info-grid .label { font-weight: bold; color: #0a3d62; min-width: 100px; }
  .info-grid .value { border-bottom: 1px dotted #ccc; flex: 1; padding-bottom: 1px; }
  table.grades { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
  table.grades th { background: #0a3d62; color: white; padding: 7px 5px; text-align: left; font-size: 8.5pt; text-transform: uppercase; letter-spacing: 1px; }
  table.grades td { padding: 6px 5px; border-bottom: 1px solid #e0e0e0; font-size: 9.5pt; }
  table.grades tr:nth-child(even) { background: #f8f9fa; }
  .mark-cell { text-align: center; font-weight: bold; }
  .grade-a { color: #0a8f3c; } .grade-b { color: #1e6f9f; } .grade-c { color: #b8860b; }
  .grade-d { color: #cc6600; } .grade-e,.grade-f { color: #cc0000; }
  .summary-box { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; margin-bottom: 12px; }
  .summary-item { text-align: center; padding: 8px; border: 1px solid #ddd; border-radius: 4px; background: #fafafa; }
  .summary-item .num { font-size: 16pt; font-weight: bold; color: #0a3d62; }
  .summary-item .lbl { font-size: 7pt; color: #777; text-transform: uppercase; letter-spacing: 1px; }
  .comment-box { border: 1px solid #ddd; padding: 10px; margin-bottom: 12px; border-radius: 4px; background: #fafbfc; }
  .comment-box .title { font-weight: bold; color: #0a3d62; font-size: 8.5pt; text-transform: uppercase; margin-bottom: 4px; }
  .signatures { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 30px; margin-top: 25px; }
  .sig-block { text-align: center; }
  .sig-line { border-top: 1px solid #333; padding-top: 4px; font-size: 8.5pt; color: #555; margin-top: 30px; }
  .sig-date { font-size: 7pt; color: #999; margin-top: 2px; }
  .footer { text-align: center; margin-top: 15px; padding-top: 8px; border-top: 2px solid #0a3d62; font-size: 7pt; color: #999; }
  .security-strip { background: repeating-linear-gradient(45deg, transparent, transparent 5px, rgba(10,61,98,0.03) 5px, rgba(10,61,98,0.03) 10px); padding: 4px 10px; text-align: center; font-size: 6.5pt; color: #bbb; font-family: 'Courier New', monospace; margin-top: 8px; border: 1px solid #eee; }
  .grading-key { font-size: 7.5pt; color: #777; margin-bottom: 8px; }
  .grading-key td { padding: 2px 6px; border: 1px solid #e0e0e0; }
  .stamp { position: absolute; bottom: 120px; right: 30px; width: 80px; height: 80px; border: 2px solid rgba(10,61,98,0.15); border-radius: 50%; display: flex; align-items: center; justify-content: center; transform: rotate(-15deg); font-size: 7pt; color: rgba(10,61,98,0.2); font-weight: bold; text-align: center; text-transform: uppercase; }
  @media print { .no-print { display: none; } body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style></head><body>
<div class="watermark">OFFICIAL</div>
<div class="report">
  <div class="serial-box">Serial: ${serialNo}<br/>Date: ${dateGenerated}</div>
  <div class="header">
    ${logoBase64 ? `<img src="${logoBase64}" class="header-logo" alt="School Logo" />` : '<div class="header-logo-fallback">SM</div>'}
    <div class="header-center">
      <h1>${schoolInfo.name}</h1>
      <div class="motto">"${schoolInfo.motto}"</div>
      <div class="address">${schoolInfo.address} | Tel: ${schoolInfo.phone} | Reg: ${schoolInfo.reg}</div>
    </div>
    ${logoBase64 ? `<img src="${logoBase64}" class="header-logo" alt="School Logo" />` : '<div class="header-logo-fallback">SM</div>'}
  </div>
  
  <div class="report-title">Academic Report Card — ${termLabel} ${year}</div>
  
  <div class="info-grid">
    <div class="row"><span class="label">Student Name:</span> <span class="value">${student.profiles?.full_name || "—"}</span></div>
    <div class="row"><span class="label">Student ID:</span> <span class="value">${student.student_id || "—"}</span></div>
    <div class="row"><span class="label">Class:</span> <span class="value">${classForStudent?.name || "—"}</span></div>
    <div class="row"><span class="label">Level:</span> <span class="value">${level.replace("_", " ").toUpperCase()}</span></div>
    <div class="row"><span class="label">Date of Birth:</span> <span class="value">${student.date_of_birth || "—"}</span></div>
    <div class="row"><span class="label">Guardian:</span> <span class="value">${student.guardian_name || "—"}</span></div>
  </div>
  
  <table class="grades">
    <thead><tr><th>#</th><th>Subject</th><th>Code</th><th style="text-align:center">Mark (%)</th><th style="text-align:center">Grade</th><th>Teacher's Comment</th></tr></thead>
    <tbody>
      ${studentGrades.map((g, i) => {
        const grade = getGradeLetter(Number(g.mark), level);
        const gc = grade === "A" ? "grade-a" : grade === "B" ? "grade-b" : grade === "C" ? "grade-c" : grade === "D" ? "grade-d" : "grade-f";
        return `<tr>
          <td>${i + 1}</td>
          <td>${g.subjects?.name || "—"}</td>
          <td>${g.subjects?.code || "—"}</td>
          <td class="mark-cell">${g.mark}</td>
          <td class="mark-cell ${gc}"><strong>${grade}</strong></td>
          <td style="font-size:8.5pt;color:#555">${g.comment || "—"}</td>
        </tr>`;
      }).join("")}
      ${studentGrades.length === 0 ? '<tr><td colspan="6" style="text-align:center;color:#999;padding:20px;">No grades recorded for this term</td></tr>' : ""}
      ${studentGrades.length > 0 ? `<tr style="background:#f0f0f0;font-weight:bold">
        <td colspan="3" style="text-align:right">Total / Average:</td>
        <td class="mark-cell">${totalMark} / ${avg}%</td>
        <td class="mark-cell">${getGradeLetter(avg, level)}</td>
        <td></td>
      </tr>` : ""}
    </tbody>
  </table>
  
  <div class="summary-box">
    <div class="summary-item"><div class="num">${avg}%</div><div class="lbl">Average</div></div>
    <div class="summary-item"><div class="num">${ordinal(position)}</div><div class="lbl">Position</div></div>
    <div class="summary-item"><div class="num">${totalStudents}</div><div class="lbl">Out of</div></div>
    <div class="summary-item"><div class="num">${studentGrades.length}</div><div class="lbl">Subjects</div></div>
    <div class="summary-item"><div class="num">${getGradeLetter(avg, level)}</div><div class="lbl">Overall</div></div>
  </div>
  
  <div class="comment-box">
    <div class="title">Class Teacher's Remark</div>
    <p style="font-size:9.5pt">${getComment(avg)}</p>
  </div>
  
  <div class="comment-box">
    <div class="title">Headmaster's Remark</div>
    <p style="font-size:9.5pt;color:#999">________________________________</p>
  </div>
  
  <table class="grading-key"><tr>${getGradeScaleHTML()}</tr></table>
  
  <div class="signatures">
    <div class="sig-block"><div class="sig-line">Class Teacher</div><div class="sig-date">Date: ____________</div></div>
    <div class="sig-block"><div class="sig-line">Headmaster</div><div class="sig-date">Date: ____________</div></div>
    <div class="sig-block"><div class="sig-line">Parent/Guardian</div><div class="sig-date">Date: ____________</div></div>
  </div>

  <div class="stamp">OFFICIAL<br/>DOCUMENT</div>
  
  <div class="security-strip">
    OFFICIAL ACADEMIC RECORD | Serial: ${serialNo} | Generated: ${dateGenerated} | ${schoolInfo.name} | This document is computer-generated. Any unauthorized alteration renders it void.
  </div>
  
  <div class="footer">
    <p>${schoolInfo.name} | ${schoolInfo.address} | Tel: ${schoolInfo.phone}</p>
    <p>This is an official academic record. Unauthorized reproduction or alteration is a criminal offense.</p>
  </div>
  
  <div class="no-print" style="text-align:center;margin-top:20px;display:flex;gap:10px;justify-content:center">
    <button onclick="window.print()" style="padding:10px 30px;font-size:14px;background:#0a3d62;color:white;border:none;border-radius:4px;cursor:pointer;">🖨️ Print Report Card</button>
    <button onclick="window.close()" style="padding:10px 30px;font-size:14px;background:#666;color:white;border:none;border-radius:4px;cursor:pointer;">✕ Close</button>
  </div>
</div></body></html>`;

    const w = window.open("", "_blank");
    if (w) { w.document.write(html); w.document.close(); }
  };

  const generateAll = async () => {
    setGenerating(true);
    for (let i = 0; i < students.length; i++) {
      await generateReport(students[i]);
      await new Promise(r => setTimeout(r, 300));
    }
    setGenerating(false);
    toast({ title: "Reports Generated", description: `Generated ${students.length} report cards.` });
  };

  return (
    <DashboardLayout role="teacher">
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Report Cards</h1>
          <p className="text-sm text-muted-foreground">Generate professional report cards with grades auto-calculated from your entered marks</p>
        </div>

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
                  const gradeColor = avg >= 70 ? "text-green-600" : avg >= 50 ? "text-yellow-600" : avg > 0 ? "text-red-600" : "text-muted-foreground";

                  return (
                    <div key={s.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                      <span className="w-8 text-sm text-muted-foreground font-mono">{i + 1}.</span>
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                        {(s.profiles?.full_name || "S").charAt(0)}
                      </div>
                      <span className="flex-1 font-medium text-foreground">{s.profiles?.full_name || "Student"}</span>
                      <Badge variant="outline" className="font-mono">{s.student_id || "—"}</Badge>
                      <span className={`text-sm font-bold ${gradeColor}`}>{avg > 0 ? `${avg}%` : "—"}</span>
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

        {!selectedClassId && (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              Select a class above to generate report cards. Grades are automatically pulled from your entered marks.
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default TeacherReports;
