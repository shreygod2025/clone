import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import axios from 'axios';
import { ArrowLeft, Shield, Loader2, Truck, Store, MapPin, Tag, X, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { useCart } from '../context/CartContext';
import { openCashfreeCheckout } from '../utils/cashfreeCheckout';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const DELIVERY = 150;

const PICKUP_ADDRESS = '103, 1st Floor, Kshitij Building, Veera Desai Rd, Dattaguru Nagar, Azad Nagar, Andheri West, Mumbai, Maharashtra 400053';

const initialForm = {
  full_name: '',
  email: '',
  phone: '',
  line1: '',
  line2: '',
  city: '',
  state: '',
  pincode: '',
  notes: '',
};

const ShopCheckoutPage = () => {
  const { items, subtotal, clearCart } = useCart();
  const [form, setForm] = useState(initialForm);
  const [fulfillmentType, setFulfillmentType] = useState('delivery'); // 'delivery' | 'pickup'
  const [submitting, setSubmitting] = useState(false);
  const [couponInput, setCouponInput] = useState('');
  const [applyingCoupon, setApplyingCoupon] = useState(false);
  const [coupon, setCoupon] = useState(null); // { code, discount_amount }
  const navigate = useNavigate();

  useEffect(() => {
    if (items.length === 0) {
      navigate('/shop');
    }
  }, [items.length, navigate]);

  // Re-validate coupon whenever cart changes so a swap or quantity update
  // keeps the discount accurate. If it becomes invalid, silently drop it.
  useEffect(() => {
    if (!coupon?.code || items.length === 0) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await axios.post(`${API}/shop/coupons/validate`, {
          code: coupon.code,
          items: items.map((it) => ({ product_id: it.product_id, quantity: it.quantity, unit_price: it.unit_price })),
        });
        if (!cancelled) setCoupon({ code: res.data.code, discount_amount: res.data.discount_amount });
      } catch {
        if (!cancelled) setCoupon(null);
      }
    })();
    return () => { cancelled = true; };
     
  }, [items]);

  const discount = coupon?.discount_amount || 0;
  const discountedSubtotal = Math.max(subtotal - discount, 0);
  const deliveryCharge = subtotal > 0 && fulfillmentType === 'delivery' ? DELIVERY : 0;
  const total = subtotal > 0 ? discountedSubtotal + deliveryCharge : 0;

  const applyCoupon = async () => {
    const code = couponInput.trim();
    if (!code) return;
    setApplyingCoupon(true);
    try {
      const res = await axios.post(`${API}/shop/coupons/validate`, {
        code,
        items: items.map((it) => ({ product_id: it.product_id, quantity: it.quantity, unit_price: it.unit_price })),
      });
      setCoupon({ code: res.data.code, discount_amount: res.data.discount_amount });
      setCouponInput('');
      toast.success(`Coupon ${res.data.code} applied — you saved ₹${res.data.discount_amount.toLocaleString('en-IN')}`);
    } catch (err) {
      const msg = err?.response?.data?.detail || 'Invalid coupon code';
      toast.error(msg);
    } finally { setApplyingCoupon(false); }
  };

  const removeCoupon = () => setCoupon(null);

  const setField = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const validate = () => {
    const errs = [];
    if (form.full_name.trim().length < 2) errs.push('Full name is required');
    if (form.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email)) errs.push('Please enter a valid email or leave it blank');
    const phoneDigits = form.phone.replace(/\D/g, '');
    if (phoneDigits.length < 10) errs.push('10-digit phone is required');
    if (fulfillmentType === 'delivery') {
      if (form.line1.trim().length < 4) errs.push('Address line 1 is required');
      if (form.city.trim().length < 2) errs.push('City is required');
      if (form.state.trim().length < 2) errs.push('State is required');
      if (!/^\d{6}$/.test(form.pincode)) errs.push('6-digit pincode is required');
    }
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (errs.length) {
      toast.error(errs[0]);
      return;
    }
    setSubmitting(true);
    try {
      // 1. Create order
      const createRes = await axios.post(`${API}/shop/orders`, {
        items: items.map((it) => ({ product_id: it.product_id, quantity: it.quantity })),
        fulfillment_type: fulfillmentType,
        coupon_code: coupon?.code || null,
        shipping: {
          ...form,
          phone: form.phone.replace(/\D/g, ''),
        },
      });
      const orderId = createRes.data.order_id;

      // 2. Init Cashfree payment
      const payRes = await axios.post(`${API}/shop/initiate-payment`, {
        order_id: orderId,
        frontend_url: window.location.origin,
      });
      const { payment_session_id, cf_mode } = payRes.data;
      if (!payment_session_id) throw new Error('Missing payment session');

      // Stash order_id locally so success page can verify
      sessionStorage.setItem('oll_shop_pending_order', orderId);

      await openCashfreeCheckout({
        paymentSessionId: payment_session_id,
        mode: cf_mode === 'production' ? 'production' : 'sandbox',
        redirectTarget: '_self',
      });
      // Cashfree will redirect away. Clear cart here so user returns to a clean state.
      clearCart();
    } catch (err) {
      const msg = err?.response?.data?.detail || err?.message || 'Checkout failed';
      toast.error(typeof msg === 'string' ? msg : 'Checkout failed');
      setSubmitting(false);
    }
  };

  if (items.length === 0) return null;

  return (
    <div className="min-h-screen bg-slate-50">
      <Helmet>
        <title>Checkout · OLL Robotics Shop</title>
      </Helmet>

      <header className="bg-slate-900 text-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <Link to="/shop" className="flex items-center gap-2 text-sm font-semibold opacity-80 hover:opacity-100">
            <ArrowLeft className="w-4 h-4" /> Back to Shop
          </Link>
          <span className="text-xs font-semibold flex items-center gap-1.5 opacity-70">
            <Shield className="w-3.5 h-3.5" /> Secure checkout
          </span>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 grid lg:grid-cols-[1.4fr,1fr] gap-8">
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 space-y-5" data-testid="shop-checkout-form">
          {/* ── Fulfillment options ─────────────────────────── */}
          <section data-testid="checkout-fulfillment-section">
            <h1 className="text-2xl font-bold text-slate-900">Fulfillment</h1>
            <p className="text-sm text-slate-500 mt-1">Choose how you&apos;d like to receive your order.</p>
            <div className="mt-4 grid sm:grid-cols-2 gap-3">
              <FulfillmentCard
                testId="fulfillment-option-delivery"
                icon={<Truck className="w-5 h-5" />}
                title="Deliver to My Address"
                subtitle={subtotal > 0 ? `+ ₹${DELIVERY} delivery` : 'Delivery charges apply'}
                selected={fulfillmentType === 'delivery'}
                onClick={() => setFulfillmentType('delivery')}
              />
              <FulfillmentCard
                testId="fulfillment-option-pickup"
                icon={<Store className="w-5 h-5" />}
                title="Pickup from OLL Office"
                subtitle="Free · No delivery charges"
                selected={fulfillmentType === 'pickup'}
                onClick={() => setFulfillmentType('pickup')}
              />
            </div>

            {fulfillmentType === 'pickup' && (
              <div
                className="mt-4 flex gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200"
                data-testid="pickup-address-block"
              >
                <MapPin className="w-5 h-5 text-slate-500 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <div className="font-semibold text-slate-900">Pickup Address</div>
                  <div className="text-slate-600 leading-relaxed mt-0.5">{PICKUP_ADDRESS}</div>
                  <div className="text-xs text-slate-500 mt-1">
                    Bring a copy of your order confirmation. Mon–Sat, 10:00 AM – 6:00 PM.
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* ── Shipping & Contact ─────────────────────────── */}
          <h2 className="text-2xl font-bold text-slate-900 pt-2">
            {fulfillmentType === 'pickup' ? 'Contact Details' : 'Shipping & Contact'}
          </h2>
          <p className="text-sm text-slate-500 -mt-3">
            We&apos;ll send the order confirmation, tracking and any updates here.
          </p>

          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Full Name *" value={form.full_name} onChange={setField('full_name')} testId="checkout-full-name" />
            <Field label="Email (optional)" type="email" value={form.email} onChange={setField('email')} placeholder="For order updates" testId="checkout-email" />
          </div>
          <Field
            label="Phone *"
            value={form.phone}
            onChange={setField('phone')}
            placeholder="10-digit mobile"
            testId="checkout-phone"
          />

          {fulfillmentType === 'delivery' && (
            <div className="space-y-4" data-testid="delivery-address-block">
              <Field label="Address Line 1 *" value={form.line1} onChange={setField('line1')} testId="checkout-line1" />
              <Field label="Address Line 2" value={form.line2} onChange={setField('line2')} testId="checkout-line2" />
              <div className="grid sm:grid-cols-3 gap-4">
                <Field label="City *" value={form.city} onChange={setField('city')} testId="checkout-city" />
                <Field label="State *" value={form.state} onChange={setField('state')} testId="checkout-state" />
                <Field label="Pincode *" value={form.pincode} onChange={setField('pincode')} placeholder="6 digits" testId="checkout-pincode" />
              </div>
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
              {fulfillmentType === 'pickup' ? 'Notes' : 'Delivery notes'}
            </label>
            <textarea
              value={form.notes}
              onChange={setField('notes')}
              rows={2}
              className="mt-1 w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-400 text-sm"
              placeholder={fulfillmentType === 'pickup'
                ? 'Anything we should know? Preferred pickup date, alternate contact…'
                : 'Anything we should know? Landmarks, gift wrap, alternate phone…'}
              data-testid="checkout-notes"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-[#D63031] hover:bg-[#b22729] disabled:bg-slate-400 text-white font-bold py-3.5 rounded-xl text-base flex items-center justify-center gap-2"
            data-testid="checkout-pay-btn"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Redirecting to Cashfree…
              </>
            ) : (
              <>Pay ₹{total.toLocaleString('en-IN')} · Cashfree</>
            )}
          </button>
          <p className="text-[11px] text-slate-500 text-center">
            By placing this order you accept our <Link to="/terms" className="underline">Terms</Link> &
            <Link to="/refund-policy" className="underline ml-1">Refund Policy</Link>.
          </p>
        </form>

        <aside className="bg-slate-900 text-white rounded-2xl p-6 lg:sticky lg:top-4 h-fit">
          <h2 className="text-sm font-bold uppercase tracking-widest text-white/70 mb-4">Order Summary</h2>
          <div className="space-y-3 mb-5 max-h-64 overflow-y-auto pr-1">
            {items.map((it) => (
              <div key={it.product_id} className="flex gap-3 items-start" data-testid={`summary-${it.product_id}`}>
                <img src={it.image_url} alt={it.name} className="w-14 h-14 rounded-lg object-cover" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold leading-tight line-clamp-2">{it.name}</p>
                  <p className="text-xs text-white/50 mt-0.5">Qty {it.quantity}</p>
                </div>
                <span className="text-sm font-bold">
                  ₹{(it.unit_price * it.quantity).toLocaleString('en-IN')}
                </span>
              </div>
            ))}
          </div>
          <div className="border-t border-white/10 pt-4 space-y-2 text-sm">
            {/* Coupon input */}
            <div className="mb-3">
              {coupon ? (
                <div
                  className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-emerald-500/15 border border-emerald-400/40"
                  data-testid="checkout-coupon-applied"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-emerald-300 truncate">Coupon <span className="font-mono">{coupon.code}</span> applied</div>
                      <div className="text-[11px] text-emerald-200/80">You saved ₹{discount.toLocaleString('en-IN')}</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={removeCoupon}
                    className="text-emerald-200/70 hover:text-white p-1 rounded"
                    data-testid="checkout-coupon-remove"
                    aria-label="Remove coupon"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-white/60 flex items-center gap-1 mb-1.5">
                    <Tag className="w-3 h-3" /> Have a coupon?
                  </label>
                  <div className="flex gap-2">
                    <input
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                      placeholder="Enter code"
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); applyCoupon(); } }}
                      className="flex-1 min-w-0 px-3 py-2 text-sm rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:border-white/50 font-mono uppercase tracking-wider"
                      data-testid="checkout-coupon-input"
                    />
                    <button
                      type="button"
                      onClick={applyCoupon}
                      disabled={applyingCoupon || !couponInput.trim()}
                      className="px-4 py-2 text-xs font-bold uppercase tracking-widest rounded-lg bg-white text-slate-900 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
                      data-testid="checkout-coupon-apply"
                    >
                      {applyingCoupon ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Apply'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-between text-white/70">
              <span>Subtotal</span>
              <span data-testid="checkout-subtotal">₹{subtotal.toLocaleString('en-IN')}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-emerald-400 font-semibold" data-testid="checkout-discount-row">
                <span>Discount ({coupon?.code})</span>
                <span>− ₹{discount.toLocaleString('en-IN')}</span>
              </div>
            )}
            <div className="flex justify-between text-white/70">
              <span>
                Delivery
                <span className="ml-1 text-[10px] uppercase tracking-wider text-white/40" data-testid="checkout-fulfillment-label">
                  {fulfillmentType === 'pickup' ? '· Pickup' : '· Home'}
                </span>
              </span>
              <span data-testid="checkout-delivery-charge">
                {deliveryCharge === 0 ? (
                  <span className="text-emerald-400 font-semibold">FREE</span>
                ) : (
                  <>₹{deliveryCharge}</>
                )}
              </span>
            </div>
            <div className="flex justify-between text-lg font-bold pt-2 border-t border-white/10">
              <span>Total</span>
              <span data-testid="checkout-total">₹{total.toLocaleString('en-IN')}</span>
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
};

