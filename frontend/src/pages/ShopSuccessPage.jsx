import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import axios from 'axios';
import { CheckCircle2, Loader2, Truck, ExternalLink, ArrowRight, AlertTriangle } from 'lucide-react';
import { useCart } from '../context/CartContext';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const ShopSuccessPage = () => {
  const [params] = useSearchParams();
  const orderId = params.get('order_id') || sessionStorage.getItem('oll_shop_pending_order');
  const [status, setStatus] = useState('checking');
  const [order, setOrder] = useState(null);
  const [pos, setPos] = useState([]);
  const { clearCart } = useCart();

  useEffect(() => {
    if (!orderId) {
      setStatus('not_found');
      return;
    }
    let cancelled = false;
    let attempts = 0;
    const poll = async () => {
      attempts += 1;
      try {
        const res = await axios.get(`${API}/shop/verify/${orderId}`);
        const o = res.data?.order;
        if (cancelled) return;
        if (res.data?.status === 'PAID') {
          setOrder(o);
          setStatus('paid');
          clearCart();
          sessionStorage.removeItem('oll_shop_pending_order');
          // Fetch POs
          try {
            const det = await axios.get(`${API}/shop/order/${orderId}`);
            setPos(det.data?.purchase_orders || []);
          } catch {
            /* ignore */
          }
          return;
        }
        setOrder(o);
        if (attempts < 10) {
          setTimeout(poll, 2500);
        } else {
          setStatus('pending');
        }
      } catch (err) {
        if (attempts < 5) setTimeout(poll, 3000);
        else setStatus('error');
      }
    };
    poll();
    return () => {
      cancelled = true;
    };
  }, [orderId, clearCart]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-emerald-50/40 flex items-center justify-center px-4 py-8">
      <Helmet>
        <title>Order Status · OLL Robotics Shop</title>
      </Helmet>
      <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl border border-slate-200 p-8 sm:p-10" data-testid="shop-success-card">
        {status === 'checking' && (
          <div className="text-center">
            <Loader2 className="w-12 h-12 mx-auto text-[#D63031] animate-spin mb-4" />
            <h1 className="text-xl font-bold text-slate-900">Confirming your payment…</h1>
            <p className="text-sm text-slate-500 mt-2">
              This usually takes a few seconds. Please don't refresh.
            </p>
          </div>
        )}
        {status === 'paid' && order && (
          <div>
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-9 h-9 text-emerald-600" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900">Order placed!</h1>
              <p className="text-sm text-slate-500 mt-1">
                Order <span className="font-semibold text-slate-700">{order.order_no}</span>{order.shipping?.email ? <> — we've sent a confirmation to <strong>{order.shipping.email}</strong>.</> : <> — we'll reach you on <strong>{order.shipping?.phone}</strong>.</>}
              </p>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-4 text-sm bg-slate-50 rounded-xl p-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Total</p>
                <p className="font-bold text-slate-900">₹{order.total.toLocaleString('en-IN')}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Shipping to</p>
                <p className="font-semibold text-slate-900">
                  {order.shipping.city}, {order.shipping.state} - {order.shipping.pincode}
                </p>
              </div>
            </div>

            {pos.length > 0 && pos.some((po) => po.vendor_tracking_url) && (
              <div className="mt-6">
                {/* Primary tracking CTA — single tracking link */}
                {pos.filter((po) => po.vendor_tracking_url).length === 1 ? (
                  (() => {
                    const po = pos.find((p) => p.vendor_tracking_url);
                    return (
                      <a
                        href={po.vendor_tracking_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        data-testid="shop-success-track-btn"
                        className="block bg-gradient-to-r from-[#D63031] to-[#b22729] hover:brightness-110 text-white font-bold rounded-2xl px-5 py-4 shadow-lg shadow-red-200/60 transition-all"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-left">
                            <p className="text-[10px] uppercase tracking-widest text-white/80 font-bold">Track Your Order</p>
                            <p className="text-base font-bold mt-0.5">Expected delivery by {po.delivery_date}</p>
                            <p className="text-[11px] text-white/80 mt-0.5">{po.items.length} item(s) on the way</p>
                          </div>
                          <Truck className="w-8 h-8 text-white/90 flex-shrink-0" />
                        </div>
                      </a>
                    );
                  })()
                ) : (
                  <div className="space-y-2">
                    <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2 flex items-center gap-2">
                      <Truck className="w-4 h-4 text-emerald-600" /> Track Your Order
                    </p>
                    {pos.filter((p) => p.vendor_tracking_url).map((po, i) => (
                      <a
                        key={po.id}
                        href={po.vendor_tracking_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        data-testid={`shop-success-track-btn-${i}`}
                        className="flex items-center justify-between bg-gradient-to-r from-[#D63031] to-[#b22729] hover:brightness-110 text-white font-bold rounded-xl px-4 py-3 shadow-md transition-all"
                      >
                        <div className="text-left">
                          <p className="text-sm font-bold">Shipment {i + 1} · {po.items.length} item(s)</p>
                          <p className="text-[11px] text-white/80">Expected by {po.delivery_date}</p>
                        </div>
                        <ExternalLink className="w-5 h-5 text-white/90" />
                      </a>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <Link
                to="/shop"
                className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-xl text-center text-sm"
              >
                Continue Shopping
              </Link>
              <Link
                to="/"
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-900 font-bold py-3 rounded-xl text-center text-sm flex items-center justify-center gap-1"
              >
                Back to OLL <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        )}
        {(status === 'pending' || status === 'error') && (
          <div className="text-center">
            <AlertTriangle className="w-12 h-12 mx-auto text-amber-500 mb-4" />
            <h1 className="text-xl font-bold text-slate-900">
              {status === 'pending' ? 'Payment still processing' : 'Could not confirm payment'}
            </h1>
            <p className="text-sm text-slate-500 mt-2">
              If money was debited, it will reflect within a few minutes and you'll receive an email.
              Reach out to <a className="underline" href="mailto:info@oll.co">info@oll.co</a> for support.
            </p>
            <Link
              to="/shop"
              className="mt-6 inline-block bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 px-6 rounded-xl text-sm"
            >
              Back to Shop
            </Link>
          </div>
        )}
        {status === 'not_found' && (
          <div className="text-center">
            <p className="text-slate-600">We couldn't find a recent order. Head back to the shop:</p>
            <Link
              to="/shop"
              className="mt-4 inline-block bg-slate-900 text-white font-bold py-3 px-6 rounded-xl text-sm"
            >
              Browse Shop
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default ShopSuccessPage;
