import { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Calendar, User, ArrowLeft, ArrowRight } from 'lucide-react';
import { Button } from '../components/ui/button';
import { format } from 'date-fns';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const DEFAULT_BLOG = {
  id: '1',
  title: 'Why Robotics is Essential for Your Child\'s Future',
  slug: 'why-robotics-essential-child-future',
  excerpt: 'Discover how robotics education prepares children for the jobs of tomorrow.',
  content: `
## Introduction

In today's rapidly evolving technological landscape, preparing children for the future means equipping them with skills that go beyond traditional academics. Robotics education has emerged as one of the most effective ways to develop critical thinking, problem-solving, and creativity in young minds.

## The Benefits of Robotics Education

### 1. Develops Problem-Solving Skills
When children build and program robots, they encounter challenges that require creative solutions. This hands-on experience teaches them to break down complex problems into manageable parts.

### 2. Encourages Creativity
Robotics isn't just about following instructions—it's about imagining new possibilities. Children learn to design, build, and iterate on their ideas.

### 3. Builds Technical Foundations
Early exposure to robotics introduces concepts in programming, engineering, and mathematics in an engaging, practical way.

### 4. Prepares for Future Careers
With automation and AI transforming industries, understanding how robots work will be a valuable skill in many future careers.

## How OLL Approaches Robotics Education

At OLL, we believe in making robotics accessible and fun for all age groups. Our curriculum is designed to:

- Start with basic concepts and gradually introduce advanced topics
- Use age-appropriate tools and platforms
- Encourage collaboration and teamwork
- Provide opportunities for competitions and showcases

## Conclusion

Investing in robotics education today means preparing your child for the opportunities of tomorrow. Whether they become engineers, entrepreneurs, or creative professionals, the skills learned through robotics will serve them well throughout their lives.

Ready to get started? [Book a free demo](/student) and see the difference robotics can make in your child's education.
  `,
  cover_image: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=1200&h=600&fit=crop',
  category: 'parents',
  author: 'OLL Team',
  created_at: '2024-12-01T00:00:00Z',
};

const BlogDetailPage = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [blog, setBlog] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBlog();
  }, [slug]);

  const fetchBlog = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/blogs/${slug}`);
      setBlog(response.data);
    } catch (error) {
      // Use default blog for demo
      if (slug === 'why-robotics-essential-child-future') {
        setBlog(DEFAULT_BLOG);
      } else {
        setBlog({
          ...DEFAULT_BLOG,
          slug: slug,
          title: slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
        });
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#D63031]"></div>
      </div>
    );
  }

  if (!blog) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-[#1E3A5F] mb-4">Blog Not Found</h1>
          <Button onClick={() => navigate('/blogs')} className="btn-primary">
            Back to Blogs
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <Helmet>
        <title>{post.title} | OLL Blog - Skill Education Insights</title>
        <meta name="description" content={post.excerpt || `Read ${post.title} on the OLL Blog. Expert insights on robotics, coding, AI, and skill education for students, parents, and educators.`} />
      </Helmet>
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
              <Link to="/blogs" className="text-slate-600 hover:text-[#1E3A5F] font-medium transition-colors">All Blogs</Link>
              <Link to="/" className="btn-primary text-sm py-2 px-6" data-testid="get-started-btn">
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-24 pb-12 px-4">
        <article className="max-w-3xl mx-auto">
          {/* Back Button */}
          <Button 
            variant="ghost" 
            onClick={() => navigate('/blogs')} 
            className="mb-6 flex items-center gap-2"
            data-testid="back-to-blogs"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Blogs
          </Button>

          {/* Hero Image */}
          <div className="aspect-video rounded-3xl overflow-hidden mb-8">
            <img 
              src={blog.cover_image} 
              alt={blog.title}
              className="w-full h-full object-cover"
            />
          </div>

          {/* Meta */}
          <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500 mb-6">
            <span className="px-3 py-1 rounded-full bg-[#1E3A5F]/10 text-[#1E3A5F] font-medium capitalize">
              {blog.category}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              {format(new Date(blog.created_at), 'MMMM d, yyyy')}
            </span>
            <span className="flex items-center gap-1">
              <User className="w-4 h-4" />
              {blog.author}
            </span>
          </div>

          {/* Title */}
          <h1 className="text-3xl md:text-4xl font-bold text-[#1E3A5F] mb-6" style={{ fontFamily: 'Manrope, sans-serif' }}>
            {blog.title}
          </h1>

          {/* Content */}
          <div className="prose prose-lg prose-slate max-w-none">
            <div className="text-slate-600 leading-relaxed whitespace-pre-line">
              {blog.content || blog.excerpt}
            </div>
          </div>

          {/* CTA */}
          <div className="mt-12 glass-card rounded-3xl p-8 text-center">
            <h2 className="text-xl font-bold text-[#1E3A5F] mb-4" style={{ fontFamily: 'Manrope, sans-serif' }}>
              Ready to Get Started?
            </h2>
            <p className="text-slate-600 mb-6">
              Book a free demo session and explore our programs.
            </p>
            <Link to="/student" className="btn-primary inline-flex items-center gap-2" data-testid="blog-cta">
              Book Free Demo <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </article>
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

export default BlogDetailPage;