const FulfillmentCard = ({ testId, icon, title, subtitle, selected, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    data-testid={testId}
    aria-pressed={selected}
    className={`text-left flex items-start gap-3 p-4 rounded-xl border-2 transition-all ${
      selected
        ? 'border-[#D63031] bg-red-50 shadow-sm'
        : 'border-slate-200 bg-white hover:border-slate-300'
    }`}
  >
    <span className={`flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center ${selected ? 'bg-[#D63031] text-white' : 'bg-slate-100 text-slate-600'}`}>
      {icon}
    </span>
    <span className="flex-1">
      <span className="block text-sm font-bold text-slate-900">{title}</span>
      <span className={`block text-xs mt-0.5 ${selected ? 'text-[#D63031] font-semibold' : 'text-slate-500'}`}>{subtitle}</span>
    </span>
    <span
      className={`mt-1 w-4 h-4 rounded-full border-2 flex-shrink-0 ${
        selected ? 'border-[#D63031] bg-[#D63031]' : 'border-slate-300 bg-white'
      }`}
    />
  </button>
);

const Field = ({ label, value, onChange, type = 'text', placeholder, testId }) => (
  <div>
    <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">{label}</label>
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      data-testid={testId}
      className="mt-1 w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-400 text-sm"
    />
  </div>
);

export default ShopCheckoutPage;
