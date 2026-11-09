import React, { useEffect, useState } from 'react';
import {
  Archive,
  ArrowLeft,
  Building2,
  Check,
  Clock,
  Copy,
  Database,
  Edit3,
  Eye,
  FolderTree,
  Globe,
  KeyRound,
  LayoutDashboard,
  Lock,
  LogOut,
  Mail,
  Menu,
  Package,
  Phone,
  Plus,
  Search,
  Settings,
  ShieldAlert,
  ShieldCheck,
  ShoppingBag,
  Trash2,
  X,
} from 'lucide-react';
import {
  AdminSession,
  AuditLog,
  Category,
  Locale,
  Order,
  OrderStatus,
  Product,
  SiteSettings,
  SupabaseConnectionConfig,
} from '../types/schema';
import { useTranslations } from '../i18n/translations';
import {
  calculateExecutiveKPIs,
  evaluateProductDeletionPolicy,
  formatNewYorkDateTime,
  formatUSD,
  hasRole,
  VALID_ORDER_STATUSES,
} from '../utils/commerceRules';
import { SQL_MIGRATIONS } from '../services/sqlMigrations';
import { AdminProductModal } from './AdminProductModal';

interface AdminPortalProps {
  locale: Locale;
  onToggleLocale: () => void;
  session: AdminSession | null;
  onLogin: (email: string, password: string) => void;
  onLogout: () => void;
  onReturnToStorefront: () => void;
  categories: Category[];
  products: Product[];
  orders: Order[];
  settings: SiteSettings;
  auditLogs: AuditLog[];
  connectionConfig: SupabaseConnectionConfig;
  onSaveCategory: (
    payload: Omit<Category, 'id' | 'created_at' | 'updated_at'> & { id?: string }
  ) => void;
  onDeleteCategory: (id: string) => void;
  onSaveProduct: (
    payload: Omit<Product, 'id' | 'created_at' | 'updated_at'> & { id?: string }
  ) => void;
  onDeleteOrArchiveProduct: (id: string) => void;
  onUpdateOrderStatus: (
    orderId: string,
    status: OrderStatus,
    adminNotes: string
  ) => void;
  onSaveSettings: (settings: SiteSettings) => void;
  onSaveConnectionConfig: (config: SupabaseConnectionConfig) => void;
}

type AdminTab =
  | 'overview'
  | 'products'
  | 'categories'
  | 'orders'
  | 'settings'
  | 'security';

