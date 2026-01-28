import { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { BookOpen, ChevronRight, Search, ArrowLeft, Clock, User, Tag, Menu, X } from 'lucide-react';
import { Input } from '../components/ui/input';
import axios from 'axios';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const ResourcesPage = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [resources, setResources] = useState([]);
  const [selectedResource, setSelectedResource] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    fetchResources();
  }, []);

  useEffect(() => {
    if (slug && resources.length > 0) {
      const resource = resources.find(r => r.slug === slug);
      if (resource) {
        setSelectedResource(resource);
      }
    } else if (!slug && resources.length > 0) {
      // If no slug, show the first resource
      setSelectedResource(resources[0]);
    }
  }, [slug, resources]);

  const fetchResources = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/blogs?blog_type=resource&published_only=true`);
      // Sort by order and then by created_at
      const sorted = response.data.sort((a, b) => {
        if (a.order !== b.order) return a.order - b.order;
        return new Date(a.created_at) - new Date(b.created_at);
      });
      setResources(sorted);
    } catch (error) {
      console.error('Failed to fetch resources:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredResources = resources.filter(r => 
    r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.excerpt?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.tags?.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Build navigation tree (parent -> children)
  const topLevelResources = filteredResources.filter(r => !r.parent_id);
  const getChildren = (parentId) => filteredResources.filter(r => r.parent_id === parentId);

  const handleResourceClick = (resource) => {
    setSelectedResource(resource);
    setSidebarOpen(false);
    navigate(`/resources/${resource.slug}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#D63031]"></div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>{selectedResource ? `${selectedResource.title} | OLL Resources` : 'Open Learning Resources | OLL'}</title>
        <meta name="description" content={selectedResource?.excerpt || 'Free learning resources, documentation, and guides for robotics, coding, and STEM education.'} />
        <meta property="og:title" content={selectedResource?.title || 'Open Learning Resources'} />
        <meta property="og:description" content={selectedResource?.excerpt || 'Free learning resources from OLL'} />
        {selectedResource?.cover_image && <meta property="og:image" content={selectedResource.cover_image} />}
        <link rel="canonical" href={`https://oll.co/resources${slug ? `/${slug}` : ''}`} />
      </Helmet>

      <div className="min-h-screen bg-slate-50">
        <Navbar />
        
        <div className="flex">
          {/* Mobile Sidebar Toggle */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden fixed bottom-6 right-6 z-50 bg-[#1E3A5F] text-white p-3 rounded-full shadow-lg"
          >
            {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>

          {/* Sidebar */}
          <aside className={`
            fixed lg:sticky top-0 left-0 z-40 h-screen w-80 bg-white border-r border-slate-200
            transform transition-transform duration-300 lg:transform-none
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
            overflow-y-auto pt-20 lg:pt-4
          `}>
            <div className="p-4">
              {/* Header */}
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-gradient-to-br from-[#1E3A5F] to-[#D63031] rounded-xl flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="font-bold text-[#1E3A5F]">Learning Resources</h2>
                  <p className="text-xs text-slate-500">{resources.length} resources</p>
                </div>
              </div>

              {/* Search */}
              <div className="relative mb-6">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Search resources..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Navigation Tree */}
              <nav className="space-y-1">
                {topLevelResources.map(resource => (
                  <ResourceNavItem
                    key={resource.id}
                    resource={resource}
                    childResources={getChildren(resource.id)}
                    selectedId={selectedResource?.id}
                    onSelect={handleResourceClick}
                    getChildren={getChildren}
                  />
                ))}
              </nav>

              {filteredResources.length === 0 && (
                <div className="text-center py-8 text-slate-500">
                  <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No resources found</p>
                </div>
              )}
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1 min-h-screen lg:ml-0">
            {selectedResource ? (
              <article className="max-w-4xl mx-auto px-4 sm:px-6 py-8 lg:py-12">
                {/* Breadcrumb */}
                <nav className="flex items-center gap-2 text-sm text-slate-500 mb-6">
                  <Link to="/resources" className="hover:text-[#D63031]">Resources</Link>
                  <ChevronRight className="w-4 h-4" />
                  <span className="text-slate-700">{selectedResource.title}</span>
                </nav>

                {/* Cover Image */}
                {selectedResource.cover_image && (
                  <div className="mb-8 rounded-2xl overflow-hidden">
                    <img 
                      src={selectedResource.cover_image} 
                      alt={selectedResource.title}
                      className="w-full h-64 object-cover"
                    />
                  </div>
                )}

                {/* Title & Meta */}
                <header className="mb-8">
                  <h1 className="text-3xl sm:text-4xl font-bold text-[#1E3A5F] mb-4">
                    {selectedResource.title}
                  </h1>
                  <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500">
                    <span className="flex items-center gap-1">
                      <User className="w-4 h-4" /> {selectedResource.author}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" /> {new Date(selectedResource.created_at).toLocaleDateString()}
                    </span>
                    <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium capitalize">
                      {selectedResource.category}
                    </span>
                  </div>
                  {selectedResource.tags?.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-4">
                      {selectedResource.tags.map((tag, idx) => (
                        <span key={idx} className="flex items-center gap-1 px-3 py-1 bg-slate-100 rounded-full text-xs text-slate-600">
                          <Tag className="w-3 h-3" /> {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </header>

                {/* Content */}
                <div 
                  className="prose prose-slate max-w-none
                    prose-headings:text-[#1E3A5F] prose-headings:font-bold
                    prose-h1:text-3xl prose-h2:text-2xl prose-h3:text-xl
                    prose-a:text-[#D63031] prose-a:no-underline hover:prose-a:underline
                    prose-blockquote:border-l-4 prose-blockquote:border-[#D63031] prose-blockquote:italic
                    prose-code:bg-slate-100 prose-code:text-[#D63031] prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none
                    prose-pre:bg-slate-900 prose-pre:text-slate-100
                    prose-img:rounded-xl prose-img:shadow-lg
                  "
                  dangerouslySetInnerHTML={{ __html: selectedResource.content }}
                />

                {/* Child Resources */}
                {getChildren(selectedResource.id).length > 0 && (
                  <div className="mt-12 pt-8 border-t border-slate-200">
                    <h2 className="text-xl font-bold text-[#1E3A5F] mb-4">Related Resources</h2>
                    <div className="grid gap-4">
                      {getChildren(selectedResource.id).map(child => (
                        <Link
                          key={child.id}
                          to={`/resources/${child.slug}`}
                          className="p-4 bg-white rounded-xl border border-slate-200 hover:border-[#D63031] transition-colors"
                        >
                          <h3 className="font-semibold text-[#1E3A5F]">{child.title}</h3>
                          <p className="text-sm text-slate-500 mt-1">{child.excerpt}</p>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {/* Navigation */}
                <div className="mt-12 pt-8 border-t border-slate-200 flex items-center justify-between">
                  <Link to="/resources" className="flex items-center gap-2 text-[#D63031] hover:underline">
                    <ArrowLeft className="w-4 h-4" /> All Resources
                  </Link>
                </div>
              </article>
            ) : (
              <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
                <div className="text-center">
                  <BookOpen className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <h2 className="text-2xl font-bold text-slate-700 mb-2">Select a Resource</h2>
                  <p className="text-slate-500">Choose a resource from the sidebar to start learning</p>
                </div>

                {/* All Resources Grid */}
                <div className="mt-12 grid md:grid-cols-2 gap-6">
                  {topLevelResources.map(resource => (
                    <Link
                      key={resource.id}
                      to={`/resources/${resource.slug}`}
                      className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-lg transition-shadow"
                    >
                      {resource.cover_image && (
                        <img src={resource.cover_image} alt={resource.title} className="w-full h-40 object-cover" />
                      )}
                      <div className="p-5">
                        <span className="text-xs text-[#D63031] font-medium capitalize">{resource.category}</span>
                        <h3 className="font-semibold text-[#1E3A5F] mt-1">{resource.title}</h3>
                        <p className="text-sm text-slate-500 mt-2 line-clamp-2">{resource.excerpt}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </main>
        </div>

        <Footer />
      </div>
    </>
  );
};

// Recursive Navigation Item Component
const ResourceNavItem = ({ resource, children, selectedId, onSelect, getChildren, depth = 0 }) => {
  const [expanded, setExpanded] = useState(true);
  const isSelected = resource.id === selectedId;
  const hasChildren = children.length > 0;

  return (
    <div>
      <button
        onClick={() => {
          onSelect(resource);
          if (hasChildren) setExpanded(!expanded);
        }}
        className={`w-full text-left px-3 py-2 rounded-lg transition-all flex items-center gap-2 ${
          isSelected 
            ? 'bg-[#1E3A5F] text-white' 
            : 'text-slate-700 hover:bg-slate-100'
        }`}
        style={{ paddingLeft: `${12 + depth * 16}px` }}
      >
        {hasChildren && (
          <ChevronRight className={`w-4 h-4 transition-transform ${expanded ? 'rotate-90' : ''}`} />
        )}
        <span className="flex-1 truncate text-sm">{resource.title}</span>
      </button>
      
      {hasChildren && expanded && (
        <div className="mt-1">
          {children.map(child => (
            <ResourceNavItem
              key={child.id}
              resource={child}
              children={getChildren(child.id)}
              selectedId={selectedId}
              onSelect={onSelect}
              getChildren={getChildren}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default ResourcesPage;
