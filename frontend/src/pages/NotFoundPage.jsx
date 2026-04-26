import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Home, Search, BookOpen, ArrowLeft } from 'lucide-react';
import { Button } from '../components/ui/button';
import { ASSETS } from '../config/assets';

const NotFoundPage = () => {
  return (
    <>
      <Helmet>
        <title>Page Not Found | OLL - Learn Future Skills</title>
        <meta name="description" content="The page you're looking for doesn't exist. Explore OLL's Robotics, AI, Coding & Entrepreneurship classes instead." />
        <meta name="robots" content="noindex, follow" />
      </Helmet>

      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 flex flex-col items-center justify-center px-4">
        {/* Logo */}
        <Link to="/" className="mb-8">
          <img 
            src={ASSETS.OLL_LOGO_COLOR} 
            alt="OLL Logo" 
            className="h-10"
          />
        </Link>

        {/* 404 Illustration */}
        <div className="text-center max-w-md">
          <div className="relative mb-6">
            <h1 className="text-[150px] md:text-[200px] font-bold text-[#1E3A5F]/10 leading-none select-none">
              404
            </h1>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-6xl">🤖</div>
            </div>
          </div>

          <h2 className="text-2xl md:text-3xl font-bold text-[#1E3A5F] mb-3" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Oops! Page Not Found
          </h2>
          <p className="text-slate-600 mb-8">
            Looks like this page took a different learning path. Let&apos;s get you back on track!
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-8">
            <Link to="/">
              <Button className="w-full sm:w-auto bg-[#D63031] hover:bg-[#b52828] text-white px-6">
                <Home className="w-4 h-4 mr-2" />
                Go Home
              </Button>
            </Link>
            <Link to="/student">
              <Button variant="outline" className="w-full sm:w-auto border-[#1E3A5F] text-[#1E3A5F] hover:bg-[#1E3A5F] hover:text-white px-6">
                <BookOpen className="w-4 h-4 mr-2" />
                Book a Demo
              </Button>
            </Link>
          </div>

          {/* Quick Links */}
          <div className="bg-white/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-200">
            <p className="text-sm text-slate-500 mb-4">Popular pages you might be looking for:</p>
            <div className="flex flex-wrap gap-2 justify-center">
              <Link to="/student" className="px-4 py-2 bg-blue-50 text-blue-700 rounded-full text-sm hover:bg-blue-100 transition-colors">
                Robotics Classes
              </Link>
              <Link to="/student" className="px-4 py-2 bg-purple-50 text-purple-700 rounded-full text-sm hover:bg-purple-100 transition-colors">
                AI & Coding
              </Link>
              <Link to="/for-schools" className="px-4 py-2 bg-green-50 text-green-700 rounded-full text-sm hover:bg-green-100 transition-colors">
                For Schools
              </Link>
              <Link to="/about" className="px-4 py-2 bg-amber-50 text-amber-700 rounded-full text-sm hover:bg-amber-100 transition-colors">
                About OLL
              </Link>
              <Link to="/blogs" className="px-4 py-2 bg-rose-50 text-rose-700 rounded-full text-sm hover:bg-rose-100 transition-colors">
                Blog
              </Link>
            </div>
          </div>
        </div>

        {/* Back Link */}
        <button 
          onClick={() => window.history.back()} 
          className="mt-8 text-slate-500 hover:text-[#1E3A5F] flex items-center gap-2 text-sm transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Go back to previous page
        </button>
      </div>
    </>
  );
};

export default NotFoundPage;
