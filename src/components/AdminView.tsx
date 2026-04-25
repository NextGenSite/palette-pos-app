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
  RefreshCw
} from 'lucide-react';
import { Product, Order } from '../types';
import { format, isToday, isYesterday, subDays, startOfDay } from 'date-fns';

interface AdminViewProps {
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  orders: Order[];
  pdfMenu: string | null;
  setPdfMenu: (url: string | null) => void;
  menuImages: string[];
  setMenuImages: React.Dispatch<React.SetStateAction<string[]>>;
}

export const AdminView: React.FC<AdminViewProps> = ({ 
  products, 
  setProducts, 
  orders, 
  pdfMenu, 
  setPdfMenu,
  menuImages,
  setMenuImages
}) => {
  const [activeTab, setActiveTab] = useState<'products' | 'orders' | 'menu' | 'system'>('products');
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  
  // Filters
  const [productCategoryFilter, setProductCategoryFilter] = useState('All');
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
    category: 'Coffee'
  });

  const handleAddProduct = () => {
    if (newProduct.name && newProduct.price !== undefined) {
      const product: Product = {
        id: Math.random().toString(36).substr(2, 9),
        name: newProduct.name,
        price: newProduct.price,
        stock: newProduct.stock || 0,
        category: newProduct.category || 'Coffee'
      };
      setProducts([...products, product]);
      setNewProduct({ name: '', price: 0, stock: 0, category: 'Coffee' });
      setIsAddingProduct(false);
    }
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

  // Filtered Data
  const filteredProducts = products.filter(p => 
    productCategoryFilter === 'All' || p.category === productCategoryFilter
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

  const adminCategories = ['All', ...new Set(products.map(p => p.category))];

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
                  <th className="p-4">Stock</th>
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
                        <option>Coffee</option>
                        <option>Pastry</option>
                        <option>Drinks</option>
                        <option>Snacks</option>
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
                    <td className="p-4">
                      <input 
                        type="number"
                        className="w-full p-2 rounded border border-[#4A3728]/20"
                        placeholder="0"
                        value={newProduct.stock}
                        onChange={e => setNewProduct({...newProduct, stock: parseInt(e.target.value)})}
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
                          <option>Coffee</option>
                          <option>Pastry</option>
                          <option>Drinks</option>
                          <option>Snacks</option>
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
                    <td className="p-4">
                      {editingProductId === product.id ? (
                        <input 
                          type="number"
                          className="w-16 p-1 border border-[#D97706] rounded"
                          value={editingProduct?.stock || 0}
                          onChange={e => setEditingProduct(prev => prev ? {...prev, stock: parseInt(e.target.value)} : null)}
                        />
                      ) : (
                        <span className={`${product.stock < 10 ? 'text-red-500 font-bold' : ''}`}>
                          {product.stock}
                        </span>
                      )}
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
                filteredOrders.map(order => (
                  <div key={order.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-[#FDF8F3]/50 transition-colors">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-xs font-bold bg-[#4A3728]/5 px-2 py-1 rounded text-[#4A3728]/60">#{order.id.slice(-6)}</span>
                        <span className="text-sm text-[#4A3728]/40">{format(order.timestamp, 'MMM dd, HH:mm')}</span>
                        {order.paymentMethod === 'Card' ? <CreditCard size={14} className="text-blue-500" /> : <Banknote size={14} className="text-green-500" />}
                      </div>
                      <p className="text-sm">
                        {order.items.map(i => `${i.quantity}x ${i.name}`).join(', ')}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-[#D97706]">{order.total.toLocaleString()} SYP</p>
                      <p className="text-[10px] text-[#4A3728]/40">Incl. {order.tax.toLocaleString()} SYP tax</p>
                    </div>
                  </div>
                ))
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
