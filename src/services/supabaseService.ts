import {
  AdminSession,
  AuditLog,
  Category,
  GuestOrderInput,
  Order,
  OrderStatus,
  Product,
  SiteSettings,
  SupabaseConnectionConfig,
} from '../types/schema';
import {
  evaluateCategoryDeletionPolicy,
  evaluateProductDeletionPolicy,
  hasRole,
  isValidOrderStatus,
  processGuestOrderLogic,
} from '../utils/commerceRules';

const STORAGE_KEYS = {
  CATEGORIES: 'tgc_corp_categories_v1',
  PRODUCTS: 'tgc_corp_products_v1',
  ORDERS: 'tgc_corp_orders_v1',
  SETTINGS: 'tgc_corp_site_settings_v1',
  AUDIT_LOGS: 'tgc_corp_audit_logs_v1',
  ADMIN_SESSION: 'tgc_corp_admin_session_v1',
  SUPABASE_CONFIG: 'tgc_corp_supabase_config_v1',
};

/**
 * STRICT ZERO-FAKE-DATA POLICY:
 * - Zero pre-populated products ([])
 * - Zero pre-populated categories ([])
 * - Zero pre-populated orders ([])
 * - Contact details start empty/unverified until configured by the Admin in the dashboard.
 */
export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  company_name_en: 'TRIO GROUP',
  company_name_ar: 'مجموعة تريو — TRIO GROUP',
  corporate_name: 'TRIO GROUP – TGC CORPORATION',
  hero_headline_en:
    'Precision Corporate Procurement & Architectural Supply Across the United States',
  hero_headline_ar:
    'التوريد المؤسسي الدقيق والحلول التجارية المعتمدة في الولايات المتحدة الأمريكية',
  hero_subheadline_en:
    'Official US-market corporate catalog and direct purchase-request platform for institutional, commercial, and executive buyers.',
  hero_subheadline_ar:
    'المنصة الرسمية لاستعراض الكتالوج المعتمد بالدولار الأمريكي وتقديم طلبات الشراء المباشرة للشركات والعملاء.',
  about_en:
    'TRIO GROUP – TGC CORPORATION is a US-market corporate enterprise structured around authoritative USD pricing, verified technical specifications, and direct commercial fulfillment.',
  about_ar:
    'تعمل شركة TRIO GROUP – TGC CORPORATION كمؤسسة تجارية معتمدة في السوق الأمريكي، وتلتزم بالتسعير الدقيق بالدولار الأمريكي والمواصفات الفنية المعتمدة والتعاقد التجاري المباشر.',
  why_choose_us: [],
  contact_email: '',
  contact_phone: '',
  contact_whatsapp: '',
  headquarters_address_en: '',
  headquarters_address_ar: '',
  business_hours_en: '',
  business_hours_ar: '',
};

const AUTHORIZED_ADMIN_ACCOUNTS = [
  {
    id: 'usr_super_owner_01',
    email: 'owner@triogroup-us.com',
    password: 'TGC-SuperAdmin-2026!',
    name: 'Executive Owner (Super Admin)',
    role: 'super_admin' as const,
  },
  {
    id: 'usr_catalog_admin_02',
    email: 'admin@triogroup-us.com',
    password: 'TGC-Admin-2026!',
    name: 'Catalog Operations Administrator',
    role: 'admin' as const,
  },
];

function safeReadJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function safeWriteJson<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (err) {
    console.error(`Failed to persist ${key}:`, err);
  }
}

export class SupabaseDualModeService {
  // --- Connection Config ---
  getConnectionConfig(): SupabaseConnectionConfig {
    return safeReadJson<SupabaseConnectionConfig>(STORAGE_KEYS.SUPABASE_CONFIG, {
      url: '',
      publishableKey: '',
      mode: 'local_persistent',
    });
  }

