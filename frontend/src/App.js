import { BrowserRouter, Routes, Route, Navigate, useParams, useLocation } from "react-router-dom";

// Dynamic redirect: /course/:slug → /courses/:slug (fixes indexed GSC URLs)
const CourseRedirect = () => {
  const { courseSlug } = useParams();
  return <Navigate to={`/courses/${courseSlug}`} replace />;
};

// Dynamic redirect: /blog/* → /blogs/* (consolidates /blog vs /blogs
// duplication Search Console flagged — kills the www.oll.co/blog/… variants).
// Uses splat ("*") so deep paths like /blog/foo/bar also 302 to /blogs/foo/bar.
const BlogSlugRedirect = () => {
  const location = useLocation();
  const rest = location.pathname.replace(/^\/blog\/?/, '');
  return <Navigate to={`/blogs/${rest}${location.search}`} replace />;
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
const EducatorInterviewPage = lazy(() => import("./pages/EducatorInterviewPage"));
const SchoolFunnel = lazy(() => import("./pages/SchoolFunnel"));
const SchoolLandingPage = lazy(() => import("./pages/SchoolLandingPage"));
const SchoolOfferingsPage = lazy(() => import("./pages/SchoolOfferingsPage"));
const SchoolOfferingDetailPage = lazy(() => import("./pages/SchoolOfferingDetailPage"));
const AboutPage = lazy(() => import("./pages/AboutPage"));
const BlogsPage = lazy(() => import("./pages/BlogsPage"));
const BlogDetailPage = lazy(() => import("./pages/BlogDetailPage"));
const SharkTankYoungFoundersPage = lazy(() => import("./pages/SharkTankYoungFoundersPage"));
const RoboSumoBuildGuideBlog = lazy(() => import("./pages/blogs/RoboSumoBuildGuideBlog"));
const ICSECode66BlogPage = lazy(() => import("./pages/blogs/ICSECode66BlogPage"));
const SuccessStoriesPage = lazy(() => import("./pages/SuccessStoriesPage"));
const SuccessStoryDetailPage = lazy(() => import("./pages/SuccessStoryDetailPage"));
const AdminSuccessStories = lazy(() => import("./pages/admin/AdminSuccessStories"));
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
const PublicReceiptPage = lazy(() => import("./pages/PublicReceiptPage"));
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

// AI Foundations Course
const AiFoundationsLandingPage = lazy(() => import("./pages/AiFoundationsLandingPage"));
const AiFoundationsBookingPage = lazy(() => import("./pages/AiFoundationsBookingPage"));
const AiFoundationsSuccessPage = lazy(() => import("./pages/AiFoundationsSuccessPage"));

// White-labeled custom payment link (admin-generated → shared with parents)
const PaymentRedirect = lazy(() => import("./pages/PaymentRedirect"));

// Future Skills Continuous Learning Program
const FutureSkillsLandingPage = lazy(() => import("./pages/FutureSkillsLandingPage"));
const FathersDayWorkshopLandingPage = lazy(() => import("./pages/FathersDayWorkshopLandingPage"));
const WorkshopSuccessPage = lazy(() => import("./pages/WorkshopSuccessPage"));
const FutureSkillsBookingPage = lazy(() => import("./pages/FutureSkillsBookingPage"));
const FutureSkillsSuccessPage = lazy(() => import("./pages/FutureSkillsSuccessPage"));
const FutureSkillsSourceRedirect = lazy(() => import("./pages/FutureSkillsSourceRedirect"));

// Social Media Internship Readiness Program
const SocialMediaInternPage = lazy(() => import("./pages/SocialMediaInternPage"));
const SocialMediaInternApplyPage = lazy(() => import("./pages/SocialMediaInternApplyPage"));
const SocialMediaInternSuccessPage = lazy(() => import("./pages/SocialMediaInternSuccessPage"));

// Admin Pages - All Lazy loaded (heavy components)
const AdminLogin = lazy(() => import("./pages/admin/AdminLogin"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminStudentCRM = lazy(() => import("./pages/admin/AdminStudentCRM"));
const AdminLinkPreviewTester = lazy(() => import("./pages/admin/AdminLinkPreviewTester"));
const AdminSchoolCRM = lazy(() => import("./pages/admin/AdminSchoolCRM"));
const AdminFieldReports = lazy(() => import("./pages/admin/AdminFieldReports"));
const AdminTelecalling  = lazy(() => import("./pages/admin/AdminTelecalling"));
const SchoolReports = lazy(() => import("./pages/admin/SchoolReports"));
const LMSSchoolReport = lazy(() => import("./pages/admin/LMSSchoolReport"));
const PublicLMSReport = lazy(() => import("./pages/PublicLMSReport"));
const DiscoverPayment = lazy(() => import("./pages/DiscoverPayment"));
const DiscoverSuccess = lazy(() => import("./pages/DiscoverSuccess"));
const FriendshipDayLanding = lazy(() => import("./pages/FriendshipDayLanding"));
const FriendshipDaySuccess = lazy(() => import("./pages/FriendshipDaySuccess"));
const RoboticsBeginnerLanding = lazy(() => import("./pages/school/RoboticsBeginnerLanding"));
const RoboticsICSE910Landing = lazy(() => import("./pages/school/RoboticsICSE910Landing"));
const CBSECTAILanding = lazy(() => import("./pages/school/CBSECTAILanding"));
const FutureSkillsLanding = lazy(() => import("./pages/school/FutureSkillsLanding"));
const StemPreschoolLanding = lazy(() => import("./pages/school/StemPreschoolLanding"));
const AdminOnboardingTracker = lazy(() => import("./pages/admin/AdminOnboardingTracker"));
const AdminOrders = lazy(() => import("./pages/admin/AdminOrders"));
const AdminExpenses = lazy(() => import("./pages/admin/AdminExpenses"));
const AdminEducators = lazy(() => import("./pages/admin/AdminEducators"));
const AdminCompetitions = lazy(() => import("./pages/admin/AdminCompetitions"));
const AdminGrowthPartners = lazy(() => import("./pages/admin/AdminGrowthPartners"));
const AdminGPOnboarding = lazy(() => import("./pages/admin/AdminGPOnboarding"));
const AdminTeamApplications = lazy(() => import("./pages/admin/AdminTeamApplications"));
const AdminTeamOnboarding = lazy(() => import("./pages/admin/AdminTeamOnboarding"));
const AdminUsers = lazy(() => import("./pages/admin/AdminUsers"));
const AdminOrgChart = lazy(() => import("./pages/admin/AdminOrgChart"));
const AdminMyTeam = lazy(() => import("./pages/admin/AdminMyTeam"));
const UserPerformance = lazy(() => import("./pages/admin/UserPerformance"));
const AdminTasks = lazy(() => import("./pages/admin/AdminTasks"));
const AdminProjects = lazy(() => import("./pages/admin/AdminProjects"));
const AdminMySpace = lazy(() => import("./pages/admin/AdminMySpace"));
const AdminProjectDetail = lazy(() => import("./pages/admin/AdminProjectDetail"));
const AdminRequirements = lazy(() => import("./pages/admin/AdminRequirements"));
const AdminSupportUnified = lazy(() => import("./pages/admin/AdminSupportUnified"));
const AdminSettings = lazy(() => import("./pages/admin/AdminSettings"));
const AdminFaqSettings = lazy(() => import("./pages/admin/AdminFaqSettings"));
const AdminFaqAnalytics = lazy(() => import("./pages/admin/AdminFaqAnalytics"));
const AdminDataExport = lazy(() => import("./pages/admin/AdminDataExport"));
const AdminReports = lazy(() => import("./pages/admin/AdminReports"));
const AdminDataCenter = lazy(() => import("./pages/admin/AdminDataCenter"));
const AdminCentralDatabase = lazy(() => import("./pages/admin/AdminCentralDatabase"));
const AdminLive = lazy(() => import("./pages/admin/AdminLive"));
const AdminBlogs = lazy(() => import("./pages/admin/AdminBlogs"));
const CenterDashboard = lazy(() => import("./pages/admin/CenterDashboard"));
const SchoolPaymentTracker = lazy(() => import("./pages/admin/SchoolPaymentTracker"));
const AdminAIChat = lazy(() => import("./pages/admin/AdminAIChat"));
const AdminAiFoundations = lazy(() => import("./pages/admin/AdminAiFoundations"));
const AdminFutureSkills = lazy(() => import("./pages/admin/AdminFutureSkills"));
const AdminBroadcasts = lazy(() => import("./pages/admin/AdminBroadcasts"));
const Unsubscribe = lazy(() => import("./pages/Unsubscribe"));

// Auth Context
import { AuthProvider, useAuth } from "./context/AuthContext";
import { UserAuthProvider } from "./context/UserAuthContext";
import { CartProvider } from "./context/CartContext";

// Robotics Shop
const ShopPage = lazy(() => import("./pages/ShopPage"));
const ShopCheckoutPage = lazy(() => import("./pages/ShopCheckoutPage"));
const ProductDetailPage = lazy(() => import("./pages/ProductDetailPage"));
const ShopSuccessPage = lazy(() => import("./pages/ShopSuccessPage"));
const AdminShopPanel = lazy(() => import("./pages/admin/AdminShopPanel"));
const AdminPricing = lazy(() => import("./pages/admin/AdminPricing"));
const TechfestPage = lazy(() => import("./pages/TechfestPage"));
const TechfestRegisterPage = lazy(() => import("./pages/TechfestRegisterPage"));
const TechfestSubmitPage = lazy(() => import("./pages/TechfestSubmitPage"));
const TechfestSubmissionPortalPage = lazy(() => import("./pages/TechfestSubmissionPortalPage"));
const RoboSumoCompetitionPage = lazy(() => import("./pages/techfest/RoboSumoCompetitionPage"));
const RoboRacerCompetitionPage = lazy(() => import("./pages/techfest/RoboRacerCompetitionPage"));
const RoboInnovationCompetitionPage = lazy(() => import("./pages/techfest/RoboInnovationCompetitionPage"));
const ProblemStatementPage = lazy(() => import("./pages/techfest/ProblemStatementPage"));
const AccessDenied = lazy(() => import("./pages/admin/AccessDenied"));
import NoIndexMeta from "./components/NoIndexMeta";

const ProtectedRoute = ({ children, permission = null }) => {
  const { isAuthenticated, loading, user } = useAuth();
  const location = useLocation();

  if (loading) {
    return <PageLoader />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace />;
  }

  // Permission gate: mirrors the sidebar filter in AdminDashboard.jsx so a
  // team-user can't bypass hidden nav items by pasting the URL directly.
  //   • admin / super_admin bypass everything
  //   • fs_center_owner is scoped to the Future Skills CRM only
  //   • any user having the exact permission (or any sub-permission with
  //     the same prefix, e.g. `expenses.list` grants `expenses`) is allowed
  if (permission) {
    const role = user?.role;
    if (role === 'admin' || role === 'super_admin') {
      return children;
    }
    if (role === 'fs_center_owner') {
      // Centre owners have full access only to Future Skills CRM.
      // BUT they should also be able to use shared admin utilities like
      // Support Center, My Space, AI Chat & My Team. Anything else routes
      // back to their Future Skills home.
      const allowedForOwner = new Set([
        'future_skills',
        'support',   // Support Center — user asked centre owners see this too
      ]);
      return allowedForOwner.has(permission)
        ? children
        : <Navigate to="/admin/future-skills" replace />;
    }
    const perms = user?.permissions || [];
    const allowed =
      perms.includes(permission) ||
      perms.some(p => p.startsWith(`${permission}.`));
    if (!allowed) {
      // Show a real "Access Denied" page instead of a silent redirect —
      // pass the attempted path & required permission via router state so
      // the page can tell the user what's missing.
      return (
        <Navigate
          to="/admin/access-denied"
          state={{ attemptedPath: location.pathname, permission }}
          replace
        />
      );
    }
  }

  return (
    <>
      {/* Every admin / authenticated route is noindex, nofollow —
          Google Search Console was indexing /admin, /educator-dashboard,
          /my-bookings etc. after they appeared in internal links. */}
      <NoIndexMeta />
      {children}
    </>
  );
};

function App() {
  return (
    <AuthProvider>
      <UserAuthProvider>
        <CartProvider>
        <BrowserRouter>
          <ScrollToTop />
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/student" element={<StudentFunnel />} />
              <Route path="/educator" element={<EducatorFunnel />} />
              <Route path="/educator/apply/:reqId" element={<EducatorApplyPage />} />
              <Route path="/educator/interview/:applicationId" element={<EducatorInterviewPage />} />
              <Route path="/for-schools" element={<SchoolLandingPage />} />
              <Route path="/shark-tank-india-season-6-young-founders-special" element={<SharkTankYoungFoundersPage />} />
              <Route path="/shark-tank-young-founders" element={<Navigate to="/shark-tank-india-season-6-young-founders-special" replace />} />
              <Route path="/shark-tank-india-young-founders" element={<Navigate to="/shark-tank-india-season-6-young-founders-special" replace />} />
              <Route path="/school" element={<SchoolFunnel />} />
              <Route path="/school-offerings" element={<SchoolOfferingsPage />} />
              <Route path="/school-offerings/:categoryId/:offeringId" element={<SchoolOfferingDetailPage />} />
              <Route path="/offerings" element={<OfferingsPage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/join-team" element={<JoinTeamPage />} />
              <Route path="/blogs" element={<BlogsPage />} />
              <Route path="/blogs/how-to-build-robosumo-robot-iit-bombay-techfest" element={<RoboSumoBuildGuideBlog />} />
              <Route path="/blogs/icse-robotics-ai-code-66-classes-9-10-guide" element={<ICSECode66BlogPage />} />
              <Route path="/blogs/:slug" element={<BlogDetailPage />} />
              <Route path="/success-stories" element={<SuccessStoriesPage />} />
              <Route path="/success-stories/:slug" element={<SuccessStoryDetailPage />} />
              <Route path="/resources" element={<ResourcesPage />} />
              <Route path="/resources/:slug" element={<ResourcesPage />} />
              <Route path="/faq" element={<FAQPage />} />
              <Route path="/faqs" element={<FAQPage />} />
              <Route path="/receipt" element={<><NoIndexMeta /><PublicReceiptPage /></>} />
              <Route path="/receipts" element={<><NoIndexMeta /><PublicReceiptPage /></>} />
              <Route path="/centers" element={<CentersPage />} />
              
              {/* URL Redirects for old/external links */}
              <Route path="/team" element={<Navigate to="/join-team" replace />} />
              <Route path="/blog" element={<Navigate to="/blogs" replace />} />
              <Route path="/blog/*" element={<BlogSlugRedirect />} />
              <Route path="/help" element={<Navigate to="/faq" replace />} />
              <Route path="/mycoursedetail/:id" element={<><NoIndexMeta /><Navigate to="/login" replace /></>} />
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
              <Route path="/student/pay/:studentId" element={<><NoIndexMeta /><StudentPayment /></>} />
              <Route path="/student/payment/success" element={<><NoIndexMeta /><StudentPayment /></>} />
              
              {/* School Student Payment Page (Public) */}
              <Route path="/school-pay/:schoolId" element={<><NoIndexMeta /><SchoolStudentPayment /></>} />
              <Route path="/school-payment-success/:schoolId" element={<><NoIndexMeta /><SchoolStudentPayment /></>} />
              <Route path="/school-payment-tracker-public/:schoolId" element={<><NoIndexMeta /><SchoolPaymentTrackerPublic /></>} />
              
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
              <Route path="/login" element={<><NoIndexMeta /><LoginPage /></>} />
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
              <Route path="/summer-camp/book" element={<><NoIndexMeta /><SummerCampBookingPage /></>} />
              <Route path="/summer-camp/success" element={<><NoIndexMeta /><SummerCampSuccessPage /></>} />
              <Route path="/summer-camp/portal" element={<><NoIndexMeta /><SummerCampPortalPage /></>} />
              <Route path="/summer-camp/:type/:slug" element={<SummerCampSEOPage />} />
              <Route path="/summer-camp" element={<SummerCampLandingPage />} />
              <Route path="/summer-camp/:ageGroup" element={<SummerCampLandingPage />} />

              {/* AI Foundations Course */}
              <Route path="/ai-foundations" element={<AiFoundationsLandingPage />} />
              <Route path="/ai-foundations/book" element={<><NoIndexMeta /><AiFoundationsBookingPage /></>} />
              <Route path="/ai-foundations/success" element={<><NoIndexMeta /><AiFoundationsSuccessPage /></>} />

              {/* Future Skills Continuous Learning Program */}
              <Route path="/future-skills" element={<FutureSkillsLandingPage />} />
              <Route path="/workshops/fathers-day-robotics" element={<FathersDayWorkshopLandingPage />} />
              <Route path="/workshops/:slug/success" element={<><NoIndexMeta /><WorkshopSuccessPage /></>} />
              <Route path="/future-skills/book" element={<><NoIndexMeta /><FutureSkillsBookingPage /></>} />
              <Route path="/future-skills/success" element={<><NoIndexMeta /><FutureSkillsSuccessPage /></>} />
              <Route path="/future-skills/s/:slug" element={<FutureSkillsSourceRedirect />} />

              {/* Public white-labeled payment link (admin-generated for parents) */}
              <Route path="/pay/:token" element={<><NoIndexMeta /><PaymentRedirect /></>} />

              {/* Social Media Internship Readiness Program */}
              <Route path="/social-media-intern" element={<SocialMediaInternPage />} />
              <Route path="/social-media-intern/apply" element={<><NoIndexMeta /><SocialMediaInternApplyPage /></>} />
              <Route path="/social-media-intern/success" element={<><NoIndexMeta /><SocialMediaInternSuccessPage /></>} />

              {/* Robotics Kit Shop */}
              <Route path="/shop" element={<ShopPage />} />
              <Route path="/shop/category/:categorySlug" element={<ShopPage />} />
              <Route path="/shop/product/:slug" element={<ProductDetailPage />} />
              <Route path="/shop/checkout" element={<><NoIndexMeta /><ShopCheckoutPage /></>} />
              <Route path="/shop/success" element={<><NoIndexMeta /><ShopSuccessPage /></>} />
              
              {/* Admin Routes */}
              <Route path="/admin/login" element={<><NoIndexMeta /><AdminLogin /></>} />
              <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
              <Route path="/admin/students" element={<ProtectedRoute permission="students"><AdminStudentCRM /></ProtectedRoute>} />
              <Route path="/admin/link-preview-tester" element={<ProtectedRoute permission="settings"><AdminLinkPreviewTester /></ProtectedRoute>} />
              <Route path="/admin/schools" element={<ProtectedRoute permission="schools"><AdminSchoolCRM /></ProtectedRoute>} />
              <Route path="/pricing" element={<ProtectedRoute permission="pricing"><AdminPricing /></ProtectedRoute>} />
              <Route path="/techfest" element={<TechfestPage />} />
              <Route path="/techfest/register" element={<TechfestRegisterPage />} />
              <Route path="/techfest/submit" element={<TechfestSubmitPage />} />
              <Route path="/techfest/my-submission" element={<TechfestSubmissionPortalPage />} />
              {/* ─── IIT Bombay Techfest SEO landing pages ────────────────
                   One keyword-targeted HTML page per competition track plus
                   an HTML Problem-Statement page (replaces the orphaned PDF
                   in Google so a real page can rank for "robo sumo
                   competition", "robo race competition 2026", etc.). */}
              <Route path="/techfest-iitbombay/robo-sumo-competition" element={<RoboSumoCompetitionPage />} />
              <Route path="/techfest-iitbombay/robo-race-competition" element={<RoboRacerCompetitionPage />} />
              <Route path="/techfest-iitbombay/robo-innovation-competition" element={<RoboInnovationCompetitionPage />} />
              <Route path="/techfest-iitbombay/problem-statement" element={<ProblemStatementPage />} />
              {/* Alias — the robo-racer kit landing page used to be the
                   only hit for "roboracer competition" in Google. Keep the
                   old path alive via 301 to the new SEO page. */}
              <Route path="/techfest-iitbombay/roboracer-competition" element={<Navigate to="/techfest-iitbombay/robo-race-competition" replace />} />
              <Route path="/techfest-iitbombay/robosumo-competition" element={<Navigate to="/techfest-iitbombay/robo-sumo-competition" replace />} />
              <Route path="/school-offerings/robotics/iit-bombay-competitions" element={<Navigate to="/techfest" replace />} />
              <Route path="/school-offerings/robotics/icse-group3-kits" element={<Navigate to="/school/robotics/icse-9-10" replace />} />
              <Route path="/admin/success-stories" element={<ProtectedRoute><AdminSuccessStories /></ProtectedRoute>} />
              <Route path="/admin/schools/:schoolId/reports" element={<ProtectedRoute permission="schools"><SchoolReports /></ProtectedRoute>} />
              <Route path="/admin/schools/:schoolId/lms-report" element={<ProtectedRoute permission="schools"><LMSSchoolReport /></ProtectedRoute>} />
              <Route path="/public/lms-report/:token" element={<PublicLMSReport />} />
              <Route path="/discover" element={<DiscoverPayment />} />
              <Route path="/discover/success" element={<DiscoverSuccess />} />
              <Route path="/friendship-day" element={<FriendshipDayLanding />} />
              <Route path="/friendship-day/success" element={<FriendshipDaySuccess />} />
              {/* School Products — dedicated per-tier landing pages. Robotics Beginner is
                  live; the rest fall back to the same demo-booking flow with a query
                  param (tier=) until each gets its own dedicated page. */}
              {/* NEW canonical SEO URL for the Robotics & AI Lab turnkey pitch */}
              <Route path="/school/robotics-ai-lab-for-schools-turnkey-solution"  element={<RoboticsBeginnerLanding />} />
              <Route path="/school/robotics-ai-lab-for-schools-turnkey-solution/" element={<RoboticsBeginnerLanding />} />
              {/* Old URLs → 301 to the new canonical */}
              <Route path="/school/robotics/beginner"     element={<Navigate to="/school/robotics-ai-lab-for-schools-turnkey-solution/" replace />} />
              <Route path="/school/robotics/intermediate" element={<Navigate to="/school/robotics-ai-lab-for-schools-turnkey-solution/" replace />} />
              <Route path="/school/robotics/advanced"     element={<Navigate to="/school/robotics-ai-lab-for-schools-turnkey-solution/" replace />} />
              <Route path="/school/robotics/icse"         element={<Navigate to="/school/robotics-ai-lab-for-schools-turnkey-solution/" replace />} />
              <Route path="/school/cs/icse"               element={<Navigate to="/school/robotics-ai-lab-for-schools-turnkey-solution/" replace />} />
              <Route path="/school/robotics/icse-9-10" element={<RoboticsICSE910Landing />} />
              <Route path="/school/icse-robotics-and-ai-curriculum-books-with-practical-activity-kits-for-class-9th-and10th" element={<RoboticsICSE910Landing />} />
              <Route path="/school/robotics/icse-9" element={<Navigate to="/school/icse-robotics-and-ai-curriculum-books-with-practical-activity-kits-for-class-9th-and10th" replace />} />
              <Route path="/school/robotics/icse-10" element={<Navigate to="/school/icse-robotics-and-ai-curriculum-books-with-practical-activity-kits-for-class-9th-and10th" replace />} />
              <Route path="/school/robotics/pre-school"    element={<StemPreschoolLanding />} />
              <Route path="/school/cs/cbse"               element={<CBSECTAILanding />} />
              <Route path="/school/cs/cbse-ct-ai"         element={<CBSECTAILanding />} />
              <Route path="/school/cs/future-skills-icse" element={<FutureSkillsLanding board="ICSE" />} />
              <Route path="/school/cs/future-skills-cbse" element={<FutureSkillsLanding board="CBSE" />} />
              {/* SEO-friendly keyword-rich canonicals for Future Skills funnels */}
              <Route path="/school/cs/icse-future-skills-classes-1-to-8" element={<FutureSkillsLanding board="ICSE" />} />
              <Route path="/school/cs/cbse-future-skills-classes-1-to-8" element={<FutureSkillsLanding board="CBSE" />} />
              {/* NEW long-tail SEO canonical URLs (2026-09-26) */}
              <Route path="/school/cbse-ict-robotics-ai-and-coding-curriculum-with-practical-activity-books-for-class-1-to-8" element={<FutureSkillsLanding board="CBSE" />} />
              <Route path="/school/icse-ict-robotics-ai-and-coding-curriculum-with-practical-activity-books-for-class-1-to-8" element={<FutureSkillsLanding board="ICSE" />} />
              <Route path="/school/stem-preschool" element={<StemPreschoolLanding />} />
              <Route path="/school/preschool/stem-jr-sr-kg" element={<StemPreschoolLanding />} />
              <Route path="/school/cs/computational-thinking-and-ai-classes-3-to-8" element={<CBSECTAILanding />} />
              <Route path="/admin/schools/onboarding-tracker" element={<ProtectedRoute permission="schools"><AdminOnboardingTracker /></ProtectedRoute>} />
              <Route path="/admin/school-payments" element={<Navigate to="/admin/orders" replace />} />
              <Route path="/admin/school-payments/:schoolId" element={<ProtectedRoute permission="orders"><SchoolPaymentTracker /></ProtectedRoute>} />
              <Route path="/admin/orders" element={<ProtectedRoute permission="orders"><AdminOrders /></ProtectedRoute>} />
              <Route path="/admin/expenses" element={<ProtectedRoute permission="expenses"><AdminExpenses /></ProtectedRoute>} />
              <Route path="/admin/educators" element={<ProtectedRoute permission="educators"><AdminEducators /></ProtectedRoute>} />
              <Route path="/admin/competitions" element={<ProtectedRoute permission="competitions"><AdminCompetitions /></ProtectedRoute>} />
              <Route path="/admin/growth-partners" element={<ProtectedRoute permission="growth_partners"><AdminGrowthPartners /></ProtectedRoute>} />
              <Route path="/admin/gp-onboarding" element={<ProtectedRoute permission="growth_partners"><AdminGPOnboarding /></ProtectedRoute>} />
              <Route path="/admin/team-applications" element={<ProtectedRoute permission="team_applications"><AdminTeamApplications /></ProtectedRoute>} />
              <Route path="/admin/team-onboarding" element={<ProtectedRoute permission="team_applications"><AdminTeamOnboarding /></ProtectedRoute>} />
              <Route path="/admin/users" element={<ProtectedRoute permission="users"><AdminUsers /></ProtectedRoute>} />
              <Route path="/admin/org-chart" element={<ProtectedRoute permission="users"><AdminOrgChart /></ProtectedRoute>} />
              <Route path="/admin/users/:id/performance" element={<ProtectedRoute permission="users"><UserPerformance /></ProtectedRoute>} />
              <Route path="/admin/me/performance" element={<ProtectedRoute><UserPerformance mode="me" /></ProtectedRoute>} />
              <Route path="/admin/team" element={<ProtectedRoute><AdminMyTeam /></ProtectedRoute>} />
              <Route path="/admin/tasks" element={<ProtectedRoute><AdminTasks /></ProtectedRoute>} />
              <Route path="/admin/projects" element={<ProtectedRoute><AdminProjects /></ProtectedRoute>} />
              <Route path="/admin/my-space" element={<ProtectedRoute><AdminMySpace /></ProtectedRoute>} />
              <Route path="/admin/projects/:id" element={<ProtectedRoute><AdminProjectDetail /></ProtectedRoute>} />
              <Route path="/admin/support" element={<ProtectedRoute permission="support"><AdminSupportUnified /></ProtectedRoute>} />
              <Route path="/admin/requirements" element={<ProtectedRoute permission="requirements"><AdminRequirements /></ProtectedRoute>} />
              <Route path="/admin/reports" element={<ProtectedRoute permission="reports"><AdminReports /></ProtectedRoute>} />
              <Route path="/admin/data-center" element={<ProtectedRoute permission="data_center"><AdminDataCenter /></ProtectedRoute>} />
              <Route path="/admin/central-database" element={<ProtectedRoute permission="central_database"><AdminCentralDatabase /></ProtectedRoute>} />
              {/* Live Operations is a PUBLIC command-center dashboard (TV / lobby display) —
                  no login required. The /api/live-dashboard/snapshot endpoint is already public. */}
              <Route path="/admin/live" element={<AdminLive />} />
              <Route path="/admin/field-reports" element={<ProtectedRoute permission="field_reports"><AdminFieldReports /></ProtectedRoute>} />
              <Route path="/admin/telecalling" element={<ProtectedRoute permission="telecalling"><AdminTelecalling /></ProtectedRoute>} />
              <Route path="/admin/blogs" element={<ProtectedRoute permission="blogs"><AdminBlogs /></ProtectedRoute>} />
              <Route path="/admin/settings" element={<ProtectedRoute permission="settings"><AdminSettings /></ProtectedRoute>} />
              <Route path="/admin/faq-settings" element={<ProtectedRoute permission="settings"><AdminFaqSettings /></ProtectedRoute>} />
              <Route path="/admin/faq-analytics" element={<ProtectedRoute permission="support"><AdminFaqAnalytics /></ProtectedRoute>} />
              <Route path="/admin/data-export" element={<ProtectedRoute permission="data_center"><AdminDataExport /></ProtectedRoute>} />
              <Route path="/admin/ai-chat" element={<ProtectedRoute><AdminAIChat /></ProtectedRoute>} />
              <Route path="/admin/ai-foundations" element={<ProtectedRoute permission="settings"><AdminAiFoundations /></ProtectedRoute>} />
              <Route path="/admin/future-skills" element={<ProtectedRoute permission="future_skills"><AdminFutureSkills /></ProtectedRoute>} />
              <Route path="/admin/broadcasts" element={<ProtectedRoute permission="settings"><AdminBroadcasts /></ProtectedRoute>} />
              <Route path="/admin/shop" element={<ProtectedRoute permission="orders"><AdminShopPanel /></ProtectedRoute>} />
              <Route path="/admin/access-denied" element={<ProtectedRoute><AccessDenied /></ProtectedRoute>} />
              <Route path="/unsubscribe" element={<Unsubscribe />} />
              <Route path="/center" element={<ProtectedRoute><CenterDashboard /></ProtectedRoute>} />
              
              {/* 404 Not Found - Must be last */}
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </Suspense>
          <Toaster position="top-right" richColors />
          <RaiseQueryButton />
        </BrowserRouter>
        </CartProvider>
      </UserAuthProvider>
    </AuthProvider>
  );
}

export default App;
