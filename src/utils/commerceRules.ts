import {
  Category,
  GuestOrderInput,
  Order,
  OrderItem,
  OrderStatus,
  Product,
  UserRole,
} from '../types/schema';

export const BUSINESS_TIMEZONE = 'America/New_York';
export const VALID_ORDER_STATUSES: readonly OrderStatus[] = [
  'pending',
  'under_review',
  'contacted',
  'confirmed',
  'completed',
  'cancelled',
] as const;

/**
 * Formats any number strictly in USD ($125.00) per non-negotiable business rule.
 */
export function formatUSD(amount: number): string {
  const safeAmount = Number.isFinite(amount) ? amount : 0;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(safeAmount);
}

/**
 * Formats an ISO timestamp explicitly in America/New_York timezone.
 */
export function formatNewYorkDateTime(
  isoString: string | Date,
  locale: 'en' | 'ar' = 'en'
): string {
  const date = typeof isoString === 'string' ? new Date(isoString) : isoString;
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-US' : 'en-US', {
    timeZone: BUSINESS_TIMEZONE,
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(date);
}

/**
 * Returns YYYYMMDD string in America/New_York timezone.
 */
export function getNewYorkDateCompact(dateInput: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: BUSINESS_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(dateInput);

  const year = parts.find((p) => p.type === 'year')?.value ?? '2026';
  const month = parts.find((p) => p.type === 'month')?.value ?? '01';
  const day = parts.find((p) => p.type === 'day')?.value ?? '01';
  return `${year}${month}${day}`;
}

/**
 * Generates an official TRIO GROUP order reference: TGC-YYYYMMDD-XXXX in America/New_York.
 */
export function generateOrderNumber(
  dateInput: Date = new Date(),
  sequenceOrRandom?: number
): string {
  const yyyymmdd = getNewYorkDateCompact(dateInput);
  const suffix =
    typeof sequenceOrRandom === 'number'
      ? String(sequenceOrRandom).padStart(4, '0').slice(-4)
      : String(Math.floor(1000 + Math.random() * 9000));
  return `TGC-${yyyymmdd}-${suffix}`;
}

/**
 * Server-side RBAC check equivalent to public.has_role(p_user_id, p_required_role).
 */
export function hasRole(
  userRole: UserRole | null | undefined,
  requiredRole: 'super_admin' | 'admin'
): boolean {
  if (!userRole) return false;
  if (userRole === 'super_admin') return true;
  if (requiredRole === 'admin' && userRole === 'admin') return true;
  return false;
}

/**
 * Validates that an order status is strictly one of the 6 permitted commercial inquiry statuses
 * and NEVER 'paid'.
 */
export function isValidOrderStatus(status: string): status is OrderStatus {
  return (VALID_ORDER_STATUSES as readonly string[]).includes(status);
}

/**
 * Filters products visible on the public storefront:
 * Must be is_active === true, is_archived === false, and belong to an active category.
 */
export function getPublicVisibleProducts(
  products: Product[],
  categories: Category[]
): Product[] {
  const activeCategoryIds = new Set(
    categories.filter((c) => c.is_active).map((c) => c.id)
  );
  return products.filter(
    (p) =>
      p.is_active === true &&
      p.is_archived === false &&
      activeCategoryIds.has(p.category_id)
  );
}

/**
 * Simulates the authoritative PostgreSQL RPC `public.process_guest_order`:
 * - Independently looks up each requested product_id in the authoritative catalog.
 * - Verifies the product exists and is_active === true and not archived.
 * - Ignores any client-side price and pulls authoritative price_usd directly from the DB record.
 * - Snapshots SKU, title_en, title_ar, and unit_price_usd_snapshot into order_items.
 * - Generates official TGC-YYYYMMDD-XXXX order reference in America/New_York.
 */
