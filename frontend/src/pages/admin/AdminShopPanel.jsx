import { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import { Loader2, Search, Package, Truck, CheckCircle2, ExternalLink, Edit2, Eye, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { AdminLayout } from './AdminDashboard';
import { useAuth } from '../../context/AuthContext';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const TAB_STYLES = {
  active: 'bg-slate-900 text-white',
  idle: 'bg-slate-100 text-slate-600 hover:bg-slate-200',
};

const AdminShopPanel = () => {
  const [tab, setTab] = useState('orders');
  return (
    <AdminLayout title="Robotics Shop">
      <div className="p-4 sm:p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Robotics Shop</h1>
            <p className="text-sm text-slate-500">Track shop orders, vendor POs and manage product overrides.</p>
          </div>
        </div>
        <div className="flex gap-2 mb-5">
          {[
            { id: 'orders', label: 'Orders' },
            { id: 'pos', label: 'Purchase Orders' },
            { id: 'products', label: 'Products' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2 rounded-full text-sm font-semibold ${
                tab === t.id ? TAB_STYLES.active : TAB_STYLES.idle
              }`}
              data-testid={`shop-admin-tab-${t.id}`}
            >
              {t.label}
            </button>
          ))}
        </div>
        {tab === 'orders' && <OrdersTab />}
        {tab === 'pos' && <PurchaseOrdersTab />}
        {tab === 'products' && <ProductsTab />}
      </div>
    </AdminLayout>
  );
};

const OrdersTab = () => {
  const { getAuthHeaders } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [detail, setDetail] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/admin/shop/orders`, {
        headers: getAuthHeaders(),
        params: { status: statusFilter || undefined, limit: 200 },
      });
      setOrders(res.data?.orders || []);
    } catch (e) {
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
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

  return (
    <div>
      <div className="flex flex-wrap gap-3 mb-4">
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
        </select>
      </div>

      {loading ? (
        <Skeleton />
      ) : filtered.length === 0 ? (
        <Empty msg="No orders yet." />
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm" data-testid="shop-orders-table">
            <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3 text-left">Order</th>
                <th className="px-4 py-3 text-left">Customer</th>
                <th className="px-4 py-3 text-left">Items</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3 text-center">Payment</th>
                <th className="px-4 py-3 text-center">Fulfillment</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((o) => (
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
                    <p className="text-xs text-slate-500">{o.shipping?.email}</p>
                    <p className="text-xs text-slate-500">{o.shipping?.phone}</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-600">
                    {o.items?.reduce((a, it) => a + it.quantity, 0)} unit(s)
                  </td>
                  <td className="px-4 py-3 text-right font-semibold">
                    ₹{o.total?.toLocaleString('en-IN')}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Badge label={o.payment_status} color={o.payment_status === 'paid' ? 'green' : 'amber'} />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Badge label={o.fulfillment_status} color={fulfillmentColor(o.fulfillment_status)} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => setDetail(o)}
                      className="text-slate-600 hover:text-slate-900 inline-flex items-center gap-1 text-xs font-semibold"
                      data-testid={`shop-order-view-${o.id}`}
                    >
                      <Eye className="w-3.5 h-3.5" /> View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {detail && <OrderDetailModal order={detail} onClose={() => setDetail(null)} />}
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
              <p>{order.shipping?.email}</p>
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
                    <p className="text-xs text-slate-500">{it.vendor_name} · Qty {it.quantity}</p>
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

          <div>
            <p className="text-xs uppercase tracking-wider font-bold text-slate-400 mb-2">Vendor POs</p>
            {loading ? (
              <Skeleton small />
            ) : pos.length === 0 ? (
              <p className="text-xs text-slate-500">No POs raised yet (payment may still be pending).</p>
            ) : (
              <div className="space-y-2">
                {pos.map((po) => (
                  <div key={po.id} className="bg-white border border-slate-200 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold">{po.vendor_name}</p>
                        <p className="text-xs text-slate-500">
                          {po.items?.length} items · ₹{po.subtotal?.toLocaleString('en-IN')} · {po.vendor_submission_status}
                        </p>
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
                      ) : null}
                    </div>
                    {po.vendor_error && (
                      <p className="text-xs text-red-500 mt-1">Vendor error: {po.vendor_error}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const PurchaseOrdersTab = () => {
  const { getAuthHeaders } = useAuth();
  const [pos, setPos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/admin/shop/purchase-orders`, {
        headers: getAuthHeaders(),
        params: { status: statusFilter || undefined, limit: 300 },
      });
      setPos(res.data?.purchase_orders || []);
    } catch {
      toast.error('Failed to load POs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const update = async (po, newStatus) => {
    try {
      await axios.patch(
        `${API}/admin/shop/purchase-orders/${po.id}`,
        { fulfillment_status: newStatus },
        { headers: getAuthHeaders() }
      );
      toast.success(`Marked ${newStatus}`);
      load();
    } catch {
      toast.error('Update failed');
    }
  };

  return (
    <div>
      <div className="flex gap-3 mb-4">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2.5 text-sm border border-slate-200 rounded-lg bg-white"
          data-testid="shop-pos-filter"
        >
          <option value="">All</option>
          <option value="pending">Pending</option>
          <option value="dispatched">Dispatched</option>
          <option value="delivered">Delivered</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>
      {loading ? (
        <Skeleton />
      ) : pos.length === 0 ? (
        <Empty msg="No purchase orders yet." />
      ) : (
        <div className="grid md:grid-cols-2 gap-4" data-testid="shop-pos-grid">
          {pos.map((po) => (
            <div key={po.id} className="bg-white rounded-xl border border-slate-200 p-5" data-testid={`shop-po-${po.id}`}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Vendor</p>
                  <p className="font-bold text-slate-900">{po.vendor_name}</p>
                </div>
                <Badge label={po.fulfillment_status} color={fulfillmentColor(po.fulfillment_status)} />
              </div>
              <div className="mt-3 text-xs text-slate-500 space-y-0.5">
                <p>Order: <span className="font-mono">{po.shop_order_id?.slice(0, 8)}</span></p>
                <p>Customer: {po.contact_person} · {po.contact_number}</p>
                <p>Deliver by: {po.delivery_date}</p>
                {po.vendor_po_number && <p>Vendor PO: {po.vendor_po_number}</p>}
                {po.vendor_error && <p className="text-red-500">Error: {po.vendor_error}</p>}
              </div>
              <ul className="mt-3 text-xs text-slate-700 list-disc pl-4 space-y-0.5">
                {po.items?.map((it, i) => (
                  <li key={i}>{it.name} × {it.quantity}</li>
                ))}
              </ul>
              <div className="mt-4 flex flex-wrap gap-2">
                {po.vendor_tracking_url && (
                  <a
                    href={po.vendor_tracking_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-md inline-flex items-center gap-1"
                  >
                    <ExternalLink className="w-3 h-3" /> Vendor portal
                  </a>
                )}
                {po.fulfillment_status !== 'dispatched' && (
                  <button
                    onClick={() => update(po, 'dispatched')}
                    className="text-xs font-semibold bg-blue-50 hover:bg-blue-100 text-blue-700 px-3 py-1.5 rounded-md inline-flex items-center gap-1"
                    data-testid={`shop-po-dispatch-${po.id}`}
                  >
                    <Truck className="w-3 h-3" /> Mark dispatched
                  </button>
                )}
                {po.fulfillment_status !== 'delivered' && (
                  <button
                    onClick={() => update(po, 'delivered')}
                    className="text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-md inline-flex items-center gap-1"
                    data-testid={`shop-po-deliver-${po.id}`}
                  >
                    <CheckCircle2 className="w-3 h-3" /> Mark delivered
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const ProductsTab = () => {
  const { getAuthHeaders } = useAuth();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [search, setSearch] = useState('');
  const [edit, setEdit] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const r = await axios.get(`${API}/admin/shop/products`, { headers: getAuthHeaders() });
      setProducts(r.data?.products || []);
    } catch {
      toast.error('Failed to load products');
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
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return products;
    const s = search.toLowerCase();
    return products.filter(
      (p) =>
        p.name?.toLowerCase().includes(s) ||
        p.sku?.toLowerCase().includes(s) ||
        p.vendor_name?.toLowerCase().includes(s)
    );
  }, [products, search]);

  return (
    <div>
      <div className="flex justify-between items-center mb-4 gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute top-3 left-3 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products…"
            className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-200 rounded-lg bg-white"
            data-testid="shop-products-search"
          />
        </div>
        <div className="flex items-center gap-3">
          <p className="text-xs text-slate-500">{filtered.length} products</p>
          <button
            onClick={sync}
            disabled={syncing || loading}
            className="inline-flex items-center gap-2 bg-slate-900 hover:bg-[#D63031] disabled:bg-slate-400 text-white text-xs font-bold uppercase tracking-wider px-4 py-2.5 rounded-lg transition-colors"
            data-testid="shop-products-sync"
            title="Re-fetch the vendor catalog now (bypasses the 5-min cache)"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing…' : 'Sync from Vendor'}
          </button>
        </div>
      </div>
      {loading ? (
        <Skeleton />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((p) => (
            <div key={p.id} className="bg-white border border-slate-200 rounded-xl p-4 flex gap-3" data-testid={`shop-prod-${p.id}`}>
              <img src={p.image_url} alt="" className="w-16 h-16 rounded-lg object-cover" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-slate-900 truncate">{p.name}</p>
                <p className="text-xs text-slate-500 truncate">{p.vendor_name}</p>
                <p className="text-xs text-slate-700 mt-1">
                  ₹{p.selling_price?.toLocaleString('en-IN')}{' '}
                  {p.mrp > p.selling_price && (
                    <span className="line-through text-slate-400">₹{p.mrp?.toLocaleString('en-IN')}</span>
                  )}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <Badge label={p.show_on_shop ? 'visible' : 'hidden'} color={p.show_on_shop ? 'green' : 'gray'} />
                  <button
                    onClick={() => setEdit(p)}
                    className="text-xs font-semibold text-slate-600 hover:text-slate-900 inline-flex items-center gap-1"
                    data-testid={`shop-prod-edit-${p.id}`}
                  >
                    <Edit2 className="w-3 h-3" /> Edit
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {edit && (
        <ProductEditModal
          product={edit}
          onClose={() => setEdit(null)}
          onSaved={() => {
            setEdit(null);
            load();
          }}
        />
      )}
    </div>
  );
};

const ProductEditModal = ({ product, onClose, onSaved }) => {
  const { getAuthHeaders } = useAuth();
  const [form, setForm] = useState({
    image_url: product.image_url || '',
    mrp: product.mrp || '',
    selling_price: product.selling_price || '',
    description: product.description || '',
    category: product.category || '',
    show_on_shop: !!product.show_on_shop,
  });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await axios.put(
        `${API}/admin/shop/products/${product.id}`,
        {
          image_url: form.image_url || null,
          mrp: form.mrp ? Number(form.mrp) : null,
          selling_price: form.selling_price ? Number(form.selling_price) : null,
          description: form.description || null,
          category: form.category || null,
          show_on_shop: form.show_on_shop,
        },
        { headers: getAuthHeaders() }
      );
      toast.success('Product updated');
      onSaved();
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6" data-testid="shop-prod-edit-modal">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold">Edit Product</h3>
          <button onClick={onClose} className="text-slate-500 text-xl">×</button>
        </div>
        <p className="text-sm font-medium mb-3">{product.name}</p>
        <div className="space-y-3 text-sm">
          <LabeledInput label="Image URL" value={form.image_url} onChange={(v) => setForm({ ...form, image_url: v })} testId="prod-image" />
          <div className="grid grid-cols-2 gap-3">
            <LabeledInput label="MRP" type="number" value={form.mrp} onChange={(v) => setForm({ ...form, mrp: v })} testId="prod-mrp" />
            <LabeledInput label="Selling price" type="number" value={form.selling_price} onChange={(v) => setForm({ ...form, selling_price: v })} testId="prod-selling-price" />
          </div>
          <LabeledInput label="Category" value={form.category} onChange={(v) => setForm({ ...form, category: v })} testId="prod-category" />
          <div>
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
              className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
              data-testid="prod-description"
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.show_on_shop}
              onChange={(e) => setForm({ ...form, show_on_shop: e.target.checked })}
              data-testid="prod-show-on-shop"
            />
            Visible on public shop
          </label>
        </div>
        <div className="mt-5 flex gap-3 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-lg">Cancel</button>
          <button
            onClick={save}
            disabled={saving}
            className="px-4 py-2 text-sm font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg disabled:opacity-60"
            data-testid="prod-save"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
};

const LabeledInput = ({ label, value, onChange, type = 'text', testId }) => (
  <div>
    <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">{label}</label>
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
      data-testid={testId}
    />
  </div>
);

const Badge = ({ label, color }) => {
  const cls = {
    green: 'bg-emerald-100 text-emerald-700',
    amber: 'bg-amber-100 text-amber-700',
    red: 'bg-red-100 text-red-700',
    blue: 'bg-blue-100 text-blue-700',
    gray: 'bg-slate-200 text-slate-600',
  }[color] || 'bg-slate-100 text-slate-700';
  return (
    <span className={`inline-flex items-center text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full ${cls}`}>
      {label || '—'}
    </span>
  );
};

const fulfillmentColor = (status) => {
  switch (status) {
    case 'delivered': return 'green';
    case 'dispatched': return 'blue';
    case 'cancelled': return 'red';
    case 'po_submitted': return 'blue';
    default: return 'amber';
  }
};

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

export default AdminShopPanel;
