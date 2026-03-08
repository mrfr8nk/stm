import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { FileText, Download, Lock, AlertTriangle, DollarSign } from "lucide-react";
import { Link } from "react-router-dom";
import { getGrade, type GradingScale } from "@/lib/grading";
import schoolLogo from "@/assets/school-logo.png";

const ParentReports = () => {
  const { user } = useAuth();
  const [children, setChildren] = useState<any[]>([]);
  const [selectedChild, setSelectedChild] = useState("");
  const [grades, setGrades] = useState<any[]>([]);
  const [reportsLocked, setReportsLocked] = useState(true);
  const [feeBalance, setFeeBalance] = useState(0);
  const [studentProfile, setStudentProfile] = useState<any>(null);
  const [profileName, setProfileName] = useState("");
  const [className, setClassName] = useState("");
  const [gradingScales, setGradingScales] = useState<GradingScale[]>([]);
  const [classGrades, setClassGrades] = useState<any[]>([]);
  const [classStudentCount, setClassStudentCount] = useState(0);
  const [term, setTerm] = useState("term_1");
  const [year, setYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);

  const [schoolInfo] = useState({
    name: "St. Mary's High School",
    motto: "Excellence Through Knowledge",
    address: "P.O. Box 123, Harare, Zimbabwe",
    phone: "+263 242 123 456",
    reg: "REG/2024/SM-001"
  });

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const { data: links } = await supabase.from("parent_student_links").select("student_id").eq("parent_id", user.id);
      const ids = (links || []).map(l => l.student_id);
      if (ids.length > 0) {
        const { data: profiles } = await supabase.from("profiles").select("*").in("user_id", ids);
        const { data: sps } = await supabase.from("student_profiles").select("*, classes(name)").in("user_id", ids);
        const merged = ids.map(id => ({
          id,
          name: profiles?.find(p => p.user_id === id)?.full_name || "Student",
          sp: sps?.find(s => s.user_id === id),
        }));
        setChildren(merged);
        if (!selectedChild && merged.length > 0) setSelectedChild(merged[0].id);
      }
      const { data: settings } = await supabase.from("system_settings").select("value").eq("key", "reports_locked").single();
      setReportsLocked(settings?.value === "true");
      setLoading(false);
    };
    fetch();
  }, [user]);

  useEffect(() => {
    if (!selectedChild) return;
    const fetchChild = async () => {
      const child = children.find(c => c.id === selectedChild);
      if (!child) return;
      setProfileName(child.name);
      setStudentProfile(child.sp);
      setClassName(child.sp?.classes?.name || "");

      const level = child.sp?.level;
      if (level) {
        const { data: scales } = await supabase.from("grading_scales").select("*").eq("level", level);
        setGradingScales((scales as GradingScale[]) || []);
      }

      // Fees
      const { data: fees } = await supabase.from("fee_records").select("*").eq("student_id", selectedChild).is("deleted_at", null);
      let bal = 0;
      (fees || []).forEach(f => { bal += Math.max(0, Number(f.amount_due) - Number(f.amount_paid)); });
      setFeeBalance(bal);

      // Grades
      const { data: g } = await supabase.from("grades").select("*, subjects(name, code)")
        .eq("student_id", selectedChild).eq("term", term as any).eq("academic_year", year).is("deleted_at", null);
      setGrades(g || []);

      // Class position
      if (child.sp?.class_id) {
        const { data: classmates } = await supabase.from("student_profiles").select("user_id").eq("class_id", child.sp.class_id).eq("is_active", true);
        setClassStudentCount(classmates?.length || 0);
        const classmateIds = (classmates || []).map(c => c.user_id);
        if (classmateIds.length > 0) {
          const { data: allG } = await supabase.from("grades").select("student_id, mark")
            .in("student_id", classmateIds).eq("term", term as any).eq("academic_year", year).is("deleted_at", null);
          setClassGrades(allG || []);
        }
      }
    };
    fetchChild();
  }, [selectedChild, term, year, children]);

  const canView = !reportsLocked && feeBalance <= 0;
  const avgMark = grades.length > 0 ? Math.round(grades.reduce((s, g) => s + Number(g.mark), 0) / grades.length) : 0;

  const getGradeLetter = (mark: number) => getGrade(mark, gradingScales);

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
        canvas.width = img.width; canvas.height = img.height;
        canvas.getContext("2d")?.drawImage(img, 0, 0);
        resolve(canvas.toDataURL("image/png"));
      };
      img.onerror = () => resolve("");
      img.src = schoolLogo;
    });
  };

  const downloadReportCard = async () => {
    if (!canView || grades.length === 0) return;
    const logoBase64 = await getLogoBase64();
    const level = studentProfile?.level || "o_level";
    const totalMark = grades.reduce((sum, g) => sum + Number(g.mark), 0);

    const studentAverages = new Map<string, number>();
    const studentSubjectCounts = new Map<string, number>();
    classGrades.forEach(g => {
      studentAverages.set(g.student_id, (studentAverages.get(g.student_id) || 0) + Number(g.mark));
      studentSubjectCounts.set(g.student_id, (studentSubjectCounts.get(g.student_id) || 0) + 1);
    });
    const sortedAvg = Array.from(studentAverages.entries())
      .map(([sid, total]) => ({ sid, avg: total / (studentSubjectCounts.get(sid) || 1) }))
      .sort((a, b) => b.avg - a.avg);
    const position = sortedAvg.findIndex(s => s.sid === selectedChild) + 1;

    const serialNo = `RPT-${year}-${term.replace("term_", "T")}-${Date.now().toString(36).toUpperCase()}`;
    const termLabel = term.replace("_", " ").toUpperCase();
    const dateGenerated = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
    const ordinal = (n: number) => n === 1 ? "1st" : n === 2 ? "2nd" : n === 3 ? "3rd" : `${n}th`;

    // Save verification record
    await supabase.from("report_verifications").insert({
      serial_number: serialNo,
      student_id: selectedChild,
      student_name: profileName,
      student_code: studentProfile?.student_id || null,
      class_name: className,
      level: level,
      term: termLabel,
      academic_year: year,
      average_mark: avgMark,
      subjects_count: grades.length,
      position: position || null,
      total_students: classStudentCount || null,
      generated_by: user?.id,
    });

    const verifyUrl = `${window.location.origin}/verify-report?serial=${encodeURIComponent(serialNo)}`;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(verifyUrl)}`;

    const getGradeScaleHTML = () => {
      const scales = [...gradingScales].sort((a, b) => b.max_mark - a.max_mark);
      if (scales.length > 0) return scales.map(s => `<td><strong>${s.grade_letter}</strong> ${s.min_mark}-${s.max_mark}</td>`).join("");
      return '<td><strong>A</strong> 75-100</td><td><strong>B</strong> 65-74</td><td><strong>C</strong> 50-64</td><td><strong>D</strong> 40-49</td><td><strong>U</strong> 0-39</td>';
    };

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Report Card - ${profileName}</title>
<style>
  @page { size: A4; margin: 12mm; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Georgia', 'Times New Roman', serif; color: #1a1a2e; background: white; font-size: 10pt; }
  .report { max-width: 210mm; margin: 0 auto; padding: 15px; border: 2px solid #0a3d62; }
  .watermark { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-35deg); font-size: 72pt; color: rgba(10,61,98,0.04); font-weight: bold; z-index: 0; pointer-events: none; }
  .header { display: flex; align-items: center; gap: 15px; border-bottom: 3px double #0a3d62; padding-bottom: 12px; margin-bottom: 12px; }
  .header-logo { width: 80px; height: 80px; border-radius: 50%; border: 3px solid #0a3d62; object-fit: contain; background: white; padding: 4px; }
  .header-logo-fallback { width: 80px; height: 80px; border-radius: 50%; border: 3px solid #0a3d62; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #0a3d62, #1e6f9f); color: white; font-weight: bold; font-size: 24pt; }
  .header-center { flex: 1; text-align: center; }
  .header-center h1 { font-size: 20pt; letter-spacing: 3px; text-transform: uppercase; color: #0a3d62; }
  .header-center .motto { font-style: italic; color: #555; font-size: 9pt; }
  .header-center .address { font-size: 7.5pt; color: #777; }
  .serial-box { text-align: right; font-size: 7pt; color: #999; font-family: 'Courier New', monospace; }
  .report-title { background: linear-gradient(135deg, #0a3d62, #1e6f9f); color: white; text-align: center; padding: 7px; font-size: 13pt; letter-spacing: 4px; text-transform: uppercase; margin-bottom: 12px; border-radius: 2px; }
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 20px; margin-bottom: 12px; font-size: 9.5pt; }
  .info-grid .row { display: flex; gap: 4px; }
  .info-grid .label { font-weight: bold; color: #0a3d62; min-width: 100px; }
  .info-grid .value { border-bottom: 1px dotted #ccc; flex: 1; }
  table.grades { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
  table.grades th { background: #0a3d62; color: white; padding: 7px 5px; text-align: left; font-size: 8.5pt; text-transform: uppercase; }
  table.grades td { padding: 6px 5px; border-bottom: 1px solid #e0e0e0; font-size: 9.5pt; }
  table.grades tr:nth-child(even) { background: #f8f9fa; }
  .mark-cell { text-align: center; font-weight: bold; }
  .summary-box { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; margin-bottom: 12px; }
  .summary-item { text-align: center; padding: 8px; border: 1px solid #ddd; border-radius: 4px; background: #fafafa; }
  .summary-item .num { font-size: 16pt; font-weight: bold; color: #0a3d62; }
  .summary-item .lbl { font-size: 7pt; color: #777; text-transform: uppercase; }
  .comment-box { border: 1px solid #ddd; padding: 10px; margin-bottom: 12px; border-radius: 4px; background: #fafbfc; }
  .comment-box .title { font-weight: bold; color: #0a3d62; font-size: 8.5pt; text-transform: uppercase; margin-bottom: 4px; }
  .signatures { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 30px; margin-top: 25px; }
  .sig-line { border-top: 1px solid #333; padding-top: 4px; font-size: 8.5pt; color: #555; margin-top: 30px; text-align: center; }
  .qr-section { display: flex; align-items: center; gap: 12px; margin-top: 12px; padding: 10px; border: 1px solid #ddd; border-radius: 4px; background: #fafbfc; }
  .qr-section img { width: 100px; height: 100px; }
  .qr-section .qr-info { font-size: 7pt; color: #888; line-height: 1.6; }
  .qr-section .qr-info strong { color: #0a3d62; }
  .grading-key { font-size: 7.5pt; color: #777; margin-bottom: 8px; }
  .grading-key td { padding: 2px 6px; border: 1px solid #e0e0e0; }
  .footer { text-align: center; margin-top: 15px; padding-top: 8px; border-top: 2px solid #0a3d62; font-size: 7pt; color: #999; }
  .stamp { position: absolute; bottom: 120px; right: 30px; width: 80px; height: 80px; border: 2px solid rgba(10,61,98,0.15); border-radius: 50%; display: flex; align-items: center; justify-content: center; transform: rotate(-15deg); font-size: 7pt; color: rgba(10,61,98,0.2); font-weight: bold; text-align: center; text-transform: uppercase; }
  @media print { .no-print { display: none; } body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style></head><body>
<div class="watermark">OFFICIAL</div>
<div class="report">
  <div class="serial-box">Serial: ${serialNo}<br/>Date: ${dateGenerated}</div>
  <div class="header">
    ${logoBase64 ? `<img src="${logoBase64}" class="header-logo" />` : '<div class="header-logo-fallback">SM</div>'}
    <div class="header-center">
      <h1>${schoolInfo.name}</h1>
      <div class="motto">"${schoolInfo.motto}"</div>
      <div class="address">${schoolInfo.address} | Tel: ${schoolInfo.phone}</div>
    </div>
    ${logoBase64 ? `<img src="${logoBase64}" class="header-logo" />` : '<div class="header-logo-fallback">SM</div>'}
  </div>
  <div class="report-title">Academic Report Card — ${termLabel} ${year}</div>
  <div class="info-grid">
    <div class="row"><span class="label">Student Name:</span><span class="value">${profileName}</span></div>
    <div class="row"><span class="label">Student ID:</span><span class="value">${studentProfile?.student_id || "—"}</span></div>
    <div class="row"><span class="label">Class:</span><span class="value">${className}</span></div>
    <div class="row"><span class="label">Level:</span><span class="value">${level.replace("_", " ").toUpperCase()}</span></div>
  </div>
  <table class="grades">
    <thead><tr><th>#</th><th>Subject</th><th>Code</th><th style="text-align:center">Mark (%)</th><th style="text-align:center">Grade</th><th>Comment</th></tr></thead>
    <tbody>
      ${grades.map((g, i) => `<tr><td>${i + 1}</td><td>${g.subjects?.name || "—"}</td><td>${g.subjects?.code || "—"}</td><td class="mark-cell">${g.mark}</td><td class="mark-cell"><strong>${getGradeLetter(Number(g.mark))}</strong></td><td style="font-size:8.5pt;color:#555">${g.comment || "—"}</td></tr>`).join("")}
      <tr style="background:#f0f0f0;font-weight:bold"><td colspan="3" style="text-align:right">Total / Average:</td><td class="mark-cell">${totalMark} / ${avgMark}%</td><td class="mark-cell">${getGradeLetter(avgMark)}</td><td></td></tr>
    </tbody>
  </table>
  <div class="summary-box">
    <div class="summary-item"><div class="num">${avgMark}%</div><div class="lbl">Average</div></div>
    <div class="summary-item"><div class="num">${ordinal(position || 1)}</div><div class="lbl">Position</div></div>
    <div class="summary-item"><div class="num">${classStudentCount}</div><div class="lbl">Out of</div></div>
    <div class="summary-item"><div class="num">${grades.length}</div><div class="lbl">Subjects</div></div>
    <div class="summary-item"><div class="num">${getGradeLetter(avgMark)}</div><div class="lbl">Overall</div></div>
  </div>
  <div class="comment-box"><div class="title">Class Teacher's Remark</div><p style="font-size:9.5pt">${getComment(avgMark)}</p></div>
  <div class="comment-box"><div class="title">Headmaster's Remark</div><p style="font-size:9.5pt;color:#999">________________________________</p></div>
  <table class="grading-key"><tr>${getGradeScaleHTML()}</tr></table>
  <div class="signatures">
    <div><div class="sig-line">Class Teacher</div></div>
    <div><div class="sig-line">Headmaster</div></div>
    <div><div class="sig-line">Parent/Guardian</div></div>
  </div>
  <div class="stamp">OFFICIAL<br/>DOCUMENT</div>
  <div class="qr-section">
    <img src="${qrUrl}" alt="QR Code" />
    <div class="qr-info">
      <strong>VERIFICATION QR CODE</strong><br/>
      Scan to verify this report card at:<br/><strong>${verifyUrl}</strong><br/>
      Serial: <strong>${serialNo}</strong><br/>
      Student: <strong>${profileName}</strong> (${studentProfile?.student_id || "N/A"})<br/>
      Generated: ${dateGenerated}<br/>
      <em>Any unauthorized alteration renders this void.</em>
    </div>
  </div>
  <div class="footer">
    <p>${schoolInfo.name} | ${schoolInfo.address} | Tel: ${schoolInfo.phone}</p>
    <p>This is an official academic record verified by QR code.</p>
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
    <DashboardLayout role="parent">
      <div className="space-y-6">
        <h1 className="font-display text-2xl font-bold text-foreground">Children's Report Cards</h1>

        <div className="flex flex-wrap gap-3">
          {children.length > 1 && (
            <select className="border border-input rounded-lg px-3 py-2 bg-background text-sm" value={selectedChild} onChange={e => setSelectedChild(e.target.value)}>
              {children.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}
          <select className="border border-input rounded-lg px-3 py-2 bg-background text-sm" value={term} onChange={e => setTerm(e.target.value)}>
            <option value="term_1">Term 1</option><option value="term_2">Term 2</option><option value="term_3">Term 3</option>
          </select>
          <select className="border border-input rounded-lg px-3 py-2 bg-background text-sm" value={year} onChange={e => setYear(Number(e.target.value))}>
            {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>

        {reportsLocked && (
          <Card className="border-l-4 border-l-yellow-500 bg-yellow-500/5">
            <CardContent className="p-4 flex items-center gap-3">
              <Lock className="w-6 h-6 text-yellow-600" />
              <div>
                <p className="font-bold text-yellow-700">Reports Are Locked</p>
                <p className="text-sm text-yellow-600">Report cards will be available once administration unlocks them.</p>
              </div>
            </CardContent>
          </Card>
        )}

        {!reportsLocked && feeBalance > 0 && (
          <Card className="border-l-4 border-l-destructive bg-destructive/5">
            <CardContent className="p-4 flex items-center gap-3">
              <AlertTriangle className="w-6 h-6 text-destructive" />
              <div>
                <p className="font-bold text-destructive">Reports Blocked — Outstanding Balance: ${feeBalance.toFixed(2)}</p>
                <p className="text-sm text-destructive/80">Please clear fees to access report cards.</p>
              </div>
            </CardContent>
          </Card>
        )}

        {canView ? (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-3">
              <CardTitle className="flex items-center gap-2"><FileText className="w-5 h-5" /> {profileName}'s Report — {term.replace("_", " ").toUpperCase()} {year}</CardTitle>
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
                    <TableRow key={g.id}>
                      <TableCell>{i + 1}</TableCell>
                      <TableCell className="font-medium">{g.subjects?.name}</TableCell>
                      <TableCell>{g.subjects?.code || "—"}</TableCell>
                      <TableCell className="font-bold">{g.mark}%</TableCell>
                      <TableCell><Badge variant="outline">{g.grade_letter || getGradeLetter(Number(g.mark))}</Badge></TableCell>
                      <TableCell className="text-sm text-muted-foreground">{g.comment || "—"}</TableCell>
                    </TableRow>
                  ))}
                  {grades.length === 0 && (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No grades recorded for this term.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              <Lock className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
              <p className="font-medium">Report cards are not available at this time.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default ParentReports;
