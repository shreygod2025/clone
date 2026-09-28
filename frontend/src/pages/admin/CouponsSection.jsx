import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Tag, Plus, Pencil, Trash2, Loader2, Percent, IndianRupee, X, Search, Calendar } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { useAuth } from '../../context/AuthContext';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const emptyForm = {
  code: '',
  discount_type: 'percent',
  discount_value: '',
  product_ids: [],
  expires_at: '',
  is_active: true,
  max_uses: '',
};

export default function CouponsSection({ searchQuery = '' }) {
  const { getAuthHeaders } = useAuth();
  const [coupons, setCoupons] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(null); // coupon being edited (null = create)
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [productFilter, setProductFilter] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const [cRes, pRes] = await Promise.all([
        axios.get(`${API}/admin/shop/coupons`, { headers: getAuthHeaders() }),
        axios.get(`${API}/admin/shop/products`, { headers: getAuthHeaders() }),
      ]);
      setCoupons(cRes.data?.items || []);
      setProducts(pRes.data?.products || pRes.data?.items || []);
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Failed to load coupons');
    } finally { setLoading(false); }
  };

  useEffect(() => { load();  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setShowForm(true);
  };

  const openEdit = (c) => {
    setEditing(c);
    setForm({
      code: c.code || '',
      discount_type: c.discount_type || 'percent',
      discount_value: c.discount_value ?? '',
      product_ids: c.product_ids || [],
      expires_at: c.expires_at ? c.expires_at.slice(0, 10) : '',
      is_active: c.is_active !== false,
      max_uses: c.max_uses ?? '',
    });
    setShowForm(true);
  };

  const close = () => { setShowForm(false); setEditing(null); setForm(emptyForm); };

  const toggleProduct = (pid) => {
    setForm((f) => ({
      ...f,
      product_ids: f.product_ids.includes(pid)
        ? f.product_ids.filter((x) => x !== pid)
        : [...f.product_ids, pid],
    }));
  };

  const save = async () => {
    const code = (form.code || '').trim().toUpperCase();
    if (!code) return toast.error('Coupon code is required');
    const value = parseFloat(form.discount_value);
    if (!value || value <= 0) return toast.error('Enter a discount value');
    if (form.discount_type === 'percent' && value > 100) return toast.error('Percentage cannot exceed 100');

    const payload = {
      code,
      discount_type: form.discount_type,
      discount_value: value,
      product_ids: form.product_ids,
      expires_at: form.expires_at || null,
      is_active: !!form.is_active,
      max_uses: form.max_uses ? parseInt(form.max_uses, 10) : null,
    };
    setSaving(true);
    try {
      if (editing) {
        await axios.patch(`${API}/admin/shop/coupons/${editing.id}`, payload, { headers: getAuthHeaders() });
        toast.success('Coupon updated');
      } else {
        await axios.post(`${API}/admin/shop/coupons`, payload, { headers: getAuthHeaders() });
        toast.success('Coupon created');
      }
      close();
      await load();
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Save failed');
    } finally { setSaving(false); }
  };

  const remove = async (c) => {
    if (!window.confirm(`Delete coupon ${c.code}? This cannot be undone.`)) return;
    try {
      await axios.delete(`${API}/admin/shop/coupons/${c.id}`, { headers: getAuthHeaders() });
      toast.success('Coupon deleted');
      await load();
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Delete failed');
    }
  };

  const productMap = useMemo(() => Object.fromEntries(products.map((p) => [p.id, p])), [products]);

  const filteredCoupons = useMemo(() => {
    if (!searchQuery.trim()) return coupons;
    const n = searchQuery.toLowerCase();
    return coupons.filter((c) => c.code.toLowerCase().includes(n));
  }, [coupons, searchQuery]);

  const filteredProducts = useMemo(() => {
    if (!productFilter.trim()) return products;
    const n = productFilter.toLowerCase();
    return products.filter((p) => p.name?.toLowerCase().includes(n) || p.sku?.toLowerCase().includes(n));
  }, [products, productFilter]);

  const fmtDate = (iso) => {
    if (!iso) return '—';
    try { return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); } catch { return iso; }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Coupon Codes</h2>
          <p className="text-sm text-slate-500 mt-0.5">Manage discount codes applied at checkout on the shop.</p>
        </div>
        <Button onClick={openCreate} className="bg-[#1E3A5F] hover:bg-[#0A1F44]" data-testid="coupon-add-btn">
          <Plus className="w-4 h-4 mr-1" /> New Coupon
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12 text-slate-500"><Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading…</div>
      ) : filteredCoupons.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-10 text-center">
          <Tag className="w-10 h-10 mx-auto text-slate-300" />
          <div className="mt-3 font-bold text-slate-800">No coupons yet</div>
          <p className="text-sm text-slate-500 mt-1">Create your first coupon to give customers a discount at checkout.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm" data-testid="coupons-table">
            <thead className="bg-slate-50 text-[10px] uppercase tracking-widest text-slate-500 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 font-bold">Code</th>
                <th className="text-left px-4 py-3 font-bold">Discount</th>
                <th className="text-left px-4 py-3 font-bold">Products</th>
                <th className="text-left px-4 py-3 font-bold">Expiry</th>
                <th className="text-left px-4 py-3 font-bold">Usage</th>
                <th className="text-left px-4 py-3 font-bold">Status</th>
                <th className="text-right px-4 py-3 font-bold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCoupons.map((c) => (
                <tr key={c.id} className="border-b border-slate-100 hover:bg-slate-50/70" data-testid={`coupon-row-${c.id}`}>
                  <td className="px-4 py-3 font-mono font-bold text-slate-900 tracking-wider">{c.code}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1 text-[13px] font-bold text-emerald-700">
                      {c.discount_type === 'percent' ? <Percent className="w-3 h-3" /> : <IndianRupee className="w-3 h-3" />}
                      {c.discount_type === 'percent' ? `${c.discount_value}%` : `₹${c.discount_value}`}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-700 max-w-[300px]">
                    {(c.product_ids || []).length === 0 ? (
                      <span className="text-[11px] text-slate-500 italic">All products</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {(c.product_ids || []).slice(0, 2).map((pid) => (
                          <span key={pid} className="text-[10px] font-semibold bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded truncate max-w-[160px]">
                            {productMap[pid]?.name || pid.slice(0, 8)}
                          </span>
                        ))}
                        {(c.product_ids || []).length > 2 && (
                          <span className="text-[10px] font-semibold text-slate-500">+{c.product_ids.length - 2} more</span>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-700 text-[13px]">{fmtDate(c.expires_at)}</td>
                  <td className="px-4 py-3 text-slate-700 text-[13px] tabular-nums">
                    {c.usage_count || 0}{c.max_uses ? ` / ${c.max_uses}` : ''}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${c.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>
                      {c.is_active ? 'Active' : 'Disabled'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <button
                      onClick={() => openEdit(c)}
                      className="inline-flex items-center gap-1 text-[12px] font-semibold text-slate-600 hover:text-[#0A1F44] px-2 py-1 rounded hover:bg-slate-100"
                      data-testid={`coupon-edit-${c.id}`}
                    >
                      <Pencil className="w-3.5 h-3.5" /> Edit
                    </button>
                    <button
                      onClick={() => remove(c)}
                      className="inline-flex items-center gap-1 text-[12px] font-semibold text-red-600 hover:text-red-800 px-2 py-1 rounded hover:bg-red-50"
                      data-testid={`coupon-delete-${c.id}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create / Edit modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" data-testid="coupon-form-modal">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 sticky top-0 bg-white z-10">
              <h3 className="text-lg font-bold text-slate-900">{editing ? 'Edit Coupon' : 'New Coupon'}</h3>
              <button onClick={close} className="text-slate-500 hover:text-slate-900 p-1" data-testid="coupon-form-close"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-600">Coupon Code *</label>
                <Input
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                  placeholder="e.g. OLLSCHOOL"
                  className="mt-1 font-mono tracking-wider uppercase"
                  data-testid="coupon-form-code"
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-600">Discount Type *</label>
                  <div className="mt-1 flex gap-2">
                    {[{ v: 'percent', l: 'Percentage', I: Percent }, { v: 'amount', l: 'Flat Amount', I: IndianRupee }].map(({ v, l, I }) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setForm({ ...form, discount_type: v })}
                        className={`flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border-2 text-sm font-semibold transition-colors ${
                          form.discount_type === v ? 'border-[#1E3A5F] bg-[#1E3A5F] text-white' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                        }`}
                        data-testid={`coupon-form-type-${v}`}
                      >
                        <I className="w-3.5 h-3.5" /> {l}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                    Discount Value * {form.discount_type === 'percent' ? '(%)' : '(₹)'}
                  </label>
                  <Input
                    type="number"
                    value={form.discount_value}
                    onChange={(e) => setForm({ ...form, discount_value: e.target.value })}
                    placeholder={form.discount_type === 'percent' ? '10' : '500'}
                    className="mt-1"
                    min="0"
                    max={form.discount_type === 'percent' ? 100 : undefined}
                    data-testid="coupon-form-value"
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-600 flex items-center gap-1"><Calendar className="w-3 h-3" /> Expiry Date</label>
                  <Input
                    type="date"
                    value={form.expires_at}
                    onChange={(e) => setForm({ ...form, expires_at: e.target.value })}
                    className="mt-1"
                    data-testid="coupon-form-expiry"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">Leave blank for no expiry.</p>
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-600">Max Uses</label>
                  <Input
                    type="number"
                    value={form.max_uses}
                    onChange={(e) => setForm({ ...form, max_uses: e.target.value })}
                    placeholder="Unlimited"
                    className="mt-1"
                    min="1"
                    data-testid="coupon-form-max-uses"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">Leave blank for unlimited redemptions.</p>
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!form.is_active}
                  onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                  className="rounded"
                  data-testid="coupon-form-active"
                />
                <span className="text-sm font-semibold text-slate-700">Coupon is active (customers can redeem it)</span>
              </label>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-600">Eligible Products</label>
                <p className="text-[11px] text-slate-500 mt-0.5 mb-2">Leave empty to apply to <strong>all products</strong>. Selected: <strong>{form.product_ids.length}</strong></p>
                <div className="relative mb-2">
                  <Search className="w-4 h-4 text-slate-400 absolute top-1/2 -translate-y-1/2 left-3" />
                  <Input
                    value={productFilter}
                    onChange={(e) => setProductFilter(e.target.value)}
                    placeholder="Search products by name or SKU…"
                    className="pl-9"
                    data-testid="coupon-form-product-search"
                  />
                </div>
                <div className="max-h-64 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100">
                  {filteredProducts.length === 0 ? (
                    <div className="p-4 text-center text-sm text-slate-500">No products match your search.</div>
                  ) : filteredProducts.map((p) => (
                    <label
                      key={p.id}
                      className="flex items-center gap-3 px-3 py-2 hover:bg-slate-50 cursor-pointer"
                      data-testid={`coupon-form-product-${p.id}`}
                    >
                      <input
                        type="checkbox"
                        checked={form.product_ids.includes(p.id)}
                        onChange={() => toggleProduct(p.id)}
                        className="rounded"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-slate-800 truncate">{p.name}</div>
                        <div className="text-[11px] text-slate-500 truncate">{p.sku || '—'} · {p.category || 'Product'}</div>
                      </div>
                      <div className="text-xs font-bold text-slate-700 tabular-nums">₹{Number(p.selling_price || p.mrp || 0).toLocaleString('en-IN')}</div>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-slate-200 bg-slate-50 sticky bottom-0">
              <Button variant="outline" onClick={close} disabled={saving} data-testid="coupon-form-cancel">Cancel</Button>
              <Button onClick={save} disabled={saving} className="bg-[#1E3A5F] hover:bg-[#0A1F44]" data-testid="coupon-form-save">
                {saving ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Saving…</> : (editing ? 'Save Changes' : 'Create Coupon')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
