import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, User, ArrowRight, Search } from 'lucide-react';
import { Input } from '../components/ui/input';
import { format } from 'date-fns';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const DEFAULT_BLOGS = [
  {
    id: '1',
    title: 'Why Robotics is Essential for Your Child\'s Future',
    slug: 'why-robotics-essential-child-future',
    excerpt: 'Discover how robotics education prepares children for the jobs of tomorrow and develops crucial 21st-century skills.',
    content: '',
    cover_image: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=800&h=400&fit=crop',
    category: 'parents',
    author: 'OLL Team',
    created_at: '2024-12-01T00:00:00Z',
  },
  {
    id: '2',
    title: 'Top 5 Coding Languages for Kids to Learn in 2025',
    slug: 'top-coding-languages-kids-2025',
    excerpt: 'A comprehensive guide to the best programming languages that kids can start learning today.',
    content: '',
    cover_image: 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=800&h=400&fit=crop',
    category: 'students',
    author: 'OLL Team',
    created_at: '2024-11-28T00:00:00Z',
  },
  {
    id: '3',
    title: 'How Schools Can Implement STEM Programs Successfully',
    slug: 'schools-implement-stem-programs',
    excerpt: 'A step-by-step guide for schools looking to introduce or enhance their STEM curriculum.',
    content: '',
    cover_image: 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=800&h=400&fit=crop',
    category: 'schools',
    author: 'OLL Team',
    created_at: '2024-11-25T00:00:00Z',
  },
  {
    id: '4',
    title: 'Becoming a STEM Educator: Career Guide',
    slug: 'becoming-stem-educator-guide',
    excerpt: 'Everything you need to know about starting a rewarding career as a STEM educator.',
    content: '',
    cover_image: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=800&h=400&fit=crop',
    category: 'educators',
    author: 'OLL Team',
    created_at: '2024-11-20T00:00:00Z',
  },
];

const CATEGORIES = [
  { value: 'all', label: 'All' },
  { value: 'students', label: 'Students' },
  { value: 'parents', label: 'Parents' },
  { value: 'educators', label: 'Educators' },
  { value: 'schools', label: 'Schools' },
];

const BlogsPage = () => {
  const [blogs, setBlogs] = useState(DEFAULT_BLOGS);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchBlogs();
  }, []);

  const fetchBlogs = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/blogs`);
      if (response.data.length > 0) {
        setBlogs(response.data);
      }
    } catch (error) {
      // Use default blogs
    } finally {
      setLoading(false);
    }
  };

  const filteredBlogs = blogs.filter(blog => {
    const matchesSearch = blog.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         blog.excerpt.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === 'all' || blog.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-lg border-b border-slate-200/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-2">
              <img 
                src="https://customer-assets.emergentagent.com/job_51f7c152-ec6b-4d38-953a-09a434414bba/artifacts/gdvjdp6s_OLL-horizontal-logo-1.png" 
                alt="OLL" 
                className="h-8"
              />
            </Link>
            <div className="flex items-center gap-4">
              <Link to="/about" className="text-slate-600 hover:text-[#1E3A5F] font-medium transition-colors hidden sm:block">About</Link>
              <Link to="/faq" className="text-slate-600 hover:text-[#1E3A5F] font-medium transition-colors hidden sm:block">FAQ</Link>
              <Link to="/" className="btn-primary text-sm py-2 px-6" data-testid="get-started-btn">
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-24 pb-12 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Hero */}
          <div className="text-center mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-[#1E3A5F] mb-4" style={{ fontFamily: 'Manrope, sans-serif' }}>
              OLL Blog
            </h1>
            <p className="text-slate-600 max-w-2xl mx-auto">
              Insights, tips, and updates on skill education for students, parents, educators, and schools.
            </p>
          </div>

          {/* Search & Filter */}
          <div className="flex flex-col md:flex-row gap-4 mb-8">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <Input
                placeholder="Search articles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 h-12 bg-white border-slate-200 rounded-xl"
                data-testid="blog-search"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              {CATEGORIES.map(cat => (
                <button
                  key={cat.value}
                  onClick={() => setActiveCategory(cat.value)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    activeCategory === cat.value
                      ? 'bg-[#1E3A5F] text-white'
                      : 'bg-white text-slate-600 hover:bg-slate-100'
                  }`}
                  data-testid={`blog-category-${cat.value}`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Blog Grid */}
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#D63031] mx-auto"></div>
            </div>
          ) : filteredBlogs.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-slate-500">No articles found matching your search.</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredBlogs.map((blog) => (
                <Link 
                  key={blog.id} 
                  to={`/blogs/${blog.slug}`}
                  className="glass-card rounded-2xl overflow-hidden hover:shadow-xl transition-shadow group"
                  data-testid={`blog-card-${blog.slug}`}
                >
                  <div className="aspect-video overflow-hidden">
                    <img 
                      src={blog.cover_image} 
                      alt={blog.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                  </div>
                  <div className="p-6">
                    <div className="flex items-center gap-4 text-sm text-slate-500 mb-3">
                      <span className="px-3 py-1 rounded-full bg-[#1E3A5F]/10 text-[#1E3A5F] text-xs font-medium capitalize">
                        {blog.category}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {format(new Date(blog.created_at), 'MMM d, yyyy')}
                      </span>
                    </div>
                    <h2 className="text-lg font-semibold text-[#1E3A5F] mb-2 line-clamp-2 group-hover:text-[#D63031] transition-colors" style={{ fontFamily: 'Manrope, sans-serif' }}>
                      {blog.title}
                    </h2>
                    <p className="text-slate-600 text-sm line-clamp-2 mb-4">
                      {blog.excerpt}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2 text-sm text-slate-500">
                        <User className="w-4 h-4" /> {blog.author}
                      </span>
                      <span className="text-[#D63031] font-medium text-sm flex items-center gap-1 group-hover:gap-2 transition-all">
                        Read <ArrowRight className="w-4 h-4" />
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-[#1E3A5F] text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <img 
            src="https://customer-assets.emergentagent.com/job_51f7c152-ec6b-4d38-953a-09a434414bba/artifacts/rugags0w_OLL-horizontal-logo-white.png" 
            alt="OLL" 
            className="h-10 mx-auto mb-4"
          />
          <p className="text-white/70 text-sm">
            © 2024 OLL. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default BlogsPage;
