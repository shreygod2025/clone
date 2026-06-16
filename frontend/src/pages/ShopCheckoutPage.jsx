import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import axios from 'axios';
import { ArrowLeft, Shield, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useCart } from '../context/CartContext';
import { openCashfreeCheckout } from '../utils/cashfreeCheckout';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const DELIVERY = 150;

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
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (items.length === 0) {
      navigate('/shop');
    }
  }, [items.length, navigate]);

  const total = subtotal > 0 ? subtotal + DELIVERY : 0;

  const setField = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const validate = () => {
    const errs = [];
    if (form.full_name.trim().length < 2) errs.push('Full name is required');
    if (form.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email)) errs.push('Please enter a valid email or leave it blank');
    const phoneDigits = form.phone.replace(/\D/g, '');
    if (phoneDigits.length < 10) errs.push('10-digit phone is required');
    if (form.line1.trim().length < 4) errs.push('Address line 1 is required');
    if (form.city.trim().length < 2) errs.push('City is required');
    if (form.state.trim().length < 2) errs.push('State is required');
    if (!/^\d{6}$/.test(form.pincode)) errs.push('6-digit pincode is required');
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
          <h1 className="text-2xl font-bold text-slate-900">Shipping & Contact</h1>
          <p className="text-sm text-slate-500 -mt-3">
            We'll send the order confirmation, tracking and any updates here.
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
          <Field label="Address Line 1 *" value={form.line1} onChange={setField('line1')} testId="checkout-line1" />
          <Field label="Address Line 2" value={form.line2} onChange={setField('line2')} testId="checkout-line2" />
          <div className="grid sm:grid-cols-3 gap-4">
            <Field label="City *" value={form.city} onChange={setField('city')} testId="checkout-city" />
            <Field label="State *" value={form.state} onChange={setField('state')} testId="checkout-state" />
            <Field label="Pincode *" value={form.pincode} onChange={setField('pincode')} placeholder="6 digits" testId="checkout-pincode" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Delivery notes</label>
            <textarea
              value={form.notes}
              onChange={setField('notes')}
              rows={2}
              className="mt-1 w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-400 text-sm"
              placeholder="Anything we should know? Landmarks, gift wrap, alternate phone…"
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
            <div className="flex justify-between text-white/70">
              <span>Subtotal</span>
              <span>₹{subtotal.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between text-white/70">
              <span>Delivery</span>
              <span>₹{DELIVERY}</span>
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
