import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/ProtectedRoute";

// Public pages
import Index from "./pages/Index";
import About from "./pages/About";
import Admissions from "./pages/Admissions";
import Staff from "./pages/Staff";
import Gallery from "./pages/Gallery";
import News from "./pages/News";
import Contact from "./pages/Contact";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import Signup from "./pages/Signup";

// Teacher pages
import TeacherDashboard from "./pages/teacher/TeacherDashboard";
import TeacherClasses from "./pages/teacher/TeacherClasses";
import TeacherGrades from "./pages/teacher/TeacherGrades";
import TeacherAttendance from "./pages/teacher/TeacherAttendance";
import TeacherReports from "./pages/teacher/TeacherReports";
import TeacherAnnouncements from "./pages/teacher/TeacherAnnouncements";
import TeacherProfile from "./pages/teacher/TeacherProfile";

// Student pages
import StudentDashboard from "./pages/student/StudentDashboard";
import StudentGrades from "./pages/student/StudentGrades";
import StudentAttendance from "./pages/student/StudentAttendance";
import StudentReports from "./pages/student/StudentReports";
import StudentAnnouncements from "./pages/student/StudentAnnouncements";
import StudentFees from "./pages/student/StudentFees";
import StudentProfile from "./pages/student/StudentProfile";

// Admin pages
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminClasses from "./pages/admin/AdminClasses";
import AdminSubjects from "./pages/admin/AdminSubjects";
import AdminCodes from "./pages/admin/AdminCodes";
import AdminGrades from "./pages/admin/AdminGrades";
import AdminAnnouncements from "./pages/admin/AdminAnnouncements";
import AdminFees from "./pages/admin/AdminFees";
import AdminSettings from "./pages/admin/AdminSettings";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Public */}
            <Route path="/" element={<Index />} />
            <Route path="/about" element={<About />} />
            <Route path="/admissions" element={<Admissions />} />
            <Route path="/staff" element={<Staff />} />
            <Route path="/gallery" element={<Gallery />} />
            <Route path="/news" element={<News />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />

            {/* Teacher Portal */}
            <Route path="/teacher" element={<ProtectedRoute allowedRoles={["teacher", "admin"]}><TeacherDashboard /></ProtectedRoute>} />
            <Route path="/teacher/classes" element={<ProtectedRoute allowedRoles={["teacher", "admin"]}><TeacherClasses /></ProtectedRoute>} />
            <Route path="/teacher/grades" element={<ProtectedRoute allowedRoles={["teacher", "admin"]}><TeacherGrades /></ProtectedRoute>} />
            <Route path="/teacher/attendance" element={<ProtectedRoute allowedRoles={["teacher", "admin"]}><TeacherAttendance /></ProtectedRoute>} />
            <Route path="/teacher/reports" element={<ProtectedRoute allowedRoles={["teacher", "admin"]}><TeacherReports /></ProtectedRoute>} />
            <Route path="/teacher/announcements" element={<ProtectedRoute allowedRoles={["teacher", "admin"]}><TeacherAnnouncements /></ProtectedRoute>} />
            <Route path="/teacher/profile" element={<ProtectedRoute allowedRoles={["teacher", "admin"]}><TeacherProfile /></ProtectedRoute>} />

            {/* Student Portal */}
            <Route path="/student" element={<ProtectedRoute allowedRoles={["student"]}><StudentDashboard /></ProtectedRoute>} />
            <Route path="/student/grades" element={<ProtectedRoute allowedRoles={["student"]}><StudentGrades /></ProtectedRoute>} />
            <Route path="/student/attendance" element={<ProtectedRoute allowedRoles={["student"]}><StudentAttendance /></ProtectedRoute>} />
            <Route path="/student/reports" element={<ProtectedRoute allowedRoles={["student"]}><StudentReports /></ProtectedRoute>} />
            <Route path="/student/announcements" element={<ProtectedRoute allowedRoles={["student"]}><StudentAnnouncements /></ProtectedRoute>} />
            <Route path="/student/fees" element={<ProtectedRoute allowedRoles={["student"]}><StudentFees /></ProtectedRoute>} />
            <Route path="/student/profile" element={<ProtectedRoute allowedRoles={["student"]}><StudentProfile /></ProtectedRoute>} />

            {/* Admin Portal */}
            <Route path="/admin" element={<ProtectedRoute allowedRoles={["admin"]}><AdminDashboard /></ProtectedRoute>} />
            <Route path="/admin/users" element={<ProtectedRoute allowedRoles={["admin"]}><AdminUsers /></ProtectedRoute>} />
            <Route path="/admin/classes" element={<ProtectedRoute allowedRoles={["admin"]}><AdminClasses /></ProtectedRoute>} />
            <Route path="/admin/subjects" element={<ProtectedRoute allowedRoles={["admin"]}><AdminSubjects /></ProtectedRoute>} />
            <Route path="/admin/codes" element={<ProtectedRoute allowedRoles={["admin"]}><AdminCodes /></ProtectedRoute>} />
            <Route path="/admin/grades" element={<ProtectedRoute allowedRoles={["admin"]}><AdminGrades /></ProtectedRoute>} />
            <Route path="/admin/announcements" element={<ProtectedRoute allowedRoles={["admin"]}><AdminAnnouncements /></ProtectedRoute>} />
            <Route path="/admin/fees" element={<ProtectedRoute allowedRoles={["admin"]}><AdminFees /></ProtectedRoute>} />
            <Route path="/admin/settings" element={<ProtectedRoute allowedRoles={["admin"]}><AdminSettings /></ProtectedRoute>} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
