import { ReactNode, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import ThemeToggle from "@/components/ThemeToggle";
import GlobalSearch from "@/components/GlobalSearch";
import {
  Menu, X, LogOut, Home, Users, BookOpen, ClipboardCheck,
  FileText, Bell, Settings, BarChart3, Key, GraduationCap,
  DollarSign, User, Receipt, MessageSquare, Trophy, Newspaper, Image, History, ShieldAlert, ShieldCheck
} from "lucide-react";
import schoolLogo from "@/assets/school-logo.png";
import NotificationBell from "@/components/NotificationBell";

interface NavItem {
  label: string;
  path: string;
  icon: React.ElementType;
}

const teacherNav: NavItem[] = [
  { label: "Dashboard", path: "/teacher", icon: Home },
  { label: "My Classes", path: "/teacher/classes", icon: Users },
  { label: "Set Grades", path: "/teacher/grades", icon: BookOpen },
  { label: "Monthly Tests", path: "/teacher/monthly-tests", icon: BarChart3 },
  { label: "Rankings", path: "/teacher/rankings", icon: Trophy },
  { label: "Attendance", path: "/teacher/attendance", icon: ClipboardCheck },
  { label: "Report Cards", path: "/teacher/reports", icon: FileText },
  { label: "Messages", path: "/teacher/messages", icon: MessageSquare },
  { label: "Announcements", path: "/teacher/announcements", icon: Bell },
  { label: "Record Book", path: "/teacher/record-book", icon: BookOpen },
  { label: "Verify Documents", path: "/teacher/verify", icon: ShieldCheck },
  { label: "Settings", path: "/teacher/profile", icon: Settings },
];

const studentNav: NavItem[] = [
  { label: "Dashboard", path: "/student", icon: Home },
  { label: "My Grades", path: "/student/grades", icon: BookOpen },
  { label: "Rankings", path: "/student/rankings", icon: Trophy },
  { label: "Attendance", path: "/student/attendance", icon: ClipboardCheck },
  { label: "Report Cards", path: "/student/reports", icon: FileText },
  { label: "Study Pal AI", path: "/student/study-pal", icon: BookOpen },
  { label: "Messages", path: "/student/messages", icon: MessageSquare },
  { label: "Announcements", path: "/student/announcements", icon: Bell },
  { label: "Fees", path: "/student/fees", icon: DollarSign },
  { label: "Verify Documents", path: "/student/verify", icon: ShieldCheck },
  { label: "Settings", path: "/student/profile", icon: Settings },
];

const adminNav: NavItem[] = [
  { label: "Dashboard", path: "/admin", icon: Home },
  { label: "Users", path: "/admin/users", icon: Users },
  { label: "Students", path: "/admin/students", icon: GraduationCap },
  { label: "Staff Management", path: "/admin/staff-management", icon: User },
  { label: "Applications", path: "/admin/applications", icon: FileText },
  { label: "Classes", path: "/admin/classes", icon: GraduationCap },
  { label: "Subjects", path: "/admin/subjects", icon: BookOpen },
  { label: "Access Codes", path: "/admin/codes", icon: Key },
  { label: "Grades Overview", path: "/admin/grades", icon: BarChart3 },
  { label: "Rankings", path: "/admin/rankings", icon: Trophy },
  { label: "Messages", path: "/admin/messages", icon: MessageSquare },
  { label: "Announcements", path: "/admin/announcements", icon: Bell },
  { label: "Fee Management", path: "/admin/fees", icon: DollarSign },
  { label: "Finance & Petty Cash", path: "/admin/finance", icon: Receipt },
  { label: "Homepage Updates", path: "/admin/homepage", icon: Newspaper },
  { label: "Staff Gallery", path: "/admin/staff-gallery", icon: Image },
  { label: "Record Books", path: "/admin/record-books", icon: BookOpen },
  { label: "Student History", path: "/admin/student-history", icon: History },
  { label: "AI Security", path: "/admin/security", icon: ShieldAlert },
  { label: "Settings", path: "/admin/settings", icon: Settings },
];

const parentNav: NavItem[] = [
  { label: "Dashboard", path: "/parent", icon: Home },
  { label: "Grades", path: "/parent/grades", icon: BookOpen },
  { label: "Report Cards", path: "/parent/reports", icon: FileText },
  { label: "Attendance", path: "/parent/attendance", icon: ClipboardCheck },
  { label: "Fees", path: "/parent/fees", icon: DollarSign },
  { label: "Messages", path: "/parent/messages", icon: MessageSquare },
  { label: "Verify Documents", path: "/parent/verify", icon: ShieldCheck },
  { label: "Settings", path: "/parent/settings", icon: Settings },
];

interface DashboardLayoutProps {
  children: ReactNode;
  role: "teacher" | "student" | "admin" | "parent";
}

const DashboardLayout = ({ children, role }: DashboardLayoutProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { profile, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = role === "admin" ? adminNav : role === "teacher" ? teacherNav : role === "parent" ? parentNav : studentNav;
  const roleLabel = role.charAt(0).toUpperCase() + role.slice(1);

  const handleSignOut = async () => {
    await signOut();
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-screen flex bg-muted/30">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-primary text-primary-foreground transform transition-transform duration-300 lg:translate-x-0 flex flex-col ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex items-center gap-3 p-4 border-b border-primary-foreground/20 shrink-0">
          <img src={schoolLogo} alt="Logo" className="h-10 w-10 object-contain" />
          <div>
            <p className="font-display font-bold text-sm">St. Mary's</p>
            <p className="text-xs opacity-80">{roleLabel} Portal</p>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden ml-auto">
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="p-3 space-y-1 overflow-y-auto flex-1 min-h-0">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-primary-foreground/20 text-primary-foreground"
                    : "text-primary-foreground/70 hover:bg-primary-foreground/10 hover:text-primary-foreground"
                }`}
              >
                <item.icon className="w-4 h-4 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-primary-foreground/20 shrink-0">
          <Button
            variant="ghost"
            className="w-full justify-start text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10"
            onClick={handleSignOut}
          >
            <LogOut className="w-4 h-4 mr-2" /> Sign Out
          </Button>
        </div>
      </aside>

      {/* Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main */}
      <div className="flex-1 lg:ml-64">
        <header className="sticky top-0 z-30 bg-card border-b border-border h-16 flex items-center px-4 gap-4">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-foreground">
            <Menu className="w-6 h-6" />
          </button>
          <GlobalSearch role={role} />
          <div className="flex items-center gap-3">
            <NotificationBell />
            <ThemeToggle />
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-foreground">{profile?.full_name || "User"}</p>
              <p className="text-xs text-muted-foreground">{roleLabel}</p>
            </div>
            <button
              onClick={() => {
                const settingsPath = role === "admin" ? "/admin/settings" : role === "teacher" ? "/teacher/profile" : role === "parent" ? "/parent/settings" : "/student/profile";
                navigate(settingsPath);
              }}
              className="cursor-pointer rounded-full focus:outline-none focus:ring-2 focus:ring-primary"
              title="Open Settings"
            >
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt={profile.full_name} className="w-9 h-9 rounded-full object-cover border-2 border-border hover:border-primary transition-colors" />
              ) : (
                <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-bold hover:opacity-90 transition-opacity">
                  {(profile?.full_name || "U").charAt(0)}
                </div>
              )}
            </button>
          </div>
        </header>

        <main className="p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
