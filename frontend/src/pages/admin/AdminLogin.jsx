import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, LogIn } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { toast } from 'sonner';
import { useAuth } from '../../context/AuthContext';

const AdminLogin = () => {
  const navigate = useNavigate();
  const { login, register } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.email || !formData.password || (isRegister && !formData.name)) {
      toast.error('Please fill all required fields');
      return;
    }

    setLoading(true);
    try {
      if (isRegister) {
        await register(formData.email, formData.password, formData.name);
        toast.success('Account created successfully!');
      } else {
        await login(formData.email, formData.password);
        toast.success('Welcome back!');
      }
      navigate('/admin');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1E3A5F] to-[#0F172A] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <Link to="/" className="block mb-8">
          <img 
            src="https://customer-assets.emergentagent.com/job_51f7c152-ec6b-4d38-953a-09a434414bba/artifacts/rugags0w_OLL-horizontal-logo-white.png" 
            alt="OLL" 
            className="h-12 mx-auto"
          />
        </Link>

        {/* Login Card */}
        <div className="glass-card rounded-3xl p-8 animate-slide-up" style={{ background: 'rgba(255,255,255,0.95)' }}>
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-[#1E3A5F] mb-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
              {isRegister ? 'Create Admin Account' : 'Admin Login'}
            </h1>
            <p className="text-slate-500 text-sm">
              {isRegister ? 'Set up your admin credentials' : 'Access the OLL admin panel'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Name</label>
                <Input
                  placeholder="Enter your name"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="h-12 rounded-xl"
                  data-testid="admin-name"
                />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Email</label>
              <Input
                type="email"
                placeholder="Enter your email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                className="h-12 rounded-xl"
                data-testid="admin-email"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Password</label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  className="h-12 rounded-xl pr-12"
                  data-testid="admin-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full btn-primary flex items-center justify-center gap-2"
              data-testid="admin-submit"
            >
              {loading ? 'Please wait...' : (isRegister ? 'Create Account' : 'Sign In')}
              <LogIn className="w-4 h-4" />
            </Button>
          </form>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => setIsRegister(!isRegister)}
              className="text-sm text-[#D63031] hover:underline"
              data-testid="toggle-auth-mode"
            >
              {isRegister ? 'Already have an account? Sign In' : 'Need an account? Register'}
            </button>
          </div>
        </div>

        {/* Back to Home */}
        <div className="mt-6 text-center">
          <Link to="/" className="text-white/70 hover:text-white text-sm transition-colors">
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