  saveConnectionConfig(
    session: AdminSession | null,
    config: SupabaseConnectionConfig
  ): SupabaseConnectionConfig {
    if (!session || !hasRole(session.role, 'super_admin')) {
      throw new Error('Access denied: super_admin role required to modify database connection.');
    }
    const updated: SupabaseConnectionConfig = {
      ...config,
      url: config.url.trim(),
      publishableKey: config.publishableKey.trim(),
      lastTestedAt: new Date().toISOString(),
    };
    safeWriteJson(STORAGE_KEYS.SUPABASE_CONFIG, updated);
    this.appendAuditLog(
      session.email,
      session.role,
      'UPDATE_DATABASE_CONNECTION',
      'database',
      'supabase_config',
      `Mode set to ${updated.mode}${updated.url ? ` (${updated.url})` : ''}`
    );
    return updated;
  }

  // --- Authentication & RBAC ---
  getCurrentSession(): AdminSession | null {
    return safeReadJson<AdminSession | null>(STORAGE_KEYS.ADMIN_SESSION, null);
  }

  authenticateAdmin(email: string, password: string): AdminSession {
    const cleanEmail = email.trim().toLowerCase();
    const matched = AUTHORIZED_ADMIN_ACCOUNTS.find(
      (acc) => acc.email.toLowerCase() === cleanEmail && acc.password === password
    );
    if (!matched) {
      throw new Error('Invalid administrator email or password.');
    }
    if (!hasRole(matched.role, 'admin')) {
      throw new Error('Access denied: user does not hold an administrative role.');
    }
    const session: AdminSession = {
      id: matched.id,
      email: matched.email,
      name: matched.name,
      role: matched.role,
      authenticated_at: new Date().toISOString(),
    };
    safeWriteJson(STORAGE_KEYS.ADMIN_SESSION, session);
    this.appendAuditLog(
      session.email,
      session.role,
      'ADMIN_LOGIN',
      'auth',
      session.id,
      `Authenticated as ${session.role}`
    );
    return session;
  }

  signOutAdmin(): void {
    const current = this.getCurrentSession();
    if (current) {
      this.appendAuditLog(
        current.email,
        current.role,
        'ADMIN_LOGOUT',
        'auth',
        current.id,
        'Signed out of Executive Portal'
      );
    }
    localStorage.removeItem(STORAGE_KEYS.ADMIN_SESSION);
  }

  // --- Audit Logs ---
  getAuditLogs(session: AdminSession | null): AuditLog[] {
    if (!session || !hasRole(session.role, 'super_admin')) {
      return [];
    }
    return safeReadJson<AuditLog[]>(STORAGE_KEYS.AUDIT_LOGS, []);
  }

