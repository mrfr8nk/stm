import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Search, Home, Users, FileText, GraduationCap, BookOpen, Key,
  BarChart3, Bell, DollarSign, Receipt, Settings, ClipboardCheck,
  MessageSquare, Trophy, Newspaper, Image, History, User, Sparkles,
  ArrowRight, Command, ShieldAlert, Loader2
} from "lucide-react";

interface SearchItem {
  label: string;
  description: string;
  path: string;
  icon: React.ElementType;
  keywords: string[];
  category: string;
}

const adminFeatures: SearchItem[] = [
  { label: "Dashboard", description: "Overview & statistics", path: "/admin", icon: Home, keywords: ["home", "overview", "stats", "summary"], category: "Navigation" },
  { label: "Users", description: "Manage students, teachers & admins", path: "/admin/users", icon: Users, keywords: ["students", "teachers", "accounts", "people", "staff", "ban"], category: "Management" },
  { label: "Staff Management", description: "Manage staff profiles", path: "/admin/staff-management", icon: User, keywords: ["staff", "teachers", "employees"], category: "Management" },
  { label: "Applications", description: "Review admission applications", path: "/admin/applications", icon: FileText, keywords: ["admissions", "apply", "enroll", "new students"], category: "Management" },
  { label: "Classes", description: "Manage classes & streams", path: "/admin/classes", icon: GraduationCap, keywords: ["forms", "streams", "class teacher", "assign"], category: "Academic" },
  { label: "Subjects", description: "Manage subjects & curriculum", path: "/admin/subjects", icon: BookOpen, keywords: ["curriculum", "courses", "compulsory", "optional"], category: "Academic" },
  { label: "Access Codes", description: "Generate signup codes", path: "/admin/codes", icon: Key, keywords: ["registration", "invite", "signup", "codes"], category: "Management" },
  { label: "Grades Overview", description: "View all student grades", path: "/admin/grades", icon: BarChart3, keywords: ["marks", "results", "performance", "academic"], category: "Academic" },
  { label: "Rankings", description: "Student & class rankings", path: "/admin/rankings", icon: Trophy, keywords: ["rank", "position", "top", "leaderboard"], category: "Academic" },
  { label: "Messages", description: "Direct messaging", path: "/admin/messages", icon: MessageSquare, keywords: ["chat", "dm", "inbox", "conversation"], category: "Communication" },
  { label: "Announcements", description: "Create & manage announcements", path: "/admin/announcements", icon: Bell, keywords: ["notice", "news", "broadcast", "pin"], category: "Communication" },
  { label: "Fee Management", description: "Fees, payments & receipts", path: "/admin/fees", icon: DollarSign, keywords: ["payment", "receipt", "balance", "tuition", "money", "barcode", "scan"], category: "Finance" },
  { label: "Finance & Petty Cash", description: "Track expenses & petty cash", path: "/admin/finance", icon: Receipt, keywords: ["expenses", "cash", "budget", "spending"], category: "Finance" },
  { label: "Homepage Updates", description: "Manage homepage content", path: "/admin/homepage", icon: Newspaper, keywords: ["website", "content", "news", "updates"], category: "Content" },
  { label: "Staff Gallery", description: "Manage staff profiles & photos", path: "/admin/staff-gallery", icon: Image, keywords: ["photos", "teachers", "staff", "gallery"], category: "Content" },
  { label: "Record Books", description: "View teacher record books", path: "/admin/record-books", icon: BookOpen, keywords: ["records", "books"], category: "Academic" },
  { label: "Student History", description: "View student academic history", path: "/admin/student-history", icon: History, keywords: ["records", "past", "archive", "history"], category: "Academic" },
  { label: "AI Security", description: "AI-powered threat detection & monitoring", path: "/admin/security", icon: ShieldAlert, keywords: ["security", "threats", "alerts", "suspicious", "anomaly", "hack", "breach"], category: "System" },
  { label: "Settings", description: "System & school settings", path: "/admin/settings", icon: Settings, keywords: ["config", "system", "school name", "preferences", "promote"], category: "System" },
];

