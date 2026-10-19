import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { ArrowRight, Trophy } from 'lucide-react';
import { PublicStoryCard } from '../pages/SuccessStoriesPage';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const BlogSuccessStories = () => {
  const [stories, setStories] = useState([]);
  useEffect(() => {
    axios.get(`${API}/public/success-stories`)
      .then((r) => {
        const list = [...(r.data || [])].sort((a, b) => String(b.published_at || b.created_at || '').localeCompare(String(a.published_at || a.created_at || '')));
        setStories(list.slice(0, 3));
      })
      .catch(() => setStories([]));
  }, []);
  if (!stories.length) return null;
  return (
    <section className="max-w-6xl mx-auto px-5 sm:px-8 pb-16" data-testid="blogs-success-stories">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6 border-t border-slate-200 pt-12">
        <div>
          <div className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-[#D63031]"><Trophy className="w-3.5 h-3.5" /> Success Stories</div>
          <h2 className="text-2xl md:text-3xl font-black text-slate-900 mt-1">Real OLL learners, real outcomes</h2>
        </div>
        <Link to="/success-stories" className="inline-flex items-center gap-1.5 text-sm font-bold text-white bg-[#0A1F44] hover:bg-[#D63031] px-5 py-2.5 rounded-full transition-colors" data-testid="blogs-success-stories-view-all">
          View all success stories <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {stories.map((s) => <PublicStoryCard key={s.id} s={s} />)}
      </div>
    </section>
  );
};