  appendAuditLog(
    actor_email: string,
    actor_role: AdminSession['role'],
    action: string,
    entity_type: AuditLog['entity_type'],
    entity_id: string,
    details: string
  ): AuditLog {
    const logs = safeReadJson<AuditLog[]>(STORAGE_KEYS.AUDIT_LOGS, []);
    const entry: AuditLog = {
      id: `aud_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      actor_email,
      actor_role,
      action,
      entity_type,
      entity_id,
      details,
      created_at: new Date().toISOString(),
    };
    safeWriteJson(STORAGE_KEYS.AUDIT_LOGS, [entry, ...logs]);
    return entry;
  }

  // --- Categories CRUD ---
  getCategories(): Category[] {
    return safeReadJson<Category[]>(STORAGE_KEYS.CATEGORIES, []);
  }

  saveCategory(
    session: AdminSession | null,
    payload: Omit<Category, 'id' | 'created_at' | 'updated_at'> & { id?: string }
  ): Category {
    if (!session || !hasRole(session.role, 'admin')) {
      throw new Error('Unauthorized: Administrator role required.');
    }
    if (!payload.name_en.trim() || !payload.name_ar.trim()) {
      throw new Error('Both English and Arabic category names are required.');
    }
    const slug =
      payload.slug.trim() ||
      payload.name_en
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

    const categories = this.getCategories();
    const duplicateSlug = categories.find(
      (c) => c.slug.toLowerCase() === slug.toLowerCase() && c.id !== payload.id
    );
    if (duplicateSlug) {
      throw new Error(`Category slug "${slug}" is already in use.`);
    }

    const now = new Date().toISOString();
    if (payload.id) {
      const idx = categories.findIndex((c) => c.id === payload.id);
      if (idx === -1) throw new Error('Category not found.');
      const updated: Category = {
        ...categories[idx],
        name_en: payload.name_en.trim(),
        name_ar: payload.name_ar.trim(),
        slug,
        description_en: payload.description_en.trim(),
        description_ar: payload.description_ar.trim(),
        is_active: Boolean(payload.is_active),
        updated_at: now,
      };
      categories[idx] = updated;
      safeWriteJson(STORAGE_KEYS.CATEGORIES, categories);
      this.appendAuditLog(
        session.email,
        session.role,
        'UPDATE_CATEGORY',
        'category',
        updated.id,
        `Updated category "${updated.name_en}" (${updated.is_active ? 'Active' : 'Inactive'})`
      );
      return updated;
    } else {
      const created: Category = {
        id: `cat_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        name_en: payload.name_en.trim(),
        name_ar: payload.name_ar.trim(),
        slug,
        description_en: payload.description_en.trim(),
        description_ar: payload.description_ar.trim(),
        is_active: Boolean(payload.is_active),
        created_at: now,
        updated_at: now,
      };
      safeWriteJson(STORAGE_KEYS.CATEGORIES, [created, ...categories]);
      this.appendAuditLog(
        session.email,
        session.role,
        'CREATE_CATEGORY',
        'category',
        created.id,
        `Created category "${created.name_en}" / "${created.name_ar}"`
      );
      return created;
    }
  }

  deleteCategory(session: AdminSession | null, categoryId: string): void {
    if (!session || !hasRole(session.role, 'admin')) {
      throw new Error('Unauthorized: Administrator role required.');
    }
    const products = this.getProducts();
    const policy = evaluateCategoryDeletionPolicy(categoryId, products);
    if (!policy.canDelete) {
      throw new Error(
        `Cannot delete this category because ${policy.linkedProductCount} product(s) are linked to it. Reassign those products or deactivate the category instead.`
      );
    }
    const categories = this.getCategories();
    const target = categories.find((c) => c.id === categoryId);
    if (!target) throw new Error('Category not found.');
    safeWriteJson(
      STORAGE_KEYS.CATEGORIES,
      categories.filter((c) => c.id !== categoryId)
    );
    this.appendAuditLog(
      session.email,
      session.role,
      'DELETE_CATEGORY',
      'category',
      categoryId,
      `Deleted category "${target.name_en}"`
    );
  }

  // --- Products CRUD ---
  getProducts(): Product[] {
    return safeReadJson<Product[]>(STORAGE_KEYS.PRODUCTS, []);
  }

  saveProduct(
    session: AdminSession | null,
    payload: Omit<Product, 'id' | 'created_at' | 'updated_at'> & { id?: string }
  ): Product {
    if (!session || !hasRole(session.role, 'admin')) {
      throw new Error('Unauthorized: Administrator role required.');
    }
    if (!payload.title_en.trim() || !payload.title_ar.trim()) {
      throw new Error('Both English and Arabic product titles are required.');
    }
    if (!payload.sku.trim()) {
      throw new Error('Product SKU code is required.');
    }
    const price = Number(payload.price_usd);
    if (!Number.isFinite(price) || price <= 0) {
      throw new Error('Authoritative USD price must be greater than $0.00.');
    }
    if (!payload.category_id) {
      throw new Error('Please select a valid category for this product.');
    }

    const products = this.getProducts();
    const duplicateSku = products.find(
      (p) => p.sku.trim().toLowerCase() === payload.sku.trim().toLowerCase() && p.id !== payload.id
    );
    if (duplicateSku) {
      throw new Error(`SKU "${payload.sku.trim()}" is already assigned to another product.`);
    }

    const now = new Date().toISOString();
    const productId =
      payload.id || `prod_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    const normalizedImages = (payload.images || []).map((img, i) => ({
      ...img,
      id: img.id || `img_${Date.now()}_${i}`,
      product_id: productId,
      display_order: i,
    }));

    const normalizedSpecs = (payload.specs || [])
      .filter((s) => s.key_en.trim() || s.key_ar.trim())
      .map((spec, i) => ({
        ...spec,
        id: spec.id || `spec_${Date.now()}_${i}`,
        product_id: productId,
        display_order: i,
      }));

    if (payload.id) {
      const idx = products.findIndex((p) => p.id === payload.id);
      if (idx === -1) throw new Error('Product not found.');
      const updated: Product = {
        ...products[idx],
        sku: payload.sku.trim().toUpperCase(),
        title_en: payload.title_en.trim(),
        title_ar: payload.title_ar.trim(),
        short_description_en: payload.short_description_en.trim(),
        short_description_ar: payload.short_description_ar.trim(),
        description_en: payload.description_en.trim(),
        description_ar: payload.description_ar.trim(),
        price_usd: Math.round(price * 100) / 100,
        category_id: payload.category_id,
        availability_status: payload.availability_status,
        is_active: Boolean(payload.is_active),
        is_featured: Boolean(payload.is_featured),
        is_archived: Boolean(payload.is_archived),
        images: normalizedImages,
        specs: normalizedSpecs,
        updated_at: now,
      };
      products[idx] = updated;
      safeWriteJson(STORAGE_KEYS.PRODUCTS, products);
      this.appendAuditLog(
        session.email,
        session.role,
        'UPDATE_PRODUCT',
        'product',
        updated.id,
        `Updated product [${updated.sku}] "${updated.title_en}" ($${updated.price_usd.toFixed(2)} USD)`
      );
      return updated;
    } else {
      const created: Product = {
        id: productId,
        sku: payload.sku.trim().toUpperCase(),
        title_en: payload.title_en.trim(),
        title_ar: payload.title_ar.trim(),
        short_description_en: payload.short_description_en.trim(),
        short_description_ar: payload.short_description_ar.trim(),
        description_en: payload.description_en.trim(),
        description_ar: payload.description_ar.trim(),
        price_usd: Math.round(price * 100) / 100,
        category_id: payload.category_id,
        availability_status: payload.availability_status,
        is_active: Boolean(payload.is_active),
        is_featured: Boolean(payload.is_featured),
        is_archived: false,
        images: normalizedImages,
        specs: normalizedSpecs,
        created_at: now,
        updated_at: now,
      };
      safeWriteJson(STORAGE_KEYS.PRODUCTS, [created, ...products]);
      this.appendAuditLog(
        session.email,
        session.role,
        'CREATE_PRODUCT',
        'product',
        created.id,
        `Published product [${created.sku}] "${created.title_en}" ($${created.price_usd.toFixed(2)} USD)`
      );
      return created;
    }
  }

  deleteOrArchiveProduct(
    session: AdminSession | null,
    productId: string
  ): { mode: 'deleted' | 'archived'; referencedOrderCount: number } {
    if (!session || !hasRole(session.role, 'admin')) {
      throw new Error('Unauthorized: Administrator role required.');
    }
    const products = this.getProducts();
    const orders = this.getOrders();
    const target = products.find((p) => p.id === productId);
    if (!target) throw new Error('Product not found.');

    const policy = evaluateProductDeletionPolicy(productId, orders);
    if (!policy.canHardDelete) {
      // Safe archive & deactivate so historical order snapshots remain intact
      const updatedProducts = products.map((p) =>
        p.id === productId
          ? {
              ...p,
              is_active: false,
              is_archived: true,
              updated_at: new Date().toISOString(),
            }
          : p
      );
      safeWriteJson(STORAGE_KEYS.PRODUCTS, updatedProducts);
      this.appendAuditLog(
        session.email,
        session.role,
        'ARCHIVE_PRODUCT_SAFE',
        'product',
        productId,
        `Archived [${target.sku}] "${target.title_en}" (referenced in ${policy.referencedOrderCount} historical order(s))`
      );
      return { mode: 'archived', referencedOrderCount: policy.referencedOrderCount };
    } else {
      safeWriteJson(
        STORAGE_KEYS.PRODUCTS,
        products.filter((p) => p.id !== productId)
      );
      this.appendAuditLog(
        session.email,
        session.role,
        'DELETE_PRODUCT',
        'product',
        productId,
        `Permanently deleted unreferenced product [${target.sku}] "${target.title_en}"`
      );
      return { mode: 'deleted', referencedOrderCount: 0 };
    }
  }

  // --- Orders & Authoritative Guest Order Submission ---
  getOrders(): Order[] {
    return safeReadJson<Order[]>(STORAGE_KEYS.ORDERS, []);
  }

  submitGuestOrder(input: GuestOrderInput): Order {
    const catalogProducts = this.getProducts();
    const { order } = processGuestOrderLogic(input, catalogProducts, new Date());
    const orders = this.getOrders();
    safeWriteJson(STORAGE_KEYS.ORDERS, [order, ...orders]);
    return order;
  }

  updateOrderStatusAndNotes(
    session: AdminSession | null,
    orderId: string,
    newStatus: OrderStatus,
    adminNotes: string
  ): Order {
    if (!session || !hasRole(session.role, 'admin')) {
      throw new Error('Unauthorized: Administrator role required.');
    }
    if (!isValidOrderStatus(newStatus)) {
      throw new Error(`Invalid order status "${newStatus}". Online 'paid' status is prohibited.`);
    }
    const orders = this.getOrders();
    const idx = orders.findIndex((o) => o.id === orderId);
    if (idx === -1) throw new Error('Order record not found.');

    const prevStatus = orders[idx].status;
    const updated: Order = {
      ...orders[idx],
      status: newStatus,
      admin_notes: adminNotes.trim(),
      updated_at: new Date().toISOString(),
    };
    orders[idx] = updated;
    safeWriteJson(STORAGE_KEYS.ORDERS, orders);

    this.appendAuditLog(
      session.email,
      session.role,
      'UPDATE_ORDER_STATUS',
      'order',
      updated.order_number,
      `Order ${updated.order_number}: status ${prevStatus} -> ${newStatus}`
    );
    return updated;
  }

  // --- Site Settings ---
  getSiteSettings(): SiteSettings {
    return safeReadJson<SiteSettings>(STORAGE_KEYS.SETTINGS, DEFAULT_SITE_SETTINGS);
  }

  saveSiteSettings(session: AdminSession | null, settings: SiteSettings): SiteSettings {
    if (!session || !hasRole(session.role, 'admin')) {
      throw new Error('Unauthorized: Administrator role required.');
    }
    const clean: SiteSettings = {
      ...settings,
      company_name_en: settings.company_name_en.trim() || 'TRIO GROUP',
      company_name_ar: settings.company_name_ar.trim() || 'مجموعة تريو — TRIO GROUP',
      corporate_name: settings.corporate_name.trim() || 'TRIO GROUP – TGC CORPORATION',
    };
    safeWriteJson(STORAGE_KEYS.SETTINGS, clean);
    this.appendAuditLog(
      session.email,
      session.role,
      'UPDATE_SITE_SETTINGS',
      'settings',
      'site_settings_1',
      'Updated corporate identity and verified contact channels'
    );
    return clean;
  }
}

export const supabaseService = new SupabaseDualModeService();
