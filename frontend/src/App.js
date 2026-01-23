import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "./components/ui/sonner";
import ScrollToTop from "./components/ScrollToTop";

// Public Pages
import LandingPage from "./pages/LandingPage";
import StudentFunnel from "./pages/StudentFunnel";
import EducatorFunnel from "./pages/EducatorFunnel";
import SchoolFunnel from "./pages/SchoolFunnel";
import SchoolOfferingsPage from "./pages/SchoolOfferingsPage";
import SchoolOfferingDetailPage from "./pages/SchoolOfferingDetailPage";
import AboutPage from "./pages/AboutPage";
import BlogsPage from "./pages/BlogsPage";
import BlogDetailPage from "./pages/BlogDetailPage";
import FAQPage from "./pages/FAQPage";
import CentersPage from "./pages/CentersPage";
import LoginPage from "./pages/LoginPage";
import MyBookingsPage from "./pages/MyBookingsPage";
import InquiryPage from "./pages/InquiryPage";
import GrowthPartnerPage from "./pages/GrowthPartnerPage";
import EducatorDashboard from "./pages/EducatorDashboard";
import EducatorOnboarding from "./pages/EducatorOnboarding";
import JoinTeamPage from "./pages/JoinTeamPage";
import OfferingsPage from "./pages/OfferingsPage";
import TermsPage from "./pages/TermsPage";
import PrivacyPage from "./pages/PrivacyPage";
import RefundPolicyPage from "./pages/RefundPolicyPage";

// Course SEO Pages
import CoursesListPage from "./pages/courses/CoursesListPage";
import CoursePage from "./pages/courses/CoursePage";

// Admin Pages
import AdminLogin from "./pages/admin/AdminLogin";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminStudentCRM from "./pages/admin/AdminStudentCRM";
import AdminSchoolCRM from "./pages/admin/AdminSchoolCRM";
import AdminEducators from "./pages/admin/AdminEducators";
import AdminGrowthPartners from "./pages/admin/AdminGrowthPartners";
import AdminTeamApplications from "./pages/admin/AdminTeamApplications";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminRequirements from "./pages/admin/AdminRequirements";
import AdminSupportUnified from "./pages/admin/AdminSupportUnified";
import AdminSettings from "./pages/admin/AdminSettings";
import AdminReports from "./pages/admin/AdminReports";
import CenterDashboard from "./pages/admin/CenterDashboard";

// Auth Context
import { AuthProvider, useAuth } from "./context/AuthContext";
import { UserAuthProvider } from "./context/UserAuthContext";

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#D63031]"></div>
      </div>
    );
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace />;
  }
  
  return children;
};

function App() {
  return (
    <AuthProvider>
      <UserAuthProvider>
        <BrowserRouter>
          <ScrollToTop />
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/student" element={<StudentFunnel />} />
            <Route path="/educator" element={<EducatorFunnel />} />
            <Route path="/school" element={<SchoolFunnel />} />
            <Route path="/school-offerings" element={<SchoolOfferingsPage />} />
            <Route path="/school-offerings/:categoryId/:offeringId" element={<SchoolOfferingDetailPage />} />
            <Route path="/offerings" element={<OfferingsPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/join-team" element={<JoinTeamPage />} />
            <Route path="/blogs" element={<BlogsPage />} />
            <Route path="/blogs/:slug" element={<BlogDetailPage />} />
            <Route path="/faq" element={<FAQPage />} />
            <Route path="/faqs" element={<FAQPage />} />
            <Route path="/centers" element={<CentersPage />} />
            
            {/* Legal Pages */}
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="/refund-policy" element={<RefundPolicyPage />} />
            
            {/* User Auth Routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/my-bookings" element={<MyBookingsPage />} />
            <Route path="/educator-dashboard" element={<EducatorDashboard />} />
            <Route path="/educator-onboarding" element={<EducatorOnboarding />} />
            <Route path="/add" element={<InquiryPage />} />
            <Route path="/add/:username" element={<InquiryPage />} />
            <Route path="/growth-partner" element={<GrowthPartnerPage />} />
            
            {/* SEO Course Pages */}
            <Route path="/courses" element={<CoursesListPage />} />
            <Route path="/courses/:courseSlug" element={<CoursePage />} />
            
            {/* Admin Routes */}
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
            <Route path="/admin/students" element={<ProtectedRoute><AdminStudentCRM /></ProtectedRoute>} />
            <Route path="/admin/schools" element={<ProtectedRoute><AdminSchoolCRM /></ProtectedRoute>} />
            <Route path="/admin/educators" element={<ProtectedRoute><AdminEducators /></ProtectedRoute>} />
            <Route path="/admin/growth-partners" element={<ProtectedRoute><AdminGrowthPartners /></ProtectedRoute>} />
            <Route path="/admin/team-applications" element={<ProtectedRoute><AdminTeamApplications /></ProtectedRoute>} />
            <Route path="/admin/users" element={<ProtectedRoute><AdminUsers /></ProtectedRoute>} />
            <Route path="/admin/support" element={<ProtectedRoute><AdminSupportUnified /></ProtectedRoute>} />
            <Route path="/admin/requirements" element={<ProtectedRoute><AdminRequirements /></ProtectedRoute>} />
            <Route path="/admin/reports" element={<ProtectedRoute><AdminReports /></ProtectedRoute>} />
            <Route path="/admin/settings" element={<ProtectedRoute><AdminSettings /></ProtectedRoute>} />
            <Route path="/center" element={<ProtectedRoute><CenterDashboard /></ProtectedRoute>} />
          </Routes>
          <Toaster position="top-right" richColors />
        </BrowserRouter>
      </UserAuthProvider>
    </AuthProvider>
  );
}

export default App;
