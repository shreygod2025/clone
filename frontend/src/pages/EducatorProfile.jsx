import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserAuth } from '../context/UserAuthContext';
import { 
  User, Phone, Mail, MapPin, Camera, Save, ArrowLeft,
  Building2, CreditCard, FileText, Shield, Edit2, CheckCircle2,
  AlertCircle, Loader2, Upload, Eye, EyeOff, Trash2, RefreshCw, ImageIcon
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { toast } from 'sonner';
import axios from 'axios';
import Navbar from '../components/Navbar';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const TSHIRT_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'];

const DOC_LABELS = {
  profile_photo: 'Profile Photo',
  aadhar_document: 'Aadhaar Card',
  pan_document: 'PAN Card',
  bank_document: 'Bank Document',
};

const formatBytes = (bytes) => {
  if (!bytes && bytes !== 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const formatUploadedAt = (iso) => {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return d.toLocaleString();
  } catch {
    return iso;
  }
};

/**
 * Uploadable document block. Renders (in order):
 *   • header row (icon + label)
 *   • optional child slot (number inputs for Aadhaar/PAN)
 *   • uploaded-file status row  →  filename · size · uploaded_at · View
 *   • action row  →  Upload / Replace  •  Delete
 */
const DocFileBlock = ({
  docType,
  label,
  hint,
  accept,
  url,
  meta,
  uploading,
  onUpload,
  onDelete,
  icon,
  previewIsImage = false,
  children,
}) => {
  const inputRef = React.useRef(null);
  const hasFile = !!url;

  const handlePick = () => {
    if (inputRef.current) inputRef.current.click();
  };

  const handleChange = (e) => {
    const f = e.target.files?.[0];
    if (f) onUpload(docType, f);
    if (e.target) e.target.value = ''; // allow re-uploading the same filename
  };

  return (
    <div
      className="border border-slate-200 rounded-lg p-4 bg-white"
      data-testid={`doc-block-${docType}`}
    >
      <div className="flex items-center justify-between mb-3">
        <div>
          <h4 className="font-medium text-slate-800 flex items-center gap-2 text-sm">
            {icon || <FileText className="w-4 h-4" />} {label}
          </h4>
          {hint && <p className="text-[11px] text-slate-500 mt-0.5">{hint}</p>}
        </div>
        {hasFile && (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-green-700 bg-green-50 border border-green-200 rounded px-2 py-0.5">
            <CheckCircle2 className="w-3 h-3" /> Uploaded
          </span>
        )}
      </div>

      {children && <div className="mb-3">{children}</div>}

      {hasFile ? (
        <div className="rounded-md border border-slate-100 bg-slate-50 p-2.5 mb-3">
          <div className="flex items-start gap-2.5">
            {previewIsImage ? (
              <img
                src={url}
                alt={label}
                className="w-10 h-10 rounded object-cover flex-shrink-0"
                data-testid={`doc-preview-${docType}`}
              />
            ) : (
              <div className="w-10 h-10 rounded bg-slate-200 flex items-center justify-center flex-shrink-0">
                <FileText className="w-4 h-4 text-slate-500" />
              </div>
            )}
            <div className="flex-1 min-w-0 text-xs">
              <p
                className="font-medium text-slate-800 truncate"
                title={meta?.original_name || ''}
                data-testid={`doc-name-${docType}`}
              >
                {meta?.original_name || 'Document uploaded'}
              </p>
              <p className="text-slate-500 mt-0.5">
                {meta?.size ? formatBytes(meta.size) : ''}
                {meta?.size && meta?.uploaded_at ? ' · ' : ''}
                {meta?.uploaded_at ? `uploaded ${formatUploadedAt(meta.uploaded_at)}` : ''}
              </p>
            </div>
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="text-xs font-medium text-indigo-600 hover:underline whitespace-nowrap flex items-center gap-1"
              data-testid={`doc-view-${docType}`}
            >
              <Eye className="w-3 h-3" /> View
            </a>
          </div>
        </div>
      ) : (
        <div className="rounded-md border border-dashed border-slate-200 bg-slate-50 text-xs text-slate-500 px-3 py-2.5 mb-3 flex items-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5" /> No file uploaded yet.
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept={accept}
        onChange={handleChange}
        data-testid={`doc-input-${docType}`}
      />
      <div className="flex items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant={hasFile ? 'outline' : 'default'}
          onClick={handlePick}
          disabled={uploading}
          className="text-xs"
          data-testid={`doc-upload-${docType}`}
        >
          {uploading ? (
            <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Uploading…</>
          ) : hasFile ? (
            <><RefreshCw className="w-3 h-3 mr-1" /> Replace</>
          ) : (
            <><Upload className="w-3 h-3 mr-1" /> Upload</>
          )}
        </Button>
        {hasFile && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => onDelete(docType)}
            disabled={uploading}
            className="text-xs text-red-600 border-red-200 hover:bg-red-50"
            data-testid={`doc-delete-${docType}`}
          >
            <Trash2 className="w-3 h-3 mr-1" /> Delete
          </Button>
        )}
      </div>
    </div>
  );
};

const EducatorProfile = () => {
  const navigate = useNavigate();
  const { user, token, logout } = useUserAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState(null);
  const [activeTab, setActiveTab] = useState('personal');
  const [editMode, setEditMode] = useState(false);
  const [showBankNumbers, setShowBankNumbers] = useState(false);
  
  // Form states
  const [formData, setFormData] = useState({});
  const [bankData, setBankData] = useState({});
  const [docData, setDocData] = useState({});

  const getAuthHeaders = () => ({
    Authorization: `Bearer ${token}`
  });

  useEffect(() => {
    if (!user || !token) {
      navigate('/login');
      return;
    }
    fetchProfile();
  }, [user, token]);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/educator/profile`, {
        headers: getAuthHeaders()
      });
      setProfile(res.data);
      setFormData({
        name: res.data.name || '',
        bio: res.data.bio || '',
        tshirt_size: res.data.tshirt_size || '',
        address_line1: res.data.address_line1 || '',
        address_line2: res.data.address_line2 || '',
        city: res.data.city || '',
        state: res.data.state || '',
        pincode: res.data.pincode || '',
        emergency_contact_name: res.data.emergency_contact_name || '',
        emergency_contact_phone: res.data.emergency_contact_phone || '',
        emergency_contact_relation: res.data.emergency_contact_relation || '',
        skills: res.data.skills?.join(', ') || '',
        experience: res.data.experience || '',
      });
      setBankData({
        bank_name: res.data.bank_name || '',
        account_holder_name: res.data.account_holder_name || '',
        account_number: res.data.account_number || '',
        ifsc_code: res.data.ifsc_code || '',
      });
      setDocData({
        aadhar_number: res.data.aadhar_number || '',
        pan_number: res.data.pan_number || '',
      });
    } catch (error) {
      console.error('Failed to fetch profile:', error);
      if (error.response?.status === 401 || error.response?.status === 403) {
        logout();
        navigate('/login');
      } else {
        toast.error('Failed to load profile');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSavePersonal = async () => {
    setSaving(true);
    try {
      const updateData = {
        ...formData,
        skills: formData.skills.split(',').map(s => s.trim()).filter(Boolean)
      };
      await axios.patch(`${API}/educator/profile`, updateData, {
        headers: getAuthHeaders()
      });
      toast.success('Profile updated successfully');
      setEditMode(false);
      fetchProfile();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveBankDetails = async () => {
    setSaving(true);
    try {
      await axios.patch(`${API}/educator/profile/bank-details`, bankData, {
        headers: getAuthHeaders()
      });
      toast.success('Bank details updated. They will be verified soon.');
      fetchProfile();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update bank details');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveDocuments = async () => {
    setSaving(true);
    try {
      await axios.patch(`${API}/educator/profile/documents`, docData, {
        headers: getAuthHeaders()
      });
      toast.success('Documents updated. They will be verified soon.');
      fetchProfile();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update documents');
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    await uploadDocument('profile_photo', file);
    // Reset input so re-selecting the same file works.
    if (e.target) e.target.value = '';
  };

  // Generic doc upload for the Documents tab (profile_photo, aadhar_document,
  // pan_document, bank_document). Uses the dedicated educator-scoped endpoint
  // that (a) enforces 50 MB & PDF/JPG/JPEG/PNG, (b) destroys the previous
  // Cloudinary asset when replacing, (c) indexes the upload in `uploaded_files`
  // so Admin > Uploaded Documents picks it up automatically.
  const [uploadingDoc, setUploadingDoc] = useState(null); // current doc_type being uploaded, if any

  const uploadDocument = async (docType, file) => {
    if (!file) return;

    // Client-side validation (server enforces authoritatively).
    const allowed = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    if (!allowed.includes(file.type)) {
      toast.error('Only PDF, JPG, JPEG, and PNG files are allowed.');
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      toast.error(`File too large (max 50 MB, got ${(file.size / (1024 * 1024)).toFixed(1)} MB).`);
      return;
    }
    if (docType === 'profile_photo' && !file.type.startsWith('image/')) {
      toast.error('Profile photo must be an image.');
      return;
    }

    setUploadingDoc(docType);
    try {
      const fd = new FormData();
      fd.append('doc_type', docType);
      fd.append('file', file);
      const res = await axios.post(
        `${API}/educator/profile/documents/upload`,
        fd,
        { headers: { ...getAuthHeaders(), 'Content-Type': 'multipart/form-data' } },
      );
      toast.success(`${DOC_LABELS[docType] || 'Document'} uploaded.`);
      // Optimistically merge into profile so UI updates instantly.
      setProfile((prev) => ({
        ...(prev || {}),
        [docType]: res.data.url,
        document_meta: {
          ...((prev && prev.document_meta) || {}),
          [docType]: {
            original_name: res.data.original_name,
            size: res.data.size,
            uploaded_at: res.data.uploaded_at,
          },
        },
      }));
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Failed to upload document.');
    } finally {
      setUploadingDoc(null);
    }
  };

  const deleteDocument = async (docType) => {
    if (!window.confirm(`Delete ${DOC_LABELS[docType] || 'this document'}?`)) return;
    try {
      await axios.delete(
        `${API}/educator/profile/documents/${docType}`,
        { headers: getAuthHeaders() },
      );
      toast.success(`${DOC_LABELS[docType] || 'Document'} removed.`);
      setProfile((prev) => {
        const next = { ...(prev || {}) };
        delete next[docType];
        if (next.document_meta) {
          next.document_meta = { ...next.document_meta };
          delete next.document_meta[docType];
        }
        return next;
      });
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Failed to delete document.');
    }
  };

  const tabs = [
    { id: 'personal', label: 'Personal Info', icon: User },
    { id: 'address', label: 'Address', icon: MapPin },
    { id: 'bank', label: 'Bank Details', icon: CreditCard },
    { id: 'documents', label: 'Documents', icon: FileText },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <Navbar />
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-[#D63031]" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <Navbar />
      
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" onClick={() => navigate('/educator-dashboard')} className="p-2">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">My Profile</h1>
            <p className="text-sm text-slate-500">Manage your personal information</p>
          </div>
        </div>

        {/* Profile Card */}
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden mb-6">
          {/* Header with photo */}
          <div className="bg-gradient-to-r from-[#1E3A5F] to-[#2d5a8f] p-6">
            <div className="flex items-center gap-6">
              {/* Photo */}
              <div className="relative">
                <div className="w-24 h-24 rounded-full bg-white/20 flex items-center justify-center overflow-hidden border-4 border-white/30">
                  {profile?.profile_photo ? (
                    <img 
                      src={profile.profile_photo} 
                      alt={profile.name} 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-12 h-12 text-white/70" />
                  )}
                </div>
                <label className="absolute bottom-0 right-0 w-8 h-8 bg-white rounded-full flex items-center justify-center cursor-pointer shadow-lg hover:bg-slate-50 transition-colors">
                  <Camera className="w-4 h-4 text-slate-600" />
                  <input 
                    type="file" 
                    className="hidden" 
                    accept="image/*"
                    onChange={handlePhotoUpload}
                  />
                </label>
              </div>
              
              {/* Basic Info */}
              <div className="text-white">
                <h2 className="text-xl font-bold">{profile?.name}</h2>
                <p className="text-white/70 flex items-center gap-2 mt-1">
                  <Mail className="w-4 h-4" /> {profile?.email}
                </p>
                <p className="text-white/70 flex items-center gap-2 mt-1">
                  <Phone className="w-4 h-4" /> {profile?.phone}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    profile?.status === 'active' ? 'bg-green-500 text-white' :
                    profile?.status === 'onboarded' ? 'bg-orange-500 text-white' :
                    'bg-slate-500 text-white'
                  }`}>
                    {profile?.status?.replace(/_/g, ' ').toUpperCase()}
                  </span>
                  {profile?.documents_verified && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-500 text-white flex items-center gap-1">
                      <Shield className="w-3 h-3" /> Verified
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          {/* Tabs */}
          <div className="border-b border-slate-100">
            <div className="flex gap-1 px-4">
              {tabs.map(tab => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-4 py-3 text-sm font-medium transition-all border-b-2 flex items-center gap-2 ${
                      activeTab === tab.id 
                        ? 'border-[#D63031] text-[#D63031]' 
                        : 'border-transparent text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>
          
          {/* Tab Content */}
          <div className="p-6">
            {/* Personal Info Tab */}
            {activeTab === 'personal' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-slate-800">Personal Information</h3>
                  <Button 
                    variant={editMode ? "outline" : "default"}
                    size="sm"
                    onClick={() => setEditMode(!editMode)}
                  >
                    <Edit2 className="w-4 h-4 mr-2" />
                    {editMode ? 'Cancel' : 'Edit'}
                  </Button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                    {editMode ? (
                      <Input 
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                      />
                    ) : (
                      <p className="text-slate-600 p-2 bg-slate-50 rounded">{profile?.name || '-'}</p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">T-Shirt Size</label>
                    {editMode ? (
                      <select
                        value={formData.tshirt_size}
                        onChange={(e) => setFormData({...formData, tshirt_size: e.target.value})}
                        className="w-full h-10 px-3 border border-slate-200 rounded-md"
                      >
                        <option value="">Select size</option>
                        {TSHIRT_SIZES.map(size => (
                          <option key={size} value={size}>{size}</option>
                        ))}
                      </select>
                    ) : (
                      <p className="text-slate-600 p-2 bg-slate-50 rounded">{profile?.tshirt_size || '-'}</p>
                    )}
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Bio / About</label>
                    {editMode ? (
                      <Textarea 
                        value={formData.bio}
                        onChange={(e) => setFormData({...formData, bio: e.target.value})}
                        placeholder="Tell us about yourself..."
                        className="min-h-[100px]"
                      />
                    ) : (
                      <p className="text-slate-600 p-2 bg-slate-50 rounded min-h-[60px]">
                        {profile?.bio || 'No bio added yet'}
                      </p>
                    )}
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Skills</label>
                    {editMode ? (
                      <Input 
                        value={formData.skills}
                        onChange={(e) => setFormData({...formData, skills: e.target.value})}
                        placeholder="Math, Science, English (comma separated)"
                      />
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {profile?.skills?.length > 0 ? profile.skills.map((skill, idx) => (
                          <span key={idx} className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-sm">
                            {skill}
                          </span>
                        )) : <span className="text-slate-400">No skills added</span>}
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Experience</label>
                    {editMode ? (
                      <Input 
                        value={formData.experience}
                        onChange={(e) => setFormData({...formData, experience: e.target.value})}
                        placeholder="e.g., 5 years"
                      />
                    ) : (
                      <p className="text-slate-600 p-2 bg-slate-50 rounded">{profile?.experience || '-'}</p>
                    )}
                  </div>
                </div>
                
                {/* Emergency Contact */}
                <div className="pt-4 border-t">
                  <h4 className="font-medium text-slate-700 mb-4">Emergency Contact</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                      {editMode ? (
                        <Input 
                          value={formData.emergency_contact_name}
                          onChange={(e) => setFormData({...formData, emergency_contact_name: e.target.value})}
                        />
                      ) : (
                        <p className="text-slate-600 p-2 bg-slate-50 rounded">{profile?.emergency_contact_name || '-'}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                      {editMode ? (
                        <Input 
                          value={formData.emergency_contact_phone}
                          onChange={(e) => setFormData({...formData, emergency_contact_phone: e.target.value})}
                        />
                      ) : (
                        <p className="text-slate-600 p-2 bg-slate-50 rounded">{profile?.emergency_contact_phone || '-'}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Relation</label>
                      {editMode ? (
                        <Input 
                          value={formData.emergency_contact_relation}
                          onChange={(e) => setFormData({...formData, emergency_contact_relation: e.target.value})}
                        />
                      ) : (
                        <p className="text-slate-600 p-2 bg-slate-50 rounded">{profile?.emergency_contact_relation || '-'}</p>
                      )}
                    </div>
                  </div>
                </div>
                
                {editMode && (
                  <div className="flex justify-end pt-4">
                    <Button onClick={handleSavePersonal} disabled={saving}>
                      {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                      Save Changes
                    </Button>
                  </div>
                )}
              </div>
            )}
            
            {/* Address Tab */}
            {activeTab === 'address' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-slate-800">Address Details</h3>
                  <Button 
                    variant={editMode ? "outline" : "default"}
                    size="sm"
                    onClick={() => setEditMode(!editMode)}
                  >
                    <Edit2 className="w-4 h-4 mr-2" />
                    {editMode ? 'Cancel' : 'Edit'}
                  </Button>
                </div>
                
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Address Line 1</label>
                    {editMode ? (
                      <Input 
                        value={formData.address_line1}
                        onChange={(e) => setFormData({...formData, address_line1: e.target.value})}
                        placeholder="House/Flat No., Building Name"
                      />
                    ) : (
                      <p className="text-slate-600 p-2 bg-slate-50 rounded">{profile?.address_line1 || '-'}</p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Address Line 2</label>
                    {editMode ? (
                      <Input 
                        value={formData.address_line2}
                        onChange={(e) => setFormData({...formData, address_line2: e.target.value})}
                        placeholder="Street, Area, Landmark"
                      />
                    ) : (
                      <p className="text-slate-600 p-2 bg-slate-50 rounded">{profile?.address_line2 || '-'}</p>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">City</label>
                      {editMode ? (
                        <Input 
                          value={formData.city}
                          onChange={(e) => setFormData({...formData, city: e.target.value})}
                        />
                      ) : (
                        <p className="text-slate-600 p-2 bg-slate-50 rounded">{profile?.city || '-'}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">State</label>
                      {editMode ? (
                        <Input 
                          value={formData.state}
                          onChange={(e) => setFormData({...formData, state: e.target.value})}
                        />
                      ) : (
                        <p className="text-slate-600 p-2 bg-slate-50 rounded">{profile?.state || '-'}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Pincode</label>
                      {editMode ? (
                        <Input 
                          value={formData.pincode}
                          onChange={(e) => setFormData({...formData, pincode: e.target.value})}
                        />
                      ) : (
                        <p className="text-slate-600 p-2 bg-slate-50 rounded">{profile?.pincode || '-'}</p>
                      )}
                    </div>
                  </div>
                </div>
                
                {editMode && (
                  <div className="flex justify-end pt-4">
                    <Button onClick={handleSavePersonal} disabled={saving}>
                      {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                      Save Changes
                    </Button>
                  </div>
                )}
              </div>
            )}
            
            {/* Bank Details Tab */}
            {activeTab === 'bank' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-slate-800">Bank Details</h3>
                  {profile?.bank_details_verified && (
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Verified
                    </span>
                  )}
                </div>
                
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
                  <p className="text-sm text-amber-800 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    Bank details are used for salary payments. Changes will require re-verification.
                  </p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Bank Name</label>
                    <Input 
                      value={bankData.bank_name}
                      onChange={(e) => setBankData({...bankData, bank_name: e.target.value})}
                      placeholder="e.g., HDFC Bank"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Account Holder Name</label>
                    <Input 
                      value={bankData.account_holder_name}
                      onChange={(e) => setBankData({...bankData, account_holder_name: e.target.value})}
                      placeholder="As per bank records"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Account Number</label>
                    <div className="relative">
                      <Input 
                        type={showBankNumbers ? "text" : "password"}
                        value={bankData.account_number}
                        onChange={(e) => setBankData({...bankData, account_number: e.target.value})}
                        placeholder="Enter account number"
                      />
                      <button 
                        type="button"
                        onClick={() => setShowBankNumbers(!showBankNumbers)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showBankNumbers ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {profile?.account_number_masked && (
                      <p className="text-xs text-slate-500 mt-1">Current: {profile.account_number_masked}</p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">IFSC Code</label>
                    <Input 
                      value={bankData.ifsc_code}
                      onChange={(e) => setBankData({...bankData, ifsc_code: e.target.value.toUpperCase()})}
                      placeholder="e.g., HDFC0001234"
                    />
                  </div>
                </div>
                
                <div className="flex justify-end pt-4">
                  <Button onClick={handleSaveBankDetails} disabled={saving}>
                    {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                    Update Bank Details
                  </Button>
                </div>
              </div>
            )}
            
            {/* Documents Tab */}
            {activeTab === 'documents' && (
              <div className="space-y-6" data-testid="educator-documents-tab">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-slate-800">Identity Documents</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Upload Aadhaar, PAN, profile photo, and bank proof. PDF, JPG, JPEG, PNG · max 50 MB each.
                    </p>
                  </div>
                  {profile?.documents_verified && (
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Verified
                    </span>
                  )}
                </div>

                {/* Aadhaar & PAN numbers (kept alongside file uploads) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <DocFileBlock
                    docType="aadhar_document"
                    label="Aadhaar Card"
                    accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/*"
                    url={profile?.aadhar_document}
                    meta={profile?.document_meta?.aadhar_document}
                    uploading={uploadingDoc === 'aadhar_document'}
                    onUpload={uploadDocument}
                    onDelete={deleteDocument}
                  >
                    <label className="block text-xs font-medium text-slate-600 mb-1">Aadhaar Number</label>
                    <Input
                      value={docData.aadhar_number}
                      onChange={(e) => setDocData({ ...docData, aadhar_number: e.target.value })}
                      placeholder="XXXX XXXX XXXX"
                      maxLength={12}
                      data-testid="educator-aadhar-number-input"
                    />
                    {profile?.aadhar_number_masked && (
                      <p className="text-[11px] text-slate-500 mt-1">Current: {profile.aadhar_number_masked}</p>
                    )}
                  </DocFileBlock>

                  <DocFileBlock
                    docType="pan_document"
                    label="PAN Card"
                    accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/*"
                    url={profile?.pan_document}
                    meta={profile?.document_meta?.pan_document}
                    uploading={uploadingDoc === 'pan_document'}
                    onUpload={uploadDocument}
                    onDelete={deleteDocument}
                  >
                    <label className="block text-xs font-medium text-slate-600 mb-1">PAN Number</label>
                    <Input
                      value={docData.pan_number}
                      onChange={(e) => setDocData({ ...docData, pan_number: e.target.value.toUpperCase() })}
                      placeholder="ABCDE1234F"
                      maxLength={10}
                      data-testid="educator-pan-number-input"
                    />
                  </DocFileBlock>

                  <DocFileBlock
                    docType="profile_photo"
                    label="Profile Photo"
                    accept=".jpg,.jpeg,.png,image/*"
                    url={profile?.profile_photo}
                    meta={profile?.document_meta?.profile_photo}
                    uploading={uploadingDoc === 'profile_photo'}
                    onUpload={uploadDocument}
                    onDelete={deleteDocument}
                    icon={<ImageIcon className="w-4 h-4" />}
                    previewIsImage
                  />

                  <DocFileBlock
                    docType="bank_document"
                    label="Bank Document"
                    hint="Cancelled cheque or passbook first page"
                    accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/*"
                    url={profile?.bank_document}
                    meta={profile?.document_meta?.bank_document}
                    uploading={uploadingDoc === 'bank_document'}
                    onUpload={uploadDocument}
                    onDelete={deleteDocument}
                    icon={<CreditCard className="w-4 h-4" />}
                  />
                </div>

                <div className="flex justify-end pt-4">
                  <Button
                    onClick={handleSaveDocuments}
                    disabled={saving}
                    data-testid="educator-save-doc-numbers"
                  >
                    {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                    Save Aadhaar / PAN Numbers
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Contract Info */}
        {profile?.contract_accepted && (
          <div className="bg-white rounded-2xl border border-slate-100 p-6">
            <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-green-600" />
              Contract Status
            </h3>
            <div className="flex items-center gap-4">
              <CheckCircle2 className="w-6 h-6 text-green-500" />
              <div>
                <p className="font-medium text-green-700">Contract Accepted</p>
                <p className="text-sm text-slate-500">
                  Signed on {profile.contract_accepted_at ? new Date(profile.contract_accepted_at).toLocaleDateString() : 'N/A'}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EducatorProfile;
