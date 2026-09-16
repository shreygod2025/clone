import { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import { Loader2, Search, Package, Truck, CheckCircle2, ExternalLink, Eye, RefreshCw, Copy, ShieldCheck, RotateCcw, X } from 'lucide-react';
import { toast } from 'sonner';
import { AdminLayout } from './AdminDashboard';
import { useAuth } from '../../context/AuthContext';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

/**
 * AdminShopPanel — Robotics Shop orders manager.
 * Standalone page (kept for legacy /admin/shop route) AND embeddable section
 * (via <ShopOrdersSection />) inside the unified /admin/orders page.
 *
 * The Purchase Orders and Products tabs were removed per request — purchase
 * orders auto-flow to the vendor on payment success, and products are now
 * managed end-to-end on the vendor panel itself.
 */
const AdminShopPanel = () => (
  <AdminLayout title="Robotics Shop">
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Robotics Shop Orders</h1>
          <p className="text-sm text-slate-500">Track customer orders and copy vendor tracking links.</p>
        </div>
      </div>
      <OrdersTab />
    </div>
  </AdminLayout>
);

/**
 * ShopOrdersSection — same orders UI but without AdminLayout chrome. Designed
 * to be dropped inside the existing /admin/orders page as a subsection.
 */
export const ShopOrdersSection = () => <OrdersTab embedded />;

const OrdersTab = ({ embedded = false }) => {
  const { getAuthHeaders } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [detail, setDetail] = useState(null);
  const [verifyingId, setVerifyingId] = useState(null);
  const [refundOrder, setRefundOrder] = useState(null);
  // Map of orderId -> array of POs (with tracking_url) so the table row can
  // render an inline tracking link without having to expand the modal.
  const [posByOrderId, setPosByOrderId] = useState({});

  const load = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/admin/shop/orders`, {
        headers: getAuthHeaders(),
        params: { status: statusFilter || undefined, limit: 200 },
      });
      const list = res.data?.orders || [];
      setOrders(list);
      // Bulk-fetch POs for paid orders so the table can show tracking inline.
      const paid = list.filter((o) => o.payment_status === 'paid' && (o.purchase_orders?.length || 0) > 0);
      if (paid.length) {
        const all = await Promise.all(
          paid.map((o) =>
            axios
              .get(`${API}/shop/order/${o.id}`, { headers: getAuthHeaders() })
              .then((r) => [o.id, r.data?.purchase_orders || []])
              .catch(() => [o.id, []])
          )
        );
        setPosByOrderId(Object.fromEntries(all));
      } else {
        setPosByOrderId({});
      }
    } catch (e) {
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const sync = async () => {
    setSyncing(true);
    try {
      const r = await axios.post(`${API}/admin/shop/sync`, {}, { headers: getAuthHeaders() });
      toast.success(`Synced ${r.data.total_products} products · ${r.data.visible_products} visible on shop`);
      await load();
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const filtered = useMemo(() => {
    if (!search.trim()) return orders;
    const s = search.trim().toLowerCase();
    return orders.filter(
      (o) =>
        o.order_no?.toLowerCase().includes(s) ||
        o.shipping?.email?.toLowerCase().includes(s) ||
        o.shipping?.phone?.includes(s) ||
        o.shipping?.full_name?.toLowerCase().includes(s)
    );
  }, [orders, search]);

  // Stats are computed across ALL orders (not filtered) so admins always see
  // the global picture even while drilling into a search.
  const stats = useMemo(() => {
    let totalRevenue = 0;
    let paidCount = 0;
    let pendingRevenue = 0;
    let pendingCount = 0;
    for (const o of orders) {
      const total = Number(o.total) || 0;
      if (o.payment_status === 'paid') {
        totalRevenue += total;
        paidCount += 1;
      } else {
        pendingRevenue += total;
        pendingCount += 1;
      }
    }
    return {
      totalOrders: orders.length,
      paidCount,
      totalRevenue,
      pendingCount,
      pendingRevenue,
    };
  }, [orders]);

  const copyTracking = async (url) => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Tracking link copied');
    } catch {
      toast.error('Could not copy — please copy manually');
    }
  };

  // Re-check payment status with Cashfree for a specific order.
  const verifyWithCashfree = async (order) => {
    setVerifyingId(order.id);
    try {
      const r = await axios.post(
        `${API}/admin/shop/orders/${order.id}/verify`,
        {},
        { headers: getAuthHeaders() }
      );
      const { old_status, new_status, cashfree_status, status_changed, message } = r.data || {};
      if (status_changed) {
        toast.success(`Status updated: ${old_status} → ${new_status}`);
        await load();
      } else if (message) {
        toast.info(message);
      } else {
        toast.info(`Cashfree says: ${cashfree_status || new_status}`);
      }
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Verify failed');
    } finally {
      setVerifyingId(null);
    }
  };

  const onRefundDone = async () => {
    setRefundOrder(null);
    await load();
  };

  return (
    <div className={embedded ? '' : ''}>
      {/* Shop-specific stats — total orders + revenue (paid + pending). */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5" data-testid="shop-stats">
        <StatCard
          label="Total Orders"
          value={stats.totalOrders}
          accent="from-slate-700 to-slate-500"
          testId="shop-stat-total-orders"
        />
        <StatCard
          label="Revenue (Paid)"
          value={`₹${stats.totalRevenue.toLocaleString('en-IN')}`}
          sub={`${stats.paidCount} order${stats.paidCount === 1 ? '' : 's'}`}
          accent="from-emerald-700 to-emerald-500"
          testId="shop-stat-revenue"
        />
        <StatCard
          label="Pending"
          value={stats.pendingCount}
          sub={`₹${stats.pendingRevenue.toLocaleString('en-IN')} unpaid`}
          accent="from-amber-600 to-amber-400"
          testId="shop-stat-pending"
        />
        <StatCard
          label="AOV (Paid)"
          value={`₹${(stats.paidCount ? Math.round(stats.totalRevenue / stats.paidCount) : 0).toLocaleString('en-IN')}`}
          sub="avg order value"
          accent="from-indigo-700 to-indigo-500"
          testId="shop-stat-aov"
        />
      </div>

      <div className="flex flex-wrap gap-3 mb-4 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute top-3 left-3 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by order #, email, phone…"
            className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-200 rounded-lg bg-white"
            data-testid="shop-orders-search"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2.5 text-sm border border-slate-200 rounded-lg bg-white"
          data-testid="shop-orders-filter"
        >
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="paid">Paid</option>
          <option value="refunded">Refunded</option>
        </select>
        <button
          onClick={sync}
          disabled={syncing || loading}
          className="inline-flex items-center gap-2 bg-slate-900 hover:bg-[#D63031] disabled:bg-slate-400 text-white text-xs font-bold uppercase tracking-wider px-4 py-2.5 rounded-lg transition-colors"
          data-testid="shop-orders-sync"
          title="Re-fetch the vendor catalog now (bypasses the 5-min cache)"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
          {syncing ? 'Syncing…' : 'Sync from Vendor'}
        </button>
      </div>

      {loading ? (
        <Skeleton />
      ) : filtered.length === 0 ? (
        <Empty msg="No orders yet." />
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
          <table className="w-full text-sm" data-testid="shop-orders-table">
            <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3 text-left">Order</th>
                <th className="px-4 py-3 text-left">Customer</th>
                <th className="px-4 py-3 text-left">Items</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3 text-center">Payment</th>
                <th className="px-4 py-3 text-left">Tracking</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((o) => {
                const pos = posByOrderId[o.id] || [];
                const trackable = pos.filter((p) => p.vendor_tracking_url);
                return (
                  <tr
                    key={o.id}
                    className="border-t border-slate-100 hover:bg-slate-50/60"
                    data-testid={`shop-order-row-${o.id}`}
                  >
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-900">{o.order_no}</p>
                      <p className="text-xs text-slate-400">{new Date(o.created_at).toLocaleString('en-IN')}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-700">{o.shipping?.full_name}</p>
                      <p className="text-xs text-slate-500">{o.shipping?.email || '—'}</p>
                      <p className="text-xs text-slate-500">{o.shipping?.phone}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">
                      {o.items?.reduce((a, it) => a + it.quantity, 0)} unit(s)
                    </td>
                    <td className="px-4 py-3 text-right font-semibold">
                      ₹{o.total?.toLocaleString('en-IN')}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge
                        label={o.payment_status}
                        color={o.payment_status === 'paid' ? 'green' : o.payment_status === 'refunded' ? 'purple' : 'amber'}
                      />
                    </td>
                    <td className="px-4 py-3">
                      {trackable.length === 0 ? (
                        <span className="text-xs text-slate-400">—</span>
                      ) : (
                        <div className="space-y-1.5" data-testid={`shop-order-tracking-${o.id}`}>
                          {trackable.map((p, i) => (
                            <div key={p.id} className="inline-flex items-center gap-1.5 max-w-full">
                              <a
                                href={p.vendor_tracking_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs font-semibold text-[#D63031] hover:underline inline-flex items-center gap-1 max-w-[180px] truncate"
                                title={p.vendor_tracking_url}
                                data-testid={`shop-order-track-link-${o.id}-${i}`}
                              >
                                <ExternalLink className="w-3 h-3 flex-shrink-0" />
                                {trackable.length > 1 ? `Shipment ${i + 1}` : 'Open link'}
                              </a>
                              <button
                                onClick={() => copyTracking(p.vendor_tracking_url)}
                                className="text-[10px] font-bold uppercase tracking-wider text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded px-2 py-1 inline-flex items-center gap-1"
                                title="Copy tracking link"
                                data-testid={`shop-order-copy-${o.id}-${i}`}
                              >
                                <Copy className="w-3 h-3" />
                                Copy
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex flex-wrap items-center justify-end gap-3">
                        {o.payment_status !== 'paid' && o.payment_status !== 'refunded' && (
                          <button
                            onClick={() => verifyWithCashfree(o)}
                            disabled={verifyingId === o.id}
                            className="text-indigo-600 hover:text-indigo-800 disabled:text-slate-300 inline-flex items-center gap-1 text-xs font-semibold"
                            title="Re-check this order's payment status with Cashfree"
                            data-testid={`shop-order-verify-${o.id}`}
                          >
                            {verifyingId === o.id
                              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              : <ShieldCheck className="w-3.5 h-3.5" />}
                            {verifyingId === o.id ? 'Verifying…' : 'Verify'}
                          </button>
                        )}
                        {o.payment_status === 'paid' && (
                          <button
                            onClick={() => setRefundOrder(o)}
                            className="text-purple-600 hover:text-purple-800 inline-flex items-center gap-1 text-xs font-semibold"
                            title="Initiate a Cashfree refund"
                            data-testid={`shop-order-refund-${o.id}`}
                          >
                            <RotateCcw className="w-3.5 h-3.5" /> Refund
                          </button>
                        )}
                        <button
                          onClick={() => setDetail(o)}
                          className="text-slate-600 hover:text-slate-900 inline-flex items-center gap-1 text-xs font-semibold"
                          data-testid={`shop-order-view-${o.id}`}
                        >
                          <Eye className="w-3.5 h-3.5" /> View
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {detail && <OrderDetailModal order={detail} onClose={() => setDetail(null)} />}
      {refundOrder && (
        <RefundModal
          order={refundOrder}
          onClose={() => setRefundOrder(null)}
          onDone={onRefundDone}
          getAuthHeaders={getAuthHeaders}
        />
      )}
    </div>
  );
};


const RefundModal = ({ order, onClose, onDone, getAuthHeaders }) => {
  const orderTotal = Number(order.total) || 0;
  const [amount, setAmount] = useState(String(orderTotal));
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    const value = parseFloat(amount);
    if (!value || value <= 0) {
      toast.error('Please enter a valid refund amount');
      return;
    }
    if (value > orderTotal) {
      toast.error('Refund amount cannot exceed the order total');
      return;
    }
    setSubmitting(true);
    try {
      const r = await axios.post(
        `${API}/admin/shop/orders/${order.id}/refund`,
        { refund_amount: value, refund_note: note || 'Admin initiated refund' },
        { headers: getAuthHeaders() }
      );
      toast.success(`Refund of ₹${value.toLocaleString('en-IN')} initiated. ID: ${r.data.refund_id}`);
      onDone();
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Refund failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
      data-testid="shop-order-refund-modal"
    >
      <div
        className="bg-white rounded-2xl max-w-md w-full overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b">
          <div>
            <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-purple-600" /> Refund via Cashfree
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Order {order.order_no} · Paid ₹{orderTotal.toLocaleString('en-IN')}
            </p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-900" data-testid="shop-refund-close">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1 block">
              Refund amount (INR)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              max={orderTotal}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm"
              data-testid="shop-refund-amount"
            />
            <p className="text-[11px] text-slate-500 mt-1">Cannot exceed ₹{orderTotal.toLocaleString('en-IN')} (order total).</p>
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1 block">
              Reason / Note
            </label>
            <textarea
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Reason shared internally on the Cashfree refund record"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
              data-testid="shop-refund-note"
            />
          </div>
          <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800">
            This will call Cashfree PGOrderCreateRefund on <strong>{order.cashfree_order_id}</strong>
            {' '}and mark the order as <strong>REFUNDED</strong>. Vendor purchase orders (if any) will NOT be recalled automatically.
          </div>
          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900 font-semibold"
              data-testid="shop-refund-cancel"
            >
              Cancel
            </button>
            <button
              onClick={submit}
              disabled={submitting}
              className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-400 text-white text-xs font-bold uppercase tracking-wider px-4 py-2.5 rounded-lg"
              data-testid="shop-refund-submit"
            >
              {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
              {submitting ? 'Refunding…' : 'Initiate Refund'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};


const OrderDetailModal = ({ order, onClose }) => {
  const { getAuthHeaders } = useAuth();
  const [pos, setPos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios
      .get(`${API}/shop/order/${order.id}`, { headers: getAuthHeaders() })
      .then((r) => setPos(r.data?.purchase_orders || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [order.id, getAuthHeaders]);

  const trackable = pos.filter((p) => p.vendor_tracking_url);

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto" data-testid="shop-order-detail-modal">
        <div className="flex items-center justify-between p-5 border-b">
          <div>
            <h3 className="font-bold text-lg">{order.order_no}</h3>
            <p className="text-xs text-slate-500">{new Date(order.created_at).toLocaleString('en-IN')}</p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-900 text-xl">×</button>
        </div>
        <div className="p-5 space-y-5">
          <div className="grid sm:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs uppercase tracking-wider font-bold text-slate-400 mb-1">Customer</p>
              <p>{order.shipping?.full_name}</p>
              <p>{order.shipping?.email || '—'}</p>
              <p>{order.shipping?.phone}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider font-bold text-slate-400 mb-1">Shipping</p>
              <p>{order.shipping?.line1}</p>
              {order.shipping?.line2 && <p>{order.shipping.line2}</p>}
              <p>{order.shipping?.city}, {order.shipping?.state} - {order.shipping?.pincode}</p>
              {order.shipping?.notes && <p className="text-xs text-slate-500 mt-1">📝 {order.shipping.notes}</p>}
            </div>
          </div>

          <div>
            <p className="text-xs uppercase tracking-wider font-bold text-slate-400 mb-2">Items</p>
            <div className="space-y-2">
              {order.items?.map((it, i) => (
                <div key={i} className="flex gap-3 items-center bg-slate-50 rounded-lg p-3">
                  <img src={it.image_url} alt="" className="w-12 h-12 rounded object-cover" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{it.name}</p>
                    <p className="text-xs text-slate-500">Qty {it.quantity}</p>
                  </div>
                  <span className="text-sm font-semibold">₹{it.line_total?.toLocaleString('en-IN')}</span>
                </div>
              ))}
            </div>
            <div className="text-sm mt-3 space-y-1 text-right">
              <p>Subtotal: <strong>₹{order.subtotal?.toLocaleString('en-IN')}</strong></p>
              <p>Delivery: <strong>₹{order.delivery_charge}</strong></p>
              <p className="text-base">Total Paid: <strong>₹{order.total?.toLocaleString('en-IN')}</strong></p>
            </div>
          </div>

          {order.payment_status === 'refunded' && (
            <div className="rounded-lg bg-purple-50 border border-purple-200 p-3 text-xs text-purple-800">
              <p className="font-bold uppercase tracking-wider mb-1">Refunded</p>
              <p>Refund ID: <strong>{order.refund_id || '—'}</strong></p>
              <p>Amount: <strong>₹{Number(order.refund_amount || 0).toLocaleString('en-IN')}</strong></p>
              {order.refund_note && <p>Note: {order.refund_note}</p>}
              {order.refunded_at && <p>At: {new Date(order.refunded_at).toLocaleString('en-IN')}</p>}
              {order.refunded_by && <p>By: {order.refunded_by}</p>}
            </div>
          )}

          {loading ? null : trackable.length > 0 && (
            <div>
              <p className="text-xs uppercase tracking-wider font-bold text-slate-400 mb-2">Tracking</p>
              <div className="space-y-2">
                {trackable.map((p, i) => (
                  <a key={p.id} href={p.vendor_tracking_url} target="_blank" rel="noopener noreferrer"
                    className="block text-sm text-[#D63031] hover:underline truncate">
                    {trackable.length > 1 ? `Shipment ${i + 1} — ` : ''}{p.vendor_tracking_url}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const Badge = ({ label, color }) => {
  const cls = {
    green: 'bg-emerald-100 text-emerald-700',
    amber: 'bg-amber-100 text-amber-700',
    red: 'bg-red-100 text-red-700',
    blue: 'bg-blue-100 text-blue-700',
    purple: 'bg-purple-100 text-purple-700',
    gray: 'bg-slate-200 text-slate-600',
  }[color] || 'bg-slate-100 text-slate-700';
  return (
    <span className={`inline-flex items-center text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full ${cls}`}>
      {label || '—'}
    </span>
  );
};

const fulfillmentColor = () => 'green';  // legacy — kept to avoid undefined ref

const Skeleton = ({ small }) => (
  <div className={`flex items-center justify-center ${small ? 'h-20' : 'h-64'} text-slate-400`}>
    <Loader2 className="w-6 h-6 animate-spin" />
  </div>
);

const Empty = ({ msg }) => (
  <div className="bg-white rounded-xl border border-dashed border-slate-300 p-10 text-center text-slate-500">
    <Package className="w-10 h-10 mx-auto mb-3 opacity-40" />
    <p className="text-sm">{msg}</p>
  </div>
);

const StatCard = ({ label, value, sub, accent, testId }) => (
  <div
    className={`bg-gradient-to-br ${accent} rounded-xl p-4 text-white shadow-sm`}
    data-testid={testId}
  >
    <p className="text-white/70 text-[10px] font-bold uppercase tracking-widest mb-1.5">{label}</p>
    <p className="text-2xl font-bold leading-none">{value}</p>
    {sub && <p className="text-white/70 text-[11px] mt-1.5">{sub}</p>}
  </div>
);

export default AdminShopPanel;
