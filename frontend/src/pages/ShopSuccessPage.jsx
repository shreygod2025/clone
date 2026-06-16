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
                Order <span className="font-semibold text-slate-700">{order.order_no}</span> — we've sent a confirmation to <strong>{order.shipping.email}</strong>.
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

            {pos.length > 0 && (
              <div className="mt-6">
                <h2 className="text-sm font-bold uppercase tracking-widest text-slate-500 mb-3 flex items-center gap-2">
                  <Truck className="w-4 h-4 text-emerald-600" /> Vendors handling your order
                </h2>
                <div className="space-y-2">
                  {pos.map((po) => (
                    <div
                      key={po.id}
                      className="flex items-center justify-between bg-white border border-slate-200 rounded-xl p-3"
                      data-testid={`success-po-${po.id}`}
                    >
                      <div>
                        <p className="text-sm font-bold text-slate-900">{po.vendor_name}</p>
                        <p className="text-xs text-slate-500">{po.items.length} item(s) · expected by {po.delivery_date}</p>
                      </div>
                      {po.vendor_tracking_url ? (
                        <a
                          href={po.vendor_tracking_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-semibold text-[#D63031] flex items-center gap-1 hover:underline"
                        >
                          Track <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        <span className="text-xs text-slate-400">Pending</span>
                      )}
                    </div>
                  ))}
                </div>
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
