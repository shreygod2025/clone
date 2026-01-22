import { useState, useEffect } from 'react';
import { AdminLayout } from './AdminDashboard';
import { useAuth } from '../../context/AuthContext';
import { 
  MapPin, Building, FileText, Plus, Edit2, Trash2, X, Save, Eye, EyeOff,
  Search, Globe, Calendar, Image, Tag, Briefcase, Users, Video, Play
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { toast } from 'sonner';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const ROLE_TYPES = ['Full-time', 'Part-time', 'Internship', 'Freelance', 'Contract'];

const AdminSettings = () => {
  const { getAuthHeaders } = useAuth();
  const [activeTab, setActiveTab] = useState('team-requirements');
  const [loading, setLoading] = useState(true);
  
  // Data states
  const [cities, setCities] = useState([]);
  const [centers, setCenters] = useState([]);
  const [blogs, setBlogs] = useState([]);
  const [teamRequirements, setTeamRequirements] = useState([]);
  const [caseStudies, setCaseStudies] = useState([]);
  
  // Modal states
  const [showCityModal, setShowCityModal] = useState(false);
  const [showCenterModal, setShowCenterModal] = useState(false);
  const [showBlogModal, setShowBlogModal] = useState(false);
  const [showTeamReqModal, setShowTeamReqModal] = useState(false);
  const [showCaseStudyModal, setShowCaseStudyModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  
  // Form states
  const [cityForm, setCityForm] = useState({ name: '', state: '', is_active: true });
  const [centerForm, setCenterForm] = useState({ 
    name: '', city: '', address: '', phone: '', email: '', maps_link: '', is_active: true 
  });
  const [blogForm, setBlogForm] = useState({
    title: '', slug: '', excerpt: '', content: '', image_url: '', 
    author: '', category: '', tags: [], is_published: false,
    meta_title: '', meta_description: '', keywords: ''
  });
  const [teamReqForm, setTeamReqForm] = useState({
    title: '', description: '', type: 'Full-time', city: 'Remote', 
    skills_required: '', responsibilities: '', qualifications: '', is_active: true
  });
  const [caseStudyForm, setCaseStudyForm] = useState({
    school_name: '', video_id: '', description: '', order: 0, is_active: true
  });
  
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [citiesRes, centersRes, blogsRes, teamReqRes, caseStudiesRes] = await Promise.all([
        axios.get(`${API}/cities`, { headers: getAuthHeaders() }),
        axios.get(`${API}/centers`, { headers: getAuthHeaders() }),
        axios.get(`${API}/blogs`, { headers: getAuthHeaders() }),
        axios.get(`${API}/team-requirements?all=true`, { headers: getAuthHeaders() }).catch(() => ({ data: [] })),
        axios.get(`${API}/case-studies?all=true`, { headers: getAuthHeaders() }).catch(() => ({ data: [] }))
      ]);
      setCities(citiesRes.data);
      setCenters(centersRes.data);
      setBlogs(blogsRes.data);
      setTeamRequirements(teamReqRes.data || []);
      setCaseStudies(caseStudiesRes.data || []);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  // City handlers
  const handleSaveCity = async () => {
    try {
      if (editingItem) {
        await axios.patch(`${API}/cities/${editingItem.id}`, cityForm, { headers: getAuthHeaders() });
        toast.success('City updated successfully');
      } else {
        await axios.post(`${API}/cities`, cityForm, { headers: getAuthHeaders() });
        toast.success('City added successfully');
      }
      setShowCityModal(false);
      setEditingItem(null);
      setCityForm({ name: '', state: '', is_active: true });
      fetchData();
    } catch (error) {
      toast.error('Failed to save city');
    }
  };

  const handleDeleteCity = async (id) => {
    if (!confirm('Are you sure you want to delete this city?')) return;
    try {
      await axios.delete(`${API}/cities/${id}`, { headers: getAuthHeaders() });
      toast.success('City deleted');
      fetchData();
    } catch (error) {
      toast.error('Failed to delete city');
    }
  };

  // Center handlers
  const handleSaveCenter = async () => {
    try {
      if (editingItem) {
        await axios.patch(`${API}/centers/${editingItem.id}`, centerForm, { headers: getAuthHeaders() });
        toast.success('Center updated successfully');
      } else {
        await axios.post(`${API}/centers`, centerForm, { headers: getAuthHeaders() });
        toast.success('Center added successfully');
      }
      setShowCenterModal(false);
      setEditingItem(null);
      setCenterForm({ name: '', city: '', address: '', phone: '', email: '', maps_link: '', is_active: true });
      fetchData();
    } catch (error) {
      toast.error('Failed to save center');
    }
  };

  const handleDeleteCenter = async (id) => {
    if (!confirm('Are you sure you want to delete this center?')) return;
    try {
      await axios.delete(`${API}/centers/${id}`, { headers: getAuthHeaders() });
      toast.success('Center deleted');
      fetchData();
    } catch (error) {
      toast.error('Failed to delete center');
    }
  };

  // Blog handlers
  const generateSlug = (title) => {
    return title.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  const handleSaveBlog = async () => {
    try {
      const blogData = {
        ...blogForm,
        slug: blogForm.slug || generateSlug(blogForm.title),
        tags: typeof blogForm.tags === 'string' ? blogForm.tags.split(',').map(t => t.trim()) : blogForm.tags
      };
      
      if (editingItem) {
        await axios.patch(`${API}/blogs/${editingItem.id}`, blogData, { headers: getAuthHeaders() });
        toast.success('Blog updated successfully');
      } else {
        await axios.post(`${API}/blogs`, blogData, { headers: getAuthHeaders() });
        toast.success('Blog created successfully');
      }
      setShowBlogModal(false);
      setEditingItem(null);
      setBlogForm({
        title: '', slug: '', excerpt: '', content: '', image_url: '', 
        author: '', category: '', tags: [], is_published: false,
        meta_title: '', meta_description: '', keywords: ''
      });
      fetchData();
    } catch (error) {
      toast.error('Failed to save blog');
    }
  };

  const handleDeleteBlog = async (id) => {
    if (!confirm('Are you sure you want to delete this blog?')) return;
    try {
      await axios.delete(`${API}/blogs/${id}`, { headers: getAuthHeaders() });
      toast.success('Blog deleted');
      fetchData();
    } catch (error) {
      toast.error('Failed to delete blog');
    }
  };

  const toggleBlogPublish = async (blog) => {
    try {
      await axios.patch(`${API}/blogs/${blog.id}`, { 
        is_published: !blog.is_published 
      }, { headers: getAuthHeaders() });
      toast.success(blog.is_published ? 'Blog unpublished' : 'Blog published');
      fetchData();
    } catch (error) {
      toast.error('Failed to update blog');
    }
  };

  // Team Requirements handlers
  const handleSaveTeamReq = async () => {
    if (!teamReqForm.title) {
      toast.error('Please enter a title');
      return;
    }
    try {
      const reqData = {
        ...teamReqForm,
        skills_required: typeof teamReqForm.skills_required === 'string' 
          ? teamReqForm.skills_required.split(',').map(s => s.trim()).filter(Boolean)
          : teamReqForm.skills_required
      };
      
      if (editingItem) {
        await axios.patch(`${API}/team-requirements/${editingItem.id}`, reqData, { headers: getAuthHeaders() });
        toast.success('Requirement updated successfully');
      } else {
        await axios.post(`${API}/team-requirements`, reqData, { headers: getAuthHeaders() });
        toast.success('Requirement added successfully');
      }
      setShowTeamReqModal(false);
      setEditingItem(null);
      setTeamReqForm({
        title: '', description: '', type: 'Full-time', city: 'Remote', 
        skills_required: '', responsibilities: '', qualifications: '', is_active: true
      });
      fetchData();
    } catch (error) {
      toast.error('Failed to save requirement');
    }
  };

  const handleDeleteTeamReq = async (id) => {
    if (!confirm('Are you sure you want to delete this requirement?')) return;
    try {
      await axios.delete(`${API}/team-requirements/${id}`, { headers: getAuthHeaders() });
      toast.success('Requirement deleted');
      fetchData();
    } catch (error) {
      toast.error('Failed to delete requirement');
    }
  };

  const toggleTeamReqActive = async (req) => {
    try {
      await axios.patch(`${API}/team-requirements/${req.id}`, { 
        is_active: !req.is_active 
      }, { headers: getAuthHeaders() });
      toast.success(req.is_active ? 'Requirement deactivated' : 'Requirement activated');
      fetchData();
    } catch (error) {
      toast.error('Failed to update requirement');
    }
  };

  // Case Study handlers
  const handleSaveCaseStudy = async () => {
    if (!caseStudyForm.school_name || !caseStudyForm.video_id) {
      toast.error('Please enter school name and YouTube video ID');
      return;
    }
    try {
      if (editingItem) {
        await axios.patch(`${API}/case-studies/${editingItem.id}`, caseStudyForm, { headers: getAuthHeaders() });
        toast.success('Case study updated successfully');
      } else {
        await axios.post(`${API}/case-studies`, caseStudyForm, { headers: getAuthHeaders() });
        toast.success('Case study added successfully');
      }
      setShowCaseStudyModal(false);
      setEditingItem(null);
      setCaseStudyForm({ school_name: '', video_id: '', description: '', order: 0, is_active: true });
      fetchData();
    } catch (error) {
      toast.error('Failed to save case study');
    }
  };

  const handleDeleteCaseStudy = async (id) => {
    if (!confirm('Are you sure you want to delete this case study?')) return;
    try {
      await axios.delete(`${API}/case-studies/${id}`, { headers: getAuthHeaders() });
      toast.success('Case study deleted');
      fetchData();
    } catch (error) {
      toast.error('Failed to delete case study');
    }
  };

  const toggleCaseStudyActive = async (study) => {
    try {
      await axios.patch(`${API}/case-studies/${study.id}`, { 
        is_active: !study.is_active 
      }, { headers: getAuthHeaders() });
      toast.success(study.is_active ? 'Case study hidden' : 'Case study visible');
      fetchData();
    } catch (error) {
      toast.error('Failed to update case study');
    }
  };

  const tabs = [
    { id: 'case-studies', label: 'School Case Studies', icon: Video, count: caseStudies.length },
    { id: 'team-requirements', label: 'Team Openings', icon: Briefcase, count: teamRequirements.length },
    { id: 'cities', label: 'Cities', icon: MapPin, count: cities.length },
    { id: 'centers', label: 'Centers', icon: Building, count: centers.length },
    { id: 'blogs', label: 'Blogs', icon: FileText, count: blogs.length },
  ];

  const filteredCaseStudies = caseStudies.filter(s => 
    s.school_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredTeamReqs = teamRequirements.filter(r => 
    r.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.city?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredCities = cities.filter(c => 
    c.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.state?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredCenters = centers.filter(c => 
    c.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.city?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredBlogs = blogs.filter(b => 
    b.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.category?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AdminLayout title="Settings">
      <div className="space-y-6">
        {/* Tabs */}
        <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-2">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                activeTab === tab.id 
                  ? 'bg-[#1E3A5F] text-white' 
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
              data-testid={`tab-${tab.id}`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                activeTab === tab.id ? 'bg-white/20' : 'bg-slate-200'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search & Add */}
        <div className="flex gap-4 items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Search ${activeTab.replace('-', ' ')}...`}
              className="pl-10"
            />
          </div>
          <Button
            onClick={() => {
              setEditingItem(null);
              if (activeTab === 'case-studies') {
                setCaseStudyForm({ school_name: '', video_id: '', description: '', order: 0, is_active: true });
                setShowCaseStudyModal(true);
              } else if (activeTab === 'team-requirements') {
                setTeamReqForm({
                  title: '', description: '', type: 'Full-time', city: 'Remote', 
                  skills_required: '', responsibilities: '', qualifications: '', is_active: true
                });
                setShowTeamReqModal(true);
              } else if (activeTab === 'cities') {
                setCityForm({ name: '', state: '', is_active: true });
                setShowCityModal(true);
              } else if (activeTab === 'centers') {
                setCenterForm({ name: '', city: '', address: '', phone: '', email: '', maps_link: '', is_active: true });
                setShowCenterModal(true);
              } else {
                setBlogForm({
                  title: '', slug: '', excerpt: '', content: '', image_url: '', 
                  author: '', category: '', tags: [], is_published: false,
                  meta_title: '', meta_description: '', keywords: ''
                });
                setShowBlogModal(true);
              }
            }}
            className="bg-[#D63031] hover:bg-[#c0392b]"
            data-testid="add-new-btn"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add {activeTab === 'case-studies' ? 'Case Study' : activeTab === 'team-requirements' ? 'Opening' : activeTab === 'cities' ? 'City' : activeTab === 'centers' ? 'Center' : 'Blog'}
          </Button>
        </div>

        {/* Case Studies Tab */}
        {activeTab === 'case-studies' && (
          <div className="grid gap-4">
            {filteredCaseStudies.length === 0 ? (
              <div className="bg-white rounded-xl p-8 text-center text-slate-500">
                <Video className="w-12 h-12 mx-auto text-slate-300 mb-4" />
                <p>No case studies yet. Click &quot;Add Case Study&quot; to add school success stories.</p>
                <p className="text-sm mt-2">These will be displayed on the School Offerings and About pages.</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredCaseStudies.map(study => (
                  <div key={study.id} className={`bg-white rounded-xl overflow-hidden shadow-sm border ${study.is_active ? 'border-green-200' : 'border-slate-200 opacity-60'}`}>
                    <div className="aspect-video bg-slate-100 relative">
                      <img 
                        src={`https://img.youtube.com/vi/${study.video_id}/mqdefault.jpg`} 
                        alt={study.school_name}
                        className="w-full h-full object-cover"
                      />
                      <a 
                        href={`https://www.youtube.com/watch?v=${study.video_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 hover:opacity-100 transition-opacity"
                      >
                        <Play className="w-12 h-12 text-white" />
                      </a>
                      <span className={`absolute top-2 right-2 px-2 py-0.5 rounded text-xs font-medium ${
                        study.is_active ? 'bg-green-500 text-white' : 'bg-slate-500 text-white'
                      }`}>
                        {study.is_active ? 'Visible' : 'Hidden'}
                      </span>
                    </div>
                    <div className="p-4">
                      <h3 className="font-semibold text-[#1E3A5F] mb-1">{study.school_name}</h3>
                      {study.description && (
                        <p className="text-sm text-slate-600 line-clamp-2">{study.description}</p>
                      )}
                      <p className="text-xs text-slate-400 mt-2">Order: {study.order || 0}</p>
                      <div className="flex gap-2 mt-3">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditingItem(study);
                            setCaseStudyForm({
                              school_name: study.school_name,
                              video_id: study.video_id,
                              description: study.description || '',
                              order: study.order || 0,
                              is_active: study.is_active
                            });
                            setShowCaseStudyModal(true);
                          }}
                        >
                          <Edit2 className="w-3 h-3 mr-1" /> Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleCaseStudyActive(study)}
                        >
                          {study.is_active ? <EyeOff className="w-3 h-3 mr-1" /> : <Eye className="w-3 h-3 mr-1" />}
                          {study.is_active ? 'Hide' : 'Show'}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red-600 hover:bg-red-50"
                          onClick={() => handleDeleteCaseStudy(study.id)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Team Requirements Tab */}
        {activeTab === 'team-requirements' && (
          <div className="grid gap-4">
            {filteredTeamReqs.length === 0 ? (
              <div className="bg-white rounded-xl p-8 text-center text-slate-500">
                <Briefcase className="w-12 h-12 mx-auto text-slate-300 mb-4" />
                <p>No team openings yet. Click "Add Opening" to create your first position.</p>
                <p className="text-sm mt-2">These will be displayed on the Join Team page.</p>
              </div>
            ) : (
              filteredTeamReqs.map(req => (
                <div key={req.id} className={`bg-white rounded-xl p-4 shadow-sm border-l-4 ${req.is_active ? 'border-green-500' : 'border-slate-300'}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-[#1E3A5F] text-lg">{req.title}</h3>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          req.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {req.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <p className="text-slate-600 text-sm mt-1">{req.description}</p>
                      <div className="flex flex-wrap gap-2 mt-3">
                        <span className="flex items-center gap-1 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                          <Briefcase className="w-3 h-3" />
                          {req.type}
                        </span>
                        <span className="flex items-center gap-1 text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-full">
                          <MapPin className="w-3 h-3" />
                          {req.city}
                        </span>
                        {req.skills_required?.map((skill, i) => (
                          <span key={i} className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
                            {skill}
                          </span>
                        ))}
                      </div>
                      {req.responsibilities && (
                        <p className="text-xs text-slate-500 mt-2"><strong>Responsibilities:</strong> {req.responsibilities}</p>
                      )}
                      {req.qualifications && (
                        <p className="text-xs text-slate-500 mt-1"><strong>Qualifications:</strong> {req.qualifications}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <button
                        onClick={() => toggleTeamReqActive(req)}
                        className={`p-1.5 rounded-lg ${req.is_active ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-500'}`}
                        title={req.is_active ? 'Deactivate' : 'Activate'}
                      >
                        {req.is_active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => {
                          setEditingItem(req);
                          setTeamReqForm({
                            ...req,
                            skills_required: req.skills_required?.join(', ') || ''
                          });
                          setShowTeamReqModal(true);
                        }}
                        className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteTeamReq(req.id)}
                        className="p-1.5 hover:bg-red-50 rounded-lg text-red-500"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Cities Tab */}
        {activeTab === 'cities' && (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600">City</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600">State</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600">Status</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-slate-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCities.map(city => (
                  <tr key={city.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium">{city.name}</td>
                    <td className="px-4 py-3 text-slate-600">{city.state || '-'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        city.is_active !== false ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {city.is_active !== false ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => {
                          setEditingItem(city);
                          setCityForm({ name: city.name, state: city.state || '', is_active: city.is_active !== false });
                          setShowCityModal(true);
                        }}
                        className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteCity(city.id)}
                        className="p-1.5 hover:bg-red-50 rounded-lg text-red-500 ml-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredCities.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                      No cities found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Centers Tab */}
        {activeTab === 'centers' && (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600">Center</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600">City</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600">Contact</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600">Status</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-slate-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCenters.map(center => (
                  <tr key={center.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="font-medium">{center.name}</div>
                      <div className="text-xs text-slate-500">{center.address}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{center.city}</td>
                    <td className="px-4 py-3">
                      <div className="text-sm">{center.phone || '-'}</div>
                      <div className="text-xs text-slate-500">{center.email}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        center.is_active !== false ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {center.is_active !== false ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => {
                          setEditingItem(center);
                          setCenterForm(center);
                          setShowCenterModal(true);
                        }}
                        className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteCenter(center.id)}
                        className="p-1.5 hover:bg-red-50 rounded-lg text-red-500 ml-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredCenters.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                      No centers found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Blogs Tab */}
        {activeTab === 'blogs' && (
          <div className="grid gap-4">
            {filteredBlogs.map(blog => (
              <div key={blog.id} className="bg-white rounded-xl p-4 shadow-sm flex gap-4">
                {blog.image_url && (
                  <img src={blog.image_url} alt="" className="w-24 h-24 object-cover rounded-lg" />
                )}
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-[#1E3A5F]">{blog.title}</h3>
                      <p className="text-sm text-slate-500 mt-1">{blog.excerpt}</p>
                      <div className="flex gap-2 mt-2">
                        <span className="text-xs bg-slate-100 px-2 py-0.5 rounded-full">{blog.category || 'General'}</span>
                        <span className="text-xs text-slate-500">/blogs/{blog.slug}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleBlogPublish(blog)}
                        className={`p-1.5 rounded-lg ${blog.is_published ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-500'}`}
                        title={blog.is_published ? 'Unpublish' : 'Publish'}
                      >
                        {blog.is_published ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => {
                          setEditingItem(blog);
                          setBlogForm({
                            ...blog,
                            tags: blog.tags?.join(', ') || ''
                          });
                          setShowBlogModal(true);
                        }}
                        className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteBlog(blog.id)}
                        className="p-1.5 hover:bg-red-50 rounded-lg text-red-500"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {filteredBlogs.length === 0 && (
              <div className="bg-white rounded-xl p-8 text-center text-slate-500">
                No blogs found. Click "Add Blog" to create your first blog post.
              </div>
            )}
          </div>
        )}
      </div>

      {/* City Modal */}
      <Dialog open={showCityModal} onOpenChange={setShowCityModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Edit City' : 'Add City'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">City Name *</label>
              <Input
                value={cityForm.name}
                onChange={(e) => setCityForm({ ...cityForm, name: e.target.value })}
                placeholder="e.g., Mumbai"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">State</label>
              <Input
                value={cityForm.state}
                onChange={(e) => setCityForm({ ...cityForm, state: e.target.value })}
                placeholder="e.g., Maharashtra"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="city-active"
                checked={cityForm.is_active}
                onChange={(e) => setCityForm({ ...cityForm, is_active: e.target.checked })}
                className="rounded"
              />
              <label htmlFor="city-active" className="text-sm">Active</label>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setShowCityModal(false)} className="flex-1">Cancel</Button>
              <Button onClick={handleSaveCity} className="flex-1 bg-[#1E3A5F]">
                <Save className="w-4 h-4 mr-2" />
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Center Modal */}
      <Dialog open={showCenterModal} onOpenChange={setShowCenterModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Edit Center' : 'Add Center'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Center Name *</label>
                <Input
                  value={centerForm.name}
                  onChange={(e) => setCenterForm({ ...centerForm, name: e.target.value })}
                  placeholder="e.g., OLL Mumbai Center"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">City *</label>
                <select
                  value={centerForm.city}
                  onChange={(e) => setCenterForm({ ...centerForm, city: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="">Select city</option>
                  {cities.map(city => (
                    <option key={city.id} value={city.name}>{city.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Address</label>
              <Textarea
                value={centerForm.address}
                onChange={(e) => setCenterForm({ ...centerForm, address: e.target.value })}
                placeholder="Full address"
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Phone</label>
                <Input
                  value={centerForm.phone}
                  onChange={(e) => setCenterForm({ ...centerForm, phone: e.target.value })}
                  placeholder="Contact number"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <Input
                  type="email"
                  value={centerForm.email}
                  onChange={(e) => setCenterForm({ ...centerForm, email: e.target.value })}
                  placeholder="center@oll.co"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Google Maps Link</label>
              <Input
                value={centerForm.maps_link}
                onChange={(e) => setCenterForm({ ...centerForm, maps_link: e.target.value })}
                placeholder="https://maps.google.com/..."
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="center-active"
                checked={centerForm.is_active}
                onChange={(e) => setCenterForm({ ...centerForm, is_active: e.target.checked })}
                className="rounded"
              />
              <label htmlFor="center-active" className="text-sm">Active</label>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setShowCenterModal(false)} className="flex-1">Cancel</Button>
              <Button onClick={handleSaveCenter} className="flex-1 bg-[#1E3A5F]">
                <Save className="w-4 h-4 mr-2" />
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Blog Modal */}
      <Dialog open={showBlogModal} onOpenChange={setShowBlogModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Edit Blog' : 'Create Blog'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[70vh] overflow-y-auto">
            <div>
              <label className="block text-sm font-medium mb-1">Title *</label>
              <Input
                value={blogForm.title}
                onChange={(e) => setBlogForm({ ...blogForm, title: e.target.value })}
                placeholder="Blog title"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Slug (URL)</label>
                <Input
                  value={blogForm.slug}
                  onChange={(e) => setBlogForm({ ...blogForm, slug: e.target.value })}
                  placeholder="Auto-generated from title"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Category</label>
                <Input
                  value={blogForm.category}
                  onChange={(e) => setBlogForm({ ...blogForm, category: e.target.value })}
                  placeholder="e.g., Education, Tips"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Excerpt</label>
              <Textarea
                value={blogForm.excerpt}
                onChange={(e) => setBlogForm({ ...blogForm, excerpt: e.target.value })}
                placeholder="Short description for previews"
                rows={2}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Content *</label>
              <Textarea
                value={blogForm.content}
                onChange={(e) => setBlogForm({ ...blogForm, content: e.target.value })}
                placeholder="Write your blog content here... (Supports HTML)"
                rows={8}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Featured Image URL</label>
                <Input
                  value={blogForm.image_url}
                  onChange={(e) => setBlogForm({ ...blogForm, image_url: e.target.value })}
                  placeholder="https://..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Author</label>
                <Input
                  value={blogForm.author}
                  onChange={(e) => setBlogForm({ ...blogForm, author: e.target.value })}
                  placeholder="Author name"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Tags (comma-separated)</label>
              <Input
                value={typeof blogForm.tags === 'string' ? blogForm.tags : blogForm.tags?.join(', ')}
                onChange={(e) => setBlogForm({ ...blogForm, tags: e.target.value })}
                placeholder="education, robotics, coding"
              />
            </div>
            
            {/* SEO Section */}
            <div className="border-t pt-4 mt-4">
              <h4 className="font-medium text-sm flex items-center gap-2 mb-3">
                <Globe className="w-4 h-4" /> SEO Settings
              </h4>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Meta Title</label>
                  <Input
                    value={blogForm.meta_title}
                    onChange={(e) => setBlogForm({ ...blogForm, meta_title: e.target.value })}
                    placeholder="SEO title (defaults to blog title)"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Meta Description</label>
                  <Textarea
                    value={blogForm.meta_description}
                    onChange={(e) => setBlogForm({ ...blogForm, meta_description: e.target.value })}
                    placeholder="SEO description (150-160 characters recommended)"
                    rows={2}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Keywords</label>
                  <Input
                    value={blogForm.keywords}
                    onChange={(e) => setBlogForm({ ...blogForm, keywords: e.target.value })}
                    placeholder="SEO keywords (comma-separated)"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="blog-published"
                checked={blogForm.is_published}
                onChange={(e) => setBlogForm({ ...blogForm, is_published: e.target.checked })}
                className="rounded"
              />
              <label htmlFor="blog-published" className="text-sm">Publish immediately</label>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setShowBlogModal(false)} className="flex-1">Cancel</Button>
              <Button onClick={handleSaveBlog} className="flex-1 bg-[#1E3A5F]">
                <Save className="w-4 h-4 mr-2" />
                {editingItem ? 'Update' : 'Create'} Blog
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Team Requirements Modal */}
      <Dialog open={showTeamReqModal} onOpenChange={setShowTeamReqModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Edit Opening' : 'Add Team Opening'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[70vh] overflow-y-auto">
            <div>
              <label className="block text-sm font-medium mb-1">Position Title *</label>
              <Input
                value={teamReqForm.title}
                onChange={(e) => setTeamReqForm({ ...teamReqForm, title: e.target.value })}
                placeholder="e.g., Marketing Manager, Content Writer"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Description</label>
              <Textarea
                value={teamReqForm.description}
                onChange={(e) => setTeamReqForm({ ...teamReqForm, description: e.target.value })}
                placeholder="Brief description of the role"
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Type</label>
                <select
                  value={teamReqForm.type}
                  onChange={(e) => setTeamReqForm({ ...teamReqForm, type: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  {ROLE_TYPES.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Location</label>
                <Input
                  value={teamReqForm.city}
                  onChange={(e) => setTeamReqForm({ ...teamReqForm, city: e.target.value })}
                  placeholder="e.g., Remote, Mumbai"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Skills Required (comma-separated)</label>
              <Input
                value={typeof teamReqForm.skills_required === 'string' ? teamReqForm.skills_required : teamReqForm.skills_required?.join(', ')}
                onChange={(e) => setTeamReqForm({ ...teamReqForm, skills_required: e.target.value })}
                placeholder="e.g., Marketing, Social Media, Communication"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Responsibilities</label>
              <Textarea
                value={teamReqForm.responsibilities}
                onChange={(e) => setTeamReqForm({ ...teamReqForm, responsibilities: e.target.value })}
                placeholder="Key responsibilities for this role"
                rows={3}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Qualifications</label>
              <Textarea
                value={teamReqForm.qualifications}
                onChange={(e) => setTeamReqForm({ ...teamReqForm, qualifications: e.target.value })}
                placeholder="Required qualifications and experience"
                rows={2}
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="teamreq-active"
                checked={teamReqForm.is_active}
                onChange={(e) => setTeamReqForm({ ...teamReqForm, is_active: e.target.checked })}
                className="rounded"
              />
              <label htmlFor="teamreq-active" className="text-sm">Active (visible on Join Team page)</label>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setShowTeamReqModal(false)} className="flex-1">Cancel</Button>
              <Button onClick={handleSaveTeamReq} className="flex-1 bg-[#1E3A5F]">
                <Save className="w-4 h-4 mr-2" />
                {editingItem ? 'Update' : 'Add'} Opening
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Case Study Modal */}
      <Dialog open={showCaseStudyModal} onOpenChange={setShowCaseStudyModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Video className="w-5 h-5 text-[#D63031]" />
              {editingItem ? 'Edit' : 'Add'} Case Study
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">School Name *</label>
              <Input
                value={caseStudyForm.school_name}
                onChange={(e) => setCaseStudyForm({ ...caseStudyForm, school_name: e.target.value })}
                placeholder="e.g., Greenlawns High School"
                data-testid="case-study-school-name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">YouTube Video ID *</label>
              <Input
                value={caseStudyForm.video_id}
                onChange={(e) => setCaseStudyForm({ ...caseStudyForm, video_id: e.target.value })}
                placeholder="e.g., dQw4w9WgXcQ"
                data-testid="case-study-video-id"
              />
              <p className="text-xs text-slate-500 mt-1">
                Enter only the video ID from the YouTube URL (e.g., for youtube.com/watch?v=<strong>dQw4w9WgXcQ</strong>, enter dQw4w9WgXcQ)
              </p>
            </div>
            {caseStudyForm.video_id && (
              <div className="border rounded-lg overflow-hidden">
                <img 
                  src={`https://img.youtube.com/vi/${caseStudyForm.video_id}/mqdefault.jpg`} 
                  alt="Video thumbnail preview"
                  className="w-full aspect-video object-cover"
                />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium mb-1">Description (optional)</label>
              <Textarea
                value={caseStudyForm.description}
                onChange={(e) => setCaseStudyForm({ ...caseStudyForm, description: e.target.value })}
                placeholder="Brief description of the case study"
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Display Order</label>
                <Input
                  type="number"
                  value={caseStudyForm.order}
                  onChange={(e) => setCaseStudyForm({ ...caseStudyForm, order: parseInt(e.target.value) || 0 })}
                  placeholder="0"
                />
              </div>
              <div className="flex items-center gap-2 pt-6">
                <input
                  type="checkbox"
                  id="case-study-active"
                  checked={caseStudyForm.is_active}
                  onChange={(e) => setCaseStudyForm({ ...caseStudyForm, is_active: e.target.checked })}
                  className="rounded"
                />
                <label htmlFor="case-study-active" className="text-sm">Visible on website</label>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => setShowCaseStudyModal(false)} className="flex-1">Cancel</Button>
              <Button onClick={handleSaveCaseStudy} className="flex-1 bg-[#D63031] hover:bg-[#c0392b]">
                <Save className="w-4 h-4 mr-2" />
                {editingItem ? 'Update' : 'Add'} Case Study
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminSettings;
