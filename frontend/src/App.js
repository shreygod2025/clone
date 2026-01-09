import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "./components/ui/sonner";

// Public Pages
import LandingPage from "./pages/LandingPage";
import StudentFunnel from "./pages/StudentFunnel";
import EducatorFunnel from "./pages/EducatorFunnel";
import SchoolFunnel from "./pages/SchoolFunnel";
import AboutPage from "./pages/AboutPage";
import BlogsPage from "./pages/BlogsPage";
import BlogDetailPage from "./pages/BlogDetailPage";
import FAQPage from "./pages/FAQPage";

// Admin Pages
import AdminLogin from "./pages/admin/AdminLogin";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminStudentCRM from "./pages/admin/AdminStudentCRM";
import AdminSchoolCRM from "./pages/admin/AdminSchoolCRM";
import AdminEducators from "./pages/admin/AdminEducators";
import AdminBlogs from "./pages/admin/AdminBlogs";
import AdminFAQs from "./pages/admin/AdminFAQs";
import AdminRequirements from "./pages/admin/AdminRequirements";
import AdminSupport from "./pages/admin/AdminSupport";

// Auth Context
import { AuthProvider, useAuth } from "./context/AuthContext";

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
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/student" element={<StudentFunnel />} />
          <Route path="/educator" element={<EducatorFunnel />} />
          <Route path="/school" element={<SchoolFunnel />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/blogs" element={<BlogsPage />} />
          <Route path="/blogs/:slug" element={<BlogDetailPage />} />
          <Route path="/faq" element={<FAQPage />} />
          
          {/* Admin Routes */}
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin/students" element={<ProtectedRoute><AdminStudentCRM /></ProtectedRoute>} />
          <Route path="/admin/schools" element={<ProtectedRoute><AdminSchoolCRM /></ProtectedRoute>} />
          <Route path="/admin/educators" element={<ProtectedRoute><AdminEducators /></ProtectedRoute>} />
          <Route path="/admin/blogs" element={<ProtectedRoute><AdminBlogs /></ProtectedRoute>} />
          <Route path="/admin/faqs" element={<ProtectedRoute><AdminFAQs /></ProtectedRoute>} />
          <Route path="/admin/requirements" element={<ProtectedRoute><AdminRequirements /></ProtectedRoute>} />
          <Route path="/admin/support" element={<ProtectedRoute><AdminSupport /></ProtectedRoute>} />
        </Routes>
        <Toaster position="top-right" richColors />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
