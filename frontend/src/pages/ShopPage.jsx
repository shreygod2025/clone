import { useEffect, useState, useMemo } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  ShoppingCart, ShoppingBag, Check, Truck, Shield, Sparkles, Search, X,
  BookOpen, Package, Trophy, Cpu, ArrowRight, ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';
import Footer from '../components/Footer';
import CartDrawer from '../components/CartDrawer';
import { useCart } from '../context/CartContext';
import { productSlug } from '../utils/slug';
import { useSeo } from '../hooks/useSeo';
import {
  SHOP_CATEGORIES,
  CATEGORY_BY_SLUG,
  getShopCategorySlug,
} from '../utils/shopCategories';

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

// Lucide icon lookup — keeps category metadata as plain data (no JSX in util).
const ICON_MAP = { BookOpen, Package, Trophy, Cpu };

const ShopPage = () => {
  // URL param — /shop (undefined) OR /shop/category/:categorySlug
  const { categorySlug } = useParams();
  const navigate = useNavigate();
  const activeCategory = categorySlug ? CATEGORY_BY_SLUG[categorySlug] : null;

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
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
    return () => { mounted = false; };
  }, []);

  // Attach a `shop_category_slug` to every product once, then group.
  const classified = useMemo(
    () => products.map((p) => ({ ...p, shop_category_slug: getShopCategorySlug(p) })),
    [products],
  );

  const countsByCategory = useMemo(() => {
    const map = {};
    SHOP_CATEGORIES.forEach((c) => { map[c.slug] = 0; });
    classified.forEach((p) => { map[p.shop_category_slug] = (map[p.shop_category_slug] || 0) + 1; });
    return map;
  }, [classified]);

  const visible = useMemo(() => {
    let list = classified;
    if (categorySlug) list = list.filter((p) => p.shop_category_slug === categorySlug);
    const s = search.trim().toLowerCase();
    if (s) {
      list = list.filter((p) => {
        const blob = `${p.name} ${p.sku} ${p.description} ${p.vendor_name} ${p.category}`.toLowerCase();
        return blob.includes(s);
      });
    }
    return list;
  }, [classified, categorySlug, search]);

  const handleAdd = (p) => {
    addItem(p, 1);
    toast.success(`${p.name.trim()} added to cart`, {
      action: { label: 'View cart', onClick: openDrawer },
    });
  };

  // SEO — category pages get their own canonical, title, description; the
  // main /shop keeps its /shop canonical even when a search query is typed.
  const seoCanonical = activeCategory
    ? `https://oll.co/shop/category/${activeCategory.slug}`
    : 'https://oll.co/shop';
  const seoTitle = activeCategory
    ? activeCategory.seoTitle
    : 'Robotics Kit Shop — Books, Grade Kits, Competition Kits & Components | OLL';
  const seoDescription = activeCategory
    ? activeCategory.seoDescription
    : 'Shop OLL robotics — NEP-aligned Curriculum Books, Grade-wise Robotic Kits, Competition Kits (RoboSumo, RoboRacer, Drone) and Individual Components. Trusted by 400+ partner schools.';

  const jsonLd = useMemo(() => {
    const base = [
      {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://oll.co/' },
          { '@type': 'ListItem', position: 2, name: 'Shop', item: 'https://oll.co/shop' },
          ...(activeCategory
            ? [{ '@type': 'ListItem', position: 3, name: activeCategory.name, item: seoCanonical }]
            : []),
        ],
      },
    ];
    // When on a category page, emit a CollectionPage schema with an
    // ItemList of the first ~30 products so Google can preview the SERP.
    if (activeCategory && visible.length) {
      base.push({
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: activeCategory.name,
        description: activeCategory.description,
        url: seoCanonical,
        hasPart: visible.slice(0, 30).map((p) => ({
          '@type': 'Product',
          name: p.name.trim(),
          url: `https://oll.co/shop/product/${productSlug(p)}`,
          image: p.image_url,
          offers: {
            '@type': 'Offer',
            price: p.selling_price,
            priceCurrency: 'INR',
            availability: 'https://schema.org/InStock',
          },
        })),
      });
    }
    return base;
  }, [activeCategory, visible, seoCanonical]);

  useSeo({
    title: seoTitle,
    description: seoDescription,
    keywords: activeCategory?.keywords,
    canonical: seoCanonical,
    robots: 'index, follow, max-image-preview:large',
    og: {
      title: seoTitle,
      description: seoDescription,
      url: seoCanonical,
      type: 'website',
      siteName: 'OLL',
    },
    jsonLd,
  });

  return (
    <div className="min-h-screen bg-slate-50 pt-[64px] sm:pt-[72px]">
      {/* Fixed navbar — `position: fixed` instead of `sticky` because index.css
          sets `html, body { overflow-x: hidden }` which creates a scrolling
          context on <body> and silently breaks `position: sticky` on both
          mobile and desktop. The container above is padded by the navbar
          height so the hero isn't hidden underneath. */}
      <nav
        className="fixed top-0 left-0 right-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200 shadow-sm"
        data-testid="shop-navbar"
      >
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-2.5 sm:py-3 flex items-center gap-2 sm:gap-6">
          <Link to="/" className="flex-shrink-0" data-testid="shop-navbar-logo">
            <img
              src={LOGO_URL}
              alt="OLL"
              className="h-7 sm:h-10 w-auto"
              loading="eager"
            />
          </Link>
          <div className="flex-1 max-w-2xl mx-auto relative" data-testid="shop-search-wrap">
            <Search className="w-4 h-4 absolute top-1/2 -translate-y-1/2 left-3 text-slate-400 pointer-events-none" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search kits, books, components…"
              className="w-full pl-10 pr-10 py-2 sm:py-2.5 text-sm bg-slate-100 hover:bg-slate-50 focus:bg-white border border-transparent focus:border-slate-300 rounded-full focus:outline-none transition-colors"
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
            className="relative flex-shrink-0 bg-slate-900 hover:bg-[#D63031] text-white rounded-full px-3 sm:px-5 py-2 sm:py-2.5 flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-semibold transition-colors"
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

      {/* Hero — slightly different copy when inside a category */}
      <header className="bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
          {activeCategory && (
            <nav className="mb-3 flex items-center gap-1 text-xs text-slate-400" data-testid="shop-breadcrumb">
              <Link to="/" className="hover:text-white">Home</Link>
              <ChevronRight className="w-3 h-3" />
              <Link to="/shop" className="hover:text-white">Shop</Link>
              <ChevronRight className="w-3 h-3" />
              <span className="text-white font-bold">{activeCategory.name}</span>
            </nav>
          )}
          <div className="grid lg:grid-cols-[1.3fr,1fr] gap-8 items-center">
            <div>
              <span className="inline-block bg-amber-500/15 text-amber-300 text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full">
                <Sparkles className="inline w-3 h-3 mr-1 -mt-0.5" />
                {activeCategory ? activeCategory.short : 'Robotics Kit Shop'}
              </span>
              <h1
                className="mt-3 font-bold tracking-tight text-4xl sm:text-5xl lg:text-6xl leading-tight"
                data-testid="shop-hero-title"
              >
                {activeCategory ? (
                  <>{activeCategory.name}</>
                ) : (
                  <>
                    Robotics & IoT kits<br />
                    <span className="text-[#D63031]">crafted by OLL educators.</span>
                  </>
                )}
              </h1>
              <p className="mt-4 text-slate-300 text-base max-w-xl">
                {activeCategory ? activeCategory.description :
                  'Take-home kits for grades 1–10, used in 400+ partner schools. Every kit ships with a teacher-led syllabus and online tutorials.'}
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
        </div>
      </header>

      {/* ── Big category grid — four tiles, each links to its own landing ── */}
      <section
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 sm:pt-14"
        aria-label="Shop categories"
        data-testid="shop-category-grid"
      >
        <div className="flex items-end justify-between gap-4 mb-6">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.28em] text-[#D63031]">Shop by category</div>
            <h2 className="mt-1 text-2xl sm:text-3xl font-black text-slate-900">
              {activeCategory ? 'Explore other categories' : 'What are you building today?'}
            </h2>
          </div>
          {activeCategory && (
            <Link
              to="/shop"
              className="text-xs font-bold uppercase tracking-widest text-[#D63031] hover:text-[#B91C1C] inline-flex items-center gap-1"
              data-testid="shop-view-all-cta"
            >
              View all · {products.length} products <ArrowRight className="w-3 h-3" />
            </Link>
          )}
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
          {SHOP_CATEGORIES.map((c) => {
            const Icon = ICON_MAP[c.icon] || Package;
            const isActive = activeCategory?.slug === c.slug;
            return (
              <Link
                key={c.slug}
                to={`/shop/category/${c.slug}`}
                className={`group relative overflow-hidden rounded-2xl sm:rounded-3xl border transition-all p-4 sm:p-6 text-left bg-gradient-to-br ${c.bg} ${
                  isActive
                    ? 'border-slate-900 shadow-lg ring-2 ring-slate-900/10'
                    : 'border-slate-200 hover:border-slate-400 hover:shadow-xl hover:-translate-y-0.5'
                }`}
                data-testid={`shop-cat-card-${c.slug}`}
              >
                <div
                  className="w-11 h-11 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl flex items-center justify-center text-white shadow-md"
                  style={{ background: c.accent }}
                >
                  <Icon className="w-5 h-5 sm:w-7 sm:h-7" strokeWidth={2.2} />
                </div>
                <h3 className="mt-4 text-base sm:text-lg font-black text-slate-900 leading-tight group-hover:text-slate-700">
                  {c.name}
                </h3>
                <p className="mt-1 text-[11px] sm:text-xs text-slate-600 line-clamp-2 leading-snug">
                  {c.tagline}
                </p>
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest" style={{ color: c.accent }}>
                    {countsByCategory[c.slug] || 0} items
                  </span>
                  <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-slate-900 group-hover:translate-x-0.5 transition-all" />
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ── Product grid ─────────────────────────────────────────────── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
        {!loading && !search && !activeCategory && (
          // On the all-products page, group products by category for scannable browsing.
          <CategoryStacks classified={classified} onAdd={handleAdd} />
        )}

        {(loading || search || activeCategory) && (
          <>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 mb-5" data-testid="shop-list-heading">
              {activeCategory
                ? `${activeCategory.name} · ${visible.length} ${visible.length === 1 ? 'product' : 'products'}`
                : search
                ? `Search results · ${visible.length}`
                : 'All products'}
            </h2>
            {loading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="bg-slate-100 rounded-2xl animate-pulse h-72" />
                ))}
              </div>
            ) : visible.length === 0 ? (
              <div className="text-center text-slate-500 py-20" data-testid="shop-empty">
                <ShoppingBag className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>{search ? `No kits match "${search}".` : 'No products available in this category yet.'}</p>
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
              <ProductGrid products={visible} onAdd={handleAdd} />
            )}
          </>
        )}
      </main>

      <CartDrawer />
      <Footer />
    </div>
  );
};