const teacherFeatures: SearchItem[] = [
  { label: "Dashboard", description: "Overview", path: "/teacher", icon: Home, keywords: ["home"], category: "Navigation" },
  { label: "My Classes", description: "View assigned classes", path: "/teacher/classes", icon: Users, keywords: ["students", "class list"], category: "Academic" },
  { label: "Set Grades", description: "Enter student grades", path: "/teacher/grades", icon: BookOpen, keywords: ["marks", "results"], category: "Academic" },
  { label: "Monthly Tests", description: "Record monthly test marks", path: "/teacher/monthly-tests", icon: BarChart3, keywords: ["tests", "marks"], category: "Academic" },
  { label: "Rankings", description: "Student rankings", path: "/teacher/rankings", icon: Trophy, keywords: ["rank", "position", "top"], category: "Academic" },
  { label: "Attendance", description: "Mark student attendance", path: "/teacher/attendance", icon: ClipboardCheck, keywords: ["present", "absent"], category: "Academic" },
  { label: "Report Cards", description: "Generate report cards", path: "/teacher/reports", icon: FileText, keywords: ["reports"], category: "Academic" },
  { label: "Messages", description: "Direct messaging", path: "/teacher/messages", icon: MessageSquare, keywords: ["chat", "dm", "inbox"], category: "Communication" },
  { label: "Announcements", description: "View & create announcements", path: "/teacher/announcements", icon: Bell, keywords: ["notice"], category: "Communication" },
  { label: "Record Book", description: "Custom record keeping", path: "/teacher/record-book", icon: BookOpen, keywords: ["records"], category: "Academic" },
  { label: "Settings", description: "Profile settings", path: "/teacher/profile", icon: Settings, keywords: ["profile"], category: "System" },
];

const studentFeatures: SearchItem[] = [
  { label: "Dashboard", description: "Overview", path: "/student", icon: Home, keywords: ["home"], category: "Navigation" },
  { label: "My Grades", description: "View your grades", path: "/student/grades", icon: BookOpen, keywords: ["marks", "results"], category: "Academic" },
  { label: "Rankings", description: "View rankings", path: "/student/rankings", icon: Trophy, keywords: ["rank", "position", "top"], category: "Academic" },
  { label: "Attendance", description: "View attendance record", path: "/student/attendance", icon: ClipboardCheck, keywords: ["present", "absent"], category: "Academic" },
  { label: "Report Cards", description: "Download report cards", path: "/student/reports", icon: FileText, keywords: ["reports"], category: "Academic" },
  { label: "Study Pal AI", description: "AI study assistant", path: "/student/study-pal", icon: Sparkles, keywords: ["ai", "study", "help", "tutor"], category: "AI Tools" },
  { label: "Messages", description: "Direct messaging", path: "/student/messages", icon: MessageSquare, keywords: ["chat", "dm", "inbox"], category: "Communication" },
  { label: "Announcements", description: "View announcements", path: "/student/announcements", icon: Bell, keywords: ["notice"], category: "Communication" },
  { label: "Fees", description: "View fee records", path: "/student/fees", icon: DollarSign, keywords: ["payment", "balance"], category: "Finance" },
  { label: "Settings", description: "Profile settings", path: "/student/profile", icon: Settings, keywords: ["profile"], category: "System" },
];

const parentFeatures: SearchItem[] = [
  { label: "Dashboard", description: "Overview", path: "/parent", icon: Home, keywords: ["home"], category: "Navigation" },
  { label: "Grades", description: "View child's grades", path: "/parent/grades", icon: BookOpen, keywords: ["marks", "results"], category: "Academic" },
  { label: "Report Cards", description: "View report cards", path: "/parent/reports", icon: FileText, keywords: ["reports"], category: "Academic" },
  { label: "Attendance", description: "View child's attendance", path: "/parent/attendance", icon: ClipboardCheck, keywords: ["present", "absent"], category: "Academic" },
  { label: "Fees", description: "View fee records", path: "/parent/fees", icon: DollarSign, keywords: ["payment", "balance"], category: "Finance" },
  { label: "Messages", description: "Direct messaging", path: "/parent/messages", icon: MessageSquare, keywords: ["chat", "dm", "inbox"], category: "Communication" },
  { label: "Settings", description: "Account settings", path: "/parent/settings", icon: Settings, keywords: ["profile"], category: "System" },
];

interface DbResult {
  label: string;
  description: string;
  path: string;
  icon: React.ElementType;
  category: string;
}

interface GlobalSearchProps {
  role: "admin" | "teacher" | "student" | "parent";
}

