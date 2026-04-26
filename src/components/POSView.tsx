import React, { useMemo, useState } from 'react';
import {
  Search,
  Plus,
  Minus,
  Trash2,
  CreditCard,
  Banknote,
  Receipt,
  X,
  ChevronRight,
  Edit3,
  Printer,
  CheckCircle2,
} from 'lucide-react';
import { Order, OrderItem, Product } from '../types';

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
  const [editingItem, setEditingItem] = useState<{ id: string; price: number } | null>(null);
  const [completedOrder, setCompletedOrder] = useState<Order | null>(null);
  const [receiptFormat, setReceiptFormat] = useState<'thermal' | 'a4'>('thermal');

  const categories = useMemo(() => ['All', ...new Set(products.map((product) => product.category))], [products]);

  const filteredProducts = products.filter((product) => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.productId === product.id && item.price === product.price);
      if (existing) {
        return prev.map((item) =>
          item.productId === product.id && item.price === product.price
            ? { ...item, quantity: item.quantity + 1, subtotal: (item.quantity + 1) * item.price }
            : item
        );
      }

      return [
        ...prev,
        {
          id: Math.random().toString(36).slice(2, 10),
          productId: product.id,
          name: product.name,
          price: product.price,
          quantity: 1,
          subtotal: product.price,
        },
      ];
    });
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart((prev) =>
      prev.map((item) => {
        if (item.id !== id) {
          return item;
        }
        const newQty = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQty, subtotal: newQty * item.price };
      })
    );
  };

  const applyQuickQuantity = (id: string, step: number) => {
    setCart((prev) =>
      prev.map((item) => {
        if (item.id !== id) {
          return item;
        }
        const nextQty = Math.max(1, item.quantity + step);
        return {
          ...item,
          quantity: nextQty,
          subtotal: nextQty * item.price,
        };
      })
    );
  };

  const removeItem = (id: string) => {
    setCart((prev) => prev.filter((item) => item.id !== id));
  };

  const updateItemPrice = (id: string, nextPrice: number) => {
    const safePrice = Math.max(0, Math.floor(nextPrice));
    setCart((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, price: safePrice, subtotal: safePrice * item.quantity } : item
      )
    );
    setEditingItem(null);
  };

  const cartSubtotal = cart.reduce((sum, item) => sum + item.subtotal, 0);
  const tax = Math.round(cartSubtotal * 0.07);
  const cartTotal = cartSubtotal + tax;

  const printReceipt = (order: Order) => {
    const isThermal = receiptFormat === 'thermal';
    const receiptWindow = window.open('', '_blank', isThermal ? 'width=360,height=780' : 'width=420,height=720');
    if (!receiptWindow) {
      alert('Pop-up was blocked. Please allow pop-ups to print the receipt.');
      return;
    }

    const rows = order.items
      .map(
        (item) => `
          <tr>
            <td>${item.name}</td>
            <td style="text-align:center;">${item.quantity}</td>
            <td style="text-align:right;">${item.subtotal.toLocaleString()} SYP</td>
          </tr>
        `
      )
      .join('');

    const pageCss = isThermal
      ? `
        @page { size: 80mm auto; margin: 4mm; }
        body { width: 72mm; margin: 0 auto; font-family: 'Courier New', monospace; padding: 0; }
        h1 { font-size: 18px; }
        td { font-size: 12px; }
        .grand { font-size: 16px; }
      `
      : `
        body { font-family: Arial, sans-serif; padding: 24px; color: #2b2118; }
        h1 { margin: 0; font-size: 24px; }
        td { font-size: 13px; }
        .grand { font-size: 20px; font-weight: 700; color: #c26c15; }
      `;

    receiptWindow.document.write(`
      <html>
        <head>
          <title>Palette Receipt</title>
          <style>
            ${pageCss}
            .meta { color: #6f5b49; font-size: 12px; margin-top: 6px; }
            table { width: 100%; border-collapse: collapse; margin: 18px 0; }
            td { padding: 6px 0; border-bottom: 1px dashed #d8c8ba; }
            .totals p { display: flex; justify-content: space-between; margin: 5px 0; }
            .grand { font-weight: 700; color: #c26c15; }
          </style>
        </head>
        <body>
          <h1>PALETTE</h1>
          <div class="meta">Receipt #${order.id} | ${new Date(order.timestamp).toLocaleString()}</div>
          <div class="meta">Payment: ${order.paymentMethod}</div>
          <table>
            <tbody>${rows}</tbody>
          </table>
          <div class="totals">
            <p><span>Subtotal</span><span>${order.subtotal.toLocaleString()} SYP</span></p>
            <p><span>Tax</span><span>${order.tax.toLocaleString()} SYP</span></p>
            <p class="grand"><span>Total</span><span>${order.total.toLocaleString()} SYP</span></p>
          </div>
          <p style="margin-top:24px; font-size:12px; color:#6f5b49;">Thank you for visiting Palette.</p>
          <script>window.onload = () => { window.print(); };</script>
        </body>
      </html>
    `);
    receiptWindow.document.close();
  };

  const handleCheckout = (method: 'Cash' | 'Card') => {
    if (cart.length === 0) return;

    const finalizedOrder: Order = {
      id: `ORD-${Date.now()}`,
      timestamp: Date.now(),
      items: [...cart],
      subtotal: cartSubtotal,
      tax,
      total: cartTotal,
      paymentMethod: method,
    };

    onCompleteOrder(finalizedOrder);

    const nextProducts = products.map((product) => {
      const soldQty = cart
        .filter((item) => item.productId === product.id)
        .reduce((sum, item) => sum + item.quantity, 0);
      return { ...product, stock: Math.max(0, product.stock - soldQty) };
    });
    updateProducts(nextProducts);

    setCompletedOrder(finalizedOrder);
    setCart([]);
    setIsCheckoutOpen(false);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-6 h-[calc(100vh-140px)]">
      <section className="md:col-span-7 lg:col-span-8 flex flex-col gap-4 overflow-hidden">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#4A3728]/40" size={18} />
            <input
              type="text"
              placeholder="Search product..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-[#4A3728]/10 focus:outline-none focus:ring-2 focus:ring-[#D97706] bg-white"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 rounded-xl whitespace-nowrap transition-all text-sm font-semibold ${
                  selectedCategory === category
                    ? 'bg-[#4A3728] text-white shadow-md'
                    : 'bg-white text-[#4A3728] hover:bg-[#FDF8F3]'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 overflow-y-auto pr-1 pb-2">
          {filteredProducts.map((product) => (
            <button
              key={product.id}
              onClick={() => addToCart(product)}
              disabled={product.stock <= 0}
              className={`p-4 rounded-2xl bg-white border border-[#4A3728]/5 shadow-sm hover:shadow-md hover:border-[#D97706]/30 transition-all text-left ${
                product.stock <= 0 ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              <div className="w-10 h-10 bg-[#FDF8F3] rounded-full flex items-center justify-center mb-3 text-[#D97706]">
                <Plus size={20} />
              </div>
              <p className="font-bold text-sm min-h-10">{product.name}</p>
              <p className="text-[#D97706] font-bold mt-1">{product.price.toLocaleString()} SYP</p>
              <p className="text-[11px] text-[#4A3728]/50">Stock: {product.stock}</p>
            </button>
          ))}
        </div>
      </section>

      <section className="md:col-span-5 lg:col-span-4 bg-white rounded-2xl shadow-xl border border-[#4A3728]/10 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-[#4A3728]/5 bg-[#4A3728]/5 flex justify-between items-center">
          <h3 className="font-bold flex items-center gap-2">
            <Receipt size={18} /> Active Order
          </h3>
          <span className="text-xs bg-[#4A3728] text-white px-2 py-1 rounded-full">
            {cart.reduce((sum, item) => sum + item.quantity, 0)} items
          </span>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-[#4A3728]/35 gap-3">
              <Receipt size={42} strokeWidth={1.5} />
              <p>No items selected yet</p>
            </div>
          ) : (
            cart.map((item) => (
              <div key={item.id} className="bg-[#FDF8F3]/55 p-3 rounded-xl border border-[#4A3728]/7">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-bold text-sm">{item.name}</p>
                    {editingItem?.id === item.id ? (
                      <input
                        type="number"
                        min={0}
                        defaultValue={item.price}
                        autoFocus
                        onBlur={(e) => updateItemPrice(item.id, Number(e.target.value))}
                        className="mt-1 w-24 text-xs rounded border border-[#D97706] px-2 py-1"
                      />
                    ) : (
                      <button
                        onClick={() => setEditingItem({ id: item.id, price: item.price })}
                        className="text-xs text-[#D97706] hover:underline flex items-center gap-1"
                      >
                        {item.price.toLocaleString()} SYP <Edit3 size={10} />
                      </button>
                    )}
                  </div>
                  <button onClick={() => removeItem(item.id)} className="text-[#4A3728]/30 hover:text-red-500">
                    <Trash2 size={16} />
                  </button>
                </div>

                <div className="flex justify-between items-center mt-3">
                  <div className="flex items-center gap-2 bg-white rounded-lg border border-[#4A3728]/10 px-2 py-1">
                    <button onClick={() => updateQuantity(item.id, -1)} className="p-1 hover:text-[#D97706]">
                      <Minus size={13} />
                    </button>
                    <span className="text-sm font-bold w-5 text-center">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.id, 1)} className="p-1 hover:text-[#D97706]">
                      <Plus size={13} />
                    </button>
                  </div>
                  <span className="font-bold">{item.subtotal.toLocaleString()} SYP</span>
                </div>

                <div className="mt-2 flex gap-1">
                  {[1, 2, 5].map((quickStep) => (
                    <button
                      key={quickStep}
                      onClick={() => applyQuickQuantity(item.id, quickStep)}
                      className="text-xs px-2 py-1 rounded-md border border-[#4A3728]/15 bg-white hover:bg-[#FDF8F3]"
                    >
                      +{quickStep}
                    </button>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-4 bg-[#FDF8F3] border-t border-[#4A3728]/10 space-y-2">
          <div className="flex justify-between text-sm opacity-70">
            <span>Subtotal</span>
            <span>{cartSubtotal.toLocaleString()} SYP</span>
          </div>
          <div className="flex justify-between text-sm opacity-70">
            <span>Tax (7%)</span>
            <span>{tax.toLocaleString()} SYP</span>
          </div>
          <div className="flex justify-between text-2xl font-black">
            <span>Total</span>
            <span className="text-[#D97706]">{cartTotal.toLocaleString()} SYP</span>
          </div>

          <button
            disabled={cart.length === 0}
            onClick={() => setIsCheckoutOpen(true)}
            className="w-full mt-3 bg-[#4A3728] text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-[#32251B] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Checkout <ChevronRight size={18} />
          </button>
        </div>
      </section>

      {isCheckoutOpen && (
        <div className="fixed inset-0 bg-black/55 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-5 bg-[#4A3728] text-white flex justify-between items-center">
              <h3 className="text-xl font-bold">Complete Payment</h3>
              <button onClick={() => setIsCheckoutOpen(false)} className="hover:opacity-70">
                <X size={22} />
              </button>
            </div>

            <div className="p-8 space-y-6">
              <div className="text-center">
                <p className="text-[#4A3728]/60 mb-1">Amount to pay</p>
                <h2 className="text-5xl font-black text-[#D97706]">{cartTotal.toLocaleString()} SYP</h2>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => handleCheckout('Cash')}
                  className="p-5 border-2 border-[#4A3728]/10 rounded-2xl hover:border-[#D97706] hover:bg-[#D97706]/5 transition-all flex flex-col items-center gap-2"
                >
                  <Banknote size={34} className="text-[#4A3728]" />
                  <span className="font-bold">Cash</span>
                </button>
                <button
                  onClick={() => handleCheckout('Card')}
                  className="p-5 border-2 border-[#4A3728]/10 rounded-2xl hover:border-[#D97706] hover:bg-[#D97706]/5 transition-all flex flex-col items-center gap-2"
                >
                  <CreditCard size={34} className="text-[#4A3728]" />
                  <span className="font-bold">Card</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {completedOrder && (
        <div className="fixed inset-0 bg-black/55 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-[#4A3728]/10 flex justify-between items-center">
              <h3 className="text-xl font-bold flex items-center gap-2 text-green-700">
                <CheckCircle2 size={22} /> Payment Complete
              </h3>
              <button onClick={() => setCompletedOrder(null)} className="text-[#4A3728]/50 hover:text-[#4A3728]">
                <X size={22} />
              </button>
            </div>

            <div className="p-6 space-y-3 max-h-[70vh] overflow-auto">
              <div className="text-sm text-[#4A3728]/70">
                <p>Receipt #{completedOrder.id}</p>
                <p>{new Date(completedOrder.timestamp).toLocaleString()}</p>
              </div>
              <div className="divide-y divide-[#4A3728]/10 rounded-xl border border-[#4A3728]/10">
                {completedOrder.items.map((item) => (
                  <div key={item.id} className="p-3 flex items-center justify-between text-sm">
                    <span>{item.quantity}x {item.name}</span>
                    <span className="font-semibold">{item.subtotal.toLocaleString()} SYP</span>
                  </div>
                ))}
              </div>

              <div className="pt-2 space-y-1 text-sm">
                <div className="flex justify-between"><span>Subtotal</span><span>{completedOrder.subtotal.toLocaleString()} SYP</span></div>
                <div className="flex justify-between"><span>Tax</span><span>{completedOrder.tax.toLocaleString()} SYP</span></div>
                <div className="flex justify-between text-lg font-black text-[#D97706]"><span>Total</span><span>{completedOrder.total.toLocaleString()} SYP</span></div>
              </div>

              <div className="pt-1">
                <label className="text-xs text-[#4A3728]/60 block mb-1">Receipt format</label>
                <select
                  value={receiptFormat}
                  onChange={(e) => setReceiptFormat(e.target.value as 'thermal' | 'a4')}
                  className="w-full rounded-lg border border-[#4A3728]/15 bg-white px-3 py-2 text-sm"
                >
                  <option value="thermal">80mm Thermal</option>
                  <option value="a4">A4</option>
                </select>
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  onClick={() => printReceipt(completedOrder)}
                  className="flex-1 py-3 rounded-xl bg-[#4A3728] text-white font-bold flex items-center justify-center gap-2 hover:bg-[#32251B]"
                >
                  <Printer size={18} /> Print Receipt
                </button>
                <button
                  onClick={() => setCompletedOrder(null)}
                  className="flex-1 py-3 rounded-xl bg-[#FDF8F3] border border-[#4A3728]/15 font-bold hover:bg-[#f6efe8]"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
