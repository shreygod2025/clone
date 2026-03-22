import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Receipt, LogOut, Edit2, Save, X, Download, School, Phone, Mail, GraduationCap, CheckCircle, Clock, XCircle, CreditCard } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { toast } from 'sonner';
import { format } from 'date-fns';
import axios from 'axios';
import Navbar from '../components/Navbar';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const SchoolStudentDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [payments, setPayments] = useState([]);
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState({});
  const [saving, setSaving] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  
  // Get phone from session storage (set during OTP login)
  const phone = sessionStorage.getItem('school_student_phone');
  
  useEffect(() => {
    if (!phone) {
      navigate('/school-student/login');
      return;
    }
    fetchProfile();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phone, navigate]);
  
  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API}/school-student/profile/${phone}`);
      setProfile(res.data);
      setPayments(res.data.payments || []);
      setEditData({
        student_name: res.data.student_name || '',
        email: res.data.email || '',
        grade: res.data.grade || '',
        division: res.data.division || ''
      });
    } catch (error) {
      console.error('Failed to fetch profile:', error);
      if (error.response?.status === 404) {
        toast.error('No payment records found for this phone number');
        handleLogout();
      } else {
        toast.error('Failed to load profile');
      }
    } finally {
      setLoading(false);
    }
  };
  
  const handleLogout = () => {
    sessionStorage.removeItem('school_student_phone');
    navigate('/school-student/login');
  };
  
  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      await axios.patch(`${API}/school-student/profile/${phone}`, editData);
      toast.success('Profile updated successfully!');
      setEditMode(false);
      fetchProfile();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };
  
  const getStatusBadge = (status) => {
    switch (status) {
      case 'PAID':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
            <CheckCircle className="w-3 h-3" /> Paid
          </span>
        );
      case 'PENDING':
      case 'ACTIVE':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">
            <Clock className="w-3 h-3" /> Pending
          </span>
        );
      case 'EXPIRED':
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">
            <XCircle className="w-3 h-3" /> {status}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-medium">
            {status}
          </span>
        );
    }
  };
  
  const handleViewReceipt = (payment) => {
    if (payment.status !== 'PAID') {
      toast.error('Receipt is only available for completed payments');
      return;
    }
    setSelectedReceipt(payment);
  };
  
  const handleDownloadReceipt = (payment) => {
    // Create a printable receipt
    const receiptContent = `
      OLL PAYMENT RECEIPT
      ==================
      
      Receipt ID: ${payment.id}
      Date: ${payment.payment_time || payment.created_at ? format(new Date(payment.payment_time || payment.created_at), 'dd MMM yyyy, hh:mm a') : 'N/A'}
      
      STUDENT DETAILS
      ---------------
      Name: ${payment.student_name}
      Phone: ${payment.phone}
      School: ${payment.school_name}
      Grade: ${payment.grade}${payment.division ? ` - ${payment.division}` : ''}
      
      PAYMENT DETAILS
      ---------------
      Program: ${payment.skill || 'OLL Program'}
      Amount: Rs. ${payment.amount}
      Status: ${payment.status}
      Order ID: ${payment.cf_order_id}
      
      ==================
      Thank you for your payment!
      For support: info@oll.co
    `;
    
    const blob = new Blob([receiptContent], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `OLL_Receipt_${payment.id}.txt`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('Receipt downloaded!');
  };
  
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navbar />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#1E3A5F] border-t-transparent"></div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-[#1E3A5F]">My Dashboard</h1>
            <p className="text-slate-600">Welcome back, {profile?.student_name || 'Student'}</p>
          </div>
          <Button variant="outline" onClick={handleLogout} className="gap-2" data-testid="logout-btn">
            <LogOut className="w-4 h-4" />
            Logout
          </Button>
        </div>
        
        {/* Profile Card */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-lg text-[#1E3A5F] flex items-center gap-2">
              <User className="w-5 h-5" />
              Profile Details
            </h2>
            {!editMode ? (
              <Button variant="outline" size="sm" onClick={() => setEditMode(true)} className="gap-1" data-testid="edit-profile-btn">
                <Edit2 className="w-4 h-4" />
                Edit
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setEditMode(false)} data-testid="cancel-edit-btn">
                  <X className="w-4 h-4" />
                </Button>
                <Button size="sm" onClick={handleSaveProfile} disabled={saving} className="gap-1 bg-green-600 hover:bg-green-700" data-testid="save-profile-btn">
                  <Save className="w-4 h-4" />
                  {saving ? 'Saving...' : 'Save'}
                </Button>
              </div>
            )}
          </div>
          
          {editMode ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-slate-600 mb-1 block">Name</label>
                <Input
                  value={editData.student_name}
                  onChange={(e) => setEditData({...editData, student_name: e.target.value})}
                  placeholder="Enter your name"
                />
              </div>
              <div>
                <label className="text-sm text-slate-600 mb-1 block">Email</label>
                <Input
                  type="email"
                  value={editData.email}
                  onChange={(e) => setEditData({...editData, email: e.target.value})}
                  placeholder="Enter your email"
                />
              </div>
              <div>
                <label className="text-sm text-slate-600 mb-1 block">Grade/Standard</label>
                <Input
                  value={editData.grade}
                  onChange={(e) => setEditData({...editData, grade: e.target.value})}
                  placeholder="e.g., 8, 9, 10"
                />
              </div>
              <div>
                <label className="text-sm text-slate-600 mb-1 block">Division</label>
                <Input
                  value={editData.division}
                  onChange={(e) => setEditData({...editData, division: e.target.value})}
                  placeholder="e.g., A, B, C"
                />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                <User className="w-5 h-5 text-slate-500" />
                <div>
                  <p className="text-xs text-slate-500">Name</p>
                  <p className="font-medium text-[#1E3A5F]">{profile?.student_name || 'Not set'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                <Phone className="w-5 h-5 text-slate-500" />
                <div>
                  <p className="text-xs text-slate-500">Phone</p>
                  <p className="font-medium text-[#1E3A5F]">{profile?.phone}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                <Mail className="w-5 h-5 text-slate-500" />
                <div>
                  <p className="text-xs text-slate-500">Email</p>
                  <p className="font-medium text-[#1E3A5F]">{profile?.email || 'Not set'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                <School className="w-5 h-5 text-slate-500" />
                <div>
                  <p className="text-xs text-slate-500">School</p>
                  <p className="font-medium text-[#1E3A5F]">{profile?.school_name || 'N/A'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                <GraduationCap className="w-5 h-5 text-slate-500" />
                <div>
                  <p className="text-xs text-slate-500">Grade</p>
                  <p className="font-medium text-[#1E3A5F]">{profile?.grade || 'Not set'}{profile?.division ? ` - ${profile.division}` : ''}</p>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Payments Section */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="font-semibold text-lg text-[#1E3A5F] flex items-center gap-2 mb-4">
            <Receipt className="w-5 h-5" />
            Payment History & Receipts
          </h2>
          
          {payments.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <CreditCard className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No payment records found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {payments.map((payment) => (
                <div 
                  key={payment.id} 
                  className="flex items-center justify-between p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium text-[#1E3A5F]">{payment.skill || 'OLL Program'}</p>
                      {getStatusBadge(payment.status)}
                    </div>
                    <p className="text-sm text-slate-600">
                      {payment.created_at ? format(new Date(payment.created_at), 'dd MMM yyyy') : 'N/A'}
                      {payment.school_name && ` • ${payment.school_name}`}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-[#1E3A5F]">₹{payment.amount}</p>
                    {payment.status === 'PAID' && (
                      <div className="flex gap-2 mt-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleViewReceipt(payment)}
                          className="text-xs"
                        >
                          View
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleDownloadReceipt(payment)}
                          className="text-xs gap-1"
                          data-testid="download-receipt-btn"
                        >
                          <Download className="w-3 h-3" />
                          Download
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      
      {/* Receipt Modal */}
      <Dialog open={!!selectedReceipt} onOpenChange={() => setSelectedReceipt(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="w-5 h-5 text-green-600" />
              Payment Receipt
            </DialogTitle>
          </DialogHeader>
          
          {selectedReceipt && (
            <div className="space-y-4">
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-2" />
                <p className="text-green-800 font-semibold">Payment Successful</p>
                <p className="text-2xl font-bold text-green-700 mt-1">₹{selectedReceipt.amount}</p>
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between py-2 border-b">
                  <span className="text-slate-600">Receipt ID</span>
                  <span className="font-medium">{selectedReceipt.id}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-slate-600">Student Name</span>
                  <span className="font-medium">{selectedReceipt.student_name}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-slate-600">School</span>
                  <span className="font-medium">{selectedReceipt.school_name}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-slate-600">Grade</span>
                  <span className="font-medium">{selectedReceipt.grade}{selectedReceipt.division ? ` - ${selectedReceipt.division}` : ''}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-slate-600">Program</span>
                  <span className="font-medium">{selectedReceipt.skill || 'OLL Program'}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-slate-600">Order ID</span>
                  <span className="font-medium font-mono text-xs">{selectedReceipt.cf_order_id}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-slate-600">Date</span>
                  <span className="font-medium">
                    {selectedReceipt.payment_time || selectedReceipt.created_at 
                      ? format(new Date(selectedReceipt.payment_time || selectedReceipt.created_at), 'dd MMM yyyy, hh:mm a')
                      : 'N/A'}
                  </span>
                </div>
              </div>
              
              <Button 
                className="w-full gap-2" 
                onClick={() => handleDownloadReceipt(selectedReceipt)}
              >
                <Download className="w-4 h-4" />
                Download Receipt
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SchoolStudentDashboard;