const GlobalSearch = ({ role }: GlobalSearchProps) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [dbResults, setDbResults] = useState<DbResult[]>([]);
  const [dbLoading, setDbLoading] = useState(false);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const features = role === "admin" ? adminFeatures : role === "teacher" ? teacherFeatures : role === "parent" ? parentFeatures : studentFeatures;

  const filtered = query.trim().length === 0
    ? features
    : features.filter(f => {
        const q = query.toLowerCase();
        return f.label.toLowerCase().includes(q) ||
          f.description.toLowerCase().includes(q) ||
          f.keywords.some(k => k.includes(q)) ||
          f.category.toLowerCase().includes(q);
      });

  // Live DB search for admin
  useEffect(() => {
    if (role !== "admin" || query.trim().length < 2) {
      setDbResults([]);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setDbLoading(true);
      const q = query.trim();
      const results: DbResult[] = [];

      try {
        const [studentsRes, profilesRes, classesRes, subjectsRes] = await Promise.all([
          supabase.from("student_profiles").select("user_id, student_id, form, level").limit(50),
          supabase.from("profiles").select("user_id, full_name, email").ilike("full_name", `%${q}%`).limit(10),
          supabase.from("classes").select("id, name, form, level").is("deleted_at", null).ilike("name", `%${q}%`).limit(5),
          supabase.from("subjects").select("id, name, code").is("deleted_at", null).ilike("name", `%${q}%`).limit(5),
        ]);

        const profileMap = new Map((profilesRes.data || []).map(p => [p.user_id, p]));
        const studentMap = new Map((studentsRes.data || []).map(s => [s.user_id, s]));

        // Match students by name or student_id
        for (const [userId, profile] of profileMap) {
          const sp = studentMap.get(userId);
          if (sp) {
            results.push({
              label: profile.full_name,
              description: `${sp.student_id || "No ID"} • Form ${sp.form} • ${sp.level?.replace("_", " ").toUpperCase()}`,
              path: "/admin/students",
              icon: GraduationCap,
              category: "Students",
            });
          } else {
            results.push({
              label: profile.full_name,
              description: profile.email || "User",
              path: "/admin/users",
              icon: User,
              category: "Users",
            });
          }
        }

        // Also search by student_id
        if (q.length >= 3) {
          const { data: sidData } = await supabase.from("student_profiles")
            .select("user_id, student_id, form, level")
            .ilike("student_id", `%${q}%`).limit(5);
          
          if (sidData) {
            const existingUserIds = new Set(results.map(r => r.path));
            const userIds = sidData.map(s => s.user_id).filter(id => !profileMap.has(id));
            if (userIds.length > 0) {
              const { data: extraProfiles } = await supabase.from("profiles")
                .select("user_id, full_name").in("user_id", userIds);
              const extraMap = new Map((extraProfiles || []).map(p => [p.user_id, p]));
              for (const s of sidData) {
                if (!profileMap.has(s.user_id)) {
                  const p = extraMap.get(s.user_id);
                  results.push({
                    label: p?.full_name || "Student",
                    description: `${s.student_id || "No ID"} • Form ${s.form}`,
                    path: "/admin/students",
                    icon: GraduationCap,
                    category: "Students",
                  });
                }
              }
            }
          }
        }

        // Classes
        for (const cls of classesRes.data || []) {
          results.push({
            label: cls.name,
            description: `Form ${cls.form} • ${cls.level?.replace("_", " ").toUpperCase()}`,
            path: "/admin/classes",
            icon: Users,
            category: "Classes",
          });
        }

        // Subjects
        for (const sub of subjectsRes.data || []) {
          results.push({
            label: sub.name,
            description: sub.code || "Subject",
            path: "/admin/subjects",
            icon: BookOpen,
            category: "Subjects",
          });
        }
      } catch (err) {
        // silently fail
      }

      setDbResults(results);
      setDbLoading(false);
    }, 300);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, role]);

  // Group by category
  const allItems = [...filtered, ...dbResults];
  const grouped = allItems.reduce<Record<string, (SearchItem | DbResult)[]>>((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {});

  const flatFiltered = Object.values(grouped).flat();

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Keyboard shortcut: Ctrl+K or Cmd+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100);
    else {
      setQuery("");
      setSelectedIndex(0);
      setDbResults([]);
    }
  }, [open]);

  const go = useCallback((path: string) => {
    navigate(path);
    setOpen(false);
  }, [navigate]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, flatFiltered.length - 1));
      scrollToSelected(selectedIndex + 1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, 0));
      scrollToSelected(selectedIndex - 1);
    } else if (e.key === "Enter" && flatFiltered[selectedIndex]) {
      go(flatFiltered[selectedIndex].path);
    }
  };

  const scrollToSelected = (index: number) => {
    const el = listRef.current?.children[index] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "nearest" });
  };

  const getQuickSuggestion = () => {
    const hour = new Date().getHours();
    if (hour < 10) return "Good morning! Start with attendance or dashboard.";
    if (hour < 14) return "Try checking grades or messages.";
    return "Review reports or announcements before you go.";
  };

  let itemIndex = -1;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-muted/50 text-muted-foreground text-sm hover:bg-muted transition-colors max-w-xs w-full sm:w-64"
      >
        <Search className="w-4 h-4 shrink-0" />
        <span className="truncate">Search anything...</span>
        <kbd className="hidden sm:inline-flex ml-auto text-[10px] font-mono bg-background border border-border rounded px-1.5 py-0.5 gap-0.5 items-center">
          <Command className="w-2.5 h-2.5" />K
        </kbd>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg p-0 gap-0 overflow-hidden">
          <div className="flex items-center gap-2 px-4 border-b border-border">
            <Search className="w-4 h-4 text-muted-foreground shrink-0" />
            <Input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search pages, students, classes..."
              className="border-0 focus-visible:ring-0 shadow-none h-12 text-base"
            />
            {dbLoading && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground shrink-0" />}
            {query && !dbLoading && (
              <Badge variant="secondary" className="shrink-0 text-[10px]">
                {allItems.length} result{allItems.length !== 1 ? "s" : ""}
              </Badge>
            )}
          </div>

          {/* AI suggestion */}
          {!query && (
            <div className="px-4 py-2 bg-muted/50 border-b border-border flex items-center gap-2 text-xs text-muted-foreground">
              <Sparkles className="w-3 h-3 text-secondary" />
              {getQuickSuggestion()}
            </div>
          )}

          <div ref={listRef} className="max-h-80 overflow-y-auto">
            {allItems.length === 0 && !dbLoading ? (
              <div className="text-center py-12 px-4">
                <Search className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground font-medium">No results for "{query}"</p>
                <p className="text-muted-foreground/60 text-sm mt-1">Try a different search term</p>
              </div>
            ) : (
              Object.entries(grouped).map(([category, items]) => (
                <div key={category}>
                  <div className="px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 bg-muted/30 sticky top-0">
                    {category}
                    {(category === "Students" || category === "Users" || category === "Classes" || category === "Subjects") && (
                      <span className="ml-1.5 text-secondary">• Live</span>
                    )}
                  </div>
                  {items.map((item, i) => {
                    itemIndex++;
                    const idx = itemIndex;
                    const isSelected = idx === selectedIndex;
                    return (
                      <button
                        key={`${item.path}-${item.label}-${i}`}
                        onClick={() => go(item.path)}
                        onMouseEnter={() => setSelectedIndex(idx)}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors group ${
                          isSelected ? "bg-primary/10" : "hover:bg-muted"
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                          isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                        }`}>
                          <item.icon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className={`text-sm font-medium ${isSelected ? "text-primary" : "text-foreground"}`}>{item.label}</p>
                          <p className="text-xs text-muted-foreground truncate">{item.description}</p>
                        </div>
                        {isSelected && <ArrowRight className="w-4 h-4 text-primary shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              ))
            )}
          </div>

          <div className="px-4 py-2 border-t border-border flex items-center justify-between text-[10px] text-muted-foreground bg-muted/30">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <kbd className="px-1 py-0.5 bg-background border border-border rounded text-[9px]">↑↓</kbd> Navigate
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1 py-0.5 bg-background border border-border rounded text-[9px]">↵</kbd> Open
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1 py-0.5 bg-background border border-border rounded text-[9px]">Esc</kbd> Close
              </span>
            </div>
            <span className="flex items-center gap-1"><Sparkles className="w-3 h-3" /> Smart Search</span>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default GlobalSearch;
