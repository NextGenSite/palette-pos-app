import React, { useState, useMemo } from 'react';
import { Search, Plus, Minus, Trash2, CreditCard, Banknote, Receipt, X, ChevronRight, Edit3 } from 'lucide-react';
import { Product, Order, OrderItem } from '../types';

interface POSViewProps {
  products: Product[];
  updateProducts: (products: Product[]) => void;
  onCompleteOrder: (order: Order) => void;
}

export const POSView: React.FC<POSViewProps> = ({ products, updateProducts, onCompleteOrder }) => {
  const [cart, setCart] = useState<OrderItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<{ id: string, price: number } | null>(null);

  const categories = useMemo(() => ['All', ...new Set(products.map(p => p.category))], [products]);

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.productId === product.id && item.price === product.price);
      if (existing) {
        return prev.map(item => 
          item.productId === product.id && item.price === product.price
            ? { ...item, quantity: item.quantity + 1, subtotal: (item.quantity + 1) * item.price }
            : item
        );
      }
      return [...prev, {
        id: Math.random().toString(36).substr(2, 9),
        productId: product.id,
        name: product.name,
        price: product.price,
        quantity: 1,
        subtotal: product.price
      }];
    });
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQty, subtotal: newQty * item.price };
      }
      return item;
    }));
  };

  const removeItem = (id: string) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const updateItemPrice = (id: string, newPrice: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        return { ...item, price: newPrice, subtotal: item.quantity * newPrice };
      }
      return item;
    }));
    setEditingItem(null);
  };

  const cartSubtotal = cart.reduce((sum, item) => sum + item.subtotal, 0);
  const tax = cartSubtotal * 0.07; // 7% coffee tax example
  const cartTotal = cartSubtotal + tax;

  const handleCheckout = (method: 'Cash' | 'Card') => {
    const newOrder: Order = {
      id: `ORD-${Date.now()}`,
      timestamp: Date.now(),
      items: [...cart],
      subtotal: cartSubtotal,
      tax: tax,
      total: cartTotal,
      paymentMethod: method
    };

    onCompleteOrder(newOrder);
    
    // Update product stock
    const updatedProducts = products.map(p => {
      const itemsInCart = cart.filter(item => item.productId === p.id);
      const totalSold = itemsInCart.reduce((sum, item) => sum + item.quantity, 0);
      return { ...p, stock: p.stock - totalSold };
    });
    updateProducts(updatedProducts);

    setCart([]);
    setIsCheckoutOpen(false);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-140px)]">
      {/* Product Selection */}
      <div className="lg:col-span-8 flex flex-col gap-4 overflow-hidden">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#4A3728]/40" size={20} />
            <input
              type="text"
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-[#4A3728]/10 focus:outline-none focus:ring-2 focus:ring-[#D97706] bg-white"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-xl whitespace-nowrap transition-all ${
                  selectedCategory === cat 
                    ? 'bg-[#4A3728] text-white shadow-md' 
                    : 'bg-white text-[#4A3728] hover:bg-[#FDF8F3]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 overflow-y-auto pr-2 pb-4">
          {filteredProducts.map(product => (
            <button
              key={product.id}
              onClick={() => addToCart(product)}
              disabled={product.stock <= 0}
              className={`p-4 rounded-2xl bg-white border border-[#4A3728]/5 shadow-sm hover:shadow-md hover:border-[#D97706]/30 transition-all flex flex-col items-center text-center group ${product.stock <= 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <div className="w-12 h-12 bg-[#FDF8F3] rounded-full flex items-center justify-center mb-3 group-hover:bg-[#D97706]/10 transition-colors text-[#D97706]">
                <Plus size={24} />
              </div>
              <span className="font-bold text-sm h-10 overflow-hidden">{product.name}</span>
              <span className="text-[#D97706] font-bold mt-2">{product.price.toLocaleString()} SYP</span>
              <span className="text-[10px] text-[#4A3728]/40 mt-1">{product.stock} in stock</span>
            </button>
          ))}
        </div>
      </div>

      {/* Cart / Register */}
      <div className="lg:col-span-4 bg-white rounded-2xl shadow-xl border border-[#4A3728]/10 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-[#4A3728]/5 bg-[#4A3728]/5 flex justify-between items-center">
          <h3 className="font-bold flex items-center gap-2">
            <Receipt size={20} /> Current Order
          </h3>
          <span className="text-xs bg-[#4A3728] text-white px-2 py-1 rounded-full">
            {cart.reduce((sum, i) => sum + i.quantity, 0)} items
          </span>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-[#4A3728]/30 gap-4">
              <Plus size={48} strokeWidth={1} />
              <p>Your cart is empty</p>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.id} className="group relative bg-[#FDF8F3]/50 p-3 rounded-xl border border-[#4A3728]/5">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <p className="font-bold text-sm">{item.name}</p>
                    {editingItem?.id === item.id ? (
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs font-bold">SYP</span>
                        <input
                          type="number"
                          step="1"
                          defaultValue={item.price}
                          onBlur={(e) => updateItemPrice(item.id, parseFloat(e.target.value))}
                          autoFocus
                          className="w-20 text-xs p-1 border border-[#D97706] rounded outline-none"
                        />
                      </div>
                    ) : (
                      <button 
                        onClick={() => setEditingItem({ id: item.id, price: item.price })}
                        className="text-xs text-[#D97706] flex items-center gap-1 hover:underline"
                      >
                        {item.price.toLocaleString()} SYP <Edit3 size={10} />
                      </button>
                    )}
                  </div>
                  <button 
                    onClick={() => removeItem(item.id)}
                    className="text-[#4A3728]/30 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3 bg-white rounded-lg border border-[#4A3728]/10 px-2">
                    <button onClick={() => updateQuantity(item.id, -1)} className="p-1 hover:text-[#D97706]">
                      <Minus size={14} />
                    </button>
                    <span className="text-sm font-bold w-4 text-center">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.id, 1)} className="p-1 hover:text-[#D97706]">
                      <Plus size={14} />
                    </button>
                  </div>
                  <span className="font-bold">{item.subtotal.toLocaleString()} SYP</span>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-4 bg-[#FDF8F3] border-t border-[#4A3728]/10 space-y-2">
          <div className="flex justify-between text-sm opacity-60">
            <span>Subtotal</span>
            <span>{cartSubtotal.toLocaleString()} SYP</span>
          </div>
          <div className="flex justify-between text-sm opacity-60">
            <span>Tax (7%)</span>
            <span>{tax.toLocaleString()} SYP</span>
          </div>
          <div className="flex justify-between text-xl font-black mt-2">
            <span>Total</span>
            <span className="text-[#D97706]">{cartTotal.toLocaleString()} SYP</span>
          </div>

          <button
            disabled={cart.length === 0}
            onClick={() => setIsCheckoutOpen(true)}
            className="w-full mt-4 bg-[#4A3728] text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-[#32251B] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
          >
            Checkout <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {/* Checkout Modal */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in duration-200">
            <div className="p-6 bg-[#4A3728] text-white flex justify-between items-center">
              <h3 className="text-xl font-bold">Complete Payment</h3>
              <button onClick={() => setIsCheckoutOpen(false)} className="hover:opacity-70">
                <X size={24} />
              </button>
            </div>
            
            <div className="p-8 space-y-6">
              <div className="text-center">
                <p className="text-[#4A3728]/60 mb-2">Amount to Pay</p>
                <h2 className="text-5xl font-black text-[#D97706]">{cartTotal.toLocaleString()} SYP</h2>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => handleCheckout('Cash')}
                  className="p-6 border-2 border-[#4A3728]/10 rounded-2xl hover:border-[#D97706] hover:bg-[#D97706]/5 transition-all flex flex-col items-center gap-3 group"
                >
                  <Banknote size={40} className="text-[#4A3728] group-hover:text-[#D97706]" />
                  <span className="font-bold">Cash</span>
                </button>
                <button
                  onClick={() => handleCheckout('Card')}
                  className="p-6 border-2 border-[#4A3728]/10 rounded-2xl hover:border-[#D97706] hover:bg-[#D97706]/5 transition-all flex flex-col items-center gap-3 group"
                >
                  <CreditCard size={40} className="text-[#4A3728] group-hover:text-[#D97706]" />
                  <span className="font-bold">Card</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
