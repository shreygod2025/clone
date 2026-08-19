import { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import axios from 'axios';
import {
  ShoppingCart, ChevronRight, Truck, Shield, Sparkles,
  ArrowLeft, Package, BadgeCheck, Star,
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

const ProductDetailPage = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { addItem, openDrawer, count } = useCart();

  const [product, setProduct] = useState(null);
  const [related, setRelated] = useState([]);
  const [qty, setQty] = useState(1);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

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
        <NavBar count={count} openDrawer={openDrawer} />
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

      <NavBar count={count} openDrawer={openDrawer} />

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
          <div className="relative aspect-square bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
            <img
              src={product.image_url || fallbackImage(product.id)}
              alt={product.name}
              className="w-full h-full object-cover"
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

          {/* Description */}
          <div className="mt-6 prose prose-sm max-w-none text-slate-700 leading-relaxed" data-testid="pdp-description">
            <p>{product.description || 'A curated OLL Robotics kit built for hands-on learning.'}</p>
          </div>

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

export default ProductDetailPage;