export const AdminPortal: React.FC<AdminPortalProps> = ({
  locale,
  onToggleLocale,
  session,
  onLogin,
  onLogout,
  onReturnToStorefront,
  categories,
  products,
  orders,
  settings,
  auditLogs,
  connectionConfig,
  onSaveCategory,
  onDeleteCategory,
  onSaveProduct,
  onDeleteOrArchiveProduct,
  onUpdateOrderStatus,
  onSaveSettings,
  onSaveConnectionConfig,
}) => {
  const t = useTranslations(locale);
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [nyClock, setNyClock] = useState(() =>
    formatNewYorkDateTime(new Date(), locale)
  );

  // Login State
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);

  // Product Management State
  const [productSearch, setProductSearch] = useState('');
  const [productFilterStatus, setProductFilterStatus] = useState<
    'all' | 'active' | 'inactive' | 'archived'
  >('all');
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [confirmDeleteProduct, setConfirmDeleteProduct] =
    useState<Product | null>(null);

  // Category Management State
  const [categorySearch, setCategorySearch] = useState('');
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [catNameEn, setCatNameEn] = useState('');
  const [catNameAr, setCatNameAr] = useState('');
  const [catSlug, setCatSlug] = useState('');
  const [catDescEn, setCatDescEn] = useState('');
  const [catDescAr, setCatDescAr] = useState('');
  const [catIsActive, setCatIsActive] = useState(true);
  const [catError, setCatError] = useState<string | null>(null);

  // Order Management State
  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState<OrderStatus | 'all'>(
    'all'
  );
  const [inspectingOrder, setInspectingOrder] = useState<Order | null>(null);
  const [modalOrderStatus, setModalOrderStatus] =
    useState<OrderStatus>('pending');
  const [modalAdminNotes, setModalAdminNotes] = useState('');

  // Settings Form State
  const [settingsDraft, setSettingsDraft] = useState<SiteSettings>(settings);

  // Supabase Connection & SQL Inspector State
  const [connDraft, setConnDraft] =
    useState<SupabaseConnectionConfig>(connectionConfig);
  const [selectedSqlTab, setSelectedSqlTab] = useState(SQL_MIGRATIONS[0].id);
  const [copiedSqlId, setCopiedSqlId] = useState<string | null>(null);

  useEffect(() => {
    setSettingsDraft(settings);
  }, [settings]);

  useEffect(() => {
    setConnDraft(connectionConfig);
  }, [connectionConfig]);

  useEffect(() => {
    const timer = setInterval(() => {
      setNyClock(formatNewYorkDateTime(new Date(), locale));
    }, 15000);
    setNyClock(formatNewYorkDateTime(new Date(), locale));
    return () => clearInterval(timer);
  }, [locale]);

  // ============================================================================
  // 1. LOGIN SCREEN (/admin/login) WITH OWNER / DEMO CREDENTIALS CARD
  // ============================================================================
  if (!session) {
    const handleLoginSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      setLoginError(null);
      try {
        onLogin(loginEmail, loginPassword);
      } catch (err) {
        setLoginError(
          err instanceof Error ? err.message : 'Authentication failed.'
        );
      }
    };

    return (
      <div className="min-h-screen bg-[#090D16] text-white flex flex-col justify-between p-4 sm:p-8">
        <div className="max-w-[1440px] w-full mx-auto flex items-center justify-between">
          <button
            type="button"
            onClick={onReturnToStorefront}
            className="inline-flex items-center gap-2 text-xs sm:text-sm font-medium text-slate-300 hover:text-[#D4AF37] transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{t.admin.backToStorefront}</span>
          </button>

          <button
            type="button"
            onClick={onToggleLocale}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-200 hover:text-[#D4AF37] border border-white/15 rounded cursor-pointer"
          >
            <Globe className="w-3.5 h-3.5 text-[#C5A059]" />
            <span>{t.nav.languageToggle}</span>
          </button>
        </div>

        <div className="max-w-md w-full mx-auto my-8 space-y-6">
          <div className="bg-[#0F172A] border border-white/15 rounded-lg p-6 sm:p-8 shadow-2xl space-y-6">
            <div className="space-y-2 text-center">
              <div className="w-12 h-12 mx-auto rounded-full bg-[#C5A059]/15 border border-[#C5A059]/40 flex items-center justify-center text-[#D4AF37]">
                <Lock className="w-5 h-5" />
              </div>
              <p className="text-[11px] font-mono-tabular tracking-widest text-[#D4AF37]">
                TRIO GROUP – TGC CORPORATION
              </p>
              <h1 className="text-2xl font-serif-display font-bold text-white">
                {t.admin.loginTitle}
              </h1>
              <p className="text-xs text-slate-400">{t.admin.loginSubtitle}</p>
            </div>

            {loginError && (
              <div
                role="alert"
                className="p-3 bg-rose-950/70 border border-rose-500/40 rounded text-xs text-rose-200"
              >
                {loginError}
              </div>
            )}

            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="admin-login-email"
                  className="block text-xs font-medium text-slate-300 mb-1"
                >
                  {t.admin.emailLabel}
                </label>
                <input
                  id="admin-login-email"
                  type="email"
                  required
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="owner@triogroup-us.com"
                  className="w-full px-3.5 py-2.5 text-sm bg-[#090D16] border border-white/20 rounded-md text-white focus:outline-none focus:border-[#C5A059]"
                />
              </div>

              <div>
                <label
                  htmlFor="admin-login-password"
                  className="block text-xs font-medium text-slate-300 mb-1"
                >
                  {t.admin.passwordLabel}
                </label>
                <input
                  id="admin-login-password"
                  type="password"
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••••••••••"
                  className="w-full px-3.5 py-2.5 text-sm bg-[#090D16] border border-white/20 rounded-md text-white focus:outline-none focus:border-[#C5A059]"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 px-5 text-sm font-semibold text-[#090D16] bg-[#C5A059] hover:bg-[#D4AF37] rounded-md transition-colors cursor-pointer"
              >
                {t.admin.signInBtn}
              </button>
            </form>
          </div>

          {/* Demo / Owner Credentials Card for Immediate Testing */}
          <div className="bg-[#0F172A] border border-[#C5A059]/40 rounded-lg p-5 space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#D4AF37]">
              <KeyRound className="w-4 h-4" />
              <span>{t.admin.demoCardTitle}</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              {t.admin.demoCardDesc}
            </p>
            <div className="grid grid-cols-1 gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setLoginEmail('owner@triogroup-us.com');
                  setLoginPassword('TGC-SuperAdmin-2026!');
                  setLoginError(null);
                }}
                className="w-full text-start px-3.5 py-2.5 text-xs bg-[#090D16] hover:bg-white/5 border border-white/15 rounded flex items-center justify-between gap-2 transition-colors cursor-pointer"
              >
                <div>
                  <strong className="block text-white">
                    {t.admin.fillSuperAdmin}
                  </strong>
                  <span className="font-mono-tabular text-slate-400">
                    owner@triogroup-us.com · super_admin
                  </span>
                </div>
                <span className="text-[#D4AF37] font-semibold shrink-0">
                  Auto-Fill
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setLoginEmail('admin@triogroup-us.com');
                  setLoginPassword('TGC-Admin-2026!');
                  setLoginError(null);
                }}
                className="w-full text-start px-3.5 py-2.5 text-xs bg-[#090D16] hover:bg-white/5 border border-white/15 rounded flex items-center justify-between gap-2 transition-colors cursor-pointer"
              >
                <div>
                  <strong className="block text-white">
                    {t.admin.fillCatalogAdmin}
                  </strong>
                  <span className="font-mono-tabular text-slate-400">
                    admin@triogroup-us.com · admin
                  </span>
                </div>
                <span className="text-[#D4AF37] font-semibold shrink-0">
                  Auto-Fill
                </span>
              </button>
            </div>
          </div>
        </div>

        <div className="text-center text-xs text-slate-500 font-mono-tabular">
          TRIO GROUP – TGC CORPORATION · America/New_York · {nyClock}
        </div>
      </div>
    );
  }

  // ============================================================================
  // 2. AUTHENTICATED EXECUTIVE DASHBOARD (/admin)
  // ============================================================================
  const kpis = calculateExecutiveKPIs(products, categories, orders);
  const isSuperAdmin = hasRole(session.role, 'super_admin');

  const filteredProducts = products.filter((p) => {
    if (productFilterStatus === 'active' && (!p.is_active || p.is_archived))
      return false;
    if (productFilterStatus === 'inactive' && (p.is_active || p.is_archived))
      return false;
    if (productFilterStatus === 'archived' && !p.is_archived) return false;
    if (!productSearch.trim()) return true;
    const q = productSearch.toLowerCase();
    return (
      p.sku.toLowerCase().includes(q) ||
      p.title_en.toLowerCase().includes(q) ||
      p.title_ar.toLowerCase().includes(q)
    );
  });

  const filteredCategories = categories.filter((c) => {
    if (!categorySearch.trim()) return true;
    const q = categorySearch.toLowerCase();
    return (
      c.name_en.toLowerCase().includes(q) ||
      c.name_ar.toLowerCase().includes(q) ||
      c.slug.toLowerCase().includes(q)
    );
  });

  const filteredOrders = orders.filter((o) => {
    if (orderStatusFilter !== 'all' && o.status !== orderStatusFilter)
      return false;
    if (!orderSearch.trim()) return true;
    const q = orderSearch.toLowerCase();
    return (
      o.order_number.toLowerCase().includes(q) ||
      o.customer_name.toLowerCase().includes(q) ||
      o.customer_email.toLowerCase().includes(q) ||
      o.customer_phone.toLowerCase().includes(q)
    );
  });

  const startEditCategory = (cat: Category) => {
    setEditingCategoryId(cat.id);
    setCatNameEn(cat.name_en);
    setCatNameAr(cat.name_ar);
    setCatSlug(cat.slug);
    setCatDescEn(cat.description_en);
    setCatDescAr(cat.description_ar);
    setCatIsActive(cat.is_active);
    setCatError(null);
  };

  const resetCategoryForm = () => {
    setEditingCategoryId(null);
    setCatNameEn('');
    setCatNameAr('');
    setCatSlug('');
    setCatDescEn('');
    setCatDescAr('');
    setCatIsActive(true);
    setCatError(null);
  };

  const handleCategorySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCatError(null);
    try {
      onSaveCategory({
        id: editingCategoryId || undefined,
        name_en: catNameEn,
        name_ar: catNameAr,
        slug: catSlug,
        description_en: catDescEn,
        description_ar: catDescAr,
        is_active: catIsActive,
      });
      resetCategoryForm();
    } catch (err) {
      setCatError(err instanceof Error ? err.message : 'Error saving category');
    }
  };

  const openOrderInspector = (order: Order) => {
    setInspectingOrder(order);
    setModalOrderStatus(order.status);
    setModalAdminNotes(order.admin_notes || '');
  };

  const handleSaveOrderInspector = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inspectingOrder) return;
    onUpdateOrderStatus(inspectingOrder.id, modalOrderStatus, modalAdminNotes);
    setInspectingOrder(null);
  };

  const addWhyChoosePoint = () => {
    setSettingsDraft((prev) => ({
      ...prev,
      why_choose_us: [
        ...prev.why_choose_us,
        {
          id: `why_${Date.now()}`,
          title_en: '',
          title_ar: '',
          desc_en: '',
          desc_ar: '',
        },
      ],
    }));
  };

  const navItems: Array<{
    id: AdminTab;
    label: string;
    icon: React.FC<{ className?: string }>;
  }> = [
    { id: 'overview', label: t.admin.tabs.overview, icon: LayoutDashboard },
    { id: 'products', label: t.admin.tabs.products, icon: Package },
    { id: 'categories', label: t.admin.tabs.categories, icon: FolderTree },
    { id: 'orders', label: t.admin.tabs.orders, icon: ShoppingBag },
    { id: 'settings', label: t.admin.tabs.settings, icon: Settings },
    { id: 'security', label: t.admin.tabs.security, icon: ShieldCheck },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] flex flex-col lg:flex-row">
      {/* Sidebar Navigation (260px Desktop + Slide-Over Mobile) */}
      <aside className="w-full lg:w-64 bg-[#090D16] text-white border-b lg:border-b-0 lg:border-e border-white/10 shrink-0 flex flex-col justify-between">
        <div>
          <div className="p-5 border-b border-white/10 flex items-center justify-between">
            <div>
              <p className="text-xs font-mono-tabular text-[#D4AF37] tracking-wider">
                TRIO GROUP · TGC
              </p>
              <h1 className="text-base font-serif-display font-bold text-white mt-0.5">
                Executive Portal
              </h1>
            </div>
            <button
              type="button"
              onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
              aria-label="Toggle Admin Navigation"
              className="lg:hidden p-2 text-slate-300 hover:text-white border border-white/15 rounded"
            >
              {mobileSidebarOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>
          </div>

          <nav
            aria-label="Admin Portal Navigation"
            className={`${
              mobileSidebarOpen ? 'block' : 'hidden'
            } lg:block p-3 space-y-1`}
          >
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setActiveTab(item.id);
                    setMobileSidebarOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-[#C5A059] text-[#090D16]'
                      : 'text-slate-300 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="hidden lg:block p-4 border-t border-white/10 space-y-3 text-xs">
          <div className="p-3 bg-white/5 rounded border border-white/10 space-y-1">
            <span className="text-[11px] text-slate-400 block">
              Authenticated Role
            </span>
            <strong className="font-mono-tabular text-[#D4AF37] block">
              {session.role}
            </strong>
            <span className="text-[11px] text-slate-300 truncate block">
              {session.email}
            </span>
          </div>

          <button
            type="button"
            onClick={onReturnToStorefront}
            className="w-full py-2 px-3 text-xs font-semibold text-slate-200 hover:text-[#D4AF37] border border-white/15 rounded flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>{t.admin.backToStorefront}</span>
          </button>

          <button
            type="button"
            onClick={onLogout}
            className="w-full py-2 px-3 text-xs font-semibold text-rose-300 hover:text-rose-200 border border-rose-500/30 rounded flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>{t.admin.logout}</span>
          </button>
        </div>
      </aside>

      {/* Main Content Workspace */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Executive Bar */}
        <header className="bg-white border-b border-slate-200 px-4 sm:px-8 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-xs text-slate-600">
            <span className="font-semibold text-[#090D16]">
              TRIO GROUP – TGC CORPORATION
            </span>
            <span aria-hidden="true">/</span>
            <span className="font-medium text-[#8A6D3B]">
              {navItems.find((i) => i.id === activeTab)?.label}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs">
            <div className="inline-flex items-center gap-1.5 text-slate-600 font-mono-tabular">
              <Clock className="w-3.5 h-3.5 text-[#C5A059]" />
              <span>NY: {nyClock}</span>
            </div>

            <button
              type="button"
              onClick={onToggleLocale}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 font-medium text-slate-700 hover:text-slate-950 border border-slate-300 rounded cursor-pointer"
            >
              <Globe className="w-3.5 h-3.5 text-[#C5A059]" />
              <span>{t.nav.languageToggle}</span>
            </button>

            <button
              type="button"
              onClick={onReturnToStorefront}
              className="px-3 py-1.5 font-semibold text-[#090D16] bg-[#C5A059] hover:bg-[#D4AF37] rounded cursor-pointer"
            >
              {t.admin.backToStorefront}
            </button>

            <button
              type="button"
              onClick={onLogout}
              className="lg:hidden px-2.5 py-1.5 font-semibold text-rose-700 border border-rose-200 rounded cursor-pointer"
            >
              {t.admin.logout}
            </button>
          </div>
        </header>

        {/* Active Module Viewport */}
        <main className="p-4 sm:p-8 flex-1 space-y-8 max-w-[1400px] w-full mx-auto">
          {/* MODULE 1: EXECUTIVE OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-8">
              {/* Real-Time KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                <div className="p-5 bg-white border border-slate-200 rounded-lg space-y-1">
                  <span className="text-xs text-slate-500">
                    {t.admin.kpis.activeProducts}
                  </span>
                  <p
                    data-testid="kpi-active-products"
                    className="text-3xl font-mono-tabular font-bold text-[#090D16]"
                  >
                    {kpis.activeProductsCount}
                  </p>
                  <span className="text-[11px] text-slate-500 font-mono-tabular block">
                    Total: {kpis.totalProductsCount} · Inactive/Archived:{' '}
                    {kpis.inactiveOrArchivedProductsCount}
                  </span>
                </div>

                <div className="p-5 bg-white border border-slate-200 rounded-lg space-y-1">
                  <span className="text-xs text-slate-500">
                    {t.admin.kpis.activeCategories}
                  </span>
                  <p
                    data-testid="kpi-active-categories"
                    className="text-3xl font-mono-tabular font-bold text-[#090D16]"
                  >
                    {kpis.activeCategoriesCount}
                  </p>
                  <span className="text-[11px] text-slate-500 font-mono-tabular block">
                    Total Divisions: {kpis.totalCategoriesCount}
                  </span>
                </div>

                <div className="p-5 bg-white border border-slate-200 rounded-lg space-y-1">
                  <span className="text-xs text-slate-500">
                    {t.admin.kpis.openInquiries}
                  </span>
                  <p
                    data-testid="kpi-open-inquiries"
                    className="text-3xl font-mono-tabular font-bold text-amber-700"
                  >
                    {kpis.openInquiriesCount}
                  </p>
                  <span className="text-[11px] text-slate-500 font-mono-tabular block">
                    Total Inquiries Recorded: {kpis.totalOrdersCount}
                  </span>
                </div>

                <div className="p-5 bg-white border border-slate-200 rounded-lg space-y-1">
                  <span className="text-xs text-slate-500">
                    {t.admin.kpis.totalVolumeUsd}
                  </span>
                  <p
                    data-testid="kpi-total-volume-usd"
                    className="text-3xl font-mono-tabular font-bold text-emerald-700"
                  >
                    {formatUSD(kpis.totalRequestedVolumeUsd)}
                  </p>
                  <span className="text-[11px] text-slate-500 block">
                    Strict USD ($) Settlement Volume
                  </span>
                </div>
              </div>

              {/* Quick Actions Bar */}
              <div className="p-6 bg-white border border-slate-200 rounded-lg flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-base font-serif-display font-bold text-[#090D16]">
                    {t.admin.quickActions.title}
                  </h2>
                  <p className="text-xs text-slate-500">
                    Publish real categories, products, and verified contact channels.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setActiveTab('categories')}
                    className="px-4 py-2 text-xs font-semibold text-white bg-[#090D16] hover:bg-slate-800 rounded cursor-pointer"
                  >
                    {t.admin.quickActions.newCategory}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (categories.length === 0) {
                        setActiveTab('categories');
                      } else {
                        setEditingProduct(null);
                        setIsProductModalOpen(true);
                      }
                    }}
                    className="px-4 py-2 text-xs font-semibold text-[#090D16] bg-[#C5A059] hover:bg-[#D4AF37] rounded cursor-pointer"
                  >
                    {t.admin.quickActions.newProduct}
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('settings')}
                    className="px-4 py-2 text-xs font-semibold text-slate-700 hover:text-slate-950 border border-slate-300 rounded cursor-pointer"
                  >
                    {t.admin.quickActions.companyInfo}
                  </button>
                </div>
              </div>

              {/* Recent Order Inquiries Table */}
              <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-[#090D16]">
                    Recent Order Inquiries (America/New_York)
                  </h3>
                  <button
                    type="button"
                    onClick={() => setActiveTab('orders')}
                    className="text-xs font-semibold text-[#8A6D3B] hover:underline cursor-pointer"
                  >
                    View All Inquiries ({orders.length})
                  </button>
                </div>

                {orders.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-500">
                    No customer order inquiries have been submitted yet.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-start text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                        <tr>
                          <th className="py-3 px-4 text-start font-semibold">
                            Reference #
                          </th>
                          <th className="py-3 px-4 text-start font-semibold">
                            Customer
                          </th>
                          <th className="py-3 px-4 text-start font-semibold">
                            NY Timestamp
                          </th>
                          <th className="py-3 px-4 text-start font-semibold">
                            Status
                          </th>
                          <th className="py-3 px-4 text-end font-semibold">
                            Subtotal (USD)
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {orders.slice(0, 5).map((ord) => (
                          <tr
                            key={ord.id}
                            onClick={() => {
                              setActiveTab('orders');
                              openOrderInspector(ord);
                            }}
                            className="hover:bg-slate-50 cursor-pointer"
                          >
                            <td className="py-3 px-4 font-mono-tabular font-bold text-[#090D16]">
                              {ord.order_number}
                            </td>
                            <td className="py-3 px-4">
                              <span className="font-semibold text-slate-900 block">
                                {ord.customer_name}
                              </span>
                              <span className="text-slate-500">
                                {ord.customer_email}
                              </span>
                            </td>
                            <td className="py-3 px-4 font-mono-tabular text-slate-600">
                              {formatNewYorkDateTime(ord.created_at, locale)}
                            </td>
                            <td className="py-3 px-4 font-semibold text-slate-800">
                              {t.orderStatuses[ord.status]}
                            </td>
                            <td className="py-3 px-4 text-end font-mono-tabular font-bold text-[#090D16]">
                              {formatUSD(ord.subtotal_usd)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* MODULE 2: PRODUCT MANAGEMENT */}
          {activeTab === 'products' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-serif-display font-bold text-[#090D16]">
                    Catalog Product Management (USD)
                  </h2>
                  <p className="text-xs text-slate-600">
                    Create, edit, toggle visibility, or safely archive TRIO GROUP products.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (categories.length === 0) {
                      setActiveTab('categories');
                    } else {
                      setEditingProduct(null);
                      setIsProductModalOpen(true);
                    }
                  }}
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-[#090D16] bg-[#C5A059] hover:bg-[#D4AF37] rounded-md cursor-pointer shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>
                    {categories.length === 0
                      ? 'Create a Category First to Add Products'
                      : '+ Add New Product'}
                  </span>
                </button>
              </div>

              {/* Search & Status Filter */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 border border-slate-200 rounded-lg">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute top-1/2 -translate-y-1/2 start-3" />
                  <input
                    type="search"
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    placeholder="Search products by SKU, English title, or Arabic title..."
                    className="w-full ps-9 pe-4 py-2 text-xs border border-slate-300 rounded"
                  />
                </div>

                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded">
                  {(['all', 'active', 'inactive', 'archived'] as const).map(
                    (st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setProductFilterStatus(st)}
                        className={`px-3 py-1.5 text-xs font-semibold rounded capitalize cursor-pointer ${
                          productFilterStatus === st
                            ? 'bg-white text-[#090D16] shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {st}
                      </button>
                    )
                  )}
                </div>
              </div>

              {/* Products Table */}
              <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                {filteredProducts.length === 0 ? (
                  <div className="p-10 text-center space-y-3">
                    <p className="text-sm font-semibold text-slate-800">
                      No products found in this view.
                    </p>
                    {categories.length === 0 ? (
                      <button
                        type="button"
                        onClick={() => setActiveTab('categories')}
                        className="px-4 py-2 text-xs font-semibold text-white bg-[#090D16] rounded cursor-pointer"
                      >
                        Step 1: Create Your First Category Division
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingProduct(null);
                          setIsProductModalOpen(true);
                        }}
                        className="px-4 py-2 text-xs font-semibold text-[#090D16] bg-[#C5A059] rounded cursor-pointer"
                      >
                        + Publish First Product
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-start">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                        <tr>
                          <th className="py-3 px-4 text-start font-semibold">
                            Product / SKU
                          </th>
                          <th className="py-3 px-4 text-start font-semibold">
                            Bilingual Titles (EN / AR)
                          </th>
                          <th className="py-3 px-4 text-start font-semibold">
                            Division
                          </th>
                          <th className="py-3 px-4 text-end font-semibold">
                            USD Price
                          </th>
                          <th className="py-3 px-4 text-center font-semibold">
                            Active Status
                          </th>
                          <th className="py-3 px-4 text-end font-semibold">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {filteredProducts.map((prod) => {
                          const cat = categories.find(
                            (c) => c.id === prod.category_id
                          );
                          const thumb = prod.images?.[0]?.url;
                          return (
                            <tr key={prod.id} className="hover:bg-slate-50">
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-3">
                                  {thumb ? (
                                    <img
                                      src={thumb}
                                      alt={prod.title_en}
                                      referrerPolicy="no-referrer"
                                      className="w-10 h-10 rounded object-cover border border-slate-200 shrink-0"
                                    />
                                  ) : (
                                    <div className="w-10 h-10 rounded bg-[#090D16] text-[#D4AF37] flex items-center justify-center shrink-0">
                                      <Building2 className="w-4 h-4" />
                                    </div>
                                  )}
                                  <div>
                                    <span className="font-mono-tabular font-bold text-[#090D16] block">
                                      {prod.sku}
                                    </span>
                                    <span className="text-[11px] text-slate-500">
                                      {prod.images.length} img ·{' '}
                                      {prod.specs.length} specs
                                    </span>
                                  </div>
                                </div>
                              </td>
                              <td className="py-3 px-4">
                                <p className="font-semibold text-slate-900">
                                  {prod.title_en}
                                </p>
                                <p
                                  dir="rtl"
                                  className="text-slate-600 text-start"
                                >
                                  {prod.title_ar}
                                </p>
                              </td>
                              <td className="py-3 px-4 text-slate-700">
                                {cat ? `${cat.name_en} / ${cat.name_ar}` : '—'}
                              </td>
                              <td className="py-3 px-4 text-end font-mono-tabular font-bold text-[#090D16]">
                                {formatUSD(prod.price_usd)}
                              </td>
                              <td className="py-3 px-4 text-center">
                                {prod.is_archived ? (
                                  <span className="text-amber-700 font-semibold">
                                    Archived
                                  </span>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      onSaveProduct({
                                        ...prod,
                                        is_active: !prod.is_active,
                                      })
                                    }
                                    className={`px-2.5 py-1 rounded text-[11px] font-semibold cursor-pointer ${
                                      prod.is_active
                                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                        : 'bg-slate-100 text-slate-600 border border-slate-200'
                                    }`}
                                  >
                                    {prod.is_active ? 'Active' : 'Inactive'}
                                  </button>
                                )}
                              </td>
                              <td className="py-3 px-4 text-end">
                                <div className="inline-flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingProduct(prod);
                                      setIsProductModalOpen(true);
                                    }}
                                    aria-label={`Edit ${prod.title_en}`}
                                    className="p-1.5 text-slate-600 hover:text-[#090D16] border border-slate-200 rounded cursor-pointer"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setConfirmDeleteProduct(prod)}
                                    aria-label={`Delete or archive ${prod.title_en}`}
                                    className="p-1.5 text-rose-600 hover:text-rose-800 border border-rose-200 rounded cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* MODULE 3: CATEGORY MANAGEMENT */}
          {activeTab === 'categories' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Create / Edit Category Form */}
              <form
                onSubmit={handleCategorySubmit}
                className="lg:col-span-5 bg-white border border-slate-200 rounded-lg p-6 space-y-4"
              >
                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                  <h2 className="text-lg font-serif-display font-bold text-[#090D16]">
                    {editingCategoryId
                      ? 'Edit Category Division'
                      : 'Create New Category Division'}
                  </h2>
                  {editingCategoryId && (
                    <button
                      type="button"
                      onClick={resetCategoryForm}
                      className="text-xs text-slate-500 hover:text-slate-900 cursor-pointer"
                    >
                      Reset
                    </button>
                  )}
                </div>

                {catError && (
                  <div
                    role="alert"
                    className="p-3 bg-rose-50 border border-rose-200 rounded text-xs font-medium text-rose-700"
                  >
                    {catError}
                  </div>
                )}

                <div>
                  <label
                    htmlFor="cat-name-en"
                    className="block text-xs font-semibold text-slate-700 mb-1"
                  >
                    Category Name (English) *
                  </label>
                  <input
                    id="cat-name-en"
                    type="text"
                    required
                    value={catNameEn}
                    onChange={(e) => setCatNameEn(e.target.value)}
                    placeholder="e.g. Executive Architectural Systems"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded"
                  />
                </div>

                <div dir="rtl">
                  <label
                    htmlFor="cat-name-ar"
                    className="block text-xs font-semibold text-slate-700 mb-1"
                  >
                    اسم القسم (بالعربية) *
                  </label>
                  <input
                    id="cat-name-ar"
                    type="text"
                    required
                    value={catNameAr}
                    onChange={(e) => setCatNameAr(e.target.value)}
                    placeholder="مثال: الأنظمة المعمارية التنفيذية"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded"
                  />
                </div>

                <div>
                  <label
                    htmlFor="cat-slug"
                    className="block text-xs font-semibold text-slate-700 mb-1"
                  >
                    URL Slug (Auto-generated if left blank)
                  </label>
                  <input
                    id="cat-slug"
                    type="text"
                    value={catSlug}
                    onChange={(e) => setCatSlug(e.target.value)}
                    placeholder="executive-architectural-systems"
                    className="w-full px-3 py-2 text-xs font-mono-tabular border border-slate-300 rounded"
                  />
                </div>

                <div>
                  <label
                    htmlFor="cat-desc-en"
                    className="block text-xs font-semibold text-slate-700 mb-1"
                  >
                    Description (English)
                  </label>
                  <textarea
                    id="cat-desc-en"
                    rows={2}
                    value={catDescEn}
                    onChange={(e) => setCatDescEn(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded"
                  />
                </div>

                <div dir="rtl">
                  <label
                    htmlFor="cat-desc-ar"
                    className="block text-xs font-semibold text-slate-700 mb-1"
                  >
                    وصف القسم (بالعربية)
                  </label>
                  <textarea
                    id="cat-desc-ar"
                    rows={2}
                    value={catDescAr}
                    onChange={(e) => setCatDescAr(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded"
                  />
                </div>

                <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={catIsActive}
                    onChange={(e) => setCatIsActive(e.target.checked)}
                  />
                  <span>Active on Public Storefront</span>
                </label>

                <button
                  type="submit"
                  className="w-full py-2.5 px-4 text-xs font-semibold text-[#090D16] bg-[#C5A059] hover:bg-[#D4AF37] rounded cursor-pointer"
                >
                  {editingCategoryId ? 'Update Category' : 'Save Category Division'}
                </button>
              </form>

              {/* Categories List */}
              <div className="lg:col-span-7 space-y-4">
                <div className="bg-white p-4 border border-slate-200 rounded-lg flex items-center justify-between gap-4">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-400 absolute top-1/2 -translate-y-1/2 start-3" />
                    <input
                      type="search"
                      value={categorySearch}
                      onChange={(e) => setCategorySearch(e.target.value)}
                      placeholder="Search categories..."
                      className="w-full ps-9 pe-4 py-2 text-xs border border-slate-300 rounded"
                    />
                  </div>
                  <span className="text-xs font-mono-tabular text-slate-500">
                    {filteredCategories.length} divisions
                  </span>
                </div>

                <div className="bg-white border border-slate-200 rounded-lg divide-y divide-slate-200">
                  {filteredCategories.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-500">
                      No categories created yet. Use the form to create the first TRIO GROUP division.
                    </div>
                  ) : (
                    filteredCategories.map((cat) => {
                      const linkedCount = products.filter(
                        (p) => p.category_id === cat.id
                      ).length;
                      return (
                        <div
                          key={cat.id}
                          className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 text-xs">
                              <span className="font-mono-tabular text-[#8A6D3B] font-semibold">
                                /{cat.slug}
                              </span>
                              <span aria-hidden="true">·</span>
                              <span className="font-mono-tabular text-slate-500">
                                {linkedCount} linked products
                              </span>
                            </div>
                            <h3 className="text-sm font-bold text-[#090D16]">
                              {cat.name_en} ·{' '}
                              <span dir="rtl">{cat.name_ar}</span>
                            </h3>
                            {cat.description_en && (
                              <p className="text-xs text-slate-600">
                                {cat.description_en}
                              </p>
                            )}
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() =>
                                onSaveCategory({
                                  ...cat,
                                  is_active: !cat.is_active,
                                })
                              }
                              className={`px-2.5 py-1 rounded text-[11px] font-semibold cursor-pointer ${
                                cat.is_active
                                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                  : 'bg-slate-100 text-slate-600 border border-slate-200'
                              }`}
                            >
                              {cat.is_active ? 'Active' : 'Inactive'}
                            </button>
                            <button
                              type="button"
                              onClick={() => startEditCategory(cat)}
                              aria-label={`Edit category ${cat.name_en}`}
                              className="p-1.5 text-slate-600 hover:text-slate-900 border border-slate-200 rounded cursor-pointer"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onDeleteCategory(cat.id)}
                              aria-label={`Delete category ${cat.name_en}`}
                              className="p-1.5 text-rose-600 hover:text-rose-800 border border-rose-200 rounded cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          )}

          {/* MODULE 4: ORDER INQUIRIES MANAGEMENT */}
          {activeTab === 'orders' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-serif-display font-bold text-[#090D16]">
                  Customer Order Inquiries Management
                </h2>
                <p className="text-xs text-slate-600">
                  Inspect historical product snapshots, contact buyers directly, and manage commercial inquiry statuses (America/New_York).
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 border border-slate-200 rounded-lg">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute top-1/2 -translate-y-1/2 start-3" />
                  <input
                    type="search"
                    value={orderSearch}
                    onChange={(e) => setOrderSearch(e.target.value)}
                    placeholder="Search by TGC- reference, customer name, email, or phone..."
                    className="w-full ps-9 pe-4 py-2 text-xs border border-slate-300 rounded"
                  />
                </div>

                <select
                  aria-label="Filter by Order Status"
                  value={orderStatusFilter}
                  onChange={(e) =>
                    setOrderStatusFilter(e.target.value as OrderStatus | 'all')
                  }
                  className="px-3 py-2 text-xs border border-slate-300 rounded bg-white"
                >
                  <option value="all">All Statuses ({orders.length})</option>
                  {VALID_ORDER_STATUSES.map((st) => (
                    <option key={st} value={st}>
                      {t.orderStatuses[st]}
                    </option>
                  ))}
                </select>
              </div>

              <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                {filteredOrders.length === 0 ? (
                  <div className="p-10 text-center text-xs text-slate-500">
                    No matching order inquiries found.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-start">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                        <tr>
                          <th className="py-3 px-4 text-start font-semibold">
                            Reference #
                          </th>
                          <th className="py-3 px-4 text-start font-semibold">
                            Customer & Contact
                          </th>
                          <th className="py-3 px-4 text-start font-semibold">
                            Submitted (America/New_York)
                          </th>
                          <th className="py-3 px-4 text-start font-semibold">
                            Status
                          </th>
                          <th className="py-3 px-4 text-end font-semibold">
                            Snapshot Total (USD)
                          </th>
                          <th className="py-3 px-4 text-end font-semibold">
                            Action
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {filteredOrders.map((ord) => (
                          <tr key={ord.id} className="hover:bg-slate-50">
                            <td className="py-3 px-4 font-mono-tabular font-bold text-[#090D16]">
                              {ord.order_number}
                            </td>
                            <td className="py-3 px-4">
                              <strong className="text-slate-900 block">
                                {ord.customer_name}
                              </strong>
                              <span className="text-slate-500">
                                {ord.customer_email} · {ord.customer_phone}
                              </span>
                            </td>
                            <td className="py-3 px-4 font-mono-tabular text-slate-600">
                              {formatNewYorkDateTime(ord.created_at, locale)}
                            </td>
                            <td className="py-3 px-4 font-semibold">
                              <span
                                className={
                                  ord.status === 'confirmed' ||
                                  ord.status === 'completed'
                                    ? 'text-emerald-700'
                                    : ord.status === 'cancelled'
                                      ? 'text-rose-700'
                                      : 'text-amber-700'
                                }
                              >
                                {t.orderStatuses[ord.status]}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-end font-mono-tabular font-bold text-[#090D16]">
                              {formatUSD(ord.subtotal_usd)}
                            </td>
                            <td className="py-3 px-4 text-end">
                              <button
                                type="button"
                                onClick={() => openOrderInspector(ord)}
                                className="px-3 py-1.5 text-xs font-semibold text-[#090D16] bg-[#C5A059] hover:bg-[#D4AF37] rounded cursor-pointer"
                              >
                                Inspect & Manage
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* MODULE 5: COMPANY INFORMATION & WEBSITE SETTINGS */}
          {activeTab === 'settings' && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                onSaveSettings(settingsDraft);
              }}
              className="bg-white border border-slate-200 rounded-lg p-6 space-y-6"
            >
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
                <div>
                  <h2 className="text-2xl font-serif-display font-bold text-[#090D16]">
                    Company Information & Verified Contact Channels
                  </h2>
                  <p className="text-xs text-slate-600">
                    Updates immediately reflect on the public Homepage, Contact section, and Footer.
                  </p>
                </div>
                <button
                  type="submit"
                  className="px-6 py-2.5 text-xs font-semibold text-[#090D16] bg-[#C5A059] hover:bg-[#D4AF37] rounded cursor-pointer"
                >
                  Save Verified Company Settings
                </button>
              </div>

              {/* Verified Contact Channels */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label
                    htmlFor="set-email"
                    className="block text-xs font-semibold text-slate-700 mb-1"
                  >
                    Official Corporate Email
                  </label>
                  <input
                    id="set-email"
                    type="email"
                    value={settingsDraft.contact_email}
                    onChange={(e) =>
                      setSettingsDraft({
                        ...settingsDraft,
                        contact_email: e.target.value,
                      })
                    }
                    placeholder="executive@triogroup-us.com"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded"
                  />
                </div>
                <div>
                  <label
                    htmlFor="set-phone"
                    className="block text-xs font-semibold text-slate-700 mb-1"
                  >
                    US Telephone Number
                  </label>
                  <input
                    id="set-phone"
                    type="text"
                    value={settingsDraft.contact_phone}
                    onChange={(e) =>
                      setSettingsDraft({
                        ...settingsDraft,
                        contact_phone: e.target.value,
                      })
                    }
                    placeholder="+1 (212) 555-0100"
                    className="w-full px-3 py-2 text-xs font-mono-tabular border border-slate-300 rounded"
                  />
                </div>
                <div>
                  <label
                    htmlFor="set-whatsapp"
                    className="block text-xs font-semibold text-slate-700 mb-1"
                  >
                    Executive WhatsApp Line
                  </label>
                  <input
                    id="set-whatsapp"
                    type="text"
                    value={settingsDraft.contact_whatsapp}
                    onChange={(e) =>
                      setSettingsDraft({
                        ...settingsDraft,
                        contact_whatsapp: e.target.value,
                      })
                    }
                    placeholder="+1 (212) 555-0199"
                    className="w-full px-3 py-2 text-xs font-mono-tabular border border-slate-300 rounded"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="set-addr-en"
                    className="block text-xs font-semibold text-slate-700 mb-1"
                  >
                    US Headquarters Address (English)
                  </label>
                  <input
                    id="set-addr-en"
                    type="text"
                    value={settingsDraft.headquarters_address_en}
                    onChange={(e) =>
                      setSettingsDraft({
                        ...settingsDraft,
                        headquarters_address_en: e.target.value,
                      })
                    }
                    placeholder="One World Trade Center, Suite 4500, New York, NY 10007"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded"
                  />
                </div>
                <div dir="rtl">
                  <label
                    htmlFor="set-addr-ar"
                    className="block text-xs font-semibold text-slate-700 mb-1"
                  >
                    عنوان المقر الرئيسي في الولايات المتحدة (بالعربية)
                  </label>
                  <input
                    id="set-addr-ar"
                    type="text"
                    value={settingsDraft.headquarters_address_ar}
                    onChange={(e) =>
                      setSettingsDraft({
                        ...settingsDraft,
                        headquarters_address_ar: e.target.value,
                      })
                    }
                    placeholder="مركز التجارة العالمي الأول، جناح 4500، نيويورك، NY 10007"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="set-hours-en"
                    className="block text-xs font-semibold text-slate-700 mb-1"
                  >
                    Business Hours (English · America/New_York)
                  </label>
                  <input
                    id="set-hours-en"
                    type="text"
                    value={settingsDraft.business_hours_en}
                    onChange={(e) =>
                      setSettingsDraft({
                        ...settingsDraft,
                        business_hours_en: e.target.value,
                      })
                    }
                    placeholder="Monday – Friday: 9:00 AM – 6:00 PM EST"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded"
                  />
                </div>
                <div dir="rtl">
                  <label
                    htmlFor="set-hours-ar"
                    className="block text-xs font-semibold text-slate-700 mb-1"
                  >
                    ساعات العمل (بالعربية · توقيت نيويورك)
                  </label>
                  <input
                    id="set-hours-ar"
                    type="text"
                    value={settingsDraft.business_hours_ar}
                    onChange={(e) =>
                      setSettingsDraft({
                        ...settingsDraft,
                        business_hours_ar: e.target.value,
                      })
                    }
                    placeholder="الإثنين – الجمعة: 9:00 صباحاً – 6:00 مساءً بتوقيت نيويورك"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded"
                  />
                </div>
              </div>

              {/* Hero Headlines & Corporate Profile */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-200">
                <div>
                  <label
                    htmlFor="set-hero-en"
                    className="block text-xs font-semibold text-slate-700 mb-1"
                  >
                    Homepage Hero Headline (English)
                  </label>
                  <input
                    id="set-hero-en"
                    type="text"
                    value={settingsDraft.hero_headline_en}
                    onChange={(e) =>
                      setSettingsDraft({
                        ...settingsDraft,
                        hero_headline_en: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded"
                  />
                </div>
                <div dir="rtl">
                  <label
                    htmlFor="set-hero-ar"
                    className="block text-xs font-semibold text-slate-700 mb-1"
                  >
                    عنوان الواجهة الرئيسية (بالعربية)
                  </label>
                  <input
                    id="set-hero-ar"
                    type="text"
                    value={settingsDraft.hero_headline_ar}
                    onChange={(e) =>
                      setSettingsDraft({
                        ...settingsDraft,
                        hero_headline_ar: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="set-about-en"
                    className="block text-xs font-semibold text-slate-700 mb-1"
                  >
                    Verified Company Introduction (English)
                  </label>
                  <textarea
                    id="set-about-en"
                    rows={3}
                    value={settingsDraft.about_en}
                    onChange={(e) =>
                      setSettingsDraft({
                        ...settingsDraft,
                        about_en: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded"
                  />
                </div>
                <div dir="rtl">
                  <label
                    htmlFor="set-about-ar"
                    className="block text-xs font-semibold text-slate-700 mb-1"
                  >
                    النبذة التعريفية المعتمدة للشركة (بالعربية)
                  </label>
                  <textarea
                    id="set-about-ar"
                    rows={3}
                    value={settingsDraft.about_ar}
                    onChange={(e) =>
                      setSettingsDraft({
                        ...settingsDraft,
                        about_ar: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded"
                  />
                </div>
              </div>

              {/* Dynamic "Why Choose TRIO GROUP" Manager */}
              <div className="pt-4 border-t border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-[#090D16] uppercase tracking-wider">
                    Verified Value Propositions ("Why Choose TRIO GROUP")
                  </h3>
                  <button
                    type="button"
                    onClick={addWhyChoosePoint}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-[#090D16] rounded cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Value Proposition</span>
                  </button>
                </div>

                {settingsDraft.why_choose_us.map((pt, idx) => (
                  <div
                    key={pt.id}
                    className="p-3 bg-slate-50 border border-slate-200 rounded grid grid-cols-1 sm:grid-cols-12 gap-2 items-start"
                  >
                    <input
                      type="text"
                      value={pt.title_en}
                      onChange={(e) => {
                        const copy = [...settingsDraft.why_choose_us];
                        copy[idx] = { ...copy[idx], title_en: e.target.value };
                        setSettingsDraft({
                          ...settingsDraft,
                          why_choose_us: copy,
                        });
                      }}
                      placeholder="Title (EN)"
                      className="sm:col-span-3 px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded"
                    />
                    <input
                      type="text"
                      value={pt.desc_en}
                      onChange={(e) => {
                        const copy = [...settingsDraft.why_choose_us];
                        copy[idx] = { ...copy[idx], desc_en: e.target.value };
                        setSettingsDraft({
                          ...settingsDraft,
                          why_choose_us: copy,
                        });
                      }}
                      placeholder="Description (EN)"
                      className="sm:col-span-3 px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded"
                    />
                    <input
                      type="text"
                      dir="rtl"
                      value={pt.title_ar}
                      onChange={(e) => {
                        const copy = [...settingsDraft.why_choose_us];
                        copy[idx] = { ...copy[idx], title_ar: e.target.value };
                        setSettingsDraft({
                          ...settingsDraft,
                          why_choose_us: copy,
                        });
                      }}
                      placeholder="العنوان (AR)"
                      className="sm:col-span-2 px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded"
                    />
                    <input
                      type="text"
                      dir="rtl"
                      value={pt.desc_ar}
                      onChange={(e) => {
                        const copy = [...settingsDraft.why_choose_us];
                        copy[idx] = { ...copy[idx], desc_ar: e.target.value };
                        setSettingsDraft({
                          ...settingsDraft,
                          why_choose_us: copy,
                        });
                      }}
                      placeholder="الوصف (AR)"
                      className="sm:col-span-3 px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setSettingsDraft({
                          ...settingsDraft,
                          why_choose_us: settingsDraft.why_choose_us.filter(
                            (w) => w.id !== pt.id
                          ),
                        })
                      }
                      aria-label="Delete value proposition"
                      className="sm:col-span-1 p-1.5 text-rose-600 hover:text-rose-800 justify-self-end cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </form>
          )}

          {/* MODULE 6: SUPER ADMIN SECURITY, AUDIT LOGS & SUPABASE SQL SCHEMA */}
          {activeTab === 'security' && (
            <div className="space-y-8">
              {!isSuperAdmin ? (
                <div className="p-10 bg-white border border-rose-200 rounded-lg text-center space-y-3 max-w-xl mx-auto">
                  <ShieldAlert className="w-10 h-10 text-rose-600 mx-auto" />
                  <h2 className="text-xl font-serif-display font-bold text-[#090D16]">
                    Restricted to Super Administrator (Owner)
                  </h2>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Server-side role verification (`public.has_role(auth.uid(), 'super_admin')`) blocked access because your current session role is{' '}
                    <strong className="font-mono-tabular">{session.role}</strong>. Sign in as{' '}
                    <strong className="font-mono-tabular">
                      owner@triogroup-us.com
                    </strong>{' '}
                    to inspect Audit Logs and Supabase SQL Migrations.
                  </p>
                </div>
              ) : (
                <>
                  {/* Supabase Live Connection Panel */}
                  <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                      <div className="flex items-center gap-2">
                        <Database className="w-5 h-5 text-[#C5A059]" />
                        <h2 className="text-lg font-serif-display font-bold text-[#090D16]">
                          Database Engine & Supabase Connection Configuration
                        </h2>
                      </div>
                      <span className="text-xs font-mono-tabular text-emerald-700 font-semibold">
                        Active Mode: {connectionConfig.mode}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label
                          htmlFor="sb-url"
                          className="block text-xs font-semibold text-slate-700 mb-1"
                        >
                          NEXT_PUBLIC_SUPABASE_URL
                        </label>
                        <input
                          id="sb-url"
                          type="text"
                          value={connDraft.url}
                          onChange={(e) =>
                            setConnDraft({ ...connDraft, url: e.target.value })
                          }
                          placeholder="https://xyzcompany.supabase.co"
                          className="w-full px-3 py-2 text-xs font-mono-tabular border border-slate-300 rounded"
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="sb-key"
                          className="block text-xs font-semibold text-slate-700 mb-1"
                        >
                          NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
                        </label>
                        <input
                          id="sb-key"
                          type="password"
                          value={connDraft.publishableKey}
                          onChange={(e) =>
                            setConnDraft({
                              ...connDraft,
                              publishableKey: e.target.value,
                            })
                          }
                          placeholder="eyJhbGciOiJIUzI1NiIsInR5c..."
                          className="w-full px-3 py-2 text-xs font-mono-tabular border border-slate-300 rounded"
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="sb-mode"
                          className="block text-xs font-semibold text-slate-700 mb-1"
                        >
                          Persistence Engine Mode
                        </label>
                        <div className="flex gap-2">
                          <select
                            id="sb-mode"
                            value={connDraft.mode}
                            onChange={(e) =>
                              setConnDraft({
                                ...connDraft,
                                mode: e.target.value as
                                  | 'local_persistent'
                                  | 'supabase_live',
                              })
                            }
                            className="flex-1 px-3 py-2 text-xs border border-slate-300 rounded"
                          >
                            <option value="local_persistent">
                              Zero-Config Persistent Engine
                            </option>
                            <option value="supabase_live">
                              Live Supabase Connection
                            </option>
                          </select>
                          <button
                            type="button"
                            onClick={() => onSaveConnectionConfig(connDraft)}
                            className="px-4 py-2 text-xs font-semibold text-[#090D16] bg-[#C5A059] hover:bg-[#D4AF37] rounded cursor-pointer"
                          >
                            Apply
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Production PostgreSQL Migrations Inspector */}
                  <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                    <div className="px-6 py-4 bg-[#090D16] text-white flex flex-wrap items-center justify-between gap-4">
                      <div>
                        <h3 className="text-base font-serif-display font-bold">
                          Production PostgreSQL Schema, RBAC & RLS Migrations
                        </h3>
                        <p className="text-xs text-slate-400">
                          Ready-to-run Supabase SQL scripts for all 11 tables, SECURITY DEFINER RPCs, and Storage policies.
                        </p>
                      </div>
                    </div>

                    <div className="border-b border-slate-200 bg-slate-50 px-4 py-2 flex flex-wrap gap-2">
                      {SQL_MIGRATIONS.map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setSelectedSqlTab(m.id)}
                          className={`px-3 py-1.5 text-xs font-mono-tabular font-semibold rounded cursor-pointer ${
                            selectedSqlTab === m.id
                              ? 'bg-[#090D16] text-[#D4AF37]'
                              : 'text-slate-700 hover:bg-slate-200'
                          }`}
                        >
                          {m.filename}
                        </button>
                      ))}
                    </div>

                    {SQL_MIGRATIONS.filter((m) => m.id === selectedSqlTab).map(
                      (script) => (
                        <div key={script.id} className="p-6 space-y-4">
                          <div className="flex flex-wrap items-center justify-between gap-4">
                            <div>
                              <h4 className="text-sm font-bold text-[#090D16]">
                                {locale === 'ar'
                                  ? script.title_ar
                                  : script.title_en}
                              </h4>
                              <p className="text-xs text-slate-600">
                                {locale === 'ar'
                                  ? script.description_ar
                                  : script.description_en}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard?.writeText(script.sql);
                                setCopiedSqlId(script.id);
                                setTimeout(() => setCopiedSqlId(null), 2000);
                              }}
                              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#090D16] bg-[#C5A059] hover:bg-[#D4AF37] rounded cursor-pointer"
                            >
                              {copiedSqlId === script.id ? (
                                <>
                                  <Check className="w-3.5 h-3.5" />
                                  <span>Copied SQL</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3.5 h-3.5" />
                                  <span>Copy SQL Migration</span>
                                </>
                              )}
                            </button>
                          </div>

                          <pre className="p-4 bg-[#090D16] text-slate-200 rounded-md text-xs font-mono-tabular overflow-x-auto max-h-96 leading-relaxed">
                            <code>{script.sql}</code>
                          </pre>
                        </div>
                      )
                    )}
                  </div>

                  {/* Live Chronological Audit Trail (audit_logs) */}
                  <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                      <h3 className="text-sm font-bold text-[#090D16]">
                        Live Administrative Audit Logs (America/New_York)
                      </h3>
                      <span className="text-xs font-mono-tabular text-slate-500">
                        {auditLogs.length} events logged
                      </span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-start">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                          <tr>
                            <th className="py-3 px-4 text-start font-semibold">
                              NY Timestamp
                            </th>
                            <th className="py-3 px-4 text-start font-semibold">
                              Actor & Role
                            </th>
                            <th className="py-3 px-4 text-start font-semibold">
                              Action
                            </th>
                            <th className="py-3 px-4 text-start font-semibold">
                              Details
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {auditLogs.map((log) => (
                            <tr key={log.id} className="hover:bg-slate-50">
                              <td className="py-2.5 px-4 font-mono-tabular text-slate-600 whitespace-nowrap">
                                {formatNewYorkDateTime(log.created_at, locale)}
                              </td>
                              <td className="py-2.5 px-4">
                                <span className="font-semibold text-slate-900">
                                  {log.actor_email}
                                </span>{' '}
                                <span className="font-mono-tabular text-[#8A6D3B]">
                                  ({log.actor_role})
                                </span>
                              </td>
                              <td className="py-2.5 px-4 font-mono-tabular font-semibold text-[#090D16]">
                                {log.action}
                              </td>
                              <td className="py-2.5 px-4 text-slate-700">
                                {log.details}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </main>
      </div>

      {/* Product Create/Edit Modal */}
      {isProductModalOpen && (
        <AdminProductModal
          isOpen={isProductModalOpen}
          onClose={() => {
            setIsProductModalOpen(false);
            setEditingProduct(null);
          }}
          locale={locale}
          categories={categories}
          editingProduct={editingProduct}
          onSaveProduct={onSaveProduct}
        />
      )}

      {/* Safe Product Deletion / Archiving Confirmation Modal */}
      {confirmDeleteProduct && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Confirm Product Deletion or Archiving"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#090D16]/75 backdrop-blur-xs"
        >
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-lg p-6 space-y-4 shadow-xl">
            {(() => {
              const policy = evaluateProductDeletionPolicy(
                confirmDeleteProduct.id,
                orders
              );
              return (
                <>
                  <div className="flex items-center gap-2 text-sm font-bold text-[#090D16]">
                    <Archive className="w-5 h-5 text-[#C5A059]" />
                    <span>
                      {policy.canHardDelete
                        ? 'Confirm Product Deletion'
                        : 'Historical Order Integrity Protection'}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed">
                    {policy.canHardDelete
                      ? `Product [${confirmDeleteProduct.sku}] "${confirmDeleteProduct.title_en}" has not been referenced in any customer orders and will be permanently removed.`
                      : `Product [${confirmDeleteProduct.sku}] "${confirmDeleteProduct.title_en}" is referenced in ${policy.referencedOrderCount} historical order(s). To protect immutable order snapshots, hard deletion is blocked and this item will be safely archived and deactivated instead.`}
                  </p>

                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteProduct(null)}
                      className="px-4 py-2 text-xs font-semibold text-slate-700 border border-slate-300 rounded cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onDeleteOrArchiveProduct(confirmDeleteProduct.id);
                        setConfirmDeleteProduct(null);
                      }}
                      className="px-4 py-2 text-xs font-semibold text-white bg-rose-700 hover:bg-rose-800 rounded cursor-pointer"
                    >
                      {policy.canHardDelete
                        ? 'Permanently Delete'
                        : 'Safely Archive & Deactivate'}
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* Order Detail Inspector Modal */}
      {inspectingOrder && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Order Inspector ${inspectingOrder.order_number}`}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#090D16]/75 backdrop-blur-xs overflow-y-auto"
        >
          <div className="w-full max-w-3xl bg-white border border-slate-200 rounded-lg shadow-2xl overflow-hidden my-auto max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 bg-[#090D16] text-white flex items-center justify-between shrink-0">
              <div>
                <span className="text-xs font-mono-tabular text-[#D4AF37]">
                  Official Order Inquiry · America/New_York
                </span>
                <h3 className="text-lg font-mono-tabular font-bold">
                  {inspectingOrder.order_number}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setInspectingOrder(null)}
                aria-label="Close order inspector"
                className="p-1.5 text-slate-300 hover:text-white border border-white/15 rounded cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={handleSaveOrderInspector}
              className="p-6 overflow-y-auto space-y-6 flex-1"
            >
              {/* Customer & Shipping Information */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-slate-50 border border-slate-200 rounded-md text-xs">
                <div className="space-y-1.5">
                  <span className="text-slate-500 font-semibold block">
                    Customer & Direct Contact
                  </span>
                  <p className="text-sm font-bold text-[#090D16]">
                    {inspectingOrder.customer_name}
                  </p>
                  <a
                    href={`mailto:${inspectingOrder.customer_email}`}
                    className="inline-flex items-center gap-1.5 text-slate-700 hover:text-[#8A6D3B] font-medium block"
                  >
                    <Mail className="w-3.5 h-3.5 text-[#C5A059]" />
                    <span>{inspectingOrder.customer_email}</span>
                  </a>
                  <a
                    href={`tel:${inspectingOrder.customer_phone}`}
                    className="inline-flex items-center gap-1.5 text-slate-700 hover:text-[#8A6D3B] font-mono-tabular font-medium block"
                  >
                    <Phone className="w-3.5 h-3.5 text-[#C5A059]" />
                    <span>{inspectingOrder.customer_phone}</span>
                  </a>
                </div>

                <div className="space-y-1.5">
                  <span className="text-slate-500 font-semibold block">
                    Delivery Destination & Metadata
                  </span>
                  <p className="font-medium text-slate-900">
                    {inspectingOrder.shipping_address}
                  </p>
                  <p className="text-slate-700">
                    {inspectingOrder.city}, {inspectingOrder.state_zip}
                  </p>
                  <p className="text-slate-500 font-mono-tabular">
                    Submitted: {formatNewYorkDateTime(inspectingOrder.created_at, locale)}{' '}
                    · Locale: {inspectingOrder.locale.toUpperCase()}
                  </p>
                </div>

                {inspectingOrder.notes && (
                  <div className="sm:col-span-2 pt-2 border-t border-slate-200">
                    <span className="text-slate-500 font-semibold block">
                      Customer Commercial Notes:
                    </span>
                    <p className="text-slate-800 mt-0.5">
                      {inspectingOrder.notes}
                    </p>
                  </div>
                )}
              </div>

              {/* Immutable Historical Snapshot Table (order_items) */}
              <div className="border border-slate-200 rounded-md overflow-hidden">
                <div className="px-4 py-2.5 bg-slate-100 border-b border-slate-200 text-xs font-bold text-[#090D16]">
                  Immutable Historical Order Snapshot (USD)
                </div>
                <table className="w-full text-xs text-start">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                    <tr>
                      <th className="py-2.5 px-4 text-start">SKU Snapshot</th>
                      <th className="py-2.5 px-4 text-start">
                        Title Snapshot (EN / AR)
                      </th>
                      <th className="py-2.5 px-4 text-end">Unit Price (USD)</th>
                      <th className="py-2.5 px-4 text-end">Qty</th>
                      <th className="py-2.5 px-4 text-end">Line Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {inspectingOrder.items.map((item) => (
                      <tr key={item.id}>
                        <td className="py-2.5 px-4 font-mono-tabular font-semibold">
                          {item.sku_snapshot}
                        </td>
                        <td className="py-2.5 px-4">
                          <span className="font-semibold text-slate-900 block">
                            {item.title_en_snapshot}
                          </span>
                          <span dir="rtl" className="text-slate-500 block">
                            {item.title_ar_snapshot}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-end font-mono-tabular">
                          {formatUSD(item.unit_price_usd_snapshot)}
                        </td>
                        <td className="py-2.5 px-4 text-end font-mono-tabular">
                          {item.quantity}
                        </td>
                        <td className="py-2.5 px-4 text-end font-mono-tabular font-bold">
                          {formatUSD(item.line_total_usd)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-50 border-t border-slate-200 font-bold text-[#090D16]">
                    <tr>
                      <td colSpan={4} className="py-3 px-4 text-end">
                        Authoritative Order Subtotal (USD):
                      </td>
                      <td className="py-3 px-4 text-end font-mono-tabular text-sm">
                        {formatUSD(inspectingOrder.subtotal_usd)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Status & Internal Admin Notes Update */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="inspector-order-status"
                    className="block text-xs font-semibold text-slate-700 mb-1"
                  >
                    Order Inquiry Status (Never "Paid")
                  </label>
                  <select
                    id="inspector-order-status"
                    value={modalOrderStatus}
                    onChange={(e) =>
                      setModalOrderStatus(e.target.value as OrderStatus)
                    }
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded font-semibold"
                  >
                    {VALID_ORDER_STATUSES.map((st) => (
                      <option key={st} value={st}>
                        {t.orderStatuses[st]} ({st})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="inspector-admin-notes"
                    className="block text-xs font-semibold text-slate-700 mb-1"
                  >
                    Internal Executive / Admin Notes
                  </label>
                  <input
                    id="inspector-admin-notes"
                    type="text"
                    value={modalAdminNotes}
                    onChange={(e) => setModalAdminNotes(e.target.value)}
                    placeholder="Invoice # sent, freight quote scheduled..."
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setInspectingOrder(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 border border-slate-300 rounded cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 text-xs font-semibold text-[#090D16] bg-[#C5A059] hover:bg-[#D4AF37] rounded cursor-pointer"
                >
                  Save Order Status & Notes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
