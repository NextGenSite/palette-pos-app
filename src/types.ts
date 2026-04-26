export interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  category: string;
}

export interface OrderItem {
  id: string;
  productId: string;
  name: string;
  price: number;
  quantity: number;
  subtotal: number;
}

export interface Order {
  id: string;
  timestamp: number;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  total: number;
  paymentMethod: 'Cash' | 'Card';
}

export interface AppStatePayload {
  products: Product[];
  orders: Order[];
  pdfMenu: string | null;
  menuImages: string[];
  categories: string[];
}

export const CATEGORY_OPTIONS = [
  'ميلك شيك',
  'آيس',
  'ساخن',
  'بارد',
  'دولشي',
  'قوالب شوكولا',
  'معجنات',
  'أعمال يدوية',
  'أراغيل',
  'حجوزات',
] as const;

export type Category = (typeof CATEGORY_OPTIONS)[number];
