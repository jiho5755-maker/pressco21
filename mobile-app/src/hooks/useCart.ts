import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { CartItem } from '../types';

const CART_KEY = 'pressco21_cart';

export function useCart() {
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    (async () => {
      const saved = await AsyncStorage.getItem(CART_KEY);
      if (saved) setItems(JSON.parse(saved));
    })();
  }, []);

  const save = useCallback(async (newItems: CartItem[]) => {
    setItems(newItems);
    await AsyncStorage.setItem(CART_KEY, JSON.stringify(newItems));
  }, []);

  const addItem = useCallback(async (item: CartItem) => {
    const existing = items.find(
      (i) => i.productId === item.productId && i.option === item.option
    );
    if (existing) {
      const updated = items.map((i) =>
        i.productId === item.productId && i.option === item.option
          ? { ...i, quantity: i.quantity + item.quantity }
          : i
      );
      await save(updated);
    } else {
      await save([...items, item]);
    }
  }, [items, save]);

  const removeItem = useCallback(async (productId: string, option?: string) => {
    const filtered = items.filter(
      (i) => !(i.productId === productId && i.option === option)
    );
    await save(filtered);
  }, [items, save]);

  const updateQuantity = useCallback(async (productId: string, quantity: number, option?: string) => {
    if (quantity <= 0) return removeItem(productId, option);
    const updated = items.map((i) =>
      i.productId === productId && i.option === option
        ? { ...i, quantity }
        : i
    );
    await save(updated);
  }, [items, save, removeItem]);

  const clearCart = useCallback(async () => {
    await save([]);
  }, [save]);

  const totalPrice = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const totalCount = items.reduce((sum, i) => sum + i.quantity, 0);

  return { items, addItem, removeItem, updateQuantity, clearCart, totalPrice, totalCount };
}