/* ──────────────────────────────────────────────────────────────────────
   CategoryStacks — on /shop (default view, no filter) we render each of
   the four categories as its own labelled band so the user sees ALL
   products divided under the right section without scrolling blindly.
   ────────────────────────────────────────────────────────────────────── */
const CategoryStacks = ({ classified, onAdd }) => (
  <div className="space-y-14 sm:space-y-20">
    {SHOP_CATEGORIES.map((c) => {
      const items = classified.filter((p) => p.shop_category_slug === c.slug);
      if (items.length === 0) return null;
      const Icon = ICON_MAP[c.icon] || Package;
      return (
        <section
          key={c.slug}
          id={`cat-${c.slug}`}
          aria-labelledby={`cat-${c.slug}-h`}
          data-testid={`shop-cat-section-${c.slug}`}
          className="scroll-mt-24"
        >
          <div className="flex items-end justify-between gap-4 mb-5">
            <div className="flex items-center gap-3 min-w-0">
              <div
                className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center text-white flex-shrink-0 shadow-sm"
                style={{ background: c.accent }}
              >
                <Icon className="w-5 h-5 sm:w-6 sm:h-6" strokeWidth={2.2} />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-black uppercase tracking-widest" style={{ color: c.accent }}>
                  {items.length} {items.length === 1 ? 'product' : 'products'}
                </div>
                <h2 id={`cat-${c.slug}-h`} className="text-xl sm:text-3xl font-black text-slate-900 leading-tight truncate">
                  {c.name}
                </h2>
              </div>
            </div>
            <Link
              to={`/shop/category/${c.slug}`}
              className="text-xs font-bold uppercase tracking-widest text-slate-700 hover:text-[#D63031] inline-flex items-center gap-1 flex-shrink-0"
              data-testid={`shop-cat-view-all-${c.slug}`}
            >
              See all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <ProductGrid products={items.slice(0, 8)} onAdd={onAdd} />
          {items.length > 8 && (
            <div className="mt-5 text-right">
              <Link
                to={`/shop/category/${c.slug}`}
                className="inline-flex items-center gap-1.5 text-sm font-black uppercase tracking-widest text-white bg-slate-900 hover:bg-[#D63031] px-4 py-2.5 rounded-full"
                data-testid={`shop-cat-view-more-${c.slug}`}
              >
                View all {items.length} {c.short.toLowerCase()} <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}
        </section>
      );
    })}
  </div>
);

/* ──────────────────────────────────────────────────────────────────────
   ProductGrid — extracted so both the all-products view (CategoryStacks)
   and the filtered-category view share identical product cards.
   ────────────────────────────────────────────────────────────────────── */
const ProductGrid = ({ products, onAdd }) => (
  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6" data-testid="shop-product-grid">
    {products.map((p) => (
      <article
        key={p.id}
        className="group bg-white rounded-2xl overflow-hidden border border-slate-200 hover:shadow-xl hover:-translate-y-0.5 transition-all flex flex-col"
        data-testid={`shop-product-${p.id}`}
      >
        <Link to={`/shop/product/${productSlug(p)}`} className="block" aria-label={`View details for ${p.name}`} data-testid={`shop-product-link-${p.id}`}>
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
        </Link>
        <div className="p-3 sm:p-4 flex-1 flex flex-col">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
            {CATEGORY_BY_SLUG[p.shop_category_slug]?.short || p.category}
          </p>
          <Link to={`/shop/product/${productSlug(p)}`} className="focus:outline-none">
            <h3 className="font-bold text-slate-900 leading-tight line-clamp-2 min-h-[40px] hover:text-[#D63031] transition-colors">
              {p.name.trim()}
            </h3>
          </Link>
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
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Link
              to={`/shop/product/${productSlug(p)}`}
              className="text-center bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 text-xs font-bold uppercase tracking-wider py-2.5 rounded-lg transition-colors"
              data-testid={`shop-view-${p.id}`}
            >
              View
            </Link>
            <button
              onClick={() => onAdd(p)}
              className="bg-slate-900 hover:bg-[#D63031] text-white text-xs font-bold uppercase tracking-wider py-2.5 rounded-lg transition-colors"
              data-testid={`shop-add-${p.id}`}
            >
              Add
            </button>
          </div>
        </div>
      </article>
    ))}
  </div>
);

export default ShopPage;
