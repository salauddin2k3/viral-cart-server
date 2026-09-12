'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

export interface CartItem {
  productId: string;
  slug: string;
  name: string;
  unitPrice: number;
  discountPercent: number;
  quantity: number;
  image: string | null;
  stockSignal: 'in_stock' | 'low_stock' | 'out_of_stock';
  variantId?: string;
}

interface CartContextValue {
  items: CartItem[];
  addItem: (item: Omit<CartItem, 'quantity'> & { quantity?: number }) => void;
  updateQuantity: (productId: string, quantity: number, variantId?: string) => void;
  removeItem: (productId: string, variantId?: string) => void;
  clearCart: () => void;
  itemCount: number;
  subtotal: number;
  buyNowItem: CartItem | null;
  setBuyNow: (item: Omit<CartItem, 'quantity'> & { quantity?: number }) => void;
  updateBuyNowQuantity: (quantity: number) => void;
  clearBuyNow: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

const STORAGE_KEY = 'ecomm_cart';

function loadCart(): CartItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item: unknown): item is CartItem =>
        typeof item === 'object' &&
        item !== null &&
        'productId' in item &&
        'quantity' in item,
    );
  } catch {
    return [];
  }
}

function saveCart(items: CartItem[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // storage full or unavailable — fail silently
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [buyNowItem, setBuyNowItem] = useState<CartItem | null>(null);
  const initialized = useRef(false);

  useEffect(() => {
    if (!initialized.current) {
      setItems(loadCart());
      initialized.current = true;
    }
  }, []);

  useEffect(() => {
    if (initialized.current) {
      saveCart(items);
    }
  }, [items]);

  const addItem = useCallback(
    (newItem: Omit<CartItem, 'quantity'> & { quantity?: number }) => {
      const qty = newItem.quantity ?? 1;
      setItems((prev) => {
        const existing = prev.find((i) => i.productId === newItem.productId && i.variantId === newItem.variantId);
        if (existing) {
          const newQty = Math.min(existing.quantity + qty, 99);
          return prev.map((i) =>
            i.productId === newItem.productId && i.variantId === newItem.variantId ? { ...i, quantity: newQty } : i,
          );
        }
        return [...prev, { ...newItem, quantity: qty }];
      });
    },
    [],
  );

  const updateQuantity = useCallback((productId: string, quantity: number, variantId?: string) => {
    const clamped = Math.max(1, Math.min(quantity, 99));
    setItems((prev) =>
      prev.map((i) =>
        i.productId === productId && i.variantId === variantId ? { ...i, quantity: clamped } : i,
      ),
    );
  }, []);

  const removeItem = useCallback((productId: string, variantId?: string) => {
    setItems((prev) => prev.filter((i) => !(i.productId === productId && i.variantId === variantId)));
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  const setBuyNow = useCallback(
    (newItem: Omit<CartItem, 'quantity'> & { quantity?: number }) => {
      setBuyNowItem({ ...newItem, quantity: newItem.quantity ?? 1 });
    },
    [],
  );

  const updateBuyNowQuantity = useCallback((quantity: number) => {
    const clamped = Math.max(1, Math.min(quantity, 99));
    setBuyNowItem((prev) => (prev ? { ...prev, quantity: clamped } : null));
  }, []);

  const clearBuyNow = useCallback(() => {
    setBuyNowItem(null);
  }, []);

  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);

  const subtotal = items.reduce(
    (sum, i) => sum + i.unitPrice * (1 - i.discountPercent / 100) * i.quantity,
    0,
  );

  return (
    <CartContext.Provider
      value={{ items, addItem, updateQuantity, removeItem, clearCart, itemCount, subtotal, buyNowItem, setBuyNow, updateBuyNowQuantity, clearBuyNow }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return ctx;
}
