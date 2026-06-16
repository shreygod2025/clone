import { createContext, useContext, useEffect, useMemo, useState } from 'react';

const CartContext = createContext(null);
const STORAGE_KEY = 'oll_shop_cart_v1';

export const CartProvider = ({ children }) => {
  const [items, setItems] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      /* ignore quota errors */
    }
  }, [items]);

  const addItem = (product, quantity = 1) => {
    setItems((prev) => {
      const existing = prev.find((p) => p.product_id === product.id);
      if (existing) {
        return prev.map((p) =>
          p.product_id === product.id
            ? { ...p, quantity: Math.min(20, p.quantity + quantity) }
            : p
        );
      }
      return [
        ...prev,
        {
          product_id: product.id,
          name: product.name,
          image_url: product.image_url,
          vendor_name: product.vendor_name,
          unit_price: product.selling_price,
          mrp: product.mrp,
          quantity,
        },
      ];
    });
  };

  const updateQty = (productId, qty) => {
    if (qty <= 0) return removeItem(productId);
    setItems((prev) =>
      prev.map((p) =>
        p.product_id === productId ? { ...p, quantity: Math.min(20, qty) } : p
      )
    );
  };

  const removeItem = (productId) => {
    setItems((prev) => prev.filter((p) => p.product_id !== productId));
  };

  const clearCart = () => setItems([]);

  const { count, subtotal } = useMemo(() => {
    const c = items.reduce((acc, it) => acc + it.quantity, 0);
    const s = items.reduce((acc, it) => acc + it.unit_price * it.quantity, 0);
    return { count: c, subtotal: s };
  }, [items]);

  return (
    <CartContext.Provider
      value={{
        items,
        count,
        subtotal,
        addItem,
        updateQty,
        removeItem,
        clearCart,
        drawerOpen,
        openDrawer: () => setDrawerOpen(true),
        closeDrawer: () => setDrawerOpen(false),
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside CartProvider');
  return ctx;
};
