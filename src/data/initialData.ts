import { Product } from '../types';

export const initialProducts: Product[] = [
  { id: '1', name: 'Espresso', price: 2500, stock: 100, category: 'Coffee' },
  { id: '2', name: 'Cappuccino', price: 3800, stock: 100, category: 'Coffee' },
  { id: '3', name: 'Latte Macchiato', price: 4200, stock: 100, category: 'Coffee' },
  { id: '4', name: 'Flat White', price: 3900, stock: 100, category: 'Coffee' },
  { id: '5', name: 'Croissant', price: 2200, stock: 30, category: 'Pastry' },
  { id: '6', name: 'Chocolate Muffin', price: 2800, stock: 20, category: 'Pastry' },
  { id: '7', name: 'Blueberry Scone', price: 3100, stock: 15, category: 'Pastry' },
  { id: '8', name: 'Iced Tea', price: 3500, stock: 50, category: 'Drinks' },
  { id: '9', name: 'Still Water', price: 2000, stock: 100, category: 'Drinks' },
  { id: '10', name: 'Orange Juice', price: 3800, stock: 40, category: 'Drinks' },
];
