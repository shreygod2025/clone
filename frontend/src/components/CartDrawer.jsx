import { Link, useNavigate } from 'react-router-dom';
import { X, Plus, Minus, Trash2, ShoppingBag } from 'lucide-react';
import { useCart } from '../context/CartContext';

const DELIVERY = 150;

const CartDrawer = () => {
  const { items, drawerOpen, closeDrawer, updateQty, removeItem, subtotal, count } = useCart();
  const navigate = useNavigate();

  if (!drawerOpen) return null;

  const total = subtotal > 0 ? subtotal + DELIVERY : 0;

  const handleCheckout = () => {
    closeDrawer();
    navigate('/shop/checkout');
  };

  return (
    <div className="fixed inset-0 z-[100]" data-testid="cart-drawer">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={closeDrawer}
        data-testid="cart-drawer-overlay"
      />
      <aside className="absolute right-0 top-0 h-full w-full sm:w-[420px] bg-slate-900 text-white shadow-2xl flex flex-col">
        <header className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <ShoppingBag className="w-5 h-5 text-[#D63031]" />
            <h2 className="font-bold tracking-wide">Your Cart · {count}</h2>
          </div>
          <button
            onClick={closeDrawer}
            className="w-9 h-9 rounded-full hover:bg-white/10 flex items-center justify-center"
            aria-label="Close cart"
            data-testid="cart-drawer-close"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {items.length === 0 && (
            <div className="text-center text-slate-400 py-12">
              <ShoppingBag className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm">Your cart is empty.</p>
              <Link
                to="/shop"
                onClick={closeDrawer}
                className="mt-3 inline-block text-[#D63031] text-sm font-semibold"
              >
                Browse robotics kits →
              </Link>
            </div>
          )}

          {items.map((it) => (
            <div
              key={it.product_id}
              className="flex gap-3 bg-white/5 rounded-xl p-3"
              data-testid={`cart-item-${it.product_id}`}
            >
              <img
                src={it.image_url}
                alt={it.name}
                className="w-16 h-16 rounded-lg object-cover bg-slate-800"
                loading="lazy"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold leading-tight line-clamp-2">{it.name}</p>
                <p className="text-xs text-slate-400 mt-0.5">{it.vendor_name}</p>
                <div className="flex items-center justify-between mt-2">
                  <div className="inline-flex items-center bg-white/10 rounded-md">
                    <button
                      onClick={() => updateQty(it.product_id, it.quantity - 1)}
                      className="w-7 h-7 flex items-center justify-center hover:bg-white/10"
                      data-testid={`cart-decrease-${it.product_id}`}
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="px-2 text-xs font-semibold w-8 text-center">
                      {it.quantity}
                    </span>
                    <button
                      onClick={() => updateQty(it.product_id, it.quantity + 1)}
                      className="w-7 h-7 flex items-center justify-center hover:bg-white/10"
                      data-testid={`cart-increase-${it.product_id}`}
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                  <p className="text-sm font-bold">₹{(it.unit_price * it.quantity).toLocaleString('en-IN')}</p>
                </div>
              </div>
              <button
                onClick={() => removeItem(it.product_id)}
                className="text-slate-500 hover:text-red-400"
                aria-label="Remove"
                data-testid={`cart-remove-${it.product_id}`}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        {items.length > 0 && (
          <footer className="border-t border-white/10 px-5 py-4 space-y-3 bg-slate-900">
            <div className="flex justify-between text-sm text-slate-400">
              <span>Subtotal</span>
              <span data-testid="cart-subtotal">₹{subtotal.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between text-sm text-slate-400">
              <span>Delivery</span>
              <span>₹{DELIVERY}</span>
            </div>
            <div className="flex justify-between text-base font-bold pt-2 border-t border-white/10">
              <span>Total</span>
              <span data-testid="cart-total">₹{total.toLocaleString('en-IN')}</span>
            </div>
            <button
              onClick={handleCheckout}
              className="w-full bg-[#D63031] hover:bg-[#b22729] py-3 rounded-xl font-bold tracking-wide transition-colors"
              data-testid="cart-checkout-btn"
            >
              Checkout · ₹{total.toLocaleString('en-IN')}
            </button>
          </footer>
        )}
      </aside>
    </div>
  );
};

export default CartDrawer;
