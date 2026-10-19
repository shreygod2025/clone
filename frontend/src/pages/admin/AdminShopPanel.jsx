import { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import { Loader2, Search, Package, Truck, CheckCircle2, ExternalLink, Eye, RefreshCw, Copy, ShieldCheck, RotateCcw, X, Download, ArrowUpDown } from 'lucide-react';
import { toast } from 'sonner';
import { AdminLayout } from './AdminDashboard';
import { useAuth } from '../../context/AuthContext';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const fmtINR = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

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
  const [serverStats, setServerStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [productFilter, setProductFilter] = useState('');
  const [sortKey, setSortKey] = useState('date_desc'); // date_desc | date_asc | product_asc | product_desc
  const [search, setSearch] = useState('');
  const [detail, setDetail] = useState(null);
  const [verifyingId, setVerifyingId] = useState(null);
  const [refundOrder, setRefundOrder] = useState(null);
  const [posByOrderId, setPosByOrderId] = useState({});
  const [updatingDelivery, setUpdatingDelivery] = useState({}); // {orderId: true}

  const updateDeliveryStatus = async (order, newStatus) => {
    if (!newStatus || newStatus === order.fulfillment_status) return;
    setUpdatingDelivery((m) => ({ ...m, [order.id]: true }));
    try {
      const { data } = await axios.patch(
        `${API}/admin/shop/orders/${order.id}`,
        { fulfillment_status: newStatus },
        { headers: getAuthHeaders() },
      );
      // Optimistic replace in local state
      setOrders((prev) => prev.map((o) => (o.id === order.id ? { ...o, ...data.order } : o)));
      toast.success(`Delivery updated to ${newStatus}`);
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Could not update delivery status');
    } finally {
      setUpdatingDelivery((m) => { const n = { ...m }; delete n[order.id]; return n; });
    }
  };

  const load = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/admin/shop/orders`, {
        headers: getAuthHeaders(),
        params: { status: statusFilter || undefined, limit: 2000 },
      });
      const list = res.data?.orders || [];
      setOrders(list);
      axios.get(`${API}/admin/shop/orders/stats`, { headers: getAuthHeaders() })
        .then((r) => setServerStats(r.data)).catch(() => setServerStats(null));
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

  const exportXlsx = async () => {
    try {
      const XLSX = await import('xlsx');
      const rows = filtered.map((o) => {
        const items = o.items || [];
        const productName = items.length === 1
          ? (items[0].product_title || items[0].title || items[0].name || '')
          : items.map((it) => `${it.product_title || it.title || it.name || ''} × ${it.quantity}`).join('\n');
        return {
          'Order #': o.order_no || '',
          'Order Date': o.created_at ? new Date(o.created_at).toLocaleString('en-IN') : '',
          'Customer Name': o.shipping?.full_name || '',
          'Email': o.shipping?.email || '',
          'Phone': o.shipping?.phone || '',
          'City': o.shipping?.city || '',
          'State': o.shipping?.state || '',
          'Pincode': o.shipping?.pincode || '',
          'Product Name': productName,
          'Units': items.reduce((a, it) => a + (it.quantity || 0), 0),
          'Total (INR)': o.total || 0,
          'Payment Status': o.payment_status || '',
          'Tracking Links': (posByOrderId[o.id] || [])
            .map((p) => p.vendor_tracking_url).filter(Boolean).join(' | '),
        };
      });
      const ws = XLSX.utils.json_to_sheet(rows);
      ws['!cols'] = [
        { wch: 22 }, { wch: 22 }, { wch: 22 }, { wch: 26 }, { wch: 14 },
        { wch: 14 }, { wch: 12 }, { wch: 10 }, { wch: 40 }, { wch: 8 },
        { wch: 12 }, { wch: 14 }, { wch: 40 },
      ];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Shop Orders');
      const day = new Date().toISOString().slice(0, 10);
      XLSX.writeFile(wb, `oll-shop-orders-${day}.xlsx`);
      toast.success(`Exported ${rows.length} orders`);
    } catch (e) {
      toast.error('Export failed');
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  // Distinct product names for the product filter dropdown.
  const productOptions = useMemo(() => {
    const s = new Set();
    for (const o of orders) {
      for (const it of (o.items || [])) {
        const n = (it.product_title || it.title || it.name || '').trim();
        if (n) s.add(n);
      }
    }
    return Array.from(s).sort((a, b) => a.localeCompare(b));
  }, [orders]);

  const primaryProduct = (o) => {
    const it = o.items?.[0];
    return (it?.product_title || it?.title || it?.name || '').trim();
  };

  const filtered = useMemo(() => {
    let rows = orders;
    if (search.trim()) {
      const s = search.trim().toLowerCase();
      rows = rows.filter(
        (o) =>
          o.order_no?.toLowerCase().includes(s) ||
          o.shipping?.email?.toLowerCase().includes(s) ||
          o.shipping?.phone?.includes(s) ||
          o.shipping?.full_name?.toLowerCase().includes(s) ||
          (o.items || []).some((it) =>
            (it.product_title || it.title || it.name || '').toLowerCase().includes(s),
          ),
      );
    }
    if (productFilter) {
      rows = rows.filter((o) =>
        (o.items || []).some(
          (it) => (it.product_title || it.title || it.name) === productFilter,
        ),
      );
    }
    // Sort — non-destructive copy
    const sorted = [...rows];
    if (sortKey === 'date_asc') {
      sorted.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    } else if (sortKey === 'product_asc') {
      sorted.sort((a, b) => primaryProduct(a).localeCompare(primaryProduct(b)));
    } else if (sortKey === 'product_desc') {
      sorted.sort((a, b) => primaryProduct(b).localeCompare(primaryProduct(a)));
    } else {
      // date_desc default
      sorted.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }
    return sorted;
  }, [orders, search, productFilter, sortKey]);

  // Stats come from the server aggregate across ALL orders (not just the loaded list).
  const stats = {
    totalOrders: serverStats?.total_orders ?? 0,
    paidCount: serverStats?.paid_count ?? 0,
    totalRevenue: serverStats?.paid_revenue ?? 0,
    paidShipping: serverStats?.paid_shipping ?? 0,
    aov: serverStats?.aov ?? 0,
    pendingCount: serverStats?.pending_count ?? 0,
    pendingRevenue: serverStats?.pending_value ?? 0,
    refundedCount: serverStats?.refunded_count ?? 0,
    refundedValue: serverStats?.refunded_amount ?? 0,
    netRevenue: serverStats?.net_revenue ?? 0,
  };

  return (
    <div className={embedded ? '' : ''}>
      {/* Shop-specific stats — total orders + revenue (paid + pending). */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5" data-testid="shop-stats">
        <StatCard
          label="Total Orders"
          value={stats.totalOrders}
          sub={stats.refundedCount ? `${stats.refundedCount} refunded · ${fmtINR(stats.refundedValue)}` : undefined}
          accent="from-slate-700 to-slate-500"
          testId="shop-stat-total-orders"
        />
        <StatCard
          label="Revenue (Paid)"
          value={fmtINR(stats.totalRevenue)}
          sub={`${stats.paidCount} paid order${stats.paidCount === 1 ? '' : 's'} · incl. ${fmtINR(stats.paidShipping)} shipping${stats.netRevenue !== stats.totalRevenue ? ` · net after refunds ${fmtINR(stats.netRevenue)}` : ''}`}
          accent="from-emerald-700 to-emerald-500"
          testId="shop-stat-revenue"
        />
        <StatCard
          label="Pending"
          value={stats.pendingCount}
          sub={`${fmtINR(stats.pendingRevenue)} not yet paid`}
          accent="from-amber-600 to-amber-400"
          testId="shop-stat-pending"
        />
        <StatCard
          label="AOV (Paid)"
          value={fmtINR(stats.aov)}
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
        <select
          value={productFilter}
          onChange={(e) => setProductFilter(e.target.value)}
          className="px-4 py-2.5 text-sm border border-slate-200 rounded-lg bg-white max-w-[240px]"
          data-testid="shop-orders-product-filter"
        >
          <option value="">All Products</option>
          {productOptions.map((name) => (
            <option key={name} value={name}>{name}</option>
          ))}
        </select>
        <select
          value={sortKey}
          onChange={(e) => setSortKey(e.target.value)}
          className="px-4 py-2.5 text-sm border border-slate-200 rounded-lg bg-white"
          data-testid="shop-orders-sort"
        >
          <option value="date_desc">Order Date · Newest first</option>
          <option value="date_asc">Order Date · Oldest first</option>
          <option value="product_asc">Product · A → Z</option>
          <option value="product_desc">Product · Z → A</option>
        </select>
        <button
          onClick={exportXlsx}
          className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold uppercase tracking-wider px-4 py-2.5 rounded-lg transition-colors"
          data-testid="shop-orders-export"
          title="Download the current (filtered) list of orders as an Excel file"
        >
          <Download className="w-3.5 h-3.5" /> Export XLSX
        </button>
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
                <th className="px-4 py-3 text-center">Delivery</th>
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
                      <p className="font-semibold text-slate-800 line-clamp-2 max-w-[280px]" title={(o.items || []).map((it) => `${it.product_title || it.title || it.name || ''} × ${it.quantity}`).join('\n')}>
                        {(() => {
                          const items = o.items || [];
                          if (items.length === 0) return '—';
                          const primary = items[0].product_title || items[0].title || items[0].name || '';
                          if (items.length === 1) return primary;
                          return `${primary} + ${items.length - 1} more`;
                        })()}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {(o.items || []).reduce((a, it) => a + (it.quantity || 0), 0)} unit(s)
                      </p>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold">
                      {fmtINR(o.total)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge
                        label={o.payment_status}
                        color={o.payment_status === 'paid' ? 'green' : o.payment_status === 'refunded' ? 'purple' : 'amber'}
                      />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <select
                        value={o.fulfillment_status || 'pending'}
                        onChange={(e) => updateDeliveryStatus(o, e.target.value)}
                        disabled={!!updatingDelivery[o.id] || o.payment_status !== 'paid'}
                        className={`text-xs font-semibold rounded-full px-2.5 py-1 border focus:outline-none focus:ring-2 focus:ring-[#D63031] disabled:opacity-50 ${
                          o.fulfillment_status === 'delivered' ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : o.fulfillment_status === 'dispatched' ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                          : o.fulfillment_status === 'cancelled' ? 'bg-slate-100 text-slate-600 border-slate-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}
                        title={o.payment_status !== 'paid' ? 'Payment must be PAID before updating delivery' : 'Update delivery status — reflects in learner\'s My Bookings'}
                        data-testid={`shop-order-delivery-${o.id}`}
                      >
                        <option value="pending">Pending</option>
                        <option value="dispatched">Dispatched</option>
                        <option value="delivered">Delivered</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                      {updatingDelivery[o.id] && (
                        <Loader2 className="w-3.5 h-3.5 animate-spin inline ml-1.5 text-slate-400" />
                      )}
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
                  <span className="text-sm font-semibold">{fmtINR(it.line_total)}</span>
                </div>
              ))}
            </div>
            <div className="text-sm mt-3 space-y-1 text-right">
              <p>Subtotal: <strong>{fmtINR(order.subtotal)}</strong></p>
              <p>Delivery: <strong>₹{order.delivery_charge}</strong></p>
              <p className="text-base">Total Paid: <strong>{fmtINR(order.total)}</strong></p>
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