export function processGuestOrderLogic(
  input: GuestOrderInput,
  catalogProducts: Product[],
  now: Date = new Date(),
  deterministicSeq?: number
): { order: Order } {
  if (!input.customer_name || input.customer_name.trim().length < 2) {
    throw new Error('Customer full name is required.');
  }
  if (!input.customer_email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.customer_email.trim())) {
    throw new Error('A valid email address is required.');
  }
  if (!input.customer_phone || input.customer_phone.trim().length < 7) {
    throw new Error('A valid phone number is required.');
  }
  if (!input.shipping_address || input.shipping_address.trim().length < 4) {
    throw new Error('Street shipping address is required.');
  }
  if (!input.city || input.city.trim().length < 2) {
    throw new Error('City is required.');
  }
  if (!input.state_zip || input.state_zip.trim().length < 2) {
    throw new Error('State / ZIP code is required.');
  }
  if (!Array.isArray(input.items) || input.items.length === 0) {
    throw new Error('Order inquiry must contain at least one active product.');
  }

  const orderId = `ord_${now.getTime()}_${Math.random().toString(36).slice(2, 8)}`;
  const orderItems: OrderItem[] = [];
  let subtotalUsd = 0;

  for (const cartItem of input.items) {
    const qty = Math.floor(Number(cartItem.quantity));
    if (!Number.isFinite(qty) || qty <= 0) {
      throw new Error('Item quantity must be a positive integer.');
    }

    const dbProduct = catalogProducts.find((p) => p.id === cartItem.product_id);
    if (!dbProduct) {
      throw new Error(`Product ${cartItem.product_id} was not found in the authoritative catalog.`);
    }
    if (!dbProduct.is_active || dbProduct.is_archived) {
      throw new Error(`Product "${dbProduct.title_en}" is no longer active for purchase inquiries.`);
    }
    if (dbProduct.availability_status === 'out_of_stock') {
      throw new Error(`Product "${dbProduct.title_en}" is currently out of stock.`);
    }

    const unitPrice = Number(dbProduct.price_usd);
    if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
      throw new Error(`Invalid authoritative USD price on product "${dbProduct.sku}".`);
    }

    const lineTotal = Math.round(unitPrice * qty * 100) / 100;
    subtotalUsd = Math.round((subtotalUsd + lineTotal) * 100) / 100;

    orderItems.push({
      id: `oi_${now.getTime()}_${orderItems.length + 1}`,
      order_id: orderId,
      product_id: dbProduct.id,
      sku_snapshot: dbProduct.sku,
      title_en_snapshot: dbProduct.title_en,
      title_ar_snapshot: dbProduct.title_ar,
      unit_price_usd_snapshot: unitPrice,
      quantity: qty,
      line_total_usd: lineTotal,
    });
  }

  const timestampIso = now.toISOString();
  const order: Order = {
    id: orderId,
    order_number: generateOrderNumber(now, deterministicSeq),
    customer_name: input.customer_name.trim(),
    customer_email: input.customer_email.trim(),
    customer_phone: input.customer_phone.trim(),
    shipping_address: input.shipping_address.trim(),
    city: input.city.trim(),
    state_zip: input.state_zip.trim(),
    notes: (input.notes || '').trim(),
    admin_notes: '',
    locale: input.locale === 'ar' ? 'ar' : 'en',
    status: 'pending',
    currency: 'USD',
    subtotal_usd: subtotalUsd,
    items: orderItems,
    created_at: timestampIso,
    updated_at: timestampIso,
  };

  return { order };
}

/**
 * Evaluates whether a product is referenced in historical order_items.
 * If referenced, hard deletion is prohibited and safe archiving/deactivation is enforced.
 */
export function evaluateProductDeletionPolicy(
  productId: string,
  orders: Order[]
): { canHardDelete: boolean; referencedOrderCount: number } {
  let count = 0;
  for (const order of orders) {
    if (order.items.some((item) => item.product_id === productId)) {
      count += 1;
    }
  }
  return {
    canHardDelete: count === 0,
    referencedOrderCount: count,
  };
}

/**
 * Evaluates whether a category has linked products.
 * Categories with linked products cannot be deleted until products are reassigned.
 */
export function evaluateCategoryDeletionPolicy(
  categoryId: string,
  products: Product[]
): { canDelete: boolean; linkedProductCount: number } {
  const linkedProductCount = products.filter((p) => p.category_id === categoryId).length;
  return {
    canDelete: linkedProductCount === 0,
    linkedProductCount,
  };
}

/**
 * Calculates real-time Executive Overview KPIs strictly from current database records.
 */
export function calculateExecutiveKPIs(
  products: Product[],
  categories: Category[],
  orders: Order[]
) {
  const activeProductsCount = products.filter((p) => p.is_active && !p.is_archived).length;
  const inactiveOrArchivedProductsCount = products.length - activeProductsCount;
  const activeCategoriesCount = categories.filter((c) => c.is_active).length;
  const openInquiriesCount = orders.filter(
    (o) => o.status === 'pending' || o.status === 'under_review'
  ).length;
  const totalRequestedVolumeUsd = orders
    .filter((o) => o.status !== 'cancelled')
    .reduce((sum, o) => Math.round((sum + o.subtotal_usd) * 100) / 100, 0);

  return {
    activeProductsCount,
    totalProductsCount: products.length,
    inactiveOrArchivedProductsCount,
    activeCategoriesCount,
    totalCategoriesCount: categories.length,
    openInquiriesCount,
    totalOrdersCount: orders.length,
    totalRequestedVolumeUsd,
  };
}
