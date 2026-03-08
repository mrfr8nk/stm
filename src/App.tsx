import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ThemeProvider } from "next-themes";
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
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";

// Teacher pages
import TeacherDashboard from "./pages/teacher/TeacherDashboard";
import TeacherClasses from "./pages/teacher/TeacherClasses";
import TeacherGrades from "./pages/teacher/TeacherGrades";
import TeacherAttendance from "./pages/teacher/TeacherAttendance";
import TeacherReports from "./pages/teacher/TeacherReports";
import TeacherAnnouncements from "./pages/teacher/TeacherAnnouncements";
import TeacherProfile from "./pages/teacher/TeacherProfile";
import TeacherMonthlyTests from "./pages/teacher/TeacherMonthlyTests";
import TeacherRankings from "./pages/teacher/TeacherRankings";
import TeacherMessages from "./pages/teacher/TeacherMessages";
import TeacherRecordBook from "./pages/teacher/TeacherRecordBook";

// Student pages
import StudentDashboard from "./pages/student/StudentDashboard";
import StudentGrades from "./pages/student/StudentGrades";
import StudentAttendance from "./pages/student/StudentAttendance";
import StudentReports from "./pages/student/StudentReports";
import StudentAnnouncements from "./pages/student/StudentAnnouncements";
import StudentFees from "./pages/student/StudentFees";
import StudentProfile from "./pages/student/StudentProfile";
import StudentStudyPal from "./pages/student/StudentStudyPal";
import StudentRankings from "./pages/student/StudentRankings";
import StudentMessages from "./pages/student/StudentMessages";

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
import AdminApplications from "./pages/admin/AdminApplications";
import AdminFinance from "./pages/admin/AdminFinance";
import AdminRankings from "./pages/admin/AdminRankings";
import AdminMessages from "./pages/admin/AdminMessages";
import AdminHomepageUpdates from "./pages/admin/AdminHomepageUpdates";
import AdminStaffGallery from "./pages/admin/AdminStaffGallery";
import AdminStudentHistory from "./pages/admin/AdminStudentHistory";

// Parent pages
import ParentDashboard from "./pages/parent/ParentDashboard";
import ParentGrades from "./pages/parent/ParentGrades";
import ParentAttendance from "./pages/parent/ParentAttendance";
import ParentFees from "./pages/parent/ParentFees";
import ParentMessages from "./pages/parent/ParentMessages";

