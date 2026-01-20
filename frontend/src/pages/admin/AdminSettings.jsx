import { useState, useEffect } from 'react';
import { AdminLayout } from './AdminDashboard';
import { useAuth } from '../../context/AuthContext';
import { 
  MapPin, Building, FileText, Plus, Edit2, Trash2, X, Save, Eye, EyeOff,
  Search, Globe, Calendar, Image, Tag, Briefcase, Users
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
  
  // Modal states
  const [showCityModal, setShowCityModal] = useState(false);
  const [showCenterModal, setShowCenterModal] = useState(false);
  const [showBlogModal, setShowBlogModal] = useState(false);
  const [showTeamReqModal, setShowTeamReqModal] = useState(false);
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
  
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [citiesRes, centersRes, blogsRes, teamReqRes] = await Promise.all([
        axios.get(`${API}/cities`, { headers: getAuthHeaders() }),
        axios.get(`${API}/centers`, { headers: getAuthHeaders() }),
        axios.get(`${API}/blogs`, { headers: getAuthHeaders() }),
        axios.get(`${API}/team-requirements`, { headers: getAuthHeaders() }).catch(() => ({ data: [] }))
      ]);
      setCities(citiesRes.data);
      setCenters(centersRes.data);
      setBlogs(blogsRes.data);
      setTeamRequirements(teamReqRes.data || []);
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

  const tabs = [
    { id: 'cities', label: 'Cities', icon: MapPin, count: cities.length },
    { id: 'centers', label: 'Centers', icon: Building, count: centers.length },
    { id: 'blogs', label: 'Blogs', icon: FileText, count: blogs.length },
  ];

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
              placeholder={`Search ${activeTab}...`}
              className="pl-10"
            />
          </div>
          <Button
            onClick={() => {
              setEditingItem(null);
              if (activeTab === 'cities') {
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
            Add {activeTab === 'cities' ? 'City' : activeTab === 'centers' ? 'Center' : 'Blog'}
          </Button>
        </div>

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
    </AdminLayout>
  );
};

export default AdminSettings;
