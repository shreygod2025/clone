import { useState, useEffect } from 'react';
import { AdminLayout } from './AdminDashboard';
import { useAuth } from '../../context/AuthContext';
import { Plus, Edit2, Trash2, FileText, Image } from 'lucide-react';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { Textarea } from '../../components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Switch } from '../../components/ui/switch';
import { toast } from 'sonner';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const CATEGORIES = ['students', 'parents', 'educators', 'schools'];

const AdminBlogs = () => {
  const { getAuthHeaders } = useAuth();
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingBlog, setEditingBlog] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    excerpt: '',
    content: '',
    cover_image: '',
    category: 'students',
    author: 'OLL Team',
    is_published: false
  });

  useEffect(() => {
    fetchBlogs();
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
        toast.success('Blog updated successfully');
      } else {
        await axios.post(`${API}/blogs`, data, {
          headers: getAuthHeaders()
        });
        toast.success('Blog created successfully');
      }

      setShowForm(false);
      setEditingBlog(null);
      resetForm();
      fetchBlogs();
    } catch (error) {
      toast.error('Failed to save blog');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this blog?')) return;

    try {
      await axios.delete(`${API}/blogs/${id}`, {
        headers: getAuthHeaders()
      });
      toast.success('Blog deleted');
      fetchBlogs();
    } catch (error) {
      toast.error('Failed to delete blog');
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
      is_published: false
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
      is_published: blog.is_published
    });
    setShowForm(true);
  };

  return (
    <AdminLayout title="Blog Management">
      <div className="flex justify-between items-center mb-6">
        <p className="text-slate-500">{blogs.length} blogs</p>
        <Button 
          onClick={() => {
            resetForm();
            setEditingBlog(null);
            setShowForm(true);
          }}
          className="btn-primary flex items-center gap-2"
          data-testid="add-blog-btn"
        >
          <Plus className="w-4 h-4" /> Add Blog
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#D63031] mx-auto"></div>
        </div>
      ) : blogs.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-slate-100">
          <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">No blogs yet</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {blogs.map((blog) => (
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
                    <Image className="w-8 h-8 text-slate-300" />
                  </div>
                )}
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

      {/* Blog Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingBlog ? 'Edit Blog' : 'Add New Blog'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Title *</label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value, slug: generateSlug(e.target.value)})}
                placeholder="Blog title"
                data-testid="blog-title"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Slug</label>
              <Input
                value={formData.slug}
                onChange={(e) => setFormData({...formData, slug: e.target.value})}
                placeholder="blog-url-slug"
                data-testid="blog-slug"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
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
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Cover Image URL</label>
              <Input
                value={formData.cover_image}
                onChange={(e) => setFormData({...formData, cover_image: e.target.value})}
                placeholder="https://..."
                data-testid="blog-cover-image"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Excerpt *</label>
              <Textarea
                value={formData.excerpt}
                onChange={(e) => setFormData({...formData, excerpt: e.target.value})}
                placeholder="Brief summary..."
                className="min-h-[80px]"
                data-testid="blog-excerpt"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Content *</label>
              <Textarea
                value={formData.content}
                onChange={(e) => setFormData({...formData, content: e.target.value})}
                placeholder="Full blog content (supports Markdown)..."
                className="min-h-[200px]"
                data-testid="blog-content"
              />
            </div>
            <div className="flex items-center gap-3">
              <Switch
                checked={formData.is_published}
                onCheckedChange={(checked) => setFormData({...formData, is_published: checked})}
                data-testid="blog-published"
              />
              <label className="text-sm text-slate-600">Publish immediately</label>
            </div>
            <div className="flex gap-3 pt-4">
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
                {editingBlog ? 'Update Blog' : 'Create Blog'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminBlogs;
