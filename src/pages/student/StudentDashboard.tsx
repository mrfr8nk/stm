import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  BookOpen, ClipboardCheck, Bell, DollarSign, TrendingUp,
  FileText, Calendar, AlertTriangle, Brain, ArrowRight, UserCircle
} from "lucide-react";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip
} from "recharts";

const StudentDashboard = () => {
  const { user, profile } = useAuth();
  const [stats, setStats] = useState({ subjects: 0, avgMark: 0, attendance: 0, totalDays: 0, present: 0 });
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [recentGrades, setRecentGrades] = useState<any[]>([]);
  const [feeBalance, setFeeBalance] = useState(0);
  const [unpaidTerms, setUnpaidTerms] = useState<string[]>([]);
  const [attendancePie, setAttendancePie] = useState<any[]>([]);
  const [studentProfile, setStudentProfile] = useState<any>(null);

  useEffect(() => {
    if (!user) return;
    const fetchAll = async () => {
      const [gradesRes, attRes, annRes, feesRes, spRes] = await Promise.all([
        supabase.from("grades").select("*, subjects(name)").eq("student_id", user.id).is("deleted_at", null).order("created_at", { ascending: false }),
        supabase.from("attendance").select("status").eq("student_id", user.id),
        supabase.from("announcements").select("*").is("deleted_at", null).order("created_at", { ascending: false }).limit(5),
        supabase.from("fee_records").select("*").eq("student_id", user.id).is("deleted_at", null),
        supabase.from("student_profiles").select("*").eq("user_id", user.id).single(),
      ]);

      const grades = gradesRes.data || [];
      const att = attRes.data || [];
      const fees = feesRes.data || [];
      setStudentProfile(spRes.data);

      const presentCount = att.filter(a => a.status === "present").length;
      const absentCount = att.filter(a => a.status === "absent").length;
      const lateCount = att.filter(a => a.status === "late").length;

      setStats({
        subjects: new Set(grades.map(g => g.subject_id)).size,
        avgMark: grades.length ? Math.round(grades.reduce((sum, g) => sum + Number(g.mark), 0) / grades.length) : 0,
        attendance: att.length ? Math.round((presentCount / att.length) * 100) : 0,
        totalDays: att.length,
        present: presentCount,
      });

      if (att.length > 0) {
        setAttendancePie([
          { name: "Present", value: presentCount },
          { name: "Absent", value: absentCount },
          { name: "Late", value: lateCount },
        ].filter(s => s.value > 0));
      }

      setRecentGrades(grades.slice(0, 6));
      setAnnouncements(annRes.data || []);

      // Fee balance
      let totalBal = 0;
      const owingTerms: string[] = [];
      fees.forEach(f => {
        const bal = Number(f.amount_due) - Number(f.amount_paid);
        if (bal > 0) {
          totalBal += bal;
          owingTerms.push(`${f.term.replace("_", " ").toUpperCase()} ${f.academic_year}`);
        }
      });
      setFeeBalance(totalBal);
      setUnpaidTerms([...new Set(owingTerms)]);
    };
    fetchAll();
  }, [user]);

  const quickLinks = [
    { label: "My Grades", path: "/student/grades", icon: BookOpen, desc: "View termly grades" },
    { label: "Attendance", path: "/student/attendance", icon: ClipboardCheck, desc: "Check records" },
    { label: "Report Cards", path: "/student/reports", icon: FileText, desc: "View reports" },
    { label: "Fee Records", path: "/student/fees", icon: DollarSign, desc: "Check balance" },
    { label: "Study Pal AI", path: "/student/study-pal", icon: Brain, desc: "AI tutor chat" },
    { label: "Announcements", path: "/student/announcements", icon: Bell, desc: "School news" },
  ];

  return (
    <DashboardLayout role="student">
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">
              Welcome, {profile?.full_name?.split(" ")[0] || "Student"}!
            </h1>
            <p className="text-muted-foreground text-sm">
              {studentProfile && (
                <span>
                  {studentProfile.student_id && <span className="font-mono font-semibold text-primary mr-2">{studentProfile.student_id}</span>}
                  {studentProfile.level?.replace("_", " ").toUpperCase()} • Form {studentProfile.form}
                </span>
              )}
              {" — "}{new Date().toLocaleDateString("en", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
            </p>
          </div>
          <Badge variant="outline" className="text-xs px-3 py-1">
            <Calendar className="w-3 h-3 mr-1" /> {new Date().getFullYear()} Academic Year
          </Badge>
        </div>

        {/* Profile Completion Prompt */}
        {studentProfile && (() => {
          const missing: string[] = [];
          if (!profile?.avatar_url) missing.push("profile picture");
          if (!studentProfile.date_of_birth) missing.push("date of birth");
          if (!studentProfile.guardian_name) missing.push("guardian name");
          if (!studentProfile.guardian_phone) missing.push("guardian phone");
          if (!studentProfile.address) missing.push("address");
          if (!studentProfile.emergency_contact) missing.push("emergency contact");
          if (!studentProfile.national_id && !studentProfile.birth_cert_number) missing.push("ID/birth cert number");
          if (missing.length === 0) return null;
          return (
            <Card className="border-l-4 border-l-primary bg-primary/5">
              <CardContent className="p-4 flex items-center gap-3">
                <UserCircle className="w-8 h-8 text-primary shrink-0" />
                <div className="flex-1">
                  <p className="font-bold text-foreground">Complete Your Profile</p>
                  <p className="text-sm text-muted-foreground">
                    Please set your {missing.slice(0, 3).join(", ")}{missing.length > 3 ? ` and ${missing.length - 3} more` : ""} to keep your records up to date.
                  </p>
                </div>
                <Link to="/student/profile">
                  <Badge className="cursor-pointer">Set Up Now <ArrowRight className="w-3 h-3 ml-1" /></Badge>
                </Link>
              </CardContent>
            </Card>
          );
        })()}

        {/* Fee Alert */}
        {feeBalance > 0 && (
          <Card className="border-l-4 border-l-destructive bg-destructive/5">
            <CardContent className="p-4 flex items-center gap-3">
              <AlertTriangle className="w-6 h-6 text-destructive shrink-0" />
              <div className="flex-1">
                <p className="font-bold text-destructive">Outstanding Fee Balance: ${feeBalance.toFixed(2)}</p>
                <p className="text-sm text-destructive/80">Owing for: {unpaidTerms.join(", ")}</p>
              </div>
              <Link to="/student/fees">
                <Badge variant="destructive">View Details <ArrowRight className="w-3 h-3 ml-1" /></Badge>
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="flex items-center gap-4 p-5">
              <div className="p-3 rounded-lg bg-muted text-primary"><BookOpen className="w-6 h-6" /></div>
              <div><p className="text-2xl font-bold">{stats.subjects}</p><p className="text-xs text-muted-foreground">Subjects</p></div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 p-5">
              <div className="p-3 rounded-lg bg-muted text-secondary"><TrendingUp className="w-6 h-6" /></div>
              <div>
                <p className={`text-2xl font-bold ${stats.avgMark >= 60 ? "text-green-600" : stats.avgMark >= 40 ? "text-yellow-600" : "text-red-600"}`}>{stats.avgMark}%</p>
                <p className="text-xs text-muted-foreground">Average</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 p-5">
              <div className="p-3 rounded-lg bg-muted text-accent"><ClipboardCheck className="w-6 h-6" /></div>
              <div><p className="text-2xl font-bold">{stats.attendance}%</p><p className="text-xs text-muted-foreground">Attendance</p></div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 p-5">
              <div className={`p-3 rounded-lg ${feeBalance > 0 ? "bg-red-500/10" : "bg-green-500/10"}`}>
                <DollarSign className={`w-6 h-6 ${feeBalance > 0 ? "text-red-600" : "text-green-600"}`} />
              </div>
              <div>
                <p className={`text-2xl font-bold ${feeBalance > 0 ? "text-red-600" : "text-green-600"}`}>
                  ${feeBalance.toFixed(0)}
                </p>
                <p className="text-xs text-muted-foreground">{feeBalance > 0 ? "Owing" : "Cleared"}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Links */}
        <Card>
          <CardHeader><CardTitle className="text-lg">Quick Links</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {quickLinks.map(link => (
                <Link key={link.path} to={link.path}
                  className="flex items-center gap-3 p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors border border-transparent hover:border-border">
                  <link.icon className="w-5 h-5 text-primary shrink-0" />
                  <div>
                    <p className="font-medium text-foreground text-sm">{link.label}</p>
                    <p className="text-xs text-muted-foreground">{link.desc}</p>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Grades & Attendance */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Recent Grades</CardTitle>
                <Link to="/student/grades" className="text-sm text-primary hover:underline">View all</Link>
              </div>
            </CardHeader>
            <CardContent>
              {recentGrades.length === 0 ? (
                <p className="text-muted-foreground text-sm py-4">No grades yet.</p>
              ) : (
                <div className="space-y-2">
                  {recentGrades.map(g => (
                    <div key={g.id} className={`flex items-center justify-between p-3 rounded-lg border-l-4 ${
                      Number(g.mark) >= 75 ? "border-l-green-500 bg-green-500/5" :
                      Number(g.mark) >= 50 ? "border-l-yellow-500 bg-yellow-500/5" :
                      "border-l-red-500 bg-red-500/5"
                    }`}>
                      <span className="font-medium text-sm">{g.subjects?.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm">{g.mark}%</span>
                        {g.grade_letter && <Badge variant="outline" className="text-[10px]">{g.grade_letter}</Badge>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Attendance Overview</CardTitle>
                <Link to="/student/attendance" className="text-sm text-primary hover:underline">View all</Link>
              </div>
            </CardHeader>
            <CardContent>
              {attendancePie.length > 0 ? (
                <div className="flex items-center gap-4">
                  <ResponsiveContainer width="50%" height={180}>
                    <PieChart>
                      <Pie data={attendancePie} cx="50%" cy="50%" outerRadius={70} dataKey="value"
                        label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}>
                        {attendancePie.map((_, i) => (
                          <Cell key={i} fill={["#10b981", "#ef4444", "#f59e0b"][i]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-green-500" /><span className="text-sm">Present: {stats.present}</span></div>
                    <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-red-500" /><span className="text-sm">Absent: {stats.totalDays - stats.present - (attendancePie.find(p => p.name === "Late")?.value || 0)}</span></div>
                    <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-yellow-500" /><span className="text-sm">Late: {attendancePie.find(p => p.name === "Late")?.value || 0}</span></div>
                    <div className="mt-2">
                      <Progress value={stats.attendance} className="h-2" />
                      <p className="text-xs text-muted-foreground mt-1">{stats.attendance}% attendance rate</p>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground text-sm py-4">No attendance data yet.</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Announcements */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg"><Bell className="w-5 h-5" /> Announcements</CardTitle>
              <Link to="/student/announcements" className="text-sm text-primary hover:underline">View all</Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {announcements.length === 0 ? (
              <p className="text-muted-foreground text-sm">No announcements.</p>
            ) : announcements.map(a => (
              <div key={a.id} className="p-3 rounded-lg bg-muted/50 border-l-4 border-primary">
                <p className="font-medium text-sm">{a.title}</p>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{a.content}</p>
                <p className="text-xs text-muted-foreground mt-1">{new Date(a.created_at).toLocaleDateString()}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default StudentDashboard;
