import { BrowserRouter, Routes, Route, Navigate, useParams } from "react-router-dom";

// Dynamic redirect: /course/:slug → /courses/:slug (fixes indexed GSC URLs)
const CourseRedirect = () => {
  const { courseSlug } = useParams();
  return <Navigate to={`/courses/${courseSlug}`} replace />;
};
import { Toaster } from "./components/ui/sonner";
import ScrollToTop from "./components/ScrollToTop";
import { lazy, Suspense } from "react";
import RaiseQueryButton from "./components/RaiseQueryButton";

// Loading Spinner Component
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
    <div className="text-center">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#D63031] mx-auto"></div>
      <p className="mt-3 text-slate-500 text-sm">Loading...</p>
    </div>
  </div>
);

// Public Pages - Eagerly loaded (critical for SEO & first paint)
import LandingPage from "./pages/LandingPage";
import NotFoundPage from "./pages/NotFoundPage";

// Public Pages - Lazy loaded
const StudentFunnel = lazy(() => import("./pages/StudentFunnel"));
const EducatorFunnel = lazy(() => import("./pages/EducatorFunnel"));
const EducatorApplyPage = lazy(() => import("./pages/EducatorApplyPage"));
const SchoolFunnel = lazy(() => import("./pages/SchoolFunnel"));
const SchoolLandingPage = lazy(() => import("./pages/SchoolLandingPage"));
const SchoolOfferingsPage = lazy(() => import("./pages/SchoolOfferingsPage"));
const SchoolOfferingDetailPage = lazy(() => import("./pages/SchoolOfferingDetailPage"));
const AboutPage = lazy(() => import("./pages/AboutPage"));
const BlogsPage = lazy(() => import("./pages/BlogsPage"));
const BlogDetailPage = lazy(() => import("./pages/BlogDetailPage"));
const ResourcesPage = lazy(() => import("./pages/ResourcesPage"));
const FAQPage = lazy(() => import("./pages/FAQPage"));
const CentersPage = lazy(() => import("./pages/CentersPage"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const MyBookingsPage = lazy(() => import("./pages/MyBookingsPage"));
const InquiryPage = lazy(() => import("./pages/InquiryPage"));
const GrowthPartnerPage = lazy(() => import("./pages/GrowthPartnerPage"));
const EducatorDashboard = lazy(() => import("./pages/EducatorDashboard"));
const EducatorProfile = lazy(() => import("./pages/EducatorProfile"));
const EducatorOnboarding = lazy(() => import("./pages/EducatorOnboarding"));
const JoinTeamPage = lazy(() => import("./pages/JoinTeamPage"));
const OfferingsPage = lazy(() => import("./pages/OfferingsPage"));
const TermsPage = lazy(() => import("./pages/TermsPage"));
const PrivacyPage = lazy(() => import("./pages/PrivacyPage"));
const RefundPolicyPage = lazy(() => import("./pages/RefundPolicyPage"));
const SchoolTrackingPage = lazy(() => import("./pages/SchoolTrackingPage"));
const TeamOnboardingTrack = lazy(() => import("./pages/TeamOnboardingTrack"));
const GPOnboardingTrack = lazy(() => import("./pages/GPOnboardingTrack"));
const GPSelfOnboarding = lazy(() => import("./pages/GPSelfOnboarding"));
const StudentPayment = lazy(() => import("./pages/StudentPayment"));
const SchoolStudentPayment = lazy(() => import("./pages/SchoolStudentPayment"));
const SchoolPaymentTrackerPublic = lazy(() => import("./pages/public/SchoolPaymentTrackerPublic"));
const SchoolStudentLogin = lazy(() => import("./pages/SchoolStudentLogin"));
const SchoolStudentDashboard = lazy(() => import("./pages/SchoolStudentDashboard"));
const PublicReports = lazy(() => import("./pages/PublicReports"));

// Course SEO Pages - Lazy loaded
const CoursesListPage = lazy(() => import("./pages/courses/CoursesListPage"));
const CoursePage = lazy(() => import("./pages/courses/CoursePage"));
const SummerCampLandingPage = lazy(() => import("./pages/SummerCampLandingPage"));
const SummerCampBookingPage = lazy(() => import("./pages/SummerCampBookingPage"));
const SummerCampSuccessPage = lazy(() => import("./pages/SummerCampSuccessPage"));
const SummerCampSEOPage = lazy(() => import("./pages/SummerCampSEOPage"));
const SummerCampPortalPage = lazy(() => import("./pages/SummerCampPortalPage"));

// Social Media Internship Readiness Program
const SocialMediaInternPage = lazy(() => import("./pages/SocialMediaInternPage"));
const SocialMediaInternApplyPage = lazy(() => import("./pages/SocialMediaInternApplyPage"));
const SocialMediaInternSuccessPage = lazy(() => import("./pages/SocialMediaInternSuccessPage"));

// Admin Pages - All Lazy loaded (heavy components)
const AdminLogin = lazy(() => import("./pages/admin/AdminLogin"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminStudentCRM = lazy(() => import("./pages/admin/AdminStudentCRM"));
const AdminSchoolCRM = lazy(() => import("./pages/admin/AdminSchoolCRM"));
const AdminOrders = lazy(() => import("./pages/admin/AdminOrders"));
const AdminExpenses = lazy(() => import("./pages/admin/AdminExpenses"));
const AdminEducators = lazy(() => import("./pages/admin/AdminEducators"));
const AdminGrowthPartners = lazy(() => import("./pages/admin/AdminGrowthPartners"));
const AdminGPOnboarding = lazy(() => import("./pages/admin/AdminGPOnboarding"));
const AdminTeamApplications = lazy(() => import("./pages/admin/AdminTeamApplications"));
const AdminTeamOnboarding = lazy(() => import("./pages/admin/AdminTeamOnboarding"));
const AdminUsers = lazy(() => import("./pages/admin/AdminUsers"));
const AdminRequirements = lazy(() => import("./pages/admin/AdminRequirements"));
const AdminSupportUnified = lazy(() => import("./pages/admin/AdminSupportUnified"));
const AdminSettings = lazy(() => import("./pages/admin/AdminSettings"));
const AdminReports = lazy(() => import("./pages/admin/AdminReports"));
const AdminDataCenter = lazy(() => import("./pages/admin/AdminDataCenter"));
const AdminBlogs = lazy(() => import("./pages/admin/AdminBlogs"));
const CenterDashboard = lazy(() => import("./pages/admin/CenterDashboard"));
const SchoolPaymentTracker = lazy(() => import("./pages/admin/SchoolPaymentTracker"));
const AdminAIChat = lazy(() => import("./pages/admin/AdminAIChat"));

// Auth Context
import { AuthProvider, useAuth } from "./context/AuthContext";
import { UserAuthProvider } from "./context/UserAuthContext";

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return <PageLoader />;
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
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/student" element={<StudentFunnel />} />
              <Route path="/educator" element={<EducatorFunnel />} />
              <Route path="/educator/apply/:reqId" element={<EducatorApplyPage />} />
              <Route path="/for-schools" element={<SchoolLandingPage />} />
              <Route path="/school" element={<SchoolFunnel />} />
              <Route path="/school-offerings" element={<SchoolOfferingsPage />} />
              <Route path="/school-offerings/:categoryId/:offeringId" element={<SchoolOfferingDetailPage />} />
              <Route path="/offerings" element={<OfferingsPage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/join-team" element={<JoinTeamPage />} />
              <Route path="/blogs" element={<BlogsPage />} />
              <Route path="/blogs/:slug" element={<BlogDetailPage />} />
              <Route path="/resources" element={<ResourcesPage />} />
              <Route path="/resources/:slug" element={<ResourcesPage />} />
              <Route path="/faq" element={<FAQPage />} />
              <Route path="/faqs" element={<FAQPage />} />
              <Route path="/centers" element={<CentersPage />} />
              
              {/* URL Redirects for old/external links */}
              <Route path="/team" element={<Navigate to="/join-team" replace />} />
              <Route path="/blog" element={<Navigate to="/blogs" replace />} />
              <Route path="/help" element={<Navigate to="/faq" replace />} />
              <Route path="/mycoursedetail/:id" element={<Navigate to="/login" replace />} />
              <Route path="/all-courses" element={<Navigate to="/offerings" replace />} />
              <Route path="/about-us" element={<Navigate to="/about" replace />} />
              {/* Fix old indexed course URLs: /course/:slug → /courses/:slug */}
              <Route path="/course/:courseSlug" element={<CourseRedirect />} />
              
              {/* Legal Pages */}
              <Route path="/terms" element={<TermsPage />} />
              <Route path="/privacy" element={<PrivacyPage />} />
              <Route path="/refund-policy" element={<RefundPolicyPage />} />
              
              {/* Public School Tracking */}
              <Route path="/track/:token" element={<SchoolTrackingPage />} />
              
              {/* Student Payment Page */}
              <Route path="/student/pay/:studentId" element={<StudentPayment />} />
              <Route path="/student/payment/success" element={<StudentPayment />} />
              
              {/* School Student Payment Page (Public) */}
              <Route path="/school-pay/:schoolId" element={<SchoolStudentPayment />} />
              <Route path="/school-payment-success/:schoolId" element={<SchoolStudentPayment />} />
              <Route path="/school-payment-tracker-public/:schoolId" element={<SchoolPaymentTrackerPublic />} />
              
              {/* School Student Login & Dashboard */}
              <Route path="/school-student/login" element={<SchoolStudentLogin />} />
              <Route path="/school-student/dashboard" element={<SchoolStudentDashboard />} />
              
              {/* Public Team Onboarding Tracking */}
              <Route path="/team-track/:token" element={<TeamOnboardingTrack />} />
              
              {/* Public GP Onboarding Tracking */}
              <Route path="/gp-track/:token" element={<GPOnboardingTrack />} />
              
              {/* GP Self Onboarding - Full onboarding form */}
              <Route path="/gp-onboard/:token" element={<GPSelfOnboarding />} />
              
              {/* Public Reports (Password Protected) */}
              <Route path="/reports/:token" element={<PublicReports />} />
              
              {/* User Auth Routes */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/my-bookings" element={<MyBookingsPage />} />
              <Route path="/educator-dashboard" element={<EducatorDashboard />} />
              <Route path="/educator-profile" element={<EducatorProfile />} />
              <Route path="/educator-onboarding" element={<EducatorOnboarding />} />
              <Route path="/add" element={<InquiryPage />} />
              <Route path="/add/:username" element={<InquiryPage />} />
              <Route path="/growth-partner" element={<GrowthPartnerPage />} />
              
              {/* SEO Course Pages */}
              <Route path="/courses" element={<CoursesListPage />} />
              <Route path="/courses/:courseSlug" element={<CoursePage />} />

              {/* Summer Camp 2026 */}
              <Route path="/summer-camp/book" element={<SummerCampBookingPage />} />
              <Route path="/summer-camp/success" element={<SummerCampSuccessPage />} />
              <Route path="/summer-camp/portal" element={<SummerCampPortalPage />} />
              <Route path="/summer-camp/:type/:slug" element={<SummerCampSEOPage />} />
              <Route path="/summer-camp" element={<SummerCampLandingPage />} />
              <Route path="/summer-camp/:ageGroup" element={<SummerCampLandingPage />} />

              {/* Social Media Internship Readiness Program */}
              <Route path="/social-media-intern" element={<SocialMediaInternPage />} />
              <Route path="/social-media-intern/apply" element={<SocialMediaInternApplyPage />} />
              <Route path="/social-media-intern/success" element={<SocialMediaInternSuccessPage />} />
              
              {/* Admin Routes */}
              <Route path="/admin/login" element={<AdminLogin />} />
              <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
              <Route path="/admin/students" element={<ProtectedRoute><AdminStudentCRM /></ProtectedRoute>} />
              <Route path="/admin/schools" element={<ProtectedRoute><AdminSchoolCRM /></ProtectedRoute>} />
              <Route path="/admin/school-payments/:schoolId" element={<ProtectedRoute><SchoolPaymentTracker /></ProtectedRoute>} />
              <Route path="/admin/orders" element={<ProtectedRoute><AdminOrders /></ProtectedRoute>} />
              <Route path="/admin/expenses" element={<ProtectedRoute><AdminExpenses /></ProtectedRoute>} />
              <Route path="/admin/educators" element={<ProtectedRoute><AdminEducators /></ProtectedRoute>} />
              <Route path="/admin/growth-partners" element={<ProtectedRoute><AdminGrowthPartners /></ProtectedRoute>} />
              <Route path="/admin/gp-onboarding" element={<ProtectedRoute><AdminGPOnboarding /></ProtectedRoute>} />
              <Route path="/admin/team-applications" element={<ProtectedRoute><AdminTeamApplications /></ProtectedRoute>} />
              <Route path="/admin/team-onboarding" element={<ProtectedRoute><AdminTeamOnboarding /></ProtectedRoute>} />
              <Route path="/admin/users" element={<ProtectedRoute><AdminUsers /></ProtectedRoute>} />
              <Route path="/admin/support" element={<ProtectedRoute><AdminSupportUnified /></ProtectedRoute>} />
              <Route path="/admin/requirements" element={<ProtectedRoute><AdminRequirements /></ProtectedRoute>} />
              <Route path="/admin/reports" element={<ProtectedRoute><AdminReports /></ProtectedRoute>} />
              <Route path="/admin/data-center" element={<ProtectedRoute><AdminDataCenter /></ProtectedRoute>} />
              <Route path="/admin/blogs" element={<ProtectedRoute><AdminBlogs /></ProtectedRoute>} />
              <Route path="/admin/settings" element={<ProtectedRoute><AdminSettings /></ProtectedRoute>} />
              <Route path="/admin/ai-chat" element={<ProtectedRoute><AdminAIChat /></ProtectedRoute>} />
              <Route path="/center" element={<ProtectedRoute><CenterDashboard /></ProtectedRoute>} />
              
              {/* 404 Not Found - Must be last */}
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </Suspense>
          <Toaster position="top-right" richColors />
          <RaiseQueryButton />
        </BrowserRouter>
      </UserAuthProvider>
    </AuthProvider>
  );
}

export default App;
