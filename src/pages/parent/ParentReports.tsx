import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import QRCode from "qrcode";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { FileText, Download, Lock, AlertTriangle, Printer, Share2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
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
  const [isGenerating, setIsGenerating] = useState(false);
  const logoBase64Ref = useRef<string>("");

  const [schoolInfo] = useState({
    name: "St. Mary's High School",
    motto: "Excellence Through Knowledge",
    address: "P.O. Box 123, Harare, Zimbabwe",
    phone: "+263 242 123 456",
  });

  // Pre-load logo
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      canvas.getContext("2d")?.drawImage(img, 0, 0);
      logoBase64Ref.current = canvas.toDataURL("image/png");
    };
    img.src = schoolLogo;
  }, []);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const [linksRes, settingsRes] = await Promise.all([
        supabase.from("parent_student_links").select("student_id").eq("parent_id", user.id),
        supabase.from("system_settings").select("value").eq("key", "reports_locked").single(),
      ]);
      
      setReportsLocked(settingsRes.data?.value === "true");
      
      const ids = (linksRes.data || []).map(l => l.student_id);
      if (ids.length > 0) {
        const [profilesRes, spsRes] = await Promise.all([
          supabase.from("profiles").select("*").in("user_id", ids),
          supabase.from("student_profiles").select("*, classes(name)").in("user_id", ids),
        ]);
        const merged = ids.map(id => ({
          id,
          name: profilesRes.data?.find(p => p.user_id === id)?.full_name || "Student",
          sp: spsRes.data?.find(s => s.user_id === id),
        }));
        setChildren(merged);
        if (!selectedChild && merged.length > 0) setSelectedChild(merged[0].id);
      }
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
      
      // Parallel fetch grades, fees, scales, classmates
      const promises: Promise<any>[] = [
        Promise.resolve(supabase.from("grades").select("*, subjects(name, code)")
          .eq("student_id", selectedChild).eq("term", term as any).eq("academic_year", year).is("deleted_at", null)),
        Promise.resolve(supabase.from("fee_records").select("*").eq("student_id", selectedChild).is("deleted_at", null)),
      ];
      
      if (level) {
        promises.push(Promise.resolve(supabase.from("grading_scales").select("*").eq("level", level)));
      }
      
      if (child.sp?.class_id) {
        promises.push(Promise.resolve(supabase.from("student_profiles").select("user_id").eq("class_id", child.sp.class_id).eq("is_active", true)));
      }

      const results = await Promise.all(promises);
      
      setGrades(results[0].data || []);
      
      let bal = 0;
      (results[1].data || []).forEach((f: any) => { bal += Math.max(0, Number(f.amount_due) - Number(f.amount_paid)); });
      setFeeBalance(bal);
      
      if (level && results[2]) setGradingScales((results[2].data as GradingScale[]) || []);
      
      const classmatesIdx = level ? 3 : 2;
      if (child.sp?.class_id && results[classmatesIdx]) {
        const classmates = results[classmatesIdx].data || [];
        setClassStudentCount(classmates.length);
        const classmateIds = classmates.map((c: any) => c.user_id);
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
  const avgMark = grades.length > 0 ? parseFloat((grades.reduce((s, g) => s + Number(g.mark), 0) / grades.length).toFixed(1)) : 0;
  const getGradeLetter = (mark: number) => getGrade(mark, gradingScales);

  const getComment = (avg: number) => {
    if (avg >= 80) return "Outstanding performance. Keep up the excellent work!";
    if (avg >= 70) return "Very good performance. Shows great potential.";
    if (avg >= 60) return "Good performance. Consistent effort is noted.";
    if (avg >= 50) return "Satisfactory performance. Room for improvement.";
    if (avg >= 40) return "Below average. Needs to put in more effort.";
    return "Unsatisfactory. Immediate intervention required.";
  };

  const generateReportPDF = async () => {
    if (!canView || grades.length === 0) return null;

    const level = studentProfile?.level || "o_level";
    const totalMark = grades.reduce((sum: number, g: any) => sum + Number(g.mark), 0);

    // Position calculation
    const studentTotals = new Map<string, number>();
    const studentCounts = new Map<string, number>();
    classGrades.forEach(g => {
      studentTotals.set(g.student_id, (studentTotals.get(g.student_id) || 0) + Number(g.mark));
      studentCounts.set(g.student_id, (studentCounts.get(g.student_id) || 0) + 1);
    });
    const sortedAvg = Array.from(studentTotals.entries())
      .map(([sid, total]) => ({ sid, avg: total / (studentCounts.get(sid) || 1) }))
      .sort((a, b) => b.avg - a.avg);
    const position = sortedAvg.findIndex(s => s.sid === selectedChild) + 1;

    const serialNo = `RPT-${year}-${term.replace("term_", "T")}-${Date.now().toString(36).toUpperCase()}`;
    const termLabel = term.replace("_", " ").toUpperCase();
    const dateGenerated = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
    const ordinal = (n: number) => n === 1 ? "1st" : n === 2 ? "2nd" : n === 3 ? "3rd" : `${n}th`;

    // Save verification
    await supabase.from("report_verifications").insert({
      serial_number: serialNo, student_id: selectedChild, student_name: profileName,
      student_code: studentProfile?.student_id || null, class_name: className, level,
      term: termLabel, academic_year: year, average_mark: avgMark,
      subjects_count: grades.length, position: position || null,
      total_students: classStudentCount || null, generated_by: user?.id,
    });

    const verifyUrl = `${window.location.origin}/verify-report?serial=${encodeURIComponent(serialNo)}`;
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pw = doc.internal.pageSize.getWidth();
    const pc: [number, number, number] = [10, 61, 98];

    // Logo
    const logo = logoBase64Ref.current;
    if (logo) {
      try { doc.addImage(logo, "PNG", 15, 10, 18, 18); } catch {}
      try { doc.addImage(logo, "PNG", pw - 33, 10, 18, 18); } catch {}
    }

    // Header
    doc.setFontSize(18); doc.setFont("helvetica", "bold"); doc.setTextColor(...pc);
    doc.text(schoolInfo.name.toUpperCase(), pw / 2, 18, { align: "center" });
    doc.setFontSize(8); doc.setFont("helvetica", "italic"); doc.setTextColor(100);
    doc.text(`"${schoolInfo.motto}"`, pw / 2, 23, { align: "center" });
    doc.setFontSize(7); doc.setFont("helvetica", "normal"); doc.setTextColor(130);
    doc.text(`${schoolInfo.address} | Tel: ${schoolInfo.phone}`, pw / 2, 27, { align: "center" });

    doc.setDrawColor(...pc); doc.setLineWidth(0.6);
    doc.line(15, 30, pw - 15, 30); doc.line(15, 31, pw - 15, 31);

    doc.setFillColor(...pc); doc.rect(15, 34, pw - 30, 9, "F");
    doc.setFontSize(11); doc.setFont("helvetica", "bold"); doc.setTextColor(255);
    doc.text(`ACADEMIC REPORT CARD — ${termLabel} ${year}`, pw / 2, 40, { align: "center" });

    let y = 48;
    doc.setFontSize(9);
    const infoRows = [
      ["Student Name:", profileName || "—", "Student ID:", studentProfile?.student_id || "—"],
      ["Class:", className || "—", "Level:", level.replace("_", " ").toUpperCase()],
    ];
    infoRows.forEach(row => {
      doc.setFont("helvetica", "bold"); doc.setTextColor(...pc); doc.text(row[0], 16, y);
      doc.setFont("helvetica", "normal"); doc.setTextColor(30); doc.text(row[1], 50, y);
      doc.setFont("helvetica", "bold"); doc.setTextColor(...pc); doc.text(row[2], pw / 2 + 5, y);
      doc.setFont("helvetica", "normal"); doc.setTextColor(30); doc.text(row[3], pw / 2 + 35, y);
      y += 6;
    });
    y += 3;

    // Grades table
    const gradeRows = grades.map((g: any, i: number) => [
      String(i + 1), g.subjects?.name || "—", g.subjects?.code || "—",
      String(g.mark), getGradeLetter(Number(g.mark)), g.comment || "—"
    ]);
    gradeRows.push(["", "TOTAL / AVERAGE", "", `${totalMark} / ${avgMark}%`, getGradeLetter(avgMark), ""]);

    autoTable(doc, {
      head: [["#", "Subject", "Code", "Mark (%)", "Grade", "Comment"]],
      body: gradeRows, startY: y,
      styles: { fontSize: 8, cellPadding: 2.5 },
      headStyles: { fillColor: pc, textColor: 255, fontStyle: "bold", fontSize: 7.5 },
      alternateRowStyles: { fillColor: [245, 247, 250] },
      columnStyles: { 0: { cellWidth: 8, halign: "center" }, 3: { halign: "center", fontStyle: "bold" }, 4: { halign: "center", fontStyle: "bold" }, 5: { fontSize: 7, textColor: [100, 100, 100] } },
      margin: { left: 15, right: 15 },
      didParseCell: (data: any) => {
        if (data.row.index === gradeRows.length - 1) { data.cell.styles.fillColor = [230, 235, 240]; data.cell.styles.fontStyle = "bold"; }
      },
    });

    y = (doc as any).lastAutoTable.finalY + 6;

    // Summary boxes
    const items = [
      { label: "Average", value: `${avgMark}%` }, { label: "Position", value: ordinal(position || 1) },
      { label: "Out of", value: String(classStudentCount) }, { label: "Subjects", value: String(grades.length) },
      { label: "Overall", value: getGradeLetter(avgMark) },
    ];
    const boxW = (pw - 30 - 16) / 5;
    items.forEach((item, i) => {
      const bx = 15 + i * (boxW + 4);
      doc.setDrawColor(200); doc.setFillColor(250, 250, 252); doc.roundedRect(bx, y, boxW, 16, 2, 2, "FD");
      doc.setFontSize(14); doc.setFont("helvetica", "bold"); doc.setTextColor(...pc);
      doc.text(item.value, bx + boxW / 2, y + 8, { align: "center" });
      doc.setFontSize(6); doc.setFont("helvetica", "normal"); doc.setTextColor(130);
      doc.text(item.label.toUpperCase(), bx + boxW / 2, y + 13, { align: "center" });
    });
    y += 22;

    // Comments
    doc.setFillColor(250, 251, 252); doc.setDrawColor(220); doc.roundedRect(15, y, pw - 30, 14, 2, 2, "FD");
    doc.setFontSize(7); doc.setFont("helvetica", "bold"); doc.setTextColor(...pc); doc.text("CLASS TEACHER'S REMARK", 18, y + 4);
    doc.setFont("helvetica", "normal"); doc.setTextColor(60); doc.setFontSize(8); doc.text(getComment(avgMark), 18, y + 10);
    y += 18;
    doc.setFillColor(250, 251, 252); doc.roundedRect(15, y, pw - 30, 14, 2, 2, "FD");
    doc.setFontSize(7); doc.setFont("helvetica", "bold"); doc.setTextColor(...pc); doc.text("HEADMASTER'S REMARK", 18, y + 4);
    doc.setFont("helvetica", "normal"); doc.setTextColor(180); doc.setFontSize(8); doc.text("________________________________", 18, y + 10);
    y += 18;

    // Grading key
    const scales = [...gradingScales].sort((a, b) => b.max_mark - a.max_mark);
    if (scales.length > 0) {
      doc.setFontSize(6.5); doc.setTextColor(130);
      doc.text(`Grading Key: ${scales.map(s => `${s.grade_letter}: ${s.min_mark}-${s.max_mark}`).join("  |  ")}`, 15, y);
      y += 5;
    }

    // Signatures
    const sigY = y + 5;
    ["Class Teacher", "Headmaster", "Parent/Guardian"].forEach((label, i) => {
      const sigW = (pw - 30 - 20) / 3;
      const sx = 15 + i * (sigW + 10);
      doc.setDrawColor(60); doc.setLineWidth(0.3); doc.line(sx, sigY + 12, sx + sigW, sigY + 12);
      doc.setFontSize(7.5); doc.setTextColor(100); doc.text(label, sx + sigW / 2, sigY + 16, { align: "center" });
    });
    y = sigY + 26;

    // QR code
    try {
      const qrImg = await QRCode.toDataURL(verifyUrl, { width: 200, margin: 1 });
      doc.setDrawColor(220); doc.setFillColor(250, 251, 252); doc.roundedRect(15, y, pw - 30, 28, 2, 2, "FD");
      doc.addImage(qrImg, "PNG", 18, y + 2, 24, 24);
      doc.setFontSize(7); doc.setFont("helvetica", "bold"); doc.setTextColor(...pc);
      doc.text("VERIFICATION QR CODE", 46, y + 5);
      doc.setFont("helvetica", "normal"); doc.setTextColor(130); doc.setFontSize(6.5);
      doc.text(`Serial: ${serialNo}`, 46, y + 9);
      doc.text(`Student: ${profileName} (${studentProfile?.student_id || "N/A"})`, 46, y + 13);
      doc.text(`Generated: ${dateGenerated}`, 46, y + 17);
    } catch {}
    y += 32;

    // Footer
    doc.setFillColor(245, 245, 248); doc.rect(15, y, pw - 30, 6, "F");
    doc.setFontSize(5); doc.setTextColor(180);
    doc.text(`OFFICIAL ACADEMIC RECORD | Serial: ${serialNo} | Generated: ${dateGenerated} | ${schoolInfo.name}`, pw / 2, y + 3.5, { align: "center" });
    y += 9;
    doc.setDrawColor(...pc); doc.setLineWidth(0.5); doc.line(15, y, pw - 15, y);
    doc.setFontSize(6); doc.setTextColor(160);
    doc.text(`${schoolInfo.name} | ${schoolInfo.address} | Tel: ${schoolInfo.phone}`, pw / 2, y + 4, { align: "center" });

    return { doc, serialNo };
  };

  const downloadReportCard = async () => {
    setIsGenerating(true);
    try {
      const result = await generateReportPDF();
      if (!result) return;
      result.doc.save(`Report_${profileName.replace(/\s+/g, "_")}_${term.toUpperCase()}_${year}.pdf`);
    } finally { setIsGenerating(false); }
  };

  const printReportCard = async () => {
    setIsGenerating(true);
    try {
      const result = await generateReportPDF();
      if (!result) return;
      const url = URL.createObjectURL(result.doc.output("blob"));
      const w = window.open(url, "_blank");
      if (w) w.onload = () => w.print();
      setTimeout(() => URL.revokeObjectURL(url), 30000);
    } finally { setIsGenerating(false); }
  };

  const shareReport = async (platform: string) => {
    setIsGenerating(true);
    try {
      const result = await generateReportPDF();
      if (!result) return;
      const blob = result.doc.output("blob");
      const file = new File([blob], `Report_${profileName.replace(/\s+/g, "_")}.pdf`, { type: "application/pdf" });
      const shareText = `📄 ${profileName}'s Report Card - ${term.replace("_", " ").toUpperCase()} ${year}\n📊 Average: ${avgMark}%\n🏫 ${schoolInfo.name}`;

      if (platform === "native" && navigator.share) {
        await navigator.share({ title: `${profileName}'s Report Card`, text: shareText, files: [file] });
      } else if (platform === "whatsapp") {
        // Can't attach files via URL, share text with verification link
        const url = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
        window.open(url, "_blank");
        // Also trigger download so they can attach manually
        result.doc.save(`Report_${profileName.replace(/\s+/g, "_")}.pdf`);
      } else if (platform === "email") {
        const subject = encodeURIComponent(`${profileName}'s Report Card - ${term.replace("_", " ").toUpperCase()} ${year}`);
        const body = encodeURIComponent(shareText);
        window.open(`mailto:?subject=${subject}&body=${body}`, "_self");
        result.doc.save(`Report_${profileName.replace(/\s+/g, "_")}.pdf`);
      } else if (platform === "copy") {
        await navigator.clipboard.writeText(shareText);
      }
    } finally { setIsGenerating(false); }
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
                <div className="flex gap-2 flex-wrap">
                  <Button onClick={downloadReportCard} variant="default" size="sm" disabled={isGenerating}>
                    {isGenerating ? (
                      <><span className="w-4 h-4 mr-2 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin inline-block" /> Generating...</>
                    ) : (
                      <><Download className="w-4 h-4 mr-2" /> Download</>
                    )}
                  </Button>
                  <Button onClick={printReportCard} variant="outline" size="sm" disabled={isGenerating}>
                    <Printer className="w-4 h-4 mr-2" /> Print
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" disabled={isGenerating}>
                        <Share2 className="w-4 h-4 mr-2" /> Share
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={() => shareReport("whatsapp")}>📱 WhatsApp</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => shareReport("email")}>📧 Email</DropdownMenuItem>
                      {navigator.share && <DropdownMenuItem onClick={() => shareReport("native")}>📤 More Options</DropdownMenuItem>}
                      <DropdownMenuItem onClick={() => shareReport("copy")}>📋 Copy Summary</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )}
            </CardHeader>
            <CardContent>
              {grades.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                  <div className="text-center p-3 rounded-lg bg-muted/50">
                    <p className={`text-xl font-bold ${avgMark >= 60 ? "text-green-600" : avgMark >= 40 ? "text-yellow-600" : "text-red-600"}`}>{avgMark}%</p>
                    <p className="text-xs text-muted-foreground">Average</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-muted/50">
                    <p className="text-xl font-bold text-primary">{grades.length}</p>
                    <p className="text-xs text-muted-foreground">Subjects</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-muted/50">
                    <p className="text-xl font-bold">{getGradeLetter(avgMark)}</p>
                    <p className="text-xs text-muted-foreground">Overall Grade</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-muted/50">
                    <p className="text-xl font-bold">{grades.reduce((s, g) => s + Number(g.mark), 0)}</p>
                    <p className="text-xs text-muted-foreground">Total Marks</p>
                  </div>
                </div>
              )}
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
