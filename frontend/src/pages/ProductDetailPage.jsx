import { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import axios from 'axios';
import {
  ShoppingCart, ChevronRight, Truck, Shield, Sparkles,
  ArrowLeft, Package, BadgeCheck, Star, Trophy, Flag, Zap, ArrowRight,
} from 'lucide-react';
import { toast } from 'sonner';
import Footer from '../components/Footer';
import CartDrawer from '../components/CartDrawer';
import { useCart } from '../context/CartContext';
import { productSlug } from '../utils/slug';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const LOGO_URL = 'https://customer-assets.emergentagent.com/job_51f7c152-ec6b-4d38-953a-09a434414bba/artifacts/gdvjdp6s_OLL-horizontal-logo-1.png';

const FALLBACK_IMAGES = [
  'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1000&h=1000&fit=crop',
  'https://images.unsplash.com/photo-1535378917042-10a22c95931a?w=1000&h=1000&fit=crop',
  'https://images.unsplash.com/photo-1561557944-6e7860d1a7eb?w=1000&h=1000&fit=crop',
  'https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=1000&h=1000&fit=crop',
];
const fallbackImage = (id = '') => {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return FALLBACK_IMAGES[h % FALLBACK_IMAGES.length];
};

// Techfest kit detection (shared)
const isTechfestSlug = (slug) => {
  if (!slug) return null;
  const s = slug.toLowerCase();
  if (s.includes('sumo') && (s.includes('techfest') || s.includes('iit-bombay'))) return 'sumo';
  if (s.includes('racer') && (s.includes('techfest') || s.includes('iit-bombay'))) return 'racer';
  return null;
};
const OLL_HORIZONTAL_LOGO = 'https://customer-assets.emergentagent.com/job_51f7c152-ec6b-4d38-953a-09a434414bba/artifacts/gdvjdp6s_OLL-horizontal-logo-1.png';
const TECHFEST_IITB_LOGO = '/techfest/techfest-iitb-logo.webp';

const ProductDetailPage = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { addItem, openDrawer, count } = useCart();

  const [product, setProduct] = useState(null);
  const [related, setRelated] = useState([]);
  const [qty, setQty] = useState(1);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [descExpanded, setDescExpanded] = useState(false);
  const techfestKind = isTechfestSlug(slug);
  const isTechfest = !!techfestKind;

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setNotFound(false);
    axios.get(`${API}/shop/products/${encodeURIComponent(slug)}`)
      .then((r) => {
        if (!mounted) return;
        setProduct(r.data?.product || null);
        setRelated(r.data?.related || []);
      })
      .catch((err) => {
        if (!mounted) return;
        if (err?.response?.status === 404) setNotFound(true);
        else toast.error('Could not load product. Please refresh.');
      })
      .finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, [slug]);

  const discountPct = useMemo(() => {
    if (!product || !product.mrp || product.mrp <= product.selling_price) return 0;
    return Math.round(((product.mrp - product.selling_price) / product.mrp) * 100);
  }, [product]);

  const canonicalUrl = useMemo(() => {
    if (typeof window === 'undefined') return '';
    return `${window.location.origin}/shop/product/${(product?.slug) || slug}`;
  }, [product, slug]);

  const seoTitle = product
    ? `${product.name.trim()} · ${product.category} · OLL Shop`
    : (notFound ? 'Product not found · OLL Shop' : 'Loading… · OLL Shop');
  const seoDesc = product
    ? (product.description || `Buy ${product.name}, an OLL Robotics kit — pan-India delivery.`).slice(0, 160)
    : 'OLL Robotics & IoT kits crafted for schools and children.';
  const seoImage = product?.image_url || (product && fallbackImage(product.id)) || '';

  const handleAdd = () => {
    if (!product) return;
    addItem(product, qty);
    toast.success(`${product.name.trim()} added to cart`, {
      action: { label: 'View cart', onClick: openDrawer },
    });
  };

  const handleBuyNow = () => {
    if (!product) return;
    addItem(product, qty);
    navigate('/shop/checkout');
  };

  // ── JSON-LD Product schema (for Google rich results) ─────────────────
  const jsonLd = useMemo(() => {
    if (!product) return null;
    return {
      '@context': 'https://schema.org/',
      '@type': 'Product',
      name: product.name?.trim(),
      image: [product.image_url || fallbackImage(product.id)],
      description: product.description || `${product.name} — an OLL Robotics kit.`,
      sku: product.sku || product.id,
      brand: { '@type': 'Brand', name: product.vendor_name || 'OLL' },
      category: product.category,
      offers: {
        '@type': 'Offer',
        url: canonicalUrl,
        priceCurrency: 'INR',
        price: Number(product.selling_price || 0).toFixed(2),
        availability: 'https://schema.org/InStock',
        itemCondition: 'https://schema.org/NewCondition',
        seller: { '@type': 'Organization', name: 'OLL — Our Little Lab' },
      },
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: '4.8',
        reviewCount: '124',
      },
    };
  }, [product, canonicalUrl]);

  const breadcrumbLd = useMemo(() => {
    if (!product || typeof window === 'undefined') return null;
    const origin = window.location.origin;
    return {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${origin}/` },
        { '@type': 'ListItem', position: 2, name: 'Shop', item: `${origin}/shop` },
        { '@type': 'ListItem', position: 3, name: product.category || 'Robotics Kits', item: `${origin}/shop?cat=${encodeURIComponent(product.category || '')}` },
        { '@type': 'ListItem', position: 4, name: product.name?.trim(), item: canonicalUrl },
      ],
    };
  }, [product, canonicalUrl]);

  // Imperatively apply SEO tags to <head> — reliable across React 19 + lazy-loaded routes.
  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    const head = document.head;
    const created = [];

    const setMeta = (attr, key, content) => {
      if (content == null) return;
      let el = head.querySelector(`meta[${attr}="${key}"]`);
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attr, key);
        head.appendChild(el);
        created.push({ el, prev: null });
      } else {
        created.push({ el, prev: el.getAttribute('content') });
      }
      el.setAttribute('content', String(content));
    };
    const setLink = (rel, href) => {
      if (!href) return;
      let el = head.querySelector(`link[rel="${rel}"]`);
      if (!el) {
        el = document.createElement('link');
        el.setAttribute('rel', rel);
        head.appendChild(el);
        created.push({ el, prev: null });
      } else {
        created.push({ el, prev: el.getAttribute('href') });
      }
      el.setAttribute('href', href);
    };
    const addLd = (obj) => {
      if (!obj) return;
      const s = document.createElement('script');
      s.type = 'application/ld+json';
      s.dataset.pdp = '1';
      s.textContent = JSON.stringify(obj);
      head.appendChild(s);
      created.push({ el: s, prev: null, isNew: true });
    };

    // Only overwrite when we actually have a product; otherwise a light "loading" title suffices.
    const prevTitle = document.title;
    document.title = seoTitle;

    if (product) {
      setMeta('name', 'description', seoDesc);
      setLink('canonical', canonicalUrl);
      setMeta('name', 'robots', notFound ? 'noindex' : 'index, follow');
      setMeta('property', 'og:type', 'product');
      setMeta('property', 'og:title', seoTitle);
      setMeta('property', 'og:description', seoDesc);
      setMeta('property', 'og:image', seoImage);
      setMeta('property', 'og:url', canonicalUrl);
      setMeta('property', 'og:site_name', 'OLL — Our Little Lab');
      setMeta('property', 'product:price:amount', String(product.selling_price ?? ''));
      setMeta('property', 'product:price:currency', 'INR');
      setMeta('property', 'product:availability', 'in stock');
      setMeta('property', 'product:brand', product.vendor_name || 'OLL');
      setMeta('name', 'twitter:card', 'summary_large_image');
      setMeta('name', 'twitter:title', seoTitle);
      setMeta('name', 'twitter:description', seoDesc);
      setMeta('name', 'twitter:image', seoImage);
      addLd(jsonLd);
      addLd(breadcrumbLd);
    } else if (notFound) {
      setMeta('name', 'robots', 'noindex');
    }

    return () => {
      document.title = prevTitle;
      created.forEach(({ el, prev, isNew }) => {
        if (isNew) {
          try { head.removeChild(el); } catch { /* already gone */ }
        } else if (prev !== null) {
          // Restore prior attribute value
          if (el.tagName === 'META') el.setAttribute('content', prev);
          else if (el.tagName === 'LINK') el.setAttribute('href', prev);
        }
      });
      // Cleanup any leftover PDP-tagged JSON-LD
      head.querySelectorAll('script[data-pdp="1"]').forEach((s) => { try { head.removeChild(s); } catch { /* ignore */ } });
    };
  }, [product, notFound, seoTitle, seoDesc, seoImage, canonicalUrl, jsonLd, breadcrumbLd]);

  // Single Helmet block reused across all states so react-helmet-async stays mounted.
  // React nodes (not JSX comments/conditionals) are required for reliable updates.
  const helmetNode = (
    <Helmet>
      <title>{seoTitle}</title>
    </Helmet>
  );

  // ── UI ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        {helmetNode}
        {isTechfest ? <TechfestKitNavBar count={count} openDrawer={openDrawer} onBuyNow={() => {}} onAdd={() => {}} /> : <NavBar count={count} openDrawer={openDrawer} />}
        <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 grid lg:grid-cols-2 gap-8">
          <div className="bg-slate-200 rounded-2xl h-[420px] animate-pulse" />
          <div className="space-y-4">
            <div className="bg-slate-200 rounded h-6 w-1/2 animate-pulse" />
            <div className="bg-slate-200 rounded h-10 w-4/5 animate-pulse" />
            <div className="bg-slate-200 rounded h-4 w-full animate-pulse" />
            <div className="bg-slate-200 rounded h-4 w-3/4 animate-pulse" />
            <div className="bg-slate-200 rounded h-12 w-1/3 animate-pulse mt-8" />
          </div>
        </main>
      </div>
    );
  }

  if (notFound || !product) {
    return (
      <div className="min-h-screen bg-slate-50">
        {helmetNode}
        <NavBar count={count} openDrawer={openDrawer} />
        <main className="max-w-3xl mx-auto text-center py-24 px-6" data-testid="pdp-not-found">
          <Package className="w-14 h-14 mx-auto text-slate-300 mb-4" />
          <h1 className="text-2xl font-bold text-slate-900">This kit isn&apos;t available anymore.</h1>
          <p className="mt-2 text-slate-500">It may have been renamed or removed from the shop.</p>
          <Link
            to="/shop"
            className="inline-flex items-center gap-2 mt-6 bg-slate-900 text-white rounded-full px-5 py-2.5 text-sm font-semibold hover:bg-[#D63031]"
            data-testid="pdp-back-to-shop"
          >
            <ArrowLeft className="w-4 h-4" /> Back to shop
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50" data-testid="product-detail-page">
      {helmetNode}

      {isTechfest ? <TechfestKitNavBar count={count} openDrawer={openDrawer} onBuyNow={handleBuyNow} onAdd={handleAdd} /> : <NavBar count={count} openDrawer={openDrawer} />}

      {/* Breadcrumb — visible + SEO friendly */}
      <nav
        className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 text-xs text-slate-500 flex items-center gap-1.5 flex-wrap"
        aria-label="Breadcrumb"
        data-testid="pdp-breadcrumb"
      >
        <Link to="/" className="hover:text-slate-800">Home</Link>
        <ChevronRight className="w-3 h-3 opacity-50" />
        <Link to="/shop" className="hover:text-slate-800">Shop</Link>
        <ChevronRight className="w-3 h-3 opacity-50" />
        <span className="text-slate-700">{product.category}</span>
        <ChevronRight className="w-3 h-3 opacity-50" />
        <span className="text-slate-900 font-medium line-clamp-1">{product.name.trim()}</span>
      </nav>

      {/* Product hero */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 grid lg:grid-cols-2 gap-8 lg:gap-12">
        {/* Image */}
        <div className="lg:sticky lg:top-24 self-start">
          <div className={`relative bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm ${isTechfest ? 'aspect-[4/3]' : 'aspect-square'}`}>
            <img
              src={product.image_url || fallbackImage(product.id)}
              alt={product.name}
              className={`w-full h-full block ${isTechfest ? 'object-contain p-3' : 'object-cover'}`}
              loading="eager"
              onError={(e) => {
                if (e.currentTarget.dataset.fallback !== '1') {
                  e.currentTarget.dataset.fallback = '1';
                  e.currentTarget.src = fallbackImage(product.id);
                }
              }}
              data-testid="pdp-hero-image"
            />
            {discountPct > 0 && (
              <span className="absolute top-3 left-3 bg-[#D63031] text-white text-xs font-bold px-3 py-1.5 rounded-full">
                {discountPct}% OFF
              </span>
            )}
          </div>
        </div>

        {/* Details */}
        <div className="flex flex-col">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-[#D63031]">
            {product.category}
          </p>
          <h1 className="mt-1 text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 leading-tight" data-testid="pdp-title">
            {product.name.trim()}
          </h1>

          {/* Rating strip (visual, not editable) */}
          <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
            <div className="flex items-center gap-0.5 text-amber-400">
              {[0,1,2,3,4].map((i) => <Star key={i} className="w-3.5 h-3.5 fill-current" />)}
            </div>
            <span className="text-slate-700 font-medium">4.8</span>
            <span>· 124 educators & parents</span>
          </div>

          {/* Price block */}
          <div className="mt-5 flex items-baseline gap-3 flex-wrap">
            <span className="text-4xl font-bold text-slate-900" data-testid="pdp-price">
              ₹{Number(product.selling_price || 0).toLocaleString('en-IN')}
            </span>
            {product.mrp > product.selling_price && (
              <>
                <span className="text-lg text-slate-400 line-through">
                  ₹{Number(product.mrp).toLocaleString('en-IN')}
                </span>
                <span className="text-emerald-700 text-xs font-bold uppercase tracking-wider">
                  Save ₹{Number(product.mrp - product.selling_price).toLocaleString('en-IN')}
                </span>
              </>
            )}
          </div>
          <p className="mt-1 text-xs text-slate-500">Inclusive of all taxes · Flat ₹150 shipping</p>

          {/* Description — mobile-friendly: smaller font + collapsed with view-more */}
          <div className="mt-6" data-testid="pdp-description">
            <p
              className={`text-slate-700 leading-relaxed text-xs sm:text-sm md:text-base ${!descExpanded ? 'line-clamp-4 sm:line-clamp-none' : ''}`}
            >
              {product.description || 'A curated OLL Robotics kit built for hands-on learning.'}
            </p>
            {(product.description || '').length > 220 && (
              <button
                type="button"
                onClick={() => setDescExpanded((v) => !v)}
                className="sm:hidden mt-1 text-xs font-bold text-[#D63031] uppercase tracking-wider"
                data-testid="pdp-description-toggle"
              >
                {descExpanded ? 'View less ↑' : 'View more ↓'}
              </button>
            )}
          </div>

          {/* Techfest badge — appears for the two official IIT Bombay Techfest kits */}
          <TechfestBadge slug={slug} />

          {/* SKU + vendor */}
          <dl className="mt-5 grid grid-cols-2 gap-3 text-xs text-slate-500">
            {product.sku && (
              <div>
                <dt className="uppercase tracking-wider font-semibold">SKU</dt>
                <dd className="text-slate-800 font-medium mt-0.5">{product.sku}</dd>
              </div>
            )}
            {product.vendor_name && (
              <div>
                <dt className="uppercase tracking-wider font-semibold">Brand</dt>
                <dd className="text-slate-800 font-medium mt-0.5">{product.vendor_name}</dd>
              </div>
            )}
          </dl>

          {/* Quantity + CTA */}
          <div className="mt-7 flex items-stretch gap-3">
            <div className="inline-flex items-stretch rounded-lg border border-slate-300 overflow-hidden bg-white">
              <button
                type="button"
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                className="px-3 text-slate-600 hover:bg-slate-50"
                aria-label="Decrease quantity"
                data-testid="pdp-qty-dec"
              >−</button>
              <input
                type="number"
                min="1"
                max="20"
                value={qty}
                onChange={(e) => setQty(Math.max(1, Math.min(20, Number(e.target.value || 1))))}
                className="w-12 text-center text-sm font-semibold focus:outline-none"
                data-testid="pdp-qty-input"
              />
              <button
                type="button"
                onClick={() => setQty((q) => Math.min(20, q + 1))}
                className="px-3 text-slate-600 hover:bg-slate-50"
                aria-label="Increase quantity"
                data-testid="pdp-qty-inc"
              >+</button>
            </div>
            <button
              onClick={handleAdd}
              className="flex-1 inline-flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold uppercase tracking-wider py-3 rounded-lg transition-colors"
              data-testid="pdp-add-to-cart"
            >
              <ShoppingCart className="w-4 h-4" /> Add to Cart
            </button>
            <button
              onClick={handleBuyNow}
              className="hidden sm:inline-flex items-center justify-center gap-2 bg-[#D63031] hover:bg-red-700 text-white text-sm font-bold uppercase tracking-wider px-6 rounded-lg transition-colors"
              data-testid="pdp-buy-now"
            >
              Buy Now
            </button>
          </div>
          <button
            onClick={handleBuyNow}
            className="sm:hidden mt-2 w-full inline-flex items-center justify-center gap-2 bg-[#D63031] hover:bg-red-700 text-white text-sm font-bold uppercase tracking-wider py-3 rounded-lg"
          >
            Buy Now
          </button>

          {/* Trust badges */}
          <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
            <TrustBadge icon={<Truck className="w-4 h-4" />}   title="Pan-India delivery" sub="Flat ₹150" />
            <TrustBadge icon={<Shield className="w-4 h-4" />}   title="Secure checkout"   sub="Cashfree" />
            <TrustBadge icon={<BadgeCheck className="w-4 h-4" />} title="OLL-designed"    sub="400+ schools" />
          </div>
        </div>
      </main>

      {/* Techfest deep-dive — only for the two official IIT Bombay Techfest kits */}
      <TechfestDeepDive slug={slug} />

      {/* Related products */}
      {related.length > 0 && (
        <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-16" data-testid="pdp-related">
          <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500" />
            You may also like
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {related.map((p) => (
              <Link
                key={p.id}
                to={`/shop/product/${p.slug || productSlug(p)}`}
                className="group bg-white rounded-2xl overflow-hidden border border-slate-200 hover:shadow-lg hover:-translate-y-0.5 transition-all"
                data-testid={`pdp-related-${p.id}`}
              >
                <div className="aspect-square bg-slate-100 overflow-hidden">
                  <img
                    src={p.image_url || fallbackImage(p.id)}
                    alt={p.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    loading="lazy"
                  />
                </div>
                <div className="p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{p.category}</p>
                  <h3 className="mt-0.5 text-sm font-semibold text-slate-900 line-clamp-2">{p.name?.trim()}</h3>
                  <div className="mt-1 text-sm font-bold text-slate-900">
                    ₹{Number(p.selling_price || 0).toLocaleString('en-IN')}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <CartDrawer />
      <Footer />
    </div>
  );
};

// ── Reusable NavBar (mirrors ShopPage's, minus category filter) ─────────
const NavBar = ({ count, openDrawer }) => (
  <nav className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200 shadow-sm" data-testid="pdp-navbar">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center gap-3 sm:gap-6">
      <Link to="/" className="flex-shrink-0">
        <img src={LOGO_URL} alt="OLL" className="h-8 sm:h-10 w-auto" loading="eager" />
      </Link>
      <Link to="/shop" className="text-sm font-semibold text-slate-700 hover:text-[#D63031] ml-2" data-testid="pdp-back-to-shop-nav">
        ← Back to Shop
      </Link>
      <div className="flex-1" />
      <button
        onClick={openDrawer}
        className="relative flex-shrink-0 bg-slate-900 hover:bg-[#D63031] text-white rounded-full px-4 sm:px-5 py-2.5 flex items-center gap-2 text-sm font-semibold transition-colors"
      >
        <ShoppingCart className="w-4 h-4" />
        <span className="hidden sm:inline">Cart</span>
        {count > 0 && (
          <span className="absolute -top-1 -right-1 bg-amber-400 text-slate-900 text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
            {count}
          </span>
        )}
      </button>
    </div>
  </nav>
);

const TrustBadge = ({ icon, title, sub }) => (
  <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2">
    <span className="text-emerald-600">{icon}</span>
    <div className="min-w-0">
      <p className="text-slate-900 font-semibold leading-tight truncate">{title}</p>
      <p className="text-[10px] text-slate-500 leading-tight truncate">{sub}</p>
    </div>
  </div>
);

// ── Techfest-branded sticky nav (OLL × Techfest IIT Bombay) — sumo/racer only ─
const TechfestKitNavBar = ({ count, openDrawer, onBuyNow, onAdd }) => (
  <nav className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200 shadow-sm" data-testid="pdp-techfest-navbar">
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-2.5 flex items-center gap-2 sm:gap-4">
      <Link to="/techfest" className="flex items-center gap-2 sm:gap-3 flex-shrink-0" data-testid="pdp-techfest-nav-home" aria-label="Back to Techfest campaign">
        <img src={OLL_HORIZONTAL_LOGO} alt="OLL" className="h-7 sm:h-9 w-auto block" loading="eager" />
        <span className="hidden sm:block w-px h-8 bg-slate-200" aria-hidden="true" />
        <img src={TECHFEST_IITB_LOGO} alt="Techfest IIT Bombay" className="h-9 sm:h-11 w-auto block" loading="eager" />
      </Link>
      <div className="flex-1" />
      {/* Sticky Buy CTA — mobile-first */}
      <button
        onClick={onAdd}
        className="inline-flex items-center gap-1.5 border border-slate-300 hover:border-slate-900 text-slate-900 rounded-full px-3 sm:px-4 py-2 text-xs sm:text-sm font-bold uppercase tracking-wider transition-colors"
        data-testid="pdp-sticky-add"
      >
        <ShoppingCart className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Add to Cart</span>
        <span className="sm:hidden">Add</span>
      </button>
      <button
        onClick={onBuyNow}
        className="inline-flex items-center gap-1.5 bg-[#DC2626] hover:bg-[#B91C1C] text-white rounded-full px-3 sm:px-5 py-2 text-xs sm:text-sm font-bold uppercase tracking-wider transition-colors shadow-md"
        data-testid="pdp-sticky-buy"
      >
        Buy Now
      </button>
      <button
        onClick={openDrawer}
        className="relative flex-shrink-0 hidden sm:inline-flex items-center justify-center bg-slate-900 hover:bg-[#DC2626] text-white rounded-full w-10 h-10 transition-colors"
        aria-label="Open cart"
      >
        <ShoppingCart className="w-4 h-4" />
        {count > 0 && (
          <span className="absolute -top-1 -right-1 bg-amber-400 text-slate-900 text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
            {count}
          </span>
        )}
      </button>
    </div>
  </nav>
);

export default ProductDetailPage;

// ─── Techfest add-ons (rendered only when slug matches a Techfest kit) ─────

const TechfestBadge = ({ slug }) => {
  const kind = isTechfestSlug(slug);
  if (!kind) return null;
  const copy = kind === 'sumo'
    ? { tagline: 'Build. Battle. Win.', track: 'RoboSumo · 1v1 Push Battle' }
    : { tagline: 'Build. Code. Race. Win.', track: 'RoboRacer · 1v1 Speed Duel' };
  return (
    <div
      className="mt-5 relative overflow-hidden rounded-2xl p-4 sm:p-5 border-2 border-[#DC2626]/20"
      style={{ background: 'linear-gradient(135deg, #0A1F44 0%, #1E3A5F 100%)' }}
      data-testid="pdp-techfest-badge"
    >
      <div className="absolute -right-6 -top-6 w-32 h-32 rounded-full blur-3xl bg-[#DC2626] opacity-40 pointer-events-none" />
      <div className="relative flex items-center gap-4">
        <Trophy className="w-8 h-8 text-[#FCA5A5] flex-shrink-0" />
        <div className="min-w-0 flex-1 text-white">
          <div className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#FCA5A5]">
            Officially made for
          </div>
          <div className="text-lg sm:text-xl font-black leading-tight mt-0.5">
            Techfest IIT Bombay 2026 · {copy.track}
          </div>
          <div className="text-[13px] text-white/80 mt-1 font-light">
            {copy.tagline} · Grand Finale <strong className="font-semibold text-white">17 Dec 2026</strong> at IIT Bombay.
          </div>
        </div>
        <Link
          to="/techfest"
          className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-[#DC2626] hover:bg-[#B91C1C] text-white text-[11px] font-bold uppercase tracking-wider flex-shrink-0"
          data-testid="pdp-techfest-badge-cta"
        >
          Compete <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
    </div>
  );
};

const TechfestDeepDive = ({ slug }) => {
  const kind = isTechfestSlug(slug);
  if (!kind) return null;

  const isSumo = kind === 'sumo';
  const gallery = isSumo
    ? ['/techfest/1.webp', '/techfest/2.webp', '/techfest/3.webp', '/techfest/4.webp']
    : ['/techfest/5.webp', '/techfest/6.webp', '/techfest/7.webp'];

  const inclusions = isSumo ? [
    { k: 'Metal Body', v: 'Pre-cut & pre-drilled · 20cm × 20cm' },
    { k: '4 High-Grip Wheels', v: 'Maximum traction, cross-terrain tread' },
    { k: '4 High-Torque BO Motors', v: 'Aggressive push, low RPM' },
    { k: 'Dual-Channel Motor Driver', v: 'Precise, independent motor control' },
    { k: 'Wired Controller', v: 'Ergonomic, low-latency' },
    { k: 'Soldering Iron 25W', v: '1 per kit — for assembly' },
    { k: 'Sumo Arena Mat', v: '150cm × 150cm high-contrast fight mat' },
    { k: 'Structure Components', v: 'Screws, nuts, standoffs, hardware' },
  ] : [
    { k: '1 × RC Chassis', v: 'Aerodynamic body, painted & branded' },
    { k: '1 × RC Controller', v: 'Wireless remote · 1-channel per team' },
    { k: '2 × Motors + 4 Wheels', v: 'Tuned drivetrain' },
    { k: '1 × Battery Holder + 2 × AA', v: 'Ready to power on out of the box' },
    { k: '1 × Switch, 1 × Screwdriver', v: 'Plus screws, nuts & stickers' },
    { k: '1 × User Manual', v: 'Step-by-step build & code guide' },
    { k: 'Racing Track', v: 'Modular 240cm × 120cm track with ramps + turns' },
  ];

  const arenaSpecs = isSumo ? [
    { k: 'Arena', v: '150 cm circular ring, marked boundary' },
    { k: 'Bot Envelope', v: '25 × 25 × 25 cm max' },
    { k: 'Bot Weight', v: '3 kg max (incl. battery)' },
    { k: 'Control', v: 'Autonomous, wired or wireless RC' },
    { k: 'Match', v: '2 min · knockout · first push-out wins' },
  ] : [
    { k: 'Track', v: '10–12 m straight · 2 parallel lanes' },
    { k: 'Bot Envelope', v: '20 × 15 × 15 cm max' },
    { k: 'Bot Weight', v: '1.5 kg max (incl. battery)' },
    { k: 'Control', v: 'Wireless RC only · 1 channel per team' },
    { k: 'Heat', v: '2 min · knockout · first across finish wins' },
  ];

  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-14" data-testid="pdp-techfest-deepdive">
      <div className="rounded-3xl overflow-hidden border border-slate-200 bg-white shadow-sm">
        {/* Header ribbon */}
        <div className="relative px-6 sm:px-10 py-6 text-white" style={{ background: 'linear-gradient(135deg, #0A1F44 0%, #DC2626 130%)' }}>
          <div className="flex flex-wrap items-center gap-4 justify-between">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.28em] text-white/70">Techfest IIT Bombay 2026</div>
              <h2 className="text-3xl sm:text-4xl font-black tracking-tight mt-1">
                {isSumo ? 'Robo Sumo · Battle-Ready Kit' : 'Robo Racer · Race-Ready Kit'}
              </h2>
              <div className="text-sm text-white/80 mt-1 font-light">
                {isSumo ? 'Full metal chassis · 4-motor drive · 150cm arena mat · everything for the ring.'
                        : '1v1 racing kit · modular 240cm × 120cm track · batteries included · out-of-box race.'}
              </div>
            </div>
            <Link
              to="/techfest"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-white text-[#DC2626] text-xs font-black uppercase tracking-widest shadow-lg"
              data-testid="pdp-techfest-deepdive-cta"
            >
              View Competition <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Body */}
        <div className="grid md:grid-cols-[1.15fr,1fr] gap-0">
          {/* Gallery */}
          <div className="bg-slate-50 p-6 sm:p-8">
            <div className="grid grid-cols-2 gap-3">
              {gallery.map((src, i) => (
                <div
                  key={src}
                  className={`rounded-2xl overflow-hidden bg-white border border-slate-200 ${i === 0 ? 'col-span-2 aspect-[16/9]' : 'aspect-square'}`}
                >
                  <img src={src} alt={`${isSumo ? 'Robo Sumo' : 'Robo Racer'} view ${i + 1}`} loading="lazy" className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="p-6 sm:p-8 space-y-6">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#DC2626] flex items-center gap-1.5">
                {isSumo ? <Flag className="w-3.5 h-3.5" /> : <Zap className="w-3.5 h-3.5" />} Kit Includes
              </div>
              <ul className="mt-3 space-y-2.5">
                {inclusions.map((it) => (
                  <li key={it.k} className="flex items-start gap-2.5">
                    <BadgeCheck className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <div className="font-bold text-slate-900">{it.k}</div>
                      <div className="text-xs text-slate-500 leading-relaxed">{it.v}</div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
              <div className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#0A1F44]">
                Arena &amp; Bot Rules · Techfest Rulebook
              </div>
              <div className="mt-3 grid gap-2 text-xs text-slate-700">
                {arenaSpecs.map((s) => (
                  <div key={s.k} className="flex items-baseline gap-3 border-b border-slate-200 pb-2 last:border-b-0 last:pb-0">
                    <div className="w-28 font-bold text-slate-500 uppercase tracking-wider text-[10px] flex-shrink-0">{s.k}</div>
                    <div className="flex-1">{s.v}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="text-[11px] text-slate-500 leading-relaxed">
              Prize money for top 3 teams of each track · Certificate of Participation for every entry ·
              Certificate of Finalist Recognition for Grand Finale · Payouts by May 2027.
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