const queryClient = new QueryClient();

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
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
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />

              {/* Teacher Portal */}
              <Route path="/teacher" element={<ProtectedRoute allowedRoles={["teacher", "admin"]}><TeacherDashboard /></ProtectedRoute>} />
              <Route path="/teacher/classes" element={<ProtectedRoute allowedRoles={["teacher", "admin"]}><TeacherClasses /></ProtectedRoute>} />
              <Route path="/teacher/grades" element={<ProtectedRoute allowedRoles={["teacher", "admin"]}><TeacherGrades /></ProtectedRoute>} />
              <Route path="/teacher/attendance" element={<ProtectedRoute allowedRoles={["teacher", "admin"]}><TeacherAttendance /></ProtectedRoute>} />
              <Route path="/teacher/reports" element={<ProtectedRoute allowedRoles={["teacher", "admin"]}><TeacherReports /></ProtectedRoute>} />
              <Route path="/teacher/monthly-tests" element={<ProtectedRoute allowedRoles={["teacher", "admin"]}><TeacherMonthlyTests /></ProtectedRoute>} />
              <Route path="/teacher/rankings" element={<ProtectedRoute allowedRoles={["teacher", "admin"]}><TeacherRankings /></ProtectedRoute>} />
              <Route path="/teacher/messages" element={<ProtectedRoute allowedRoles={["teacher", "admin"]}><TeacherMessages /></ProtectedRoute>} />
              <Route path="/teacher/announcements" element={<ProtectedRoute allowedRoles={["teacher", "admin"]}><TeacherAnnouncements /></ProtectedRoute>} />
              <Route path="/teacher/record-book" element={<ProtectedRoute allowedRoles={["teacher", "admin"]}><TeacherRecordBook /></ProtectedRoute>} />
              <Route path="/teacher/profile" element={<ProtectedRoute allowedRoles={["teacher", "admin"]}><TeacherProfile /></ProtectedRoute>} />

              {/* Student Portal */}
              <Route path="/student" element={<ProtectedRoute allowedRoles={["student"]}><StudentDashboard /></ProtectedRoute>} />
              <Route path="/student/grades" element={<ProtectedRoute allowedRoles={["student"]}><StudentGrades /></ProtectedRoute>} />
              <Route path="/student/attendance" element={<ProtectedRoute allowedRoles={["student"]}><StudentAttendance /></ProtectedRoute>} />
              <Route path="/student/reports" element={<ProtectedRoute allowedRoles={["student"]}><StudentReports /></ProtectedRoute>} />
              <Route path="/student/announcements" element={<ProtectedRoute allowedRoles={["student"]}><StudentAnnouncements /></ProtectedRoute>} />
              <Route path="/student/fees" element={<ProtectedRoute allowedRoles={["student"]}><StudentFees /></ProtectedRoute>} />
              <Route path="/student/profile" element={<ProtectedRoute allowedRoles={["student"]}><StudentProfile /></ProtectedRoute>} />
              <Route path="/student/study-pal" element={<ProtectedRoute allowedRoles={["student"]}><StudentStudyPal /></ProtectedRoute>} />
              <Route path="/student/rankings" element={<ProtectedRoute allowedRoles={["student"]}><StudentRankings /></ProtectedRoute>} />
              <Route path="/student/messages" element={<ProtectedRoute allowedRoles={["student"]}><StudentMessages /></ProtectedRoute>} />

              {/* Admin Portal */}
              <Route path="/admin" element={<ProtectedRoute allowedRoles={["admin"]}><AdminDashboard /></ProtectedRoute>} />
              <Route path="/admin/users" element={<ProtectedRoute allowedRoles={["admin"]}><AdminUsers /></ProtectedRoute>} />
              <Route path="/admin/applications" element={<ProtectedRoute allowedRoles={["admin"]}><AdminApplications /></ProtectedRoute>} />
              <Route path="/admin/classes" element={<ProtectedRoute allowedRoles={["admin"]}><AdminClasses /></ProtectedRoute>} />
              <Route path="/admin/subjects" element={<ProtectedRoute allowedRoles={["admin"]}><AdminSubjects /></ProtectedRoute>} />
              <Route path="/admin/codes" element={<ProtectedRoute allowedRoles={["admin"]}><AdminCodes /></ProtectedRoute>} />
              <Route path="/admin/grades" element={<ProtectedRoute allowedRoles={["admin"]}><AdminGrades /></ProtectedRoute>} />
              <Route path="/admin/rankings" element={<ProtectedRoute allowedRoles={["admin"]}><AdminRankings /></ProtectedRoute>} />
              <Route path="/admin/messages" element={<ProtectedRoute allowedRoles={["admin"]}><AdminMessages /></ProtectedRoute>} />
              <Route path="/admin/announcements" element={<ProtectedRoute allowedRoles={["admin"]}><AdminAnnouncements /></ProtectedRoute>} />
              <Route path="/admin/fees" element={<ProtectedRoute allowedRoles={["admin"]}><AdminFees /></ProtectedRoute>} />
              <Route path="/admin/settings" element={<ProtectedRoute allowedRoles={["admin"]}><AdminSettings /></ProtectedRoute>} />
              <Route path="/admin/finance" element={<ProtectedRoute allowedRoles={["admin"]}><AdminFinance /></ProtectedRoute>} />
              <Route path="/admin/homepage" element={<ProtectedRoute allowedRoles={["admin"]}><AdminHomepageUpdates /></ProtectedRoute>} />
              <Route path="/admin/staff-gallery" element={<ProtectedRoute allowedRoles={["admin"]}><AdminStaffGallery /></ProtectedRoute>} />
              <Route path="/admin/student-history" element={<ProtectedRoute allowedRoles={["admin"]}><AdminStudentHistory /></ProtectedRoute>} />

              {/* Parent Portal */}
              <Route path="/parent" element={<ProtectedRoute allowedRoles={["parent"]}><ParentDashboard /></ProtectedRoute>} />
              <Route path="/parent/grades" element={<ProtectedRoute allowedRoles={["parent"]}><ParentGrades /></ProtectedRoute>} />
              <Route path="/parent/attendance" element={<ProtectedRoute allowedRoles={["parent"]}><ParentAttendance /></ProtectedRoute>} />
              <Route path="/parent/fees" element={<ProtectedRoute allowedRoles={["parent"]}><ParentFees /></ProtectedRoute>} />
              <Route path="/parent/messages" element={<ProtectedRoute allowedRoles={["parent"]}><ParentMessages /></ProtectedRoute>} />

              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
