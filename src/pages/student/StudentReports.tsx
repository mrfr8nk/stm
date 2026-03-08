import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { AlertTriangle, FileText, Lock, DollarSign, BookOpen, ClipboardCheck, TrendingUp, Download, Printer } from "lucide-react";
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
  const [isGenerating, setIsGenerating] = useState(false);

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

  const generateReportPDF = async () => {
    if (!canViewReports || grades.length === 0) return null;

    const level = studentProfile?.level || "o_level";
    const totalMark = grades.reduce((sum: number, g: any) => sum + Number(g.mark), 0);

    // Calculate position
    const studentAverages = new Map<string, number>();
    classGrades.forEach(g => {
      const prev = studentAverages.get(g.student_id) || 0;
      studentAverages.set(g.student_id, prev + Number(g.mark));
    });
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

    // Save verification record
    await supabase.from("report_verifications").insert({
      serial_number: serialNo,
      student_id: user!.id,
      student_name: profileName,
      student_code: studentProfile?.student_id || null,
      class_name: className,
      level: studentProfile?.level || null,
      term: termLabel,
      academic_year: year,
      average_mark: avgMark,
      subjects_count: grades.length,
      position: position || null,
      total_students: totalStudents || null,
      generated_by: user!.id,
    });

    const verifyUrl = `${window.location.origin}/verify-report?serial=${encodeURIComponent(serialNo)}`;

    // Build PDF with jsPDF
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pw = doc.internal.pageSize.getWidth();
    const primaryColor: [number, number, number] = [10, 61, 98];

    // Try to add logo
    const logoBase64 = await getLogoBase64();
    if (logoBase64) {
      try { doc.addImage(logoBase64, "PNG", 15, 10, 18, 18); } catch {}
      try { doc.addImage(logoBase64, "PNG", pw - 33, 10, 18, 18); } catch {}
    }

    // Header
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...primaryColor);
    doc.text(schoolInfo.name.toUpperCase(), pw / 2, 18, { align: "center" });

    doc.setFontSize(8);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(100);
    doc.text(`"${schoolInfo.motto}"`, pw / 2, 23, { align: "center" });

    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(130);
    doc.text(`${schoolInfo.address} | Tel: ${schoolInfo.phone}`, pw / 2, 27, { align: "center" });

    // Divider
    doc.setDrawColor(...primaryColor);
    doc.setLineWidth(0.6);
    doc.line(15, 30, pw - 15, 30);
    doc.line(15, 31, pw - 15, 31);

    // Title bar
    doc.setFillColor(...primaryColor);
    doc.rect(15, 34, pw - 30, 9, "F");
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255);
    doc.text(`ACADEMIC REPORT CARD — ${termLabel} ${year}`, pw / 2, 40, { align: "center" });

    // Student info grid
    let y = 48;
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(30);

    const infoRows = [
      ["Student Name:", profileName || "—", "Student ID:", studentProfile?.student_id || "—"],
      ["Class:", className || "—", "Level:", level.replace("_", " ").toUpperCase()],
      ["Date of Birth:", studentProfile?.date_of_birth || "—", "Guardian:", studentProfile?.guardian_name || "—"],
    ];

    infoRows.forEach(row => {
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...primaryColor);
      doc.text(row[0], 16, y);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(30);
      doc.text(row[1], 50, y);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...primaryColor);
      doc.text(row[2], pw / 2 + 5, y);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(30);
      doc.text(row[3], pw / 2 + 35, y);
      y += 6;
    });

    y += 3;

    // Grades table
    const gradeRows = grades.map((g: any, i: number) => [
      String(i + 1),
      g.subjects?.name || "—",
      g.subjects?.code || "—",
      String(g.mark),
      getGradeLetter(Number(g.mark)),
      g.comment || "—"
    ]);

    // Add total row
    gradeRows.push(["", "TOTAL / AVERAGE", "", `${totalMark} / ${avgMark}%`, getGradeLetter(avgMark), ""]);

    autoTable(doc, {
      head: [["#", "Subject", "Code", "Mark (%)", "Grade", "Comment"]],
      body: gradeRows,
      startY: y,
      styles: { fontSize: 8, cellPadding: 2.5 },
      headStyles: { fillColor: primaryColor, textColor: 255, fontStyle: "bold", fontSize: 7.5 },
      alternateRowStyles: { fillColor: [245, 247, 250] },
      columnStyles: {
        0: { cellWidth: 8, halign: "center" },
        3: { halign: "center", fontStyle: "bold" },
        4: { halign: "center", fontStyle: "bold" },
        5: { fontSize: 7, textColor: [100, 100, 100] },
      },
      margin: { left: 15, right: 15 },
      didParseCell: (data: any) => {
        // Style the last row (total)
        if (data.row.index === gradeRows.length - 1) {
          data.cell.styles.fillColor = [230, 235, 240];
          data.cell.styles.fontStyle = "bold";
        }
      },
    });

    y = (doc as any).lastAutoTable.finalY + 6;

    // Summary boxes
    const summaryItems = [
      { label: "Average", value: `${avgMark}%` },
      { label: "Position", value: ordinal(position || 1) },
      { label: "Out of", value: String(totalStudents) },
      { label: "Subjects", value: String(grades.length) },
      { label: "Overall", value: getGradeLetter(avgMark) },
    ];
    const boxW = (pw - 30 - 4 * 4) / 5;
    summaryItems.forEach((item, i) => {
      const bx = 15 + i * (boxW + 4);
      doc.setDrawColor(200);
      doc.setFillColor(250, 250, 252);
      doc.roundedRect(bx, y, boxW, 16, 2, 2, "FD");
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...primaryColor);
      doc.text(item.value, bx + boxW / 2, y + 8, { align: "center" });
      doc.setFontSize(6);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(130);
      doc.text(item.label.toUpperCase(), bx + boxW / 2, y + 13, { align: "center" });
    });

    y += 22;

    // Class teacher remark
    doc.setFillColor(250, 251, 252);
    doc.setDrawColor(220);
    doc.roundedRect(15, y, pw - 30, 14, 2, 2, "FD");
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...primaryColor);
    doc.text("CLASS TEACHER'S REMARK", 18, y + 4);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(60);
    doc.setFontSize(8);
    doc.text(getComment(avgMark), 18, y + 10);

    y += 18;

    // Headmaster remark
    doc.setFillColor(250, 251, 252);
    doc.roundedRect(15, y, pw - 30, 14, 2, 2, "FD");
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...primaryColor);
    doc.text("HEADMASTER'S REMARK", 18, y + 4);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(180);
    doc.setFontSize(8);
    doc.text("________________________________", 18, y + 10);

    y += 18;

    // Grading key
    const scales = [...gradingScales].sort((a, b) => b.max_mark - a.max_mark);
    if (scales.length > 0) {
      doc.setFontSize(6.5);
      doc.setTextColor(130);
      const keyStr = scales.map(s => `${s.grade_letter}: ${s.min_mark}-${s.max_mark}`).join("  |  ");
      doc.text(`Grading Key: ${keyStr}`, 15, y);
      y += 5;
    }

    // Signatures
    const sigY = y + 5;
    const sigLabels = ["Class Teacher", "Headmaster", "Parent/Guardian"];
    const sigWidth = (pw - 30 - 20) / 3;
    sigLabels.forEach((label, i) => {
      const sx = 15 + i * (sigWidth + 10);
      doc.setDrawColor(60);
      doc.setLineWidth(0.3);
      doc.line(sx, sigY + 12, sx + sigWidth, sigY + 12);
      doc.setFontSize(7.5);
      doc.setTextColor(100);
      doc.text(label, sx + sigWidth / 2, sigY + 16, { align: "center" });
      doc.setFontSize(6);
      doc.setTextColor(160);
      doc.text("Date: ____________", sx + sigWidth / 2, sigY + 20, { align: "center" });
    });

    y = sigY + 26;

    // QR code section
    try {
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(verifyUrl)}`;
      const qrImg = await new Promise<string>((resolve) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          const c = document.createElement("canvas");
          c.width = img.width; c.height = img.height;
          c.getContext("2d")?.drawImage(img, 0, 0);
          resolve(c.toDataURL("image/png"));
        };
        img.onerror = () => resolve("");
        img.src = qrUrl;
      });

      if (qrImg) {
        doc.setDrawColor(220);
        doc.setFillColor(250, 251, 252);
        doc.roundedRect(15, y, pw - 30, 28, 2, 2, "FD");
        doc.addImage(qrImg, "PNG", 18, y + 2, 24, 24);
        doc.setFontSize(7);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...primaryColor);
        doc.text("VERIFICATION QR CODE", 46, y + 5);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(130);
        doc.setFontSize(6.5);
        doc.text(`Scan to verify this report card`, 46, y + 9);
        doc.text(`Serial: ${serialNo}`, 46, y + 13);
        doc.text(`Student: ${profileName} (${studentProfile?.student_id || "N/A"})`, 46, y + 17);
        doc.text(`Generated: ${dateGenerated}`, 46, y + 21);
        doc.setFontSize(5.5);
        doc.setTextColor(160);
        doc.text("Any unauthorized alteration of this document renders it void.", 46, y + 25);
      }
    } catch {}

    y += 32;

    // Security strip
    doc.setFillColor(245, 245, 248);
    doc.rect(15, y, pw - 30, 6, "F");
    doc.setFontSize(5);
    doc.setTextColor(180);
    doc.text(
      `OFFICIAL ACADEMIC RECORD | Serial: ${serialNo} | Generated: ${dateGenerated} | ${schoolInfo.name} | Computer-generated and verified by QR code.`,
      pw / 2, y + 3.5, { align: "center" }
    );

    y += 9;

    // Footer
    doc.setDrawColor(...primaryColor);
    doc.setLineWidth(0.5);
    doc.line(15, y, pw - 15, y);
    doc.setFontSize(6);
    doc.setTextColor(160);
    doc.text(`${schoolInfo.name} | ${schoolInfo.address} | Tel: ${schoolInfo.phone}`, pw / 2, y + 4, { align: "center" });
    doc.text("This is an official academic record. Unauthorized reproduction or alteration is a criminal offense.", pw / 2, y + 8, { align: "center" });

    return { doc, serialNo };
  };

  const downloadReportCard = async () => {
    setIsGenerating(true);
    try {
      const result = await generateReportPDF();
      if (!result) return;
      const filename = `Report_Card_${profileName.replace(/\s+/g, "_")}_${term.toUpperCase()}_${year}.pdf`;
      result.doc.save(filename);
    } finally {
      setIsGenerating(false);
    }
  };

  const printReportCard = async () => {
    setIsGenerating(true);
    try {
      const result = await generateReportPDF();
      if (!result) return;
      const pdfBlob = result.doc.output("blob");
      const url = URL.createObjectURL(pdfBlob);
      const w = window.open(url, "_blank");
      if (w) {
        w.onload = () => { w.print(); };
      }
      setTimeout(() => URL.revokeObjectURL(url), 30000);
    } finally {
      setIsGenerating(false);
    }
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
                      <div className="flex gap-2">
                        <Button onClick={downloadReportCard} variant="default" size="sm" disabled={isGenerating}>
                          {isGenerating ? (
                            <><span className="w-4 h-4 mr-2 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin inline-block" /> Generating...</>
                          ) : (
                            <><Download className="w-4 h-4 mr-2" /> Download PDF</>
                          )}
                        </Button>
                        <Button onClick={printReportCard} variant="outline" size="sm" disabled={isGenerating}>
                          <Printer className="w-4 h-4 mr-2" /> Print
                        </Button>
                      </div>
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
