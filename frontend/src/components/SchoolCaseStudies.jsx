import { useState, useEffect } from 'react';
import { Play, School, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './ui/button';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL;

// Extract YouTube video ID from various URL formats
const extractYouTubeId = (url) => {
  if (!url) return null;
  // Already a video ID (no URL)
  if (!url.includes('http') && !url.includes('/')) return url;
  
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /youtube\.com\/.*[?&]v=([^&\n?#]+)/
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return url;
};

const SchoolCaseStudies = ({ title = "Our School Partners", subtitle = "See what schools are saying about OLL" }) => {
  const [caseStudies, setCaseStudies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [currentPage, setCurrentPage] = useState(0);
  
  const itemsPerPage = window.innerWidth >= 1024 ? 3 : window.innerWidth >= 768 ? 2 : 1;
  const totalPages = Math.ceil(caseStudies.length / itemsPerPage);

  useEffect(() => {
    const fetchCaseStudies = async () => {
      try {
        const response = await axios.get(`${API}/api/case-studies`);
        setCaseStudies(response.data || []);
      } catch (error) {
        console.error('Failed to fetch case studies:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchCaseStudies();
  }, []);

  const handlePrev = () => {
    setCurrentPage(prev => Math.max(0, prev - 1));
  };

  const handleNext = () => {
    setCurrentPage(prev => Math.min(totalPages - 1, prev + 1));
  };

  if (loading) {
    return (
      <div className="py-12 bg-gradient-to-b from-slate-50 to-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-8">
            <h2 className="text-2xl md:text-3xl font-bold text-[#1E3A5F]">{title}</h2>
            <p className="text-slate-600 mt-2">{subtitle}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-xl shadow-md p-4 animate-pulse">
                <div className="aspect-video bg-slate-200 rounded-lg mb-4" />
                <div className="h-5 bg-slate-200 rounded w-3/4 mb-2" />
                <div className="h-4 bg-slate-200 rounded w-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (caseStudies.length === 0) {
    return null;
  }

  const visibleStudies = caseStudies.slice(
    currentPage * itemsPerPage,
    (currentPage + 1) * itemsPerPage
  );

  return (
    <section className="py-12 md:py-16 bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-[#1E3A5F]/10 text-[#1E3A5F] px-4 py-1.5 rounded-full text-sm font-medium mb-4">
            <School className="w-4 h-4" />
            School Case Studies
          </div>
          <h2 className="text-2xl md:text-4xl font-bold text-[#1E3A5F]" style={{ fontFamily: 'Manrope, sans-serif' }}>
            {title}
          </h2>
          <p className="text-slate-600 mt-2 text-base md:text-lg">{subtitle}</p>
        </div>

        {/* Navigation */}
        {totalPages > 1 && (
          <div className="flex justify-center gap-4 mb-6">
            <Button
              variant="outline"
              size="icon"
              onClick={handlePrev}
              disabled={currentPage === 0}
              className="rounded-full"
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-2">
              {Array.from({ length: totalPages }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentPage(i)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    i === currentPage ? 'bg-[#D63031] w-6' : 'bg-slate-300'
                  }`}
                />
              ))}
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={handleNext}
              disabled={currentPage === totalPages - 1}
              className="rounded-full"
            >
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>
        )}

        {/* Case Studies Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {visibleStudies.map((study) => {
            const videoId = extractYouTubeId(study.video_id);
            return (
              <div
                key={study.id}
                className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden group"
              >
                {/* Video Thumbnail */}
                <div
                  className="aspect-video relative cursor-pointer bg-slate-900"
                  onClick={() => setSelectedVideo(videoId)}
                >
                  <img
                    src={`https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`}
                    alt={study.school_name}
                    className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity"
                    onError={(e) => {
                      e.target.src = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
                    }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors">
                    <div className="w-14 h-14 rounded-full bg-[#D63031] flex items-center justify-center transform group-hover:scale-110 transition-transform shadow-lg">
                      <Play className="w-6 h-6 text-white ml-1" fill="white" />
                    </div>
                  </div>
                </div>

                {/* Info */}
                <div className="p-4">
                  <h3 className="font-bold text-[#1E3A5F] text-lg" style={{ fontFamily: 'Manrope, sans-serif' }}>
                    {study.school_name}
                  </h3>
                  {study.description && (
                    <p className="text-slate-600 text-sm mt-1 line-clamp-2">{study.description}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* View All Button */}
        {caseStudies.length > 3 && (
          <div className="text-center mt-8">
            <p className="text-slate-500 text-sm">
              Showing {visibleStudies.length} of {caseStudies.length} partner schools
            </p>
          </div>
        )}
      </div>

      {/* Video Modal */}
      {selectedVideo && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setSelectedVideo(null)}
        >
          <div
            className="w-full max-w-4xl aspect-video bg-black rounded-xl overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <iframe
              src={`https://www.youtube.com/embed/${selectedVideo}?autoplay=1`}
              title="School Testimonial"
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
          <button
            onClick={() => setSelectedVideo(null)}
            className="absolute top-4 right-4 text-white hover:text-slate-300 text-xl font-bold"
          >
            ✕
          </button>
        </div>
      )}
    </section>
  );
};

export default SchoolCaseStudies;
