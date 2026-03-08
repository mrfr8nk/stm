import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { AlertTriangle, FileText, Lock, DollarSign, BookOpen, ClipboardCheck, TrendingUp, Download } from "lucide-react";
import { Link } from "react-router-dom";
import { Progress } from "@/components/ui/progress";
import { getGrade, getGradeColor, type GradingScale } from "@/lib/grading";
import schoolLogo from "@/assets/school-logo.png";

const StudentReports = () => {
  const { user } = useAuth();
  const [reportsLocked, setReportsLocked] = useState(true);
  const [hasFeeBalance, setHasFeeBalance] = useState(false);
  const [feeBalance, setFeeBalance] = useState(0);
  const [unpaidTerms, setUnpaidTerms] = useState<string[]>([]);
  const [grades, setGrades] = useState<any[]>([]);
  const [monthlyTests, setMonthlyTests] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [term, setTerm] = useState("term_1");
  const [year, setYear] = useState(new Date().getFullYear());
  const [studentProfile, setStudentProfile] = useState<any>(null);
  const [gradingScales, setGradingScales] = useState<GradingScale[]>([]);
  const [className, setClassName] = useState("");
  const [classStudentCount, setClassStudentCount] = useState(0);
  const [classGrades, setClassGrades] = useState<any[]>([]);
  const [profileName, setProfileName] = useState("");

  const [schoolInfo] = useState({
    name: "St. Mary's High School",
    motto: "Excellence Through Knowledge",
    address: "P.O. Box 123, Harare, Zimbabwe",
    phone: "+263 242 123 456",
    reg: "REG/2024/SM-001"
  });

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      // Check if reports are locked by admin
      const { data: settingsData } = await supabase.from("system_settings").select("value").eq("key", "reports_locked").single();
      setReportsLocked(settingsData?.value === "true");

      // Check fee balance
      const { data: feesData } = await supabase.from("fee_records").select("*").eq("student_id", user.id).is("deleted_at", null);
      let totalBal = 0;
      const owingTerms: string[] = [];
      (feesData || []).forEach(f => {
        const bal = Number(f.amount_due) - Number(f.amount_paid);
        if (bal > 0) { totalBal += bal; owingTerms.push(`${f.term.replace("_", " ").toUpperCase()} ${f.academic_year}`); }
      });
      setFeeBalance(totalBal);
      setHasFeeBalance(totalBal > 0);
      setUnpaidTerms([...new Set(owingTerms)]);

      // Student profile
      const { data: sp } = await supabase.from("student_profiles").select("*").eq("user_id", user.id).single();
      setStudentProfile(sp);

      // Profile name
      const { data: prof } = await supabase.from("profiles").select("full_name").eq("user_id", user.id).single();
      setProfileName(prof?.full_name || "");

      // Class info
      if (sp?.class_id) {
        const { data: cls } = await supabase.from("classes").select("*").eq("id", sp.class_id).single();
        setClassName(cls?.name || "");

        // Grading scales for class level
        const level = sp.level || cls?.level;
        if (level) {
          const { data: scales } = await supabase.from("grading_scales").select("*").eq("level", level);
          setGradingScales((scales as GradingScale[]) || []);
        }

        // Count classmates + fetch all class grades for position calculation
        const { data: classmates } = await supabase.from("student_profiles").select("user_id").eq("class_id", sp.class_id).eq("is_active", true);
        setClassStudentCount(classmates?.length || 0);

        const classmateIds = (classmates || []).map(c => c.user_id);
        if (classmateIds.length > 0) {
          const { data: allGrades } = await supabase.from("grades").select("student_id, mark")
            .in("student_id", classmateIds).eq("term", term as any).eq("academic_year", year).is("deleted_at", null);
          setClassGrades(allGrades || []);
        }
      }

      // Grades
      const { data: gradesData } = await supabase.from("grades").select("*, subjects(name, code)")
        .eq("student_id", user.id).eq("term", term as any).eq("academic_year", year).is("deleted_at", null);
      setGrades(gradesData || []);

      // Monthly tests
      const { data: testsData } = await supabase.from("monthly_tests").select("*, subjects(name)")
        .eq("student_id", user.id).eq("academic_year", year).is("deleted_at", null).order("month");
      setMonthlyTests(testsData || []);

      // Attendance
      const { data: attData } = await supabase.from("attendance").select("*")
        .eq("student_id", user.id).order("date", { ascending: false }).limit(50);
      setAttendance(attData || []);
    };
    fetchData();
  }, [user, term, year]);

  const canViewReports = !reportsLocked && !hasFeeBalance;
  const avgMark = grades.length > 0 ? Math.round(grades.reduce((s, g) => s + Number(g.mark), 0) / grades.length) : 0;
  const presentCount = attendance.filter(a => a.status === "present").length;
  const attendanceRate = attendance.length > 0 ? Math.round((presentCount / attendance.length) * 100) : 0;

  const getGradeLetter = (mark: number) => {
    return getGrade(mark, gradingScales);
  };

  const getComment = (avg: number) => {
    if (avg >= 80) return "Outstanding performance. Keep up the excellent work!";
    if (avg >= 70) return "Very good performance. Shows great potential.";
    if (avg >= 60) return "Good performance. Consistent effort is noted.";
    if (avg >= 50) return "Satisfactory performance. Room for improvement.";
    if (avg >= 40) return "Below average. Needs to put in more effort.";
    return "Unsatisfactory. Immediate intervention required.";
  };

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

  const downloadReportCard = async () => {
    if (!canViewReports || grades.length === 0) return;

    const logoBase64 = await getLogoBase64();
    const level = studentProfile?.level || "o_level";
    const totalMark = grades.reduce((sum, g) => sum + Number(g.mark), 0);

    // Calculate position
    const studentAverages = new Map<string, number>();
    classGrades.forEach(g => {
      const prev = studentAverages.get(g.student_id) || 0;
      studentAverages.set(g.student_id, prev + Number(g.mark));
    });
    // Count subjects per student for average
    const studentSubjectCounts = new Map<string, number>();
    classGrades.forEach(g => {
      studentSubjectCounts.set(g.student_id, (studentSubjectCounts.get(g.student_id) || 0) + 1);
    });
    const sortedAverages = Array.from(studentAverages.entries())
      .map(([sid, total]) => ({ sid, avg: total / (studentSubjectCounts.get(sid) || 1) }))
      .sort((a, b) => b.avg - a.avg);
    const position = sortedAverages.findIndex(s => s.sid === user!.id) + 1;
    const totalStudents = classStudentCount;

    const serialNo = `RPT-${year}-${term.replace("term_", "T")}-${Date.now().toString(36).toUpperCase()}`;
    const termLabel = term.replace("_", " ").toUpperCase();
    const dateGenerated = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
    const ordinal = (n: number) => n === 1 ? "1st" : n === 2 ? "2nd" : n === 3 ? "3rd" : `${n}th`;

    // QR code verification data
    const qrData = encodeURIComponent(JSON.stringify({
      serial: serialNo,
      student: profileName,
      studentId: studentProfile?.student_id || "",
      class: className,
      term: termLabel,
      year,
      avg: avgMark,
      subjects: grades.length,
      school: schoolInfo.name,
      generated: dateGenerated
    }));
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${qrData}`;

    const getGradeScaleHTML = () => {
      const scales = [...gradingScales].sort((a, b) => b.max_mark - a.max_mark);
      if (scales.length > 0) {
        return scales.map(s => `<td><strong>${s.grade_letter}</strong> ${s.min_mark}-${s.max_mark}</td>`).join("");
      }
      return '<td><strong>A</strong> 75-100</td><td><strong>B</strong> 65-74</td><td><strong>C</strong> 50-64</td><td><strong>D</strong> 40-49</td><td><strong>U</strong> 0-39</td>';
    };

    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Report Card - ${profileName}</title>
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
   .qr-section { display: flex; align-items: center; gap: 12px; margin-top: 12px; padding: 10px; border: 1px solid #ddd; border-radius: 4px; background: #fafbfc; }
   .qr-section img { width: 100px; height: 100px; }
   .qr-section .qr-info { font-size: 7pt; color: #888; line-height: 1.6; }
   .qr-section .qr-info strong { color: #0a3d62; }
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
    <div class="row"><span class="label">Student Name:</span> <span class="value">${profileName || "—"}</span></div>
    <div class="row"><span class="label">Student ID:</span> <span class="value">${studentProfile?.student_id || "—"}</span></div>
    <div class="row"><span class="label">Class:</span> <span class="value">${className || "—"}</span></div>
    <div class="row"><span class="label">Level:</span> <span class="value">${level.replace("_", " ").toUpperCase()}</span></div>
    <div class="row"><span class="label">Date of Birth:</span> <span class="value">${studentProfile?.date_of_birth || "—"}</span></div>
    <div class="row"><span class="label">Guardian:</span> <span class="value">${studentProfile?.guardian_name || "—"}</span></div>
  </div>
  
  <table class="grades">
    <thead><tr><th>#</th><th>Subject</th><th>Code</th><th style="text-align:center">Mark (%)</th><th style="text-align:center">Grade</th><th>Teacher's Comment</th></tr></thead>
    <tbody>
      ${grades.map((g, i) => {
        const grade = getGradeLetter(Number(g.mark));
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
      ${grades.length > 0 ? `<tr style="background:#f0f0f0;font-weight:bold">
        <td colspan="3" style="text-align:right">Total / Average:</td>
        <td class="mark-cell">${totalMark} / ${avgMark}%</td>
        <td class="mark-cell">${getGradeLetter(avgMark)}</td>
        <td></td>
      </tr>` : ""}
    </tbody>
  </table>
  
  <div class="summary-box">
    <div class="summary-item"><div class="num">${avgMark}%</div><div class="lbl">Average</div></div>
    <div class="summary-item"><div class="num">${ordinal(position || 1)}</div><div class="lbl">Position</div></div>
    <div class="summary-item"><div class="num">${totalStudents}</div><div class="lbl">Out of</div></div>
    <div class="summary-item"><div class="num">${grades.length}</div><div class="lbl">Subjects</div></div>
    <div class="summary-item"><div class="num">${getGradeLetter(avgMark)}</div><div class="lbl">Overall</div></div>
  </div>
  
  <div class="comment-box">
    <div class="title">Class Teacher's Remark</div>
    <p style="font-size:9.5pt">${getComment(avgMark)}</p>
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
  
  <div class="qr-section">
    <img src="${qrUrl}" alt="Verification QR Code" />
    <div class="qr-info">
      <strong>VERIFICATION QR CODE</strong><br/>
      Scan this code to verify the authenticity of this report card.<br/>
      Serial: <strong>${serialNo}</strong><br/>
      Student: <strong>${profileName}</strong> (${studentProfile?.student_id || "N/A"})<br/>
      Class: <strong>${className}</strong> | ${termLabel} ${year}<br/>
      Average: <strong>${avgMark}%</strong> | Grade: <strong>${getGradeLetter(avgMark)}</strong><br/>
      Generated: ${dateGenerated}<br/>
      <em>Any unauthorized alteration of this document renders it void.</em>
    </div>
  </div>
  
  <div class="security-strip">
    OFFICIAL ACADEMIC RECORD | Serial: ${serialNo} | Generated: ${dateGenerated} | ${schoolInfo.name} | This document is computer-generated and verified by QR code.
  </div>
  
  <div class="footer">
    <p>${schoolInfo.name} | ${schoolInfo.address} | Tel: ${schoolInfo.phone}</p>
    <p>This is an official academic record. Unauthorized reproduction or alteration is a criminal offense.</p>
  </div>
  
  <div class="no-print" style="text-align:center;margin-top:20px;display:flex;gap:10px;justify-content:center">
    <button onclick="window.print()" style="padding:10px 30px;font-size:14px;background:#0a3d62;color:white;border:none;border-radius:4px;cursor:pointer;">🖨️ Print / Save as PDF</button>
    <button onclick="window.close()" style="padding:10px 30px;font-size:14px;background:#666;color:white;border:none;border-radius:4px;cursor:pointer;">✕ Close</button>
  </div>
</div></body></html>`;

    const w = window.open("", "_blank");
    if (w) { w.document.write(html); w.document.close(); }
  };

  return (
    <DashboardLayout role="student">
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">My Academic Records</h1>
            <p className="text-sm text-muted-foreground">View your report cards, monthly test results, and attendance</p>
          </div>
          {studentProfile?.student_id && (
            <Badge variant="outline" className="font-mono text-sm px-3 py-1">
              {studentProfile.student_id}
            </Badge>
          )}
        </div>

        {/* Blocked Messages */}
        {reportsLocked && (
          <Card className="border-l-4 border-l-yellow-500 bg-yellow-500/5">
            <CardContent className="p-4 flex items-center gap-3">
              <Lock className="w-6 h-6 text-yellow-600 shrink-0" />
              <div>
                <p className="font-bold text-yellow-700">Report Cards Are Currently Locked</p>
                <p className="text-sm text-yellow-600">Teachers are still setting up reports. Report cards will be available once the administration unlocks them.</p>
              </div>
            </CardContent>
          </Card>
        )}

        {!reportsLocked && hasFeeBalance && (
          <Card className="border-l-4 border-l-red-500 bg-red-500/5">
            <CardContent className="p-4 flex items-center gap-3">
              <AlertTriangle className="w-6 h-6 text-red-600 shrink-0" />
              <div className="flex-1">
                <p className="font-bold text-red-700">Report Cards Blocked — Outstanding Fees</p>
                <p className="text-sm text-red-600">
                  You have an unpaid balance of <strong>${feeBalance.toFixed(2)}</strong> for: {unpaidTerms.join(", ")}
                </p>
                <p className="text-sm text-red-600 mt-1">Please clear your fee balance to access report cards.</p>
              </div>
              <Link to="/student/fees">
                <Badge variant="destructive"><DollarSign className="w-3 h-3 mr-1" /> View Fees</Badge>
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <select className="border border-input rounded-lg px-3 py-2 bg-background text-foreground text-sm" value={term} onChange={e => setTerm(e.target.value)}>
            <option value="term_1">Term 1</option><option value="term_2">Term 2</option><option value="term_3">Term 3</option>
          </select>
          <select className="border border-input rounded-lg px-3 py-2 bg-background text-foreground text-sm" value={year} onChange={e => setYear(Number(e.target.value))}>
            {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>

        <Tabs defaultValue="report">
          <TabsList>
            <TabsTrigger value="report"><FileText className="w-4 h-4 mr-1" /> Report Card</TabsTrigger>
            <TabsTrigger value="monthly"><BookOpen className="w-4 h-4 mr-1" /> Monthly Tests</TabsTrigger>
            <TabsTrigger value="attendance"><ClipboardCheck className="w-4 h-4 mr-1" /> Attendance</TabsTrigger>
          </TabsList>

          {/* Report Card Tab */}
          <TabsContent value="report" className="space-y-4">
            {canViewReports ? (
              <>
                {grades.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <Card><CardContent className="p-4 text-center">
                      <p className={`text-2xl font-bold ${avgMark >= 60 ? "text-green-600" : avgMark >= 40 ? "text-yellow-600" : "text-red-600"}`}>{avgMark}%</p>
                      <p className="text-xs text-muted-foreground">Average Mark</p>
                    </CardContent></Card>
                    <Card><CardContent className="p-4 text-center">
                      <p className="text-2xl font-bold">{grades.length}</p>
                      <p className="text-xs text-muted-foreground">Subjects</p>
                    </CardContent></Card>
                    <Card><CardContent className="p-4 text-center">
                      <p className="text-2xl font-bold text-primary">{term.replace("_", " ").toUpperCase()}</p>
                      <p className="text-xs text-muted-foreground">{year}</p>
                    </CardContent></Card>
                  </div>
                )}

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-3">
                    <CardTitle className="flex items-center gap-2"><FileText className="w-5 h-5" /> {term.replace("_", " ").toUpperCase()} {year} Report Card</CardTitle>
                    {grades.length > 0 && (
                      <Button onClick={downloadReportCard} variant="outline" size="sm">
                        <Download className="w-4 h-4 mr-2" /> Download Report Card
                      </Button>
                    )}
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow><TableHead>#</TableHead><TableHead>Subject</TableHead><TableHead>Code</TableHead><TableHead>Mark</TableHead><TableHead>Grade</TableHead><TableHead>Comment</TableHead></TableRow>
                      </TableHeader>
                      <TableBody>
                        {grades.map((g, i) => (
                          <TableRow key={g.id} className={Number(g.mark) >= 75 ? "bg-green-500/5" : Number(g.mark) < 40 ? "bg-red-500/5" : ""}>
                            <TableCell>{i + 1}</TableCell>
                            <TableCell className="font-medium">{g.subjects?.name}</TableCell>
                            <TableCell>{g.subjects?.code || "—"}</TableCell>
                            <TableCell className="font-bold">{g.mark}%</TableCell>
                            <TableCell><Badge variant="outline">{g.grade_letter || getGradeLetter(Number(g.mark)) || "—"}</Badge></TableCell>
                            <TableCell className="text-sm text-muted-foreground">{g.comment || "—"}</TableCell>
                          </TableRow>
                        ))}
                        {grades.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No grades recorded for this term.</TableCell></TableRow>}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card>
                <CardContent className="py-10 text-center text-muted-foreground">
                  <Lock className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
                  <p className="font-medium">Report cards are not available at this time.</p>
                  <p className="text-sm mt-1">{reportsLocked ? "Reports are locked by administration." : "Please clear your outstanding fee balance."}</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Monthly Tests Tab */}
          <TabsContent value="monthly" className="space-y-4">
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><TrendingUp className="w-5 h-5" /> Monthly Test Results — {year}</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow><TableHead>Month</TableHead><TableHead>Subject</TableHead><TableHead>Mark</TableHead><TableHead>Grade</TableHead></TableRow>
                  </TableHeader>
                  <TableBody>
                    {monthlyTests.map(t => {
                      const grade = getGradeLetter(Number(t.mark));
                      return (
                        <TableRow key={t.id} className={Number(t.mark) >= 75 ? "bg-green-500/5" : Number(t.mark) < 40 ? "bg-red-500/5" : ""}>
                          <TableCell>{["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][t.month]}</TableCell>
                          <TableCell className="font-medium">{t.subjects?.name || "—"}</TableCell>
                          <TableCell className="font-bold">{t.mark}%</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={getGradeColor(grade)}>
                              {grade}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {monthlyTests.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">No monthly test results yet.</TableCell></TableRow>}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Attendance Tab */}
          <TabsContent value="attendance" className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold">{attendance.length}</p><p className="text-xs text-muted-foreground">Total Days</p></CardContent></Card>
              <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-green-600">{presentCount}</p><p className="text-xs text-muted-foreground">Present</p></CardContent></Card>
              <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-red-600">{attendance.filter(a => a.status === "absent").length}</p><p className="text-xs text-muted-foreground">Absent</p></CardContent></Card>
              <Card><CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-primary">{attendanceRate}%</p>
                <p className="text-xs text-muted-foreground">Rate</p>
                <Progress value={attendanceRate} className="h-1.5 mt-2" />
              </CardContent></Card>
            </div>

            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><ClipboardCheck className="w-5 h-5" /> Recent Attendance</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Status</TableHead><TableHead>Notes</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {attendance.slice(0, 30).map(a => {
                      const colors: Record<string, string> = {
                        present: "bg-green-500/10 text-green-700",
                        absent: "bg-red-500/10 text-red-700",
                        late: "bg-yellow-500/10 text-yellow-700",
                        excused: "bg-blue-500/10 text-blue-700",
                      };
                      return (
                        <TableRow key={a.id}>
                          <TableCell>{new Date(a.date).toLocaleDateString()}</TableCell>
                          <TableCell><Badge className={colors[a.status] || ""} variant="outline">{a.status.charAt(0).toUpperCase() + a.status.slice(1)}</Badge></TableCell>
                          <TableCell className="text-sm text-muted-foreground">{a.notes || "—"}</TableCell>
                        </TableRow>
                      );
                    })}
                    {attendance.length === 0 && <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-8">No attendance records.</TableCell></TableRow>}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default StudentReports;
