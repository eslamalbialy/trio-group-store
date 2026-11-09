/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { CheckCircle2, Lock, Store, X } from 'lucide-react';
import {
  AdminSession,
  AuditLog,
  CartItem,
  Category,
  GuestOrderInput,
  Locale,
  Order,
  OrderStatus,
  Product,
  SiteSettings,
  SupabaseConnectionConfig,
} from './types/schema';
import { supabaseService } from './services/supabaseService';
import { PublicHeader } from './components/PublicHeader';
import { PublicStorefront } from './components/PublicStorefront';
import { ProductDetailModal } from './components/ProductDetailModal';
import { CartCheckoutDrawer } from './components/CartCheckoutDrawer';
import { AdminPortal } from './components/AdminPortal';
import { useTranslations } from './i18n/translations';

interface ToastMessage {
  id: string;
  text: string;
  type: 'success' | 'error';
}

export default function App() {
  const [locale, setLocale] = useState<Locale>('en');
  const [viewMode, setViewMode] = useState<'public' | 'admin'>(() =>
    window.location.pathname.startsWith('/admin') ? 'admin' : 'public'
  );

  // Synchronized Persistent Application State
  const [adminSession, setAdminSession] = useState<AdminSession | null>(() =>
    supabaseService.getCurrentSession()
  );
  const [categories, setCategories] = useState<Category[]>(() =>
    supabaseService.getCategories()
  );
  const [products, setProducts] = useState<Product[]>(() =>
    supabaseService.getProducts()
  );
  const [orders, setOrders] = useState<Order[]>(() =>
    supabaseService.getOrders()
  );
  const [settings, setSettings] = useState<SiteSettings>(() =>
    supabaseService.getSiteSettings()
  );
  const [connectionConfig, setConnectionConfig] =
    useState<SupabaseConnectionConfig>(() =>
      supabaseService.getConnectionConfig()
    );
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() =>
    supabaseService.getAuditLogs(supabaseService.getCurrentSession())
  );

  // Public Storefront Interactive State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const t = useTranslations(locale);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr';
  }, [locale]);

  const pushToast = (text: string, type: 'success' | 'error' = 'success') => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    setToasts((prev) => [...prev, { id, text, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((item) => item.id !== id));
    }, 4000);
  };

  const refreshState = (sessionOverride?: AdminSession | null) => {
    const activeSession =
      sessionOverride !== undefined ? sessionOverride : adminSession;
    setCategories(supabaseService.getCategories());
    setProducts(supabaseService.getProducts());
    setOrders(supabaseService.getOrders());
    setSettings(supabaseService.getSiteSettings());
    setConnectionConfig(supabaseService.getConnectionConfig());
    setAuditLogs(supabaseService.getAuditLogs(activeSession));
  };

  const handleToggleLocale = () => {
    setLocale((prev) => (prev === 'en' ? 'ar' : 'en'));
  };

  const handleNavigateSection = (sectionId: string) => {
    if (viewMode !== 'public') {
      setViewMode('public');
      window.history.pushState({}, '', '/');
      setTimeout(() => {
        document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
      }, 60);
    } else {
      document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const switchMode = (target: 'public' | 'admin') => {
    setViewMode(target);
    window.history.pushState(
      {},
      '',
      target === 'admin' ? (adminSession ? '/admin' : '/admin/login') : '/'
    );
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // --- Cart & Checkout Handlers ---
  const handleAddToCart = (product: Product, quantity: number) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.product_id === product.id);
      if (existing) {
        return prev.map((i) =>
          i.product_id === product.id
            ? { ...i, quantity: i.quantity + quantity }
            : i
        );
      }
      return [...prev, { product_id: product.id, quantity }];
    });
    const title = locale === 'ar' ? product.title_ar : product.title_en;
    pushToast(
      locale === 'ar'
        ? `تمت إضافة "${title}" إلى سلة طلب الشراء`
        : `Added "${title}" to Purchase Request`
    );
    setIsCartOpen(true);
  };

  const handleUpdateCartQty = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      setCart((prev) => prev.filter((i) => i.product_id !== productId));
    } else {
      setCart((prev) =>
        prev.map((i) => (i.product_id === productId ? { ...i, quantity } : i))
      );
    }
  };

  const handleRemoveCartItem = (productId: string) => {
    setCart((prev) => prev.filter((i) => i.product_id !== productId));
  };

  const handleSubmitGuestOrder = (input: GuestOrderInput): Order => {
    const createdOrder = supabaseService.submitGuestOrder(input);
    setCart([]);
    refreshState();
    pushToast(
      locale === 'ar'
        ? `تم تسجيل طلب الشراء الرسمي رقم ${createdOrder.order_number}`
        : `Order Inquiry ${createdOrder.order_number} recorded`
    );
    return createdOrder;
  };

  // --- Admin Handlers ---
  const handleAdminLogin = (email: string, password: string) => {
    const session = supabaseService.authenticateAdmin(email, password);
    setAdminSession(session);
    window.history.pushState({}, '', '/admin');
    refreshState(session);
    pushToast(`Authenticated as ${session.role} (${session.email})`);
  };

  const handleAdminLogout = () => {
    supabaseService.signOutAdmin();
    setAdminSession(null);
    window.history.pushState({}, '', '/admin/login');
    refreshState(null);
    pushToast('Signed out of Executive Portal');
  };

  const handleSaveCategory = (
    payload: Omit<Category, 'id' | 'created_at' | 'updated_at'> & { id?: string }
  ) => {
    const saved = supabaseService.saveCategory(adminSession, payload);
    refreshState();
    pushToast(
      payload.id
        ? `Category "${saved.name_en}" updated`
        : `Category "${saved.name_en}" created`
    );
  };

  const handleDeleteCategory = (categoryId: string) => {
    try {
      supabaseService.deleteCategory(adminSession, categoryId);
      refreshState();
      pushToast('Category division deleted');
    } catch (err) {
      pushToast(
        err instanceof Error ? err.message : 'Unable to delete category',
        'error'
      );
    }
  };

  const handleSaveProduct = (
    payload: Omit<Product, 'id' | 'created_at' | 'updated_at'> & { id?: string }
  ) => {
    const saved = supabaseService.saveProduct(adminSession, payload);
    refreshState();
    pushToast(`Product [${saved.sku}] "${saved.title_en}" saved to catalog`);
  };

  const handleDeleteOrArchiveProduct = (productId: string) => {
    try {
      const res = supabaseService.deleteOrArchiveProduct(adminSession, productId);
      refreshState();
      if (res.mode === 'archived') {
        pushToast(
          `Product safely archived & deactivated (referenced in ${res.referencedOrderCount} historical order(s))`
        );
      } else {
        pushToast('Product permanently deleted from catalog');
      }
    } catch (err) {
      pushToast(
        err instanceof Error ? err.message : 'Unable to delete product',
        'error'
      );
    }
  };

  const handleUpdateOrderStatus = (
    orderId: string,
    status: OrderStatus,
    adminNotes: string
  ) => {
    try {
      const updated = supabaseService.updateOrderStatusAndNotes(
        adminSession,
        orderId,
        status,
        adminNotes
      );
      refreshState();
      pushToast(
        `Order ${updated.order_number} status updated to ${status}`
      );
    } catch (err) {
      pushToast(
        err instanceof Error ? err.message : 'Unable to update order',
        'error'
      );
    }
  };

  const handleSaveSettings = (newSettings: SiteSettings) => {
    try {
      supabaseService.saveSiteSettings(adminSession, newSettings);
      refreshState();
      pushToast('Company information & website settings saved');
    } catch (err) {
      pushToast(
        err instanceof Error ? err.message : 'Unable to save settings',
        'error'
      );
    }
  };

  const handleSaveConnectionConfig = (config: SupabaseConnectionConfig) => {
    try {
      supabaseService.saveConnectionConfig(adminSession, config);
      refreshState();
      pushToast(`Database engine mode set to ${config.mode}`);
    } catch (err) {
      pushToast(
        err instanceof Error ? err.message : 'Unable to save database config',
        'error'
      );
    }
  };

  const totalCartItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div dir={t.dir} className="min-h-screen w-full overflow-x-hidden flex flex-col">
      {viewMode === 'public' ? (
        <>
          <PublicHeader
            locale={locale}
            onToggleLocale={handleToggleLocale}
            cartCount={totalCartItems}
            onOpenCart={() => setIsCartOpen(true)}
            onNavigateSection={handleNavigateSection}
            settings={settings}
          />
          <PublicStorefront
            locale={locale}
            categories={categories}
            products={products}
            settings={settings}
            onSelectProduct={(prod) => setSelectedProduct(prod)}
            onAddToCart={handleAddToCart}
            onOpenAdminPortal={() => switchMode('admin')}
          />
          <ProductDetailModal
            product={selectedProduct}
            categories={categories}
            locale={locale}
            onClose={() => setSelectedProduct(null)}
            onAddToCart={handleAddToCart}
          />
          <CartCheckoutDrawer
            isOpen={isCartOpen}
            onClose={() => setIsCartOpen(false)}
            locale={locale}
            cart={cart}
            products={products}
            settings={settings}
            onUpdateQty={handleUpdateCartQty}
            onRemoveItem={handleRemoveCartItem}
            onSubmitOrder={handleSubmitGuestOrder}
          />
        </>
      ) : (
        <AdminPortal
          locale={locale}
          onToggleLocale={handleToggleLocale}
          session={adminSession}
          onLogin={handleAdminLogin}
          onLogout={handleAdminLogout}
          onReturnToStorefront={() => switchMode('public')}
          categories={categories}
          products={products}
          orders={orders}
          settings={settings}
          auditLogs={auditLogs}
          connectionConfig={connectionConfig}
          onSaveCategory={handleSaveCategory}
          onDeleteCategory={handleDeleteCategory}
          onSaveProduct={handleSaveProduct}
          onDeleteOrArchiveProduct={handleDeleteOrArchiveProduct}
          onUpdateOrderStatus={handleUpdateOrderStatus}
          onSaveSettings={handleSaveSettings}
          onSaveConnectionConfig={handleSaveConnectionConfig}
        />
      )}

      {/* Discreet Floating Preview Quick-Switch Bar (Bottom Corner) */}
      <div className="fixed bottom-4 end-4 z-40 flex items-center gap-1 p-1 bg-[#090D16]/95 text-white border border-[#C5A059]/40 rounded-md shadow-xl text-xs">
        <button
          type="button"
          onClick={() => switchMode('public')}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded font-semibold transition-colors cursor-pointer ${
            viewMode === 'public'
              ? 'bg-[#C5A059] text-[#090D16]'
              : 'text-slate-300 hover:text-white'
          }`}
        >
          <Store className="w-3.5 h-3.5" />
          <span>{t.nav.switchToPublic}</span>
        </button>
        <button
          type="button"
          onClick={() => switchMode('admin')}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded font-semibold transition-colors cursor-pointer ${
            viewMode === 'admin'
              ? 'bg-[#C5A059] text-[#090D16]'
              : 'text-slate-300 hover:text-white'
          }`}
        >
          <Lock className="w-3.5 h-3.5" />
          <span>{t.nav.switchToAdmin}</span>
        </button>
      </div>

      {/* Subtle Toast Notification Stack */}
      {toasts.length > 0 && (
        <div
          aria-live="polite"
          className="fixed bottom-16 end-4 z-50 flex flex-col gap-2 max-w-sm"
        >
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={`px-4 py-3 rounded-md shadow-lg border flex items-center justify-between gap-3 text-xs font-semibold ${
                toast.type === 'error'
                  ? 'bg-rose-950 text-rose-100 border-rose-500/40'
                  : 'bg-[#090D16] text-white border-[#C5A059]/50'
              }`}
            >
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#D4AF37] shrink-0" />
                <span>{toast.text}</span>
              </div>
              <button
                type="button"
                onClick={() =>
                  setToasts((prev) => prev.filter((item) => item.id !== toast.id))
                }
                aria-label="Dismiss notification"
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
