import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Search, Home, Users, FileText, GraduationCap, BookOpen, Key,
  BarChart3, Bell, DollarSign, Receipt, Settings, ClipboardCheck
} from "lucide-react";

interface SearchItem {
  label: string;
  description: string;
  path: string;
  icon: React.ElementType;
  keywords: string[];
}

const adminFeatures: SearchItem[] = [
  { label: "Dashboard", description: "Overview & statistics", path: "/admin", icon: Home, keywords: ["home", "overview", "stats", "summary"] },
  { label: "Users", description: "Manage students, teachers & admins", path: "/admin/users", icon: Users, keywords: ["students", "teachers", "accounts", "people", "staff"] },
  { label: "Applications", description: "Review admission applications", path: "/admin/applications", icon: FileText, keywords: ["admissions", "apply", "enroll", "new students"] },
  { label: "Classes", description: "Manage classes & streams", path: "/admin/classes", icon: GraduationCap, keywords: ["forms", "streams", "class teacher", "assign"] },
  { label: "Subjects", description: "Manage subjects & curriculum", path: "/admin/subjects", icon: BookOpen, keywords: ["curriculum", "courses", "compulsory", "optional"] },
  { label: "Access Codes", description: "Generate signup codes", path: "/admin/codes", icon: Key, keywords: ["registration", "invite", "signup", "codes"] },
  { label: "Grades Overview", description: "View all student grades", path: "/admin/grades", icon: BarChart3, keywords: ["marks", "results", "performance", "academic"] },
  { label: "Announcements", description: "Create & manage announcements", path: "/admin/announcements", icon: Bell, keywords: ["notice", "news", "broadcast", "pin"] },
  { label: "Fee Management", description: "Fees, payments & receipts", path: "/admin/fees", icon: DollarSign, keywords: ["payment", "receipt", "balance", "tuition", "money", "barcode", "scan"] },
  { label: "Finance & Petty Cash", description: "Track expenses & petty cash", path: "/admin/finance", icon: Receipt, keywords: ["expenses", "cash", "budget", "spending"] },
  { label: "Settings", description: "System & school settings", path: "/admin/settings", icon: Settings, keywords: ["config", "system", "school name", "preferences"] },
];

const teacherFeatures: SearchItem[] = [
  { label: "Dashboard", description: "Overview", path: "/teacher", icon: Home, keywords: ["home"] },
  { label: "My Classes", description: "View assigned classes", path: "/teacher/classes", icon: Users, keywords: ["students", "class list"] },
  { label: "Set Grades", description: "Enter student grades", path: "/teacher/grades", icon: BookOpen, keywords: ["marks", "results"] },
  { label: "Monthly Tests", description: "Record monthly test marks", path: "/teacher/monthly-tests", icon: BarChart3, keywords: ["tests", "marks"] },
  { label: "Attendance", description: "Mark student attendance", path: "/teacher/attendance", icon: ClipboardCheck, keywords: ["present", "absent"] },
  { label: "Report Cards", description: "Generate report cards", path: "/teacher/reports", icon: FileText, keywords: ["reports"] },
  { label: "Announcements", description: "View & create announcements", path: "/teacher/announcements", icon: Bell, keywords: ["notice"] },
  { label: "Settings", description: "Profile settings", path: "/teacher/profile", icon: Settings, keywords: ["profile"] },
];

const studentFeatures: SearchItem[] = [
  { label: "Dashboard", description: "Overview", path: "/student", icon: Home, keywords: ["home"] },
  { label: "My Grades", description: "View your grades", path: "/student/grades", icon: BookOpen, keywords: ["marks", "results"] },
  { label: "Attendance", description: "View attendance record", path: "/student/attendance", icon: ClipboardCheck, keywords: ["present", "absent"] },
  { label: "Report Cards", description: "Download report cards", path: "/student/reports", icon: FileText, keywords: ["reports"] },
  { label: "Study Pal AI", description: "AI study assistant", path: "/student/study-pal", icon: BookOpen, keywords: ["ai", "study", "help", "tutor"] },
  { label: "Announcements", description: "View announcements", path: "/student/announcements", icon: Bell, keywords: ["notice"] },
  { label: "Fees", description: "View fee records", path: "/student/fees", icon: DollarSign, keywords: ["payment", "balance"] },
  { label: "Settings", description: "Profile settings", path: "/student/profile", icon: Settings, keywords: ["profile"] },
];

interface GlobalSearchProps {
  role: "admin" | "teacher" | "student" | "parent";
}

const GlobalSearch = ({ role }: GlobalSearchProps) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(true);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const features = role === "admin" ? adminFeatures : role === "teacher" ? teacherFeatures : role === "parent" ? studentFeatures : studentFeatures;

  const filtered = query.trim().length === 0
    ? features
    : features.filter(f => {
        const q = query.toLowerCase();
        return f.label.toLowerCase().includes(q) ||
          f.description.toLowerCase().includes(q) ||
          f.keywords.some(k => k.includes(q));
      });

  const handleQueryChange = (value: string) => {
    setQuery(value);
    if (value.trim().length > 0) {
      setIsSearching(true);
      setShowResults(false);
      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        setIsSearching(false);
        setShowResults(true);
      }, 400);
    } else {
      setIsSearching(false);
      setShowResults(true);
    }
  };

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
      setIsSearching(false);
      setShowResults(true);
    }
  }, [open]);

  const go = (path: string) => {
    navigate(path);
    setOpen(false);
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-muted/50 text-muted-foreground text-sm hover:bg-muted transition-colors max-w-xs w-full sm:w-64"
      >
        <Search className="w-4 h-4 shrink-0" />
        <span className="truncate">Search features...</span>
        <kbd className="hidden sm:inline-flex ml-auto text-[10px] font-mono bg-background border border-border rounded px-1.5 py-0.5">⌘K</kbd>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden">
          <div className="flex items-center gap-2 px-4 border-b border-border">
            <Search className="w-4 h-4 text-muted-foreground shrink-0" />
            <Input
              ref={inputRef}
              value={query}
              onChange={e => handleQueryChange(e.target.value)}
              placeholder="Search pages & features..."
              className="border-0 focus-visible:ring-0 shadow-none h-12 text-base"
            />
          </div>
          <div className="max-h-72 overflow-y-auto p-2">
            {isSearching ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-3 py-2.5">
                  <Skeleton className="w-8 h-8 rounded-md shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-4 w-28 rounded" />
                    <Skeleton className="h-3 w-44 rounded" />
                  </div>
                </div>
              ))
            ) : !showResults ? null : filtered.length === 0 ? (
              <p className="text-center text-muted-foreground text-sm py-8">No results found</p>
            ) : (
              filtered.map(item => (
                <button
                  key={item.path}
                  onClick={() => go(item.path)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left hover:bg-muted transition-colors"
                >
                  <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                    <item.icon className="w-4 h-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">{item.label}</p>
                    <p className="text-xs text-muted-foreground truncate">{item.description}</p>
                  </div>
                </button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default GlobalSearch;
