import { useEffect, useRef, useState } from 'react';
import { ShoppingCart, Settings, Menu as MenuIcon, LogOut, Coffee } from 'lucide-react';
import { POSView } from './components/POSView';
import { AdminView } from './components/AdminView';
import { GuestView } from './components/GuestView';
import { LoginView } from './components/LoginView';
import { AppStatePayload, Order, Product } from './types';
import { initialProducts } from './data/initialData';
import { isSupabaseConfigured, supabase } from './lib/supabase';

const APP_STATE_ID = 'palette-main';

const toPayload = (
  products: Product[],
  orders: Order[],
  pdfMenu: string | null,
  menuImages: string[]
): AppStatePayload => ({
  products,
  orders,
  pdfMenu,
  menuImages,
});

function App() {
  const [view, setView] = useState<'guest' | 'pos' | 'admin' | 'login'>('guest');
  const [loginTarget, setLoginTarget] = useState<'pos' | 'admin'>('pos');
  const [isLoggedIn, setIsLoggedIn] = useState<{ pos: boolean; admin: boolean }>({
    pos: false,
    admin: false,
  });

  const [products, setProducts] = useState<Product[]>(() => {
    const saved = localStorage.getItem('palette_products');
    return saved ? JSON.parse(saved) : initialProducts;
  });

  const [orders, setOrders] = useState<Order[]>(() => {
    const saved = localStorage.getItem('palette_orders');
    return saved ? JSON.parse(saved) : [];
  });

  const [pdfMenu, setPdfMenu] = useState<string | null>(() => {
    return localStorage.getItem('palette_pdf_menu');
  });

  const [menuImages, setMenuImages] = useState<string[]>(() => {
    const saved = localStorage.getItem('palette_menu_images');
    return saved ? JSON.parse(saved) : [];
  });

  const [cloudStatus, setCloudStatus] = useState<'disabled' | 'syncing' | 'ready' | 'error'>(
    isSupabaseConfigured ? 'syncing' : 'disabled'
  );
  const [lastCloudUpdateAt, setLastCloudUpdateAt] = useState<string | null>(null);
  const isApplyingCloudUpdate = useRef(false);
  const isCloudReady = useRef(!isSupabaseConfigured);

  // Local persistence fallback
  useEffect(() => {
    if (products.length > 0 || localStorage.getItem('palette_products')) {
      localStorage.setItem('palette_products', JSON.stringify(products));
    }
  }, [products]);

  useEffect(() => {
    localStorage.setItem('palette_orders', JSON.stringify(orders));
  }, [orders]);

  useEffect(() => {
    if (pdfMenu) {
      localStorage.setItem('palette_pdf_menu', pdfMenu);
    } else {
      localStorage.removeItem('palette_pdf_menu');
    }
  }, [pdfMenu]);

  useEffect(() => {
    if (menuImages.length > 0) {
      localStorage.setItem('palette_menu_images', JSON.stringify(menuImages));
    } else {
      localStorage.removeItem('palette_menu_images');
    }
  }, [menuImages]);

  // Initial cloud bootstrap
  useEffect(() => {
    if (!supabase) {
      return;
    }
    const client = supabase;
    let isCancelled = false;

    const bootstrapCloud = async () => {
      try {
        const { data, error } = await client
          .from('app_state')
          .select('payload, updated_at')
          .eq('id', APP_STATE_ID)
          .maybeSingle();

        if (error) throw error;

        if (!isCancelled && data?.payload) {
          const payload = data.payload as AppStatePayload;
          isApplyingCloudUpdate.current = true;
          setProducts(payload.products || initialProducts);
          setOrders(payload.orders || []);
          setPdfMenu(payload.pdfMenu || null);
          setMenuImages(payload.menuImages || []);
          setLastCloudUpdateAt(data.updated_at || null);
          setTimeout(() => {
            isApplyingCloudUpdate.current = false;
          }, 0);
        }

        if (!isCancelled && !data) {
          const seededPayload = toPayload(products, orders, pdfMenu, menuImages);
          const now = new Date().toISOString();
          const { error: insertError } = await client.from('app_state').upsert(
            {
              id: APP_STATE_ID,
              payload: seededPayload,
              updated_at: now,
            },
            { onConflict: 'id' }
          );

          if (insertError) throw insertError;
          setLastCloudUpdateAt(now);
        }

        if (!isCancelled) {
          isCloudReady.current = true;
          setCloudStatus('ready');
        }
      } catch {
        if (!isCancelled) {
          setCloudStatus('error');
        }
      }
    };

    bootstrapCloud();

    return () => {
      isCancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Push local changes to cloud
  useEffect(() => {
    if (!supabase || !isCloudReady.current || isApplyingCloudUpdate.current) {
      return;
    }

    const client = supabase;
    let isCancelled = false;

    const syncTimer = window.setTimeout(async () => {
      try {
        setCloudStatus('syncing');
        const now = new Date().toISOString();
        const payload = toPayload(products, orders, pdfMenu, menuImages);

        const { error } = await client.from('app_state').upsert(
          {
            id: APP_STATE_ID,
            payload,
            updated_at: now,
          },
          { onConflict: 'id' }
        );

        if (error) throw error;

        if (!isCancelled) {
          setCloudStatus('ready');
          setLastCloudUpdateAt(now);
        }
      } catch {
        if (!isCancelled) {
          setCloudStatus('error');
        }
      }
    }, 450);

    return () => {
      isCancelled = true;
      window.clearTimeout(syncTimer);
    };
  }, [products, orders, pdfMenu, menuImages]);

  // Pull remote changes periodically
  useEffect(() => {
    if (!supabase || !isCloudReady.current) {
      return;
    }
    const client = supabase;

    const pollInterval = window.setInterval(async () => {
      try {
        const { data, error } = await client
          .from('app_state')
          .select('payload, updated_at')
          .eq('id', APP_STATE_ID)
          .maybeSingle();

        if (error || !data?.payload || !data.updated_at) {
          return;
        }

        if (!lastCloudUpdateAt || new Date(data.updated_at).getTime() > new Date(lastCloudUpdateAt).getTime()) {
          const payload = data.payload as AppStatePayload;
          isApplyingCloudUpdate.current = true;
          setProducts(payload.products || initialProducts);
          setOrders(payload.orders || []);
          setPdfMenu(payload.pdfMenu || null);
          setMenuImages(payload.menuImages || []);
          setLastCloudUpdateAt(data.updated_at);
          setTimeout(() => {
            isApplyingCloudUpdate.current = false;
          }, 0);
        }
      } catch {
        // Ignore single poll errors
      }
    }, 5000);

    return () => {
      window.clearInterval(pollInterval);
    };
  }, [lastCloudUpdateAt]);

  const handleLogin = (target: 'pos' | 'admin') => {
    setLoginTarget(target);
    setView('login');
  };

  const handleLogout = () => {
    setIsLoggedIn({ pos: false, admin: false });
    setView('guest');
  };

  const addOrder = (order: Order) => {
    setOrders((prev) => [order, ...prev]);
  };

  return (
    <div className="min-h-screen bg-[#FDF8F3] text-[#4A3728] font-sans">
      <nav className="bg-[#4A3728] text-[#FDF8F3] px-4 py-2 flex justify-between items-center shadow-lg sticky top-0 z-50">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => setView('guest')}>
          <img
            src="/logo.png"
            alt="Palette Logo"
            className="h-12 w-12 object-contain bg-white/10 rounded-lg p-1"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
              (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
            }}
          />
          <div className="hidden bg-[#D97706] p-2 rounded-full">
            <Coffee size={24} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">PALETTE</h1>
        </div>

        <div className="flex gap-2">
          {view !== 'guest' && (
            <button
              onClick={() => setView('guest')}
              className="px-4 py-2 rounded-lg hover:bg-[#5D4636] transition-colors flex items-center gap-2"
            >
              <MenuIcon size={20} /> <span className="hidden sm:inline">Guest Menu</span>
            </button>
          )}

          {!isLoggedIn.pos ? (
            <button
              onClick={() => handleLogin('pos')}
              className="px-4 py-2 rounded-lg bg-[#D97706] hover:bg-[#B45309] transition-colors flex items-center gap-2"
            >
              <ShoppingCart size={20} /> <span className="hidden sm:inline">POS</span>
            </button>
          ) : (
            <button
              onClick={() => setView('pos')}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 ${view === 'pos' ? 'bg-[#D97706]' : 'hover:bg-[#5D4636]'}`}
            >
              <ShoppingCart size={20} /> <span className="hidden sm:inline">POS</span>
            </button>
          )}

          {!isLoggedIn.admin ? (
            <button
              onClick={() => handleLogin('admin')}
              className="px-4 py-2 rounded-lg border border-[#D97706] text-[#D97706] hover:bg-[#D97706] hover:text-white transition-all flex items-center gap-2"
            >
              <Settings size={20} /> <span className="hidden sm:inline">Admin</span>
            </button>
          ) : (
            <button
              onClick={() => setView('admin')}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 ${view === 'admin' ? 'bg-[#D97706]' : 'hover:bg-[#5D4636]'}`}
            >
              <Settings size={20} /> <span className="hidden sm:inline">Admin</span>
            </button>
          )}

          {(isLoggedIn.pos || isLoggedIn.admin) && (
            <button onClick={handleLogout} className="p-2 text-red-400 hover:text-red-300 transition-colors">
              <LogOut size={20} />
            </button>
          )}
        </div>
      </nav>

      <main className="container mx-auto p-4 md:p-6">
        {view === 'guest' && <GuestView pdfMenu={pdfMenu} menuImages={menuImages} />}

        {view === 'login' && (
          <LoginView
            target={loginTarget}
            onSuccess={() => {
              setIsLoggedIn((prev) => ({ ...prev, [loginTarget]: true }));
              setView(loginTarget);
            }}
            onCancel={() => setView('guest')}
          />
        )}

        {view === 'pos' && isLoggedIn.pos && (
          <POSView products={products} updateProducts={setProducts} onCompleteOrder={addOrder} />
        )}

        {view === 'admin' && isLoggedIn.admin && (
          <AdminView
            products={products}
            setProducts={setProducts}
            orders={orders}
            pdfMenu={pdfMenu}
            setPdfMenu={setPdfMenu}
            menuImages={menuImages}
            setMenuImages={setMenuImages}
          />
        )}
      </main>

      <footer className="text-center p-8 text-[#4A3728]/60 text-sm space-y-1">
        <div>
          Sync:{' '}
          {cloudStatus === 'disabled'
            ? 'Local only'
            : cloudStatus === 'ready'
              ? 'Cloud connected'
              : cloudStatus === 'syncing'
                ? 'Syncing...'
                : 'Cloud error'}
        </div>
        {lastCloudUpdateAt && <div>Last cloud update: {new Date(lastCloudUpdateAt).toLocaleString()}</div>}
        &copy; {new Date().getFullYear()} Palette Coffee Shop. All rights reserved.
      </footer>
    </div>
  );
}

export default App;