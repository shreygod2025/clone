import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { DollarSign, Users, Building2, CheckCircle, Clock, ArrowLeft, GraduationCap } from 'lucide-react';
import axios from 'axios';
import { format } from 'date-fns';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const SchoolPaymentTrackerPublic = () => {
  const { schoolId } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState(null);
  const [payments, setPayments] = useState([]);
  const [school, setSchool] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch public stats
        const statsRes = await axios.get(`${API}/school-payment/tracker-public/${schoolId}`);
        setStats(statsRes.data);
        setSchool(statsRes.data);
        
        // Note: Individual payment details are not exposed in public endpoint for privacy
        setPayments([]);
      } catch (err) {
        setError(err.response?.data?.detail || 'Failed to load payment tracker');
      } finally {
        setLoading(false);
      }
    };
    
    if (schoolId) {
      fetchData();
    }
  }, [schoolId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-[#1E3A5F] border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <DollarSign className="w-8 h-8 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 mb-2">Tracker Not Found</h1>
          <p className="text-slate-600 mb-6">{error}</p>
          <Link to="/" className="text-[#1E3A5F] hover:underline">
            Return to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Fee Collection Status | {school?.school_name || 'School'} | OLL</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        {/* Header */}
        <header className="bg-white shadow-sm sticky top-0 z-50">
          <div className="max-w-4xl mx-auto px-4 sm:px-6">
            <div className="flex items-center justify-between h-16">
              <Link to="/" className="flex items-center gap-2">
                <img 
                  src="https://customer-assets.emergentagent.com/job_51f7c152-ec6b-4d38-953a-09a434414bba/artifacts/gdvjdp6s_OLL-horizontal-logo-1.png" 
                  alt="OLL Logo"
                  className="h-10 w-auto"
                />
              </Link>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
          {/* School Info */}
          <div className="bg-[#1E3A5F] text-white rounded-2xl p-6 mb-6">
            <div className="flex items-center gap-3 mb-4">
              <Building2 className="w-8 h-8" />
              <div>
                <h1 className="text-xl font-bold">{school?.school_name || 'School'}</h1>
                <p className="text-white/70 text-sm">Fee Collection Status</p>
              </div>
            </div>
            
            {/* Progress Bar */}
            <div className="bg-white/20 rounded-full h-4 overflow-hidden mb-2">
              <div 
                className="h-full bg-green-400 transition-all duration-500"
                style={{ width: `${Math.min(stats?.collection_percentage || 0, 100)}%` }}
              />
            </div>
            <div className="flex justify-between text-sm">
              <span>{stats?.collection_percentage || 0}% Collected</span>
              <span>{stats?.paid_count || 0} / {stats?.total_students || 0} Students</span>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-xl shadow p-4 text-center">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-2">
                <DollarSign className="w-5 h-5 text-green-600" />
              </div>
              <p className="text-2xl font-bold text-green-600">
                {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(stats?.total_collected || 0)}
              </p>
              <p className="text-xs text-slate-500">Collected</p>
            </div>
            
            <div className="bg-white rounded-xl shadow p-4 text-center">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-2">
                <CheckCircle className="w-5 h-5 text-blue-600" />
              </div>
              <p className="text-2xl font-bold text-blue-600">{stats?.paid_count || 0}</p>
              <p className="text-xs text-slate-500">Paid</p>
            </div>
            
            <div className="bg-white rounded-xl shadow p-4 text-center">
              <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center mx-auto mb-2">
                <Clock className="w-5 h-5 text-yellow-600" />
              </div>
              <p className="text-2xl font-bold text-yellow-600">{stats?.pending_count || 0}</p>
              <p className="text-xs text-slate-500">Pending</p>
            </div>
            
            <div className="bg-white rounded-xl shadow p-4 text-center">
              <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center mx-auto mb-2">
                <Users className="w-5 h-5 text-purple-600" />
              </div>
              <p className="text-2xl font-bold text-purple-600">{stats?.total_students || 0}</p>
              <p className="text-xs text-slate-500">Total Students</p>
            </div>
          </div>

          {/* Grade-wise Breakdown */}
          {stats?.grade_counts && Object.keys(stats.grade_counts).length > 0 && (
            <div className="bg-white rounded-xl shadow p-6 mb-6">
              <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-[#1E3A5F]" />
                Grade-wise Payments
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {Object.entries(stats.grade_counts).map(([grade, count]) => (
                  <div key={grade} className="bg-slate-50 rounded-lg p-3 text-center">
                    <p className="text-sm text-slate-500">Grade {grade}</p>
                    <p className="text-xl font-bold text-[#1E3A5F]">{count}</p>
                    <p className="text-xs text-green-600">Paid</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Payment Link */}
          <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
            <DollarSign className="w-12 h-12 text-green-600 mx-auto mb-3" />
            <h3 className="font-semibold text-green-800 mb-2">Make a Payment</h3>
            <p className="text-sm text-green-700 mb-4">
              Parents can pay their child's fees online using the payment link below.
            </p>
            <a 
              href={`/school-pay/${schoolId}`}
              className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
            >
              <DollarSign className="w-5 h-5" />
              Pay Now
            </a>
          </div>
        </div>

        {/* Footer */}
        <footer className="bg-[#1E3A5F] text-white mt-8">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 text-center text-sm text-white/70">
            © {new Date().getFullYear()} Clonefutura Live Solutions Pvt. Ltd
          </div>
        </footer>
      </div>
    </>
  );
};

export default SchoolPaymentTrackerPublic;
