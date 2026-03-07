import { ReactNode, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  Menu, X, LogOut, Home, Users, BookOpen, ClipboardCheck,
  FileText, Bell, Settings, BarChart3, Key, GraduationCap,
  DollarSign, User
} from "lucide-react";
import schoolLogo from "@/assets/school-logo.png";

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
  { label: "Attendance", path: "/teacher/attendance", icon: ClipboardCheck },
  { label: "Report Cards", path: "/teacher/reports", icon: FileText },
  { label: "Announcements", path: "/teacher/announcements", icon: Bell },
  { label: "Profile", path: "/teacher/profile", icon: User },
];

const studentNav: NavItem[] = [
  { label: "Dashboard", path: "/student", icon: Home },
  { label: "My Grades", path: "/student/grades", icon: BookOpen },
  { label: "Attendance", path: "/student/attendance", icon: ClipboardCheck },
  { label: "Report Cards", path: "/student/reports", icon: FileText },
  { label: "Announcements", path: "/student/announcements", icon: Bell },
  { label: "Fees", path: "/student/fees", icon: DollarSign },
  { label: "Profile", path: "/student/profile", icon: User },
];

const adminNav: NavItem[] = [
  { label: "Dashboard", path: "/admin", icon: Home },
  { label: "Users", path: "/admin/users", icon: Users },
  { label: "Applications", path: "/admin/applications", icon: FileText },
  { label: "Classes", path: "/admin/classes", icon: GraduationCap },
  { label: "Subjects", path: "/admin/subjects", icon: BookOpen },
  { label: "Access Codes", path: "/admin/codes", icon: Key },
  { label: "Grades Overview", path: "/admin/grades", icon: BarChart3 },
  { label: "Announcements", path: "/admin/announcements", icon: Bell },
  { label: "Fee Management", path: "/admin/fees", icon: DollarSign },
  { label: "Settings", path: "/admin/settings", icon: Settings },
];

interface DashboardLayoutProps {
  children: ReactNode;
  role: "teacher" | "student" | "admin";
}

const DashboardLayout = ({ children, role }: DashboardLayoutProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { profile, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = role === "admin" ? adminNav : role === "teacher" ? teacherNav : studentNav;
  const roleLabel = role.charAt(0).toUpperCase() + role.slice(1);

  const handleSignOut = async () => {
    await signOut();
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-screen flex bg-muted/30">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-primary text-primary-foreground transform transition-transform duration-300 lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex items-center gap-3 p-4 border-b border-primary-foreground/20">
          <img src={schoolLogo} alt="Logo" className="h-10 w-10 object-contain" />
          <div>
            <p className="font-display font-bold text-sm">St. Mary's</p>
            <p className="text-xs opacity-80">{roleLabel} Portal</p>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden ml-auto">
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="p-3 space-y-1 overflow-y-auto flex-1">
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

        <div className="p-3 border-t border-primary-foreground/20">
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
          <div className="flex-1" />
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-foreground">{profile?.full_name || "User"}</p>
              <p className="text-xs text-muted-foreground">{roleLabel}</p>
            </div>
            <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-bold">
              {(profile?.full_name || "U").charAt(0)}
            </div>
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
