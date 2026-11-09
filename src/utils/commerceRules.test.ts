import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateExecutiveKPIs,
  evaluateCategoryDeletionPolicy,
  evaluateProductDeletionPolicy,
  formatUSD,
  generateOrderNumber,
  getPublicVisibleProducts,
  hasRole,
  isValidOrderStatus,
  processGuestOrderLogic,
} from './commerceRules';
import { Category, Product } from '../types/schema';

test('formatUSD strictly formats currency in US Dollars ($)', () => {
  assert.equal(formatUSD(0), '$0.00');
  assert.equal(formatUSD(125), '$125.00');
  assert.equal(formatUSD(1450.5), '$1,450.50');
});

test('generateOrderNumber formats TGC-YYYYMMDD-XXXX in America/New_York timezone', () => {
  // 2026-11-09T06:00:00Z is 2026-11-09 01:00:00 EST in America/New_York
  const fixedDate = new Date('2026-11-09T06:00:00.000Z');
  const orderNum = generateOrderNumber(fixedDate, 42);
  assert.equal(orderNum, 'TGC-20261109-0042');
});

test('isValidOrderStatus allows the 6 valid inquiry statuses and rejects "paid"', () => {
  assert.equal(isValidOrderStatus('pending'), true);
  assert.equal(isValidOrderStatus('under_review'), true);
  assert.equal(isValidOrderStatus('contacted'), true);
  assert.equal(isValidOrderStatus('confirmed'), true);
  assert.equal(isValidOrderStatus('completed'), true);
  assert.equal(isValidOrderStatus('cancelled'), true);
  assert.equal(isValidOrderStatus('paid'), false);
});

test('hasRole enforces super_admin and admin RBAC permissions', () => {
  assert.equal(hasRole('super_admin', 'super_admin'), true);
  assert.equal(hasRole('super_admin', 'admin'), true);
  assert.equal(hasRole('admin', 'admin'), true);
  assert.equal(hasRole('admin', 'super_admin'), false);
  assert.equal(hasRole('customer', 'admin'), false);
  assert.equal(hasRole(null, 'admin'), false);
});

test('processGuestOrderLogic pulls authoritative USD price and snapshots product metadata', () => {
  const sampleProduct: Product = {
    id: 'prod_1',
    sku: 'TGC-EXEC-001',
    title_en: 'Obsidian Executive Desk',
    title_ar: 'مكتب تنفيذي أوبسيديان',
    short_description_en: 'Architectural desk',
    short_description_ar: 'مكتب معماري',
    description_en: 'Full description',
    description_ar: 'وصف كامل',
    price_usd: 2500.0,
    category_id: 'cat_1',
    availability_status: 'in_stock',
    is_active: true,
    is_featured: true,
    is_archived: false,
    images: [],
    specs: [],
    created_at: '2026-11-09T00:00:00.000Z',
    updated_at: '2026-11-09T00:00:00.000Z',
  };

  const fixedNow = new Date('2026-11-09T14:30:00.000Z');
  const { order } = processGuestOrderLogic(
    {
      customer_name: 'Alexander Sterling',
      customer_email: 'a.sterling@enterprise.us',
      customer_phone: '+1 (212) 555-0199',
      shipping_address: '432 Park Avenue, Suite 1800',
      city: 'New York',
      state_zip: 'NY 10022',
      notes: 'Deliver to loading dock B',
      locale: 'en',
      items: [{ product_id: 'prod_1', quantity: 3 }],
    },
    [sampleProduct],
    fixedNow,
    1001
  );

  assert.equal(order.order_number, 'TGC-20261109-1001');
  assert.equal(order.status, 'pending');
  assert.equal(order.currency, 'USD');
  assert.equal(order.subtotal_usd, 7500.0);
  assert.equal(order.items.length, 1);
  assert.equal(order.items[0].sku_snapshot, 'TGC-EXEC-001');
  assert.equal(order.items[0].title_en_snapshot, 'Obsidian Executive Desk');
  assert.equal(order.items[0].title_ar_snapshot, 'مكتب تنفيذي أوبسيديان');
  assert.equal(order.items[0].unit_price_usd_snapshot, 2500.0);
  assert.equal(order.items[0].line_total_usd, 7500.0);

  // Verify safe deletion protection when product is referenced in order_items
  const delPolicy = evaluateProductDeletionPolicy('prod_1', [order]);
  assert.equal(delPolicy.canHardDelete, false);
  assert.equal(delPolicy.referencedOrderCount, 1);
});

test('getPublicVisibleProducts and calculateExecutiveKPIs strictly filter inactive/archived items', () => {
  const categories: Category[] = [
    {
      id: 'cat_active',
      name_en: 'Active Systems',
      name_ar: 'أنظمة نشطة',
      slug: 'active-systems',
      description_en: '',
      description_ar: '',
      is_active: true,
      created_at: '',
      updated_at: '',
    },
    {
      id: 'cat_inactive',
      name_en: 'Inactive Systems',
      name_ar: 'أنظمة غير نشطة',
      slug: 'inactive-systems',
      description_en: '',
      description_ar: '',
      is_active: false,
      created_at: '',
      updated_at: '',
    },
  ];

  const products: Product[] = [
    {
      id: 'p1',
      sku: 'SKU-1',
      title_en: 'Visible Product',
      title_ar: 'منتج مرئي',
      short_description_en: '',
      short_description_ar: '',
      description_en: '',
      description_ar: '',
      price_usd: 500,
      category_id: 'cat_active',
      availability_status: 'in_stock',
      is_active: true,
      is_featured: false,
      is_archived: false,
      images: [],
      specs: [],
      created_at: '',
      updated_at: '',
    },
    {
      id: 'p2',
      sku: 'SKU-2',
      title_en: 'Archived Product',
      title_ar: 'منتج مؤرشف',
      short_description_en: '',
      short_description_ar: '',
      description_en: '',
      description_ar: '',
      price_usd: 500,
      category_id: 'cat_active',
      availability_status: 'in_stock',
      is_active: true,
      is_featured: false,
      is_archived: true,
      images: [],
      specs: [],
      created_at: '',
      updated_at: '',
    },
    {
      id: 'p3',
      sku: 'SKU-3',
      title_en: 'Inactive Cat Product',
      title_ar: 'منتج فئة غير نشطة',
      short_description_en: '',
      short_description_ar: '',
      description_en: '',
      description_ar: '',
      price_usd: 500,
      category_id: 'cat_inactive',
      availability_status: 'in_stock',
      is_active: true,
      is_featured: false,
      is_archived: false,
      images: [],
      specs: [],
      created_at: '',
      updated_at: '',
    },
  ];

  const visible = getPublicVisibleProducts(products, categories);
  assert.equal(visible.length, 1);
  assert.equal(visible[0].id, 'p1');

  const catPolicy = evaluateCategoryDeletionPolicy('cat_active', products);
  assert.equal(catPolicy.canDelete, false);
  assert.equal(catPolicy.linkedProductCount, 2);

  const kpis = calculateExecutiveKPIs(products, categories, []);
  assert.equal(kpis.activeProductsCount, 2);
  assert.equal(kpis.activeCategoriesCount, 1);
  assert.equal(kpis.totalRequestedVolumeUsd, 0);
});
