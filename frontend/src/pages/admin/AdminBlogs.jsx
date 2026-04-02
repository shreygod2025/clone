import { useState, useEffect } from 'react';
import { AdminLayout } from './AdminDashboard';
import { useAuth } from '../../context/AuthContext';
import { Plus, Edit2, Trash2, FileText, Image, BookOpen, Newspaper } from 'lucide-react';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { Textarea } from '../../components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Switch } from '../../components/ui/switch';
import { toast } from 'sonner';
import axios from 'axios';
import RichTextEditor from '../../components/RichTextEditor';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const CATEGORIES = ['students', 'parents', 'educators', 'schools'];
const BLOG_TYPES = [
  { value: 'blog', label: 'Blog Post', icon: Newspaper, description: 'Regular blog articles' },
  { value: 'resource', label: 'Open Learning Resource', icon: BookOpen, description: 'Documentation & learning guides' }
];

const AdminBlogs = () => {
  const { getAuthHeaders } = useAuth();
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingBlog, setEditingBlog] = useState(null);
  const [activeTab, setActiveTab] = useState('all'); // all, blog, resource
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    excerpt: '',
    content: '',
    cover_image: '',
    category: 'students',
    author: 'OLL Team',
    blog_type: 'blog', // 'blog' or 'resource'
    is_published: false,
    // Resource-specific fields
    parent_id: null, // For nested resources
    order: 0,
    tags: []
  });

  useEffect(() => {
    fetchBlogs();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchBlogs = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/blogs?published_only=false`, {
        headers: getAuthHeaders()
      });
      setBlogs(response.data);
    } catch (error) {
      toast.error('Failed to fetch blogs');
    } finally {
      setLoading(false);
    }
  };

  const generateSlug = (title) => {
    return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.excerpt || !formData.content) {
      toast.error('Please fill all required fields');
      return;
    }

    try {
      const data = {
        ...formData,
        slug: formData.slug || generateSlug(formData.title)
      };

      if (editingBlog) {
        await axios.patch(`${API}/blogs/${editingBlog.id}`, data, {
          headers: getAuthHeaders()
        });
        toast.success('Content updated successfully');
      } else {
        await axios.post(`${API}/blogs`, data, {
          headers: getAuthHeaders()
        });
        toast.success('Content created successfully');
      }

      setShowForm(false);
      setEditingBlog(null);
      resetForm();
      fetchBlogs();
    } catch (error) {
      toast.error('Failed to save content');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this content?')) return;

    try {
      await axios.delete(`${API}/blogs/${id}`, {
        headers: getAuthHeaders()
      });
      toast.success('Content deleted');
      fetchBlogs();
    } catch (error) {
      toast.error('Failed to delete content');
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      slug: '',
      excerpt: '',
      content: '',
      cover_image: '',
      category: 'students',
      author: 'OLL Team',
      blog_type: 'blog',
      is_published: false,
      parent_id: null,
      order: 0,
      tags: []
    });
  };

  const openEditForm = (blog) => {
    setEditingBlog(blog);
    setFormData({
      title: blog.title,
      slug: blog.slug,
      excerpt: blog.excerpt,
      content: blog.content,
      cover_image: blog.cover_image,
      category: blog.category,
      author: blog.author,
      blog_type: blog.blog_type || 'blog',
      is_published: blog.is_published,
      parent_id: blog.parent_id || null,
      order: blog.order || 0,
      tags: blog.tags || []
    });
    setShowForm(true);
  };

  const filteredBlogs = blogs.filter(blog => {
    if (activeTab === 'all') return true;
    return (blog.blog_type || 'blog') === activeTab;
  });

  const blogCount = blogs.filter(b => (b.blog_type || 'blog') === 'blog').length;
  const resourceCount = blogs.filter(b => b.blog_type === 'resource').length;

  // Get resources for parent selection (only top-level resources)
  const parentResources = blogs.filter(b => b.blog_type === 'resource' && !b.parent_id);

  return (
    <AdminLayout title="Content Management">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        {/* Tabs */}
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'all' 
                ? 'bg-[#1E3A5F] text-white' 
                : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'
            }`}
          >
            All ({blogs.length})
          </button>
          <button
            onClick={() => setActiveTab('blog')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
              activeTab === 'blog' 
                ? 'bg-[#1E3A5F] text-white' 
                : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'
            }`}
          >
            <Newspaper className="w-4 h-4" /> Blogs ({blogCount})
          </button>
          <button
            onClick={() => setActiveTab('resource')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
              activeTab === 'resource' 
                ? 'bg-[#1E3A5F] text-white' 
                : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'
            }`}
          >
            <BookOpen className="w-4 h-4" /> Resources ({resourceCount})
          </button>
        </div>

        <Button 
          onClick={() => {
            resetForm();
            setEditingBlog(null);
            setShowForm(true);
          }}
          className="btn-primary flex items-center gap-2"
          data-testid="add-blog-btn"
        >
          <Plus className="w-4 h-4" /> Add Content
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#D63031] mx-auto"></div>
        </div>
      ) : filteredBlogs.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-slate-100">
          <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">No content yet</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredBlogs.map((blog) => (
            <div 
              key={blog.id} 
              className="bg-white rounded-2xl border border-slate-100 overflow-hidden"
              data-testid={`blog-card-${blog.id}`}
            >
              <div className="aspect-video bg-slate-100 relative">
                {blog.cover_image ? (
                  <img src={blog.cover_image} alt={blog.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    {(blog.blog_type || 'blog') === 'resource' ? (
                      <BookOpen className="w-8 h-8 text-slate-300" />
                    ) : (
                      <Image className="w-8 h-8 text-slate-300" />
                    )}
                  </div>
                )}
                <div className="absolute top-2 left-2">
                  <span className={`px-2 py-1 rounded text-xs font-medium flex items-center gap-1 ${
                    (blog.blog_type || 'blog') === 'resource' 
                      ? 'bg-purple-100 text-purple-700' 
                      : 'bg-blue-100 text-blue-700'
                  }`}>
                    {(blog.blog_type || 'blog') === 'resource' ? (
                      <><BookOpen className="w-3 h-3" /> Resource</>
                    ) : (
                      <><Newspaper className="w-3 h-3" /> Blog</>
                    )}
                  </span>
                </div>
                <div className="absolute top-2 right-2">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${blog.is_published ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                    {blog.is_published ? 'Published' : 'Draft'}
                  </span>
                </div>
              </div>
              <div className="p-4">
                <span className="text-xs text-[#D63031] font-medium capitalize">{blog.category}</span>
                <h3 className="font-semibold text-[#1E3A5F] mt-1 line-clamp-2">{blog.title}</h3>
                <p className="text-sm text-slate-500 mt-1 line-clamp-2">{blog.excerpt}</p>
                {blog.tags?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {blog.tags.slice(0, 3).map((tag, idx) => (
                      <span key={idx} className="px-2 py-0.5 bg-slate-100 rounded text-xs text-slate-600">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex gap-2 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEditForm(blog)}
                    className="flex-1"
                    data-testid={`edit-blog-${blog.id}`}
                  >
                    <Edit2 className="w-4 h-4 mr-1" /> Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(blog.id)}
                    className="text-red-500 hover:text-red-700"
                    data-testid={`delete-blog-${blog.id}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Blog/Resource Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingBlog ? 'Edit Content' : 'Add New Content'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Content Type Selection */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-3">Content Type</label>
              <div className="grid grid-cols-2 gap-3">
                {BLOG_TYPES.map(type => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setFormData({...formData, blog_type: type.value})}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${
                      formData.blog_type === type.value
                        ? 'border-[#1E3A5F] bg-blue-50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <type.icon className={`w-5 h-5 ${formData.blog_type === type.value ? 'text-[#1E3A5F]' : 'text-slate-400'}`} />
                      <div>
                        <p className="font-medium text-slate-800">{type.label}</p>
                        <p className="text-xs text-slate-500">{type.description}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Title *</label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value, slug: generateSlug(e.target.value)})}
                  placeholder="Enter title"
                  data-testid="blog-title"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Slug</label>
                <Input
                  value={formData.slug}
                  onChange={(e) => setFormData({...formData, slug: e.target.value})}
                  placeholder="url-friendly-slug"
                  data-testid="blog-slug"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({...formData, category: e.target.value})}
                  className="w-full h-10 px-4 border border-slate-200 rounded-lg"
                  data-testid="blog-category"
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat} value={cat} className="capitalize">{cat}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Author</label>
                <Input
                  value={formData.author}
                  onChange={(e) => setFormData({...formData, author: e.target.value})}
                  placeholder="Author name"
                  data-testid="blog-author"
                />
              </div>
              {formData.blog_type === 'resource' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Parent Resource</label>
                  <select
                    value={formData.parent_id || ''}
                    onChange={(e) => setFormData({...formData, parent_id: e.target.value || null})}
                    className="w-full h-10 px-4 border border-slate-200 rounded-lg"
                  >
                    <option value="">None (Top Level)</option>
                    {parentResources.filter(r => r.id !== editingBlog?.id).map(res => (
                      <option key={res.id} value={res.id}>{res.title}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Cover Image URL</label>
              <Input
                value={formData.cover_image}
                onChange={(e) => setFormData({...formData, cover_image: e.target.value})}
                placeholder="https://..."
                data-testid="blog-cover-image"
              />
              {formData.cover_image && (
                <div className="mt-2 rounded-lg overflow-hidden border border-slate-200">
                  <img src={formData.cover_image} alt="Cover preview" className="w-full h-32 object-cover" />
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Excerpt / Summary *</label>
              <Textarea
                value={formData.excerpt}
                onChange={(e) => setFormData({...formData, excerpt: e.target.value})}
                placeholder="Brief summary that appears in listings..."
                className="min-h-[80px]"
                data-testid="blog-excerpt"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Tags (comma separated)</label>
              <Input
                value={formData.tags?.join(', ') || ''}
                onChange={(e) => setFormData({
                  ...formData, 
                  tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean)
                })}
                placeholder="robotics, coding, kids, beginner"
                data-testid="blog-tags"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Content *</label>
              <RichTextEditor
                content={formData.content}
                onChange={(content) => setFormData({...formData, content})}
                placeholder={formData.blog_type === 'resource' 
                  ? "Write your learning resource content here. Add headings, images, code blocks, videos..." 
                  : "Write your blog post here..."
                }
                getAuthHeaders={getAuthHeaders}
              />
            </div>

            <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-lg">
              <Switch
                checked={formData.is_published}
                onCheckedChange={(checked) => setFormData({...formData, is_published: checked})}
                data-testid="blog-published"
              />
              <label className="text-sm text-slate-600">
                {formData.is_published ? 'Published - Visible to public' : 'Draft - Not visible to public'}
              </label>
            </div>

            <div className="flex gap-3 pt-4 border-t">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setShowForm(false)} 
                className="flex-1"
                data-testid="cancel-blog"
              >
                Cancel
              </Button>
              <Button type="submit" className="btn-primary flex-1" data-testid="save-blog">
                {editingBlog ? 'Update Content' : 'Create Content'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminBlogs;
