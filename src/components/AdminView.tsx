import React, { useState } from 'react';
import { 
  Package, 
  History, 
  FileText, 
  Download, 
  Plus, 
  Trash2, 
  Edit2, 
  Upload,
  Check,
  X,
  TrendingUp,
  CreditCard,
  Banknote,
  Settings,
  Save,
  RefreshCw,
  Undo2
} from 'lucide-react';
import { Product, Order } from '../types';
import { format, isToday, isYesterday, subDays, startOfDay } from 'date-fns';

interface AdminViewProps {
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  orders: Order[];
  setOrders: React.Dispatch<React.SetStateAction<Order[]>>;
  pdfMenu: string | null;
  setPdfMenu: (url: string | null) => void;
  menuImages: string[];
  setMenuImages: React.Dispatch<React.SetStateAction<string[]>>;
  categories: string[];
  setCategories: React.Dispatch<React.SetStateAction<string[]>>;
}

export const AdminView: React.FC<AdminViewProps> = ({ 
  products, 
  setProducts, 
  orders, 
  setOrders,
  pdfMenu, 
  setPdfMenu,
  menuImages,
  setMenuImages,
  categories,
  setCategories
}) => {
  const [activeTab, setActiveTab] = useState<'products' | 'orders' | 'menu' | 'system'>('products');
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  
  // Filters
  const [productCategoryFilter, setProductCategoryFilter] = useState('All');
  const [productSearch, setProductSearch] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [orderDateFilter, setOrderDateFilter] = useState<'all' | 'today' | 'yesterday' | 'week' | 'custom'>('all');
  const [customDateRange, setCustomDateRange] = useState({
    from: format(new Date(), 'yyyy-MM-dd'),
    to: format(new Date(), 'yyyy-MM-dd')
  });
  
  // New product form
  const [newProduct, setNewProduct] = useState<Partial<Product>>({
    name: '',
    price: 0,
    stock: 0,
    category: categories[0] || 'عام'
  });

  const handleAddProduct = () => {
    if (newProduct.name && newProduct.price !== undefined) {
      if (newProduct.price <= 0) {
        alert('Price must be greater than 0.');
        return;
      }
      if ((newProduct.stock || 0) < 0) {
        alert('Stock cannot be negative.');
        return;
      }
      const product: Product = {
        id: Math.random().toString(36).substr(2, 9),
        name: newProduct.name,
        price: newProduct.price,
        stock: 0,
        category: newProduct.category || categories[0] || 'عام'
      };
      setProducts([...products, product]);
      setNewProduct({ name: '', price: 0, stock: 0, category: categories[0] || 'عام' });
      setIsAddingProduct(false);
    }
  };

  const handleAddCategory = () => {
    const trimmed = newCategoryName.trim();
    if (!trimmed) {
      return;
    }
    if (categories.includes(trimmed)) {
      alert('Category already exists.');
      return;
    }
    setCategories((prev) => [...prev, trimmed]);
    setNewCategoryName('');
    setNewProduct((prev) => ({ ...prev, category: trimmed }));
  };

  const deleteProduct = (id: string) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      setProducts(products.filter(p => p.id !== id));
    }
  };

  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const startEditing = (product: Product) => {
    setEditingProduct({ ...product });
    setEditingProductId(product.id);
  };

  const saveProduct = () => {
    if (editingProduct) {
      setProducts(products.map(p => p.id === editingProduct.id ? editingProduct : p));
      setEditingProductId(null);
      setEditingProduct(null);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file size (localStorage limit is ~5MB)
      if (file.size > 2 * 1024 * 1024) {
        alert("The PDF is too large. Please upload a file smaller than 2MB.");
        return;
      }
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setPdfMenu(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleMenuImagesUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const tooLarge = files.some((file) => file.size > 4 * 1024 * 1024);
    if (tooLarge) {
      alert('One or more images are larger than 4MB. Please use smaller files.');
      return;
    }

    const readers = files.map(
      (file) =>
        new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () => reject(new Error('Failed to read image.'));
          reader.readAsDataURL(file);
        })
    );

    try {
      const imageData = await Promise.all(readers);
      setMenuImages(imageData);
      alert('Menu images uploaded successfully.');
    } catch {
      alert('Image upload failed. Please try again.');
    }
  };

  const removeMenuImage = (index: number) => {
    setMenuImages((prev) => prev.filter((_, i) => i !== index));
  };

  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [editingOrderDraft, setEditingOrderDraft] = useState<Order | null>(null);
  const [orderUndoStack, setOrderUndoStack] = useState<Order[][]>([]);

  const pushOrderSnapshot = () => {
    setOrderUndoStack((prev) => [[...orders], ...prev].slice(0, 20));
  };

  const undoLastOrderChange = () => {
    setOrderUndoStack((prev) => {
      if (prev.length === 0) {
        return prev;
      }
      const [latestSnapshot, ...remaining] = prev;
      setOrders(latestSnapshot);
      setEditingOrderId(null);
      setEditingOrderDraft(null);
      return remaining;
    });
  };

  const recalculateOrder = (order: Order): Order => {
    const subtotal = order.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const tax = subtotal * 0.07;
    return {
      ...order,
      items: order.items.map((item) => ({
        ...item,
        subtotal: item.price * item.quantity,
      })),
      subtotal,
      tax,
      total: subtotal + tax,
    };
  };

  const startEditOrder = (order: Order) => {
    setEditingOrderId(order.id);
    setEditingOrderDraft(JSON.parse(JSON.stringify(order)));
  };

  const saveOrderDraft = () => {
    if (!editingOrderDraft) return;
    const normalized = recalculateOrder(editingOrderDraft);
    pushOrderSnapshot();
    setOrders((prev) => prev.map((order) => (order.id === normalized.id ? normalized : order)));
    setEditingOrderId(null);
    setEditingOrderDraft(null);
  };

  const deleteOrder = (orderId: string) => {
    if (!window.confirm('Delete this order permanently?')) {
      return;
    }
    pushOrderSnapshot();
    setOrders((prev) => prev.filter((order) => order.id !== orderId));
    if (editingOrderId === orderId) {
      setEditingOrderId(null);
      setEditingOrderDraft(null);
    }
  };

  const updateDraftItem = (itemId: string, key: 'quantity' | 'price', value: number) => {
    setEditingOrderDraft((prev) => {
      if (!prev) return prev;
      const next = {
        ...prev,
        items: prev.items.map((item) => {
          if (item.id !== itemId) return item;
          const safeValue = key === 'quantity' ? Math.max(1, Math.floor(value)) : Math.max(0, value);
          return {
            ...item,
            [key]: safeValue,
            subtotal: key === 'quantity' ? safeValue * item.price : item.quantity * safeValue,
          };
        }),
      };
      return recalculateOrder(next);
    });
  };

  const removeDraftItem = (itemId: string) => {
    setEditingOrderDraft((prev) => {
      if (!prev) return prev;
      const next = {
        ...prev,
        items: prev.items.filter((item) => item.id !== itemId),
      };
      return recalculateOrder(next);
    });
  };

  // Filtered Data
  const filteredProducts = products.filter(p => 
    (productCategoryFilter === 'All' || p.category === productCategoryFilter) &&
    p.name.toLowerCase().includes(productSearch.toLowerCase())
  );

  const filteredOrders = orders.filter(order => {
    const date = new Date(order.timestamp);
    if (orderDateFilter === 'today') return isToday(date);
    if (orderDateFilter === 'yesterday') return isYesterday(date);
    if (orderDateFilter === 'week') return date >= subDays(startOfDay(new Date()), 7);
    if (orderDateFilter === 'custom') {
      const fromDate = startOfDay(new Date(customDateRange.from));
      const toDate = new Date(customDateRange.to);
      toDate.setHours(23, 59, 59, 999);
      return date >= fromDate && date <= toDate;
    }
    return true;
  });

  const exportOrdersToCSV = () => {
    const ordersToExport = filteredOrders;
    if (ordersToExport.length === 0) {
      alert("No orders to export in current filter.");
      return;
    }

    const headers = ['Date', 'Item', 'Quantity', 'Price', 'Order Total'];
    const rows: string[][] = [];
    
    ordersToExport.forEach(order => {
      const dateStr = format(order.timestamp, 'yyyy-MM-dd HH:mm');
      order.items.forEach(item => {
        rows.push([
          dateStr,
          item.name,
          item.quantity.toString(),
          item.price.toString(),
          order.total.toString()
        ]);
      });
    });

    const csvContent = "\uFEFF" + [
      headers.join(';'),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(';'))
    ].join('\n');

    try {
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `palette_orders_${orderDateFilter}_${format(new Date(), 'yyyy-MM-dd')}.csv`;
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }, 100);
    } catch (err) {
      alert("Export failed.");
    }
  };

  const totalRevenue = filteredOrders.reduce((sum, o) => sum + o.total, 0);
  const totalSalesCount = filteredOrders.length;

  const adminCategories = ['All', ...new Set([...categories, ...products.map((p) => p.category)])];

  const handleBackup = () => {
    const data = {
      products,
      orders,
      pdfMenu,
      menuImages,
      version: '1.0',
      timestamp: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `palette_full_backup_${format(new Date(), 'yyyy-MM-dd')}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = JSON.parse(event.target?.result as string);
          if (data.products && data.orders) {
            if (window.confirm('This will overwrite all current products and orders. Are you sure?')) {
              localStorage.setItem('palette_products', JSON.stringify(data.products));
              localStorage.setItem('palette_orders', JSON.stringify(data.orders));
              if (data.pdfMenu) localStorage.setItem('palette_pdf_menu', data.pdfMenu);
              if (data.menuImages) {
                localStorage.setItem('palette_menu_images', JSON.stringify(data.menuImages));
              }
              alert('Data restored successfully! The page will now reload.');
              window.location.reload();
            }
          }
        } catch (err) {
          alert('Invalid backup file.');
        }
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold">Admin Dashboard</h2>
          <p className="text-[#4A3728]/60">Manage your shop operations</p>
        </div>
        
        <div className="flex gap-2 bg-white p-1 rounded-xl shadow-sm border border-[#4A3728]/5">
          <button 
            onClick={() => setActiveTab('products')}
            className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 ${activeTab === 'products' ? 'bg-[#4A3728] text-white' : 'hover:bg-[#FDF8F3]'}`}
          >
            <Package size={18} /> Products
          </button>
          <button 
            onClick={() => setActiveTab('orders')}
            className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 ${activeTab === 'orders' ? 'bg-[#4A3728] text-white' : 'hover:bg-[#FDF8F3]'}`}
          >
            <History size={18} /> Orders
          </button>
          <button 
            onClick={() => setActiveTab('menu')}
            className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 ${activeTab === 'menu' ? 'bg-[#4A3728] text-white' : 'hover:bg-[#FDF8F3]'}`}
          >
            <FileText size={18} /> Digital Menu
          </button>
          <button 
            onClick={() => setActiveTab('system')}
            className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 ${activeTab === 'system' ? 'bg-[#4A3728] text-white' : 'hover:bg-[#FDF8F3]'}`}
          >
            <Settings size={18} /> System
          </button>
        </div>
      </div>

      {activeTab === 'products' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-bold flex items-center gap-2">
              <Package className="text-[#D97706]" /> Inventory Management
            </h3>
            <button 
              onClick={() => setIsAddingProduct(true)}
              className="bg-[#D97706] text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-[#B45309] transition-all"
            >
              <Plus size={20} /> Add Product
            </button>
          </div>

          <input
            type="text"
            value={productSearch}
            onChange={(e) => setProductSearch(e.target.value)}
            placeholder="Search product by name..."
            className="w-full max-w-md rounded-xl border border-[#4A3728]/10 bg-white px-4 py-2.5 outline-none ring-[#D97706] focus:ring-2"
          />

          <div className="flex flex-col sm:flex-row gap-2 max-w-xl">
            <input
              type="text"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="Add new category..."
              className="flex-1 rounded-xl border border-[#4A3728]/10 bg-white px-4 py-2.5 outline-none ring-[#D97706] focus:ring-2"
            />
            <button
              onClick={handleAddCategory}
              className="rounded-xl bg-[#4A3728] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#32251B]"
            >
              Add Category
            </button>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-4">
            {adminCategories.map(cat => (
              <button
                key={cat}
                onClick={() => setProductCategoryFilter(cat)}
                className={`px-4 py-1.5 rounded-full text-sm font-bold transition-all border ${
                  productCategoryFilter === cat 
                    ? 'bg-[#4A3728] text-white border-[#4A3728]' 
                    : 'bg-white text-[#4A3728] border-[#4A3728]/10 hover:border-[#D97706]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="bg-white rounded-2xl shadow-md border border-[#4A3728]/5 overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-[#4A3728]/5 text-[#4A3728]/70 text-sm">
                <tr>
                  <th className="p-4">Name</th>
                  <th className="p-4">Category</th>
                  <th className="p-4">Price</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#4A3728]/5">
                {isAddingProduct && (
                  <tr className="bg-[#D97706]/5">
                    <td className="p-4">
                      <input 
                        className="w-full p-2 rounded border border-[#4A3728]/20"
                        placeholder="Name"
                        value={newProduct.name}
                        onChange={e => setNewProduct({...newProduct, name: e.target.value})}
                      />
                    </td>
                    <td className="p-4">
                      <select 
                        className="w-full p-2 rounded border border-[#4A3728]/20"
                        value={newProduct.category}
                        onChange={e => setNewProduct({...newProduct, category: e.target.value})}
                      >
                        {adminCategories.filter((category) => category !== 'All').map((category) => (
                          <option key={category}>{category}</option>
                        ))}
                      </select>
                    </td>
                    <td className="p-4">
                      <input 
                        type="number" 
                        step="0.01"
                        className="w-full p-2 rounded border border-[#4A3728]/20"
                        placeholder="0.00"
                        value={newProduct.price}
                        onChange={e => setNewProduct({...newProduct, price: parseFloat(e.target.value)})}
                      />
                    </td>
                    <td className="p-4 text-right space-x-2">
                      <button onClick={handleAddProduct} className="text-green-600 hover:bg-green-50 p-2 rounded-full"><Check size={20}/></button>
                      <button onClick={() => setIsAddingProduct(false)} className="text-red-600 hover:bg-red-50 p-2 rounded-full"><X size={20}/></button>
                    </td>
                  </tr>
                )}
                {filteredProducts.map(product => (
                  <tr key={product.id} className="hover:bg-[#FDF8F3]/50 transition-colors group">
                    <td className="p-4 font-bold">
                      {editingProductId === product.id ? (
                        <input 
                          className="w-full p-1 border border-[#D97706] rounded"
                          value={editingProduct?.name || ''}
                          onChange={e => setEditingProduct(prev => prev ? {...prev, name: e.target.value} : null)}
                        />
                      ) : product.name}
                    </td>
                    <td className="p-4">
                      {editingProductId === product.id ? (
                        <select 
                          className="w-full p-1 border border-[#D97706] rounded"
                          value={editingProduct?.category || ''}
                          onChange={e => setEditingProduct(prev => prev ? {...prev, category: e.target.value} : null)}
                        >
                          {adminCategories.filter((category) => category !== 'All').map((category) => (
                            <option key={category}>{category}</option>
                          ))}
                        </select>
                      ) : (
                        <span className="px-2 py-1 bg-[#FDF8F3] text-[#4A3728]/60 rounded-md text-xs font-bold uppercase tracking-wider border border-[#4A3728]/5">
                          {product.category}
                        </span>
                      )}
                    </td>
                    <td className="p-4 font-bold text-[#D97706]">
                      {editingProductId === product.id ? (
                        <input 
                          type="number"
                          step="1"
                          className="w-28 p-1 border border-[#D97706] rounded"
                          value={editingProduct?.price || 0}
                          onChange={e => setEditingProduct(prev => prev ? {...prev, price: parseFloat(e.target.value)} : null)}
                        />
                      ) : `${product.price.toLocaleString()} SYP`}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-2">
                        {editingProductId === product.id ? (
                          <>
                            <button 
                              onClick={saveProduct}
                              className="p-2 text-green-600 hover:bg-green-50 rounded-full transition-colors"
                              title="Save"
                            >
                              <Check size={18} />
                            </button>
                            <button 
                              onClick={() => {
                                setEditingProductId(null);
                                setEditingProduct(null);
                              }}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-full transition-colors"
                              title="Cancel"
                            >
                              <X size={18} />
                            </button>
                          </>
                        ) : (
                          <>
                            <button 
                              onClick={() => startEditing(product)}
                              className="p-2 text-[#4A3728]/40 hover:text-[#D97706] transition-colors"
                              title="Edit"
                            >
                              <Edit2 size={18} />
                            </button>
                            <button 
                              onClick={() => deleteProduct(product.id)}
                              className="p-2 text-[#4A3728]/40 hover:text-red-500 transition-colors"
                              title="Delete"
                            >
                              <Trash2 size={18} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'orders' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#4A3728]/5">
              <div className="flex items-center gap-3 text-[#4A3728]/40 mb-2">
                <TrendingUp size={20} />
                <span className="text-sm font-bold uppercase tracking-wider">Total Revenue</span>
              </div>
              <p className="text-3xl font-black text-[#D97706]">{totalRevenue.toLocaleString()} SYP</p>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#4A3728]/5">
              <div className="flex items-center gap-3 text-[#4A3728]/40 mb-2">
                <FileText size={20} />
                <span className="text-sm font-bold uppercase tracking-wider">Total Orders</span>
              </div>
              <p className="text-3xl font-black">{totalSalesCount}</p>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#4A3728]/5 flex flex-col justify-center">
              <button 
                onClick={exportOrdersToCSV}
                className="w-full bg-[#4A3728] text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-[#32251B] transition-all shadow-md"
              >
                <Download size={20} /> Export Filtered CSV
              </button>
              <button
                onClick={undoLastOrderChange}
                disabled={orderUndoStack.length === 0}
                className="mt-3 w-full bg-white border border-[#4A3728]/15 text-[#4A3728] py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-[#FDF8F3] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Undo2 size={18} /> Undo Last Order Change
              </button>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-4 mb-4">
            <div className="flex gap-1 overflow-x-auto bg-white p-1 rounded-xl border border-[#4A3728]/5 h-fit">
              {[
                { id: 'all', label: 'All' },
                { id: 'today', label: 'Today' },
                { id: 'yesterday', label: 'Yesterday' },
                { id: 'week', label: '7 Days' },
                { id: 'custom', label: 'Custom Range' }
              ].map(filter => (
                <button
                  key={filter.id}
                  onClick={() => setOrderDateFilter(filter.id as any)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                    orderDateFilter === filter.id 
                      ? 'bg-[#D97706] text-white shadow-sm' 
                      : 'text-[#4A3728]/60 hover:bg-[#FDF8F3]'
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>

            {orderDateFilter === 'custom' && (
              <div className="flex items-center gap-2 bg-white p-2 rounded-xl border border-[#4A3728]/5 animate-in slide-in-from-left duration-200">
                <input 
                  type="date" 
                  value={customDateRange.from}
                  onChange={(e) => setCustomDateRange(prev => ({ ...prev, from: e.target.value }))}
                  className="text-xs p-1 border rounded border-[#4A3728]/10"
                />
                <span className="text-[#4A3728]/40 text-xs">to</span>
                <input 
                  type="date" 
                  value={customDateRange.to}
                  onChange={(e) => setCustomDateRange(prev => ({ ...prev, to: e.target.value }))}
                  className="text-xs p-1 border rounded border-[#4A3728]/10"
                />
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl shadow-md border border-[#4A3728]/5 overflow-hidden">
            <div className="p-4 border-b border-[#4A3728]/5 bg-[#4A3728]/5 font-bold flex justify-between items-center">
              <span>Order List ({filteredOrders.length})</span>
              <span className="text-xs text-[#4A3728]/40">Showing: {orderDateFilter.toUpperCase()}</span>
            </div>
            <div className="divide-y divide-[#4A3728]/5 overflow-x-auto">
              {filteredOrders.length === 0 ? (
                <div className="p-10 text-center text-[#4A3728]/30">No orders found for this period.</div>
              ) : (
                filteredOrders.map(order => {
                  const isEditing = editingOrderId === order.id;
                  const activeOrder = isEditing && editingOrderDraft ? editingOrderDraft : order;

                  return (
                    <div key={order.id} className="p-4 hover:bg-[#FDF8F3]/50 transition-colors space-y-3">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="font-mono text-xs font-bold bg-[#4A3728]/5 px-2 py-1 rounded text-[#4A3728]/60">#{order.id.slice(-6)}</span>
                            <span className="text-sm text-[#4A3728]/40">{format(order.timestamp, 'MMM dd, HH:mm')}</span>
                            {order.paymentMethod === 'Card' ? <CreditCard size={14} className="text-blue-500" /> : <Banknote size={14} className="text-green-500" />}
                          </div>
                          <p className="text-sm">{activeOrder.items.map(i => `${i.quantity}x ${i.name}`).join(', ')}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-black text-[#D97706]">{activeOrder.total.toLocaleString()} SYP</p>
                        </div>
                      </div>

                      <div className="flex justify-end gap-2">
                        {isEditing ? (
                          <>
                            <button
                              onClick={saveOrderDraft}
                              className="px-3 py-1.5 rounded-lg text-sm font-bold bg-green-600 text-white hover:bg-green-700"
                            >
                              Save Order
                            </button>
                            <button
                              onClick={() => {
                                setEditingOrderId(null);
                                setEditingOrderDraft(null);
                              }}
                              className="px-3 py-1.5 rounded-lg text-sm font-bold bg-white border border-[#4A3728]/15 hover:bg-[#FDF8F3]"
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => startEditOrder(order)}
                              className="px-3 py-1.5 rounded-lg text-sm font-bold bg-white border border-[#4A3728]/15 hover:bg-[#FDF8F3] flex items-center gap-1"
                            >
                              <Edit2 size={14} /> Edit
                            </button>
                            <button
                              onClick={() => deleteOrder(order.id)}
                              className="px-3 py-1.5 rounded-lg text-sm font-bold bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 flex items-center gap-1"
                            >
                              <Trash2 size={14} /> Delete
                            </button>
                          </>
                        )}
                      </div>

                      {isEditing && editingOrderDraft && (
                        <div className="rounded-xl border border-[#4A3728]/10 bg-white p-3 space-y-2">
                          {editingOrderDraft.items.length === 0 && (
                            <p className="text-sm text-[#4A3728]/50">No items left in this order. Add from POS if needed.</p>
                          )}
                          {editingOrderDraft.items.map((item) => (
                            <div key={item.id} className="grid grid-cols-12 gap-2 items-center text-sm">
                              <span className="col-span-4 font-semibold truncate">{item.name}</span>
                              <input
                                type="number"
                                min={1}
                                value={item.quantity}
                                onChange={(e) => updateDraftItem(item.id, 'quantity', Number(e.target.value))}
                                className="col-span-2 rounded border border-[#4A3728]/15 px-2 py-1"
                              />
                              <input
                                type="number"
                                min={0}
                                step={1}
                                value={item.price}
                                onChange={(e) => updateDraftItem(item.id, 'price', Number(e.target.value))}
                                className="col-span-3 rounded border border-[#4A3728]/15 px-2 py-1"
                              />
                              <span className="col-span-2 text-right font-semibold">{item.subtotal.toLocaleString()} SYP</span>
                              <button
                                onClick={() => removeDraftItem(item.id)}
                                className="col-span-1 justify-self-end text-red-600 hover:text-red-700"
                                title="Remove item"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'menu' && (
        <div className="max-w-2xl mx-auto py-10">
          <div className="bg-white p-10 rounded-3xl shadow-xl border-2 border-dashed border-[#4A3728]/10 text-center">
            <div className="bg-[#D97706]/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
              <Upload size={32} className="text-[#D97706]" />
            </div>
            <h3 className="text-2xl font-bold mb-2">Upload Guest Menu Images</h3>
            <p className="text-[#4A3728]/60 mb-8">
              Upload the exact menu photos (multiple images). They will appear directly on the first guest page.
            </p>
            
            <label className="inline-block cursor-pointer bg-[#4A3728] text-white px-8 py-4 rounded-2xl font-bold hover:bg-[#32251B] transition-all shadow-lg">
              <input 
                type="file" 
                accept="image/*"
                multiple
                className="hidden" 
                onChange={handleMenuImagesUpload}
              />
              Select Menu Images
            </label>

            {menuImages.length > 0 && (
              <div className="mt-8 text-left">
                <div className="mb-3 p-3 bg-green-50 border border-green-100 rounded-xl text-green-700 font-bold text-sm">
                  {menuImages.length} menu image(s) active for guests.
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {menuImages.map((img, index) => (
                    <div key={index} className="relative rounded-xl overflow-hidden border border-[#4A3728]/10">
                      <img src={img} alt={`Menu ${index + 1}`} className="w-full h-36 object-cover" />
                      <button
                        onClick={() => removeMenuImage(index)}
                        className="absolute top-2 right-2 bg-white/90 text-red-600 rounded-full p-1"
                        title="Remove image"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-10 border-t pt-6">
              <p className="text-sm text-[#4A3728]/60 mb-4">Optional: keep PDF upload as fallback.</p>
              <label className="inline-block cursor-pointer bg-white border border-[#4A3728]/20 text-[#4A3728] px-6 py-3 rounded-xl font-bold hover:bg-[#FDF8F3] transition-all">
                <input
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={handleFileUpload}
                />
                Upload PDF Fallback
              </label>
              {pdfMenu && (
                <button
                  onClick={() => setPdfMenu(null)}
                  className="ml-3 text-sm text-red-600 underline"
                >
                  Remove PDF
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'system' && (
        <div className="max-w-2xl mx-auto py-10">
          <div className="bg-white p-10 rounded-3xl shadow-xl border border-[#4A3728]/10">
            <div className="flex items-center gap-3 mb-8 border-b pb-4">
              <Settings className="text-[#D97706]" size={24} />
              <h3 className="text-2xl font-bold">System Maintenance</h3>
            </div>

            <div className="space-y-8">
              <div>
                <h4 className="font-bold mb-2 flex items-center gap-2">
                  <Save size={18} className="text-[#4A3728]" /> 
                  Data Backup
                </h4>
                <p className="text-sm text-[#4A3728]/60 mb-4">
                  Download all your products, orders, and settings as a file. Use this to transfer data or keep a permanent copy.
                </p>
                <button 
                  onClick={handleBackup}
                  className="bg-[#4A3728] text-white px-6 py-2 rounded-xl font-bold hover:bg-[#32251B] transition-all"
                >
                  Download Full Backup (.json)
                </button>
              </div>

              <div className="pt-8 border-t">
                <h4 className="font-bold mb-2 flex items-center gap-2">
                  <RefreshCw size={18} className="text-[#4A3728]" /> 
                  Restore Data
                </h4>
                <p className="text-sm text-[#4A3728]/60 mb-4">
                  Upload a previously saved backup file. <span className="text-red-500 font-bold underline">Warning: This will delete all current data!</span>
                </p>
                <label className="inline-block cursor-pointer bg-white border-2 border-[#4A3728] text-[#4A3728] px-6 py-2 rounded-xl font-bold hover:bg-[#FDF8F3] transition-all">
                  <input 
                    type="file" 
                    accept=".json" 
                    className="hidden" 
                    onChange={handleRestore}
                  />
                  Upload & Restore Backup
                </label>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
