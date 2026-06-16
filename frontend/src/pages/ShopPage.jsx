import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import axios from 'axios';
import { ShoppingCart, ShoppingBag, Check, Truck, Shield, Sparkles, Search, X } from 'lucide-react';
import { toast } from 'sonner';
import Footer from '../components/Footer';
import CartDrawer from '../components/CartDrawer';
import { useCart } from '../context/CartContext';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const LOGO_URL = 'https://customer-assets.emergentagent.com/job_51f7c152-ec6b-4d38-953a-09a434414bba/artifacts/gdvjdp6s_OLL-horizontal-logo-1.png';
const FALLBACK_IMAGES = [
  'https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&h=600&fit=crop',
  'https://images.unsplash.com/photo-1535378917042-10a22c95931a?w=600&h=600&fit=crop',
  'https://images.unsplash.com/photo-1561557944-6e7860d1a7eb?w=600&h=600&fit=crop',
  'https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=600&h=600&fit=crop',
];
const fallbackImage = (id = '') => {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return FALLBACK_IMAGES[h % FALLBACK_IMAGES.length];
};

const ShopPage = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState('');
  const { addItem, openDrawer, count } = useCart();

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    axios
      .get(`${API}/shop/products`)
      .then((r) => {
        if (!mounted) return;
        setProducts(r.data?.products || []);
      })
      .catch(() => toast.error('Could not load products. Please refresh.'))
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, []);

  const categories = useMemo(() => {
    const set = new Set();
    products.forEach((p) => p.category && set.add(p.category));
    return ['all', ...Array.from(set)];
  }, [products]);

  const visible = useMemo(() => {
    let list = products;
    if (category !== 'all') list = list.filter((p) => p.category === category);
    const s = search.trim().toLowerCase();
    if (s) {
      list = list.filter((p) => {
        const blob = `${p.name} ${p.sku} ${p.description} ${p.vendor_name} ${p.category}`.toLowerCase();
        return blob.includes(s);
      });
    }
    return list;
  }, [products, category, search]);

  const handleAdd = (p) => {
    addItem(p, 1);
    toast.success(`${p.name.trim()} added to cart`, {
      action: { label: 'View cart', onClick: openDrawer },
    });
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Helmet>
        <title>Robotics Kit Shop · OLL</title>
        <meta
          name="description"
          content="Buy OLL Robotics & IoT kits for grades 1-10. Pan-India delivery, secure Cashfree checkout, designed by OLL educators."
        />
      </Helmet>

      {/* Sticky white navbar with logo + search + cart */}
      <nav
        className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200 shadow-sm"
        data-testid="shop-navbar"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center gap-3 sm:gap-6">
          <Link to="/" className="flex-shrink-0" data-testid="shop-navbar-logo">
            <img
              src={LOGO_URL}
              alt="OLL"
              className="h-8 sm:h-10 w-auto"
              loading="eager"
            />
          </Link>
          <div className="flex-1 max-w-2xl mx-auto relative" data-testid="shop-search-wrap">
            <Search className="w-4 h-4 absolute top-1/2 -translate-y-1/2 left-3 text-slate-400 pointer-events-none" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search robotics kits, vendors, SKUs…"
              className="w-full pl-10 pr-10 py-2.5 text-sm bg-slate-100 hover:bg-slate-50 focus:bg-white border border-transparent focus:border-slate-300 rounded-full focus:outline-none transition-colors"
              data-testid="shop-search-input"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute top-1/2 -translate-y-1/2 right-3 text-slate-400 hover:text-slate-600"
                aria-label="Clear search"
                data-testid="shop-search-clear"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <button
            onClick={openDrawer}
            className="relative flex-shrink-0 bg-slate-900 hover:bg-[#D63031] text-white rounded-full px-4 sm:px-5 py-2.5 flex items-center gap-2 text-sm font-semibold transition-colors"
            data-testid="shop-cart-button"
          >
            <ShoppingCart className="w-4 h-4" />
            <span className="hidden sm:inline">Cart</span>
            {count > 0 && (
              <span
                className="absolute -top-1 -right-1 bg-amber-400 text-slate-900 text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center"
                data-testid="shop-cart-count"
              >
                {count}
              </span>
            )}
          </button>
        </div>
      </nav>

      {/* Hero */}
      <header className="bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 grid lg:grid-cols-[1.3fr,1fr] gap-8 items-center">
          <div>
            <span className="inline-block bg-amber-500/15 text-amber-300 text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full">
              <Sparkles className="inline w-3 h-3 mr-1 -mt-0.5" /> Robotics Kit Shop
            </span>
            <h1
              className="mt-3 font-bold tracking-tight text-4xl sm:text-5xl lg:text-6xl leading-tight"
              data-testid="shop-hero-title"
            >
              Robotics & IoT kits<br />
              <span className="text-[#D63031]">crafted by OLL educators.</span>
            </h1>
            <p className="mt-4 text-slate-300 text-base max-w-xl">
              Take-home kits for grades 1–10, used in 400+ partner schools. Every kit ships with a teacher-led
              syllabus and online tutorials.
            </p>
            <div className="mt-5 flex flex-wrap gap-4 text-xs text-slate-400">
              <span className="flex items-center gap-1.5"><Truck className="w-3.5 h-3.5 text-emerald-400" /> Flat ₹150 delivery</span>
              <span className="flex items-center gap-1.5"><Shield className="w-3.5 h-3.5 text-emerald-400" /> Secure Cashfree checkout</span>
              <span className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-400" /> Pan-India shipping</span>
            </div>
          </div>
          <div className="hidden lg:block">
            <img
              src="https://images.unsplash.com/photo-1535378917042-10a22c95931a?w=900&h=700&fit=crop"
              alt="Robotics kit hero"
              className="rounded-2xl w-full h-72 object-cover border border-white/10"
              loading="lazy"
            />
          </div>
        </div>
      </header>

      {/* Category filter */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex gap-2 overflow-x-auto">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              data-testid={`shop-cat-${c.replace(/\s+/g, '-').toLowerCase()}`}
              className={`text-xs font-semibold uppercase tracking-wider rounded-full px-4 py-2 whitespace-nowrap transition-colors ${
                category === c
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {c === 'all' ? `All (${products.length})` : c}
            </button>
          ))}
        </div>
      </div>

      {/* Product grid */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-slate-100 rounded-2xl animate-pulse h-72" />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <div className="text-center text-slate-500 py-20" data-testid="shop-empty">
            <ShoppingBag className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>{search ? `No kits match "${search}".` : 'No kits available in this category yet.'}</p>
            {search && (
              <button
                onClick={() => setSearch('')}
                className="mt-3 text-[#D63031] text-sm font-semibold"
                data-testid="shop-empty-clear"
              >
                Clear search
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6" data-testid="shop-product-grid">
            {visible.map((p) => (
              <article
                key={p.id}
                className="group bg-white rounded-2xl overflow-hidden border border-slate-200 hover:shadow-xl hover:-translate-y-0.5 transition-all flex flex-col"
                data-testid={`shop-product-${p.id}`}
              >
                <div className="relative aspect-square bg-slate-100 overflow-hidden">
                  <img
                    src={p.image_url}
                    alt={p.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                    onError={(e) => {
                      if (e.currentTarget.dataset.fallback !== '1') {
                        e.currentTarget.dataset.fallback = '1';
                        e.currentTarget.src = fallbackImage(p.id);
                      }
                    }}
                  />
                  {p.mrp > p.selling_price && (
                    <span className="absolute top-2 left-2 bg-[#D63031] text-white text-[10px] font-bold px-2 py-1 rounded-full">
                      {Math.round(((p.mrp - p.selling_price) / p.mrp) * 100)}% OFF
                    </span>
                  )}
                </div>
                <div className="p-3 sm:p-4 flex-1 flex flex-col">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    {p.category}
                  </p>
                  <h3 className="font-bold text-slate-900 leading-tight line-clamp-2 min-h-[40px]">
                    {p.name.trim()}
                  </h3>
                  <p className="mt-1 text-xs text-slate-500 line-clamp-2">{p.description}</p>
                  <div className="mt-3 flex items-baseline gap-2">
                    <span className="text-lg font-bold text-slate-900">
                      ₹{p.selling_price.toLocaleString('en-IN')}
                    </span>
                    {p.mrp > p.selling_price && (
                      <span className="text-xs text-slate-400 line-through">
                        ₹{p.mrp.toLocaleString('en-IN')}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => handleAdd(p)}
                    className="mt-3 w-full bg-slate-900 hover:bg-[#D63031] text-white text-xs font-bold uppercase tracking-wider py-2.5 rounded-lg transition-colors"
                    data-testid={`shop-add-${p.id}`}
                  >
                    Add to Cart
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>

      <CartDrawer />
      <Footer />
    </div>
  );
};

export default ShopPage;
