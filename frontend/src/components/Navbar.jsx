import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { Button } from './ui/button';

const Navbar = ({ showBookDemo = false, onBookDemo }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  const navLinks = [
    { path: '/courses', label: 'Courses' },
    { path: '/about', label: 'About' },
    { path: '/centers', label: 'Centers' },
    { path: '/blogs', label: 'Blog' },
    { path: '/faq', label: 'FAQ' },
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="bg-white/80 backdrop-blur-lg border-b border-slate-200/50 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2">
            <img 
              src="https://customer-assets.emergentagent.com/job_51f7c152-ec6b-4d38-953a-09a434414bba/artifacts/gdvjdp6s_OLL-horizontal-logo-1.png" 
              alt="OLL" 
              className="h-10"
            />
          </Link>
          
          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-6">
            {navLinks.map(link => (
              <Link 
                key={link.path}
                to={link.path} 
                className={`font-medium transition-colors ${
                  isActive(link.path) 
                    ? 'text-[#D63031]' 
                    : 'text-slate-600 hover:text-[#1E3A5F]'
                }`}
              >
                {link.label}
              </Link>
            ))}
            {showBookDemo && (
              <Button 
                onClick={onBookDemo}
                className="bg-[#D63031] hover:bg-[#b52828] text-white ml-2"
                data-testid="nav-book-demo-btn"
              >
                Book Free Demo
              </Button>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="flex items-center gap-2 md:hidden">
            {showBookDemo && (
              <Button 
                onClick={onBookDemo}
                className="bg-[#D63031] hover:bg-[#b52828] text-white text-sm px-3 py-1 h-8"
                data-testid="mobile-book-demo-btn"
              >
                Book Demo
              </Button>
            )}
            <button 
              className="p-2"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              data-testid="mobile-menu-btn"
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-t border-slate-200 py-4 px-4 space-y-1 animate-slide-up">
          {navLinks.map(link => (
            <Link 
              key={link.path}
              to={link.path} 
              className={`block py-2 px-2 rounded-lg ${
                isActive(link.path) 
                  ? 'text-[#D63031] bg-red-50' 
                  : 'text-slate-600 hover:text-[#1E3A5F] hover:bg-slate-50'
              }`}
              onClick={() => setMobileMenuOpen(false)}
            >
              {link.label}
            </Link>
          ))}
        </div>
      )}
    </nav>
  );
};

export default Navbar;
