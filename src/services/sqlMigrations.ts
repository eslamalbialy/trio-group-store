export interface SqlMigrationScript {
  id: string;
  filename: string;
  title_en: string;
  title_ar: string;
  description_en: string;
  description_ar: string;
  sql: string;
}

export const SQL_MIGRATIONS: SqlMigrationScript[] = [
  {
    id: '20261108000001_initial_schema',
    filename: '20261108000001_initial_schema.sql',
    title_en: '01. Initial 11-Table Schema & Enums (USD + America/New_York)',
    title_ar: '01. مخطط قاعدة البيانات الأساسي (11 جدولاً وعملة الدولار الأمريكي)',
    description_en:
      'Defines app_role, availability_status, and order_status enums along with the 11 authoritative tables for TRIO GROUP – TGC CORPORATION.',
    description_ar:
      'يعرّف الأنواع المخصصة والجداول الأحد عشر المعتمدة لشركة TRIO GROUP – TGC CORPORATION.',
    sql: `-- ============================================================================
-- TRIO GROUP – TGC CORPORATION (US Market)
-- Migration: 20261108000001_initial_schema.sql
-- Timezone Standard: America/New_York | Currency Standard: USD ($)
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Custom Enum Types (Strictly NO 'paid' status)
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('super_admin', 'admin', 'customer');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.availability_status AS ENUM ('in_stock', 'made_to_order', 'out_of_stock');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.order_status AS ENUM (
    'pending',
    'under_review',
    'contacted',
    'confirmed',
    'completed',
    'cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. Table 1: profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Table 2: user_roles
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL DEFAULT 'customer',
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, role)
);

-- 4. Table 3: categories
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name_en TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description_en TEXT NOT NULL DEFAULT '',
  description_ar TEXT NOT NULL DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Table 4: products
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku TEXT UNIQUE NOT NULL,
  title_en TEXT NOT NULL,
  title_ar TEXT NOT NULL,
  short_description_en TEXT NOT NULL DEFAULT '',
  short_description_ar TEXT NOT NULL DEFAULT '',
  description_en TEXT NOT NULL DEFAULT '',
  description_ar TEXT NOT NULL DEFAULT '',
  price_usd NUMERIC(12, 2) NOT NULL CHECK (price_usd > 0),
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE RESTRICT,
  availability_status public.availability_status NOT NULL DEFAULT 'in_stock',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  is_featured BOOLEAN NOT NULL DEFAULT FALSE,
  is_archived BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Table 5: product_images
CREATE TABLE IF NOT EXISTS public.product_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  alt_en TEXT NOT NULL DEFAULT '',
  alt_ar TEXT NOT NULL DEFAULT '',
  display_order INTEGER NOT NULL DEFAULT 0
);

-- 7. Table 6: product_specs
CREATE TABLE IF NOT EXISTS public.product_specs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  key_en TEXT NOT NULL,
  key_ar TEXT NOT NULL,
  value_en TEXT NOT NULL,
  value_ar TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0
);

-- 8. Table 7: orders
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT UNIQUE NOT NULL, -- TGC-YYYYMMDD-XXXX (America/New_York)
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  shipping_address TEXT NOT NULL,
  city TEXT NOT NULL,
  state_zip TEXT NOT NULL,
  notes TEXT NOT NULL DEFAULT '',
  admin_notes TEXT NOT NULL DEFAULT '',
  locale TEXT NOT NULL DEFAULT 'en' CHECK (locale IN ('en', 'ar')),
  status public.order_status NOT NULL DEFAULT 'pending',
  currency TEXT NOT NULL DEFAULT 'USD' CHECK (currency = 'USD'),
  subtotal_usd NUMERIC(12, 2) NOT NULL CHECK (subtotal_usd >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. Table 8: order_items (Historical Snapshot Integrity)
CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  sku_snapshot TEXT NOT NULL,
  title_en_snapshot TEXT NOT NULL,
  title_ar_snapshot TEXT NOT NULL,
  unit_price_usd_snapshot NUMERIC(12, 2) NOT NULL CHECK (unit_price_usd_snapshot > 0),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  line_total_usd NUMERIC(12, 2) NOT NULL CHECK (line_total_usd > 0)
);

-- 10. Table 9: order_status_history
CREATE TABLE IF NOT EXISTS public.order_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  previous_status public.order_status,
  new_status public.order_status NOT NULL,
  changed_by_email TEXT NOT NULL,
  note TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. Table 10: site_settings
CREATE TABLE IF NOT EXISTS public.site_settings (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  company_name_en TEXT NOT NULL DEFAULT 'TRIO GROUP',
  company_name_ar TEXT NOT NULL DEFAULT 'مجموعة تريو - TRIO GROUP',
  corporate_name TEXT NOT NULL DEFAULT 'TRIO GROUP – TGC CORPORATION',
  hero_headline_en TEXT NOT NULL DEFAULT '',
  hero_headline_ar TEXT NOT NULL DEFAULT '',
  hero_subheadline_en TEXT NOT NULL DEFAULT '',
  hero_subheadline_ar TEXT NOT NULL DEFAULT '',
  about_en TEXT NOT NULL DEFAULT '',
  about_ar TEXT NOT NULL DEFAULT '',
  why_choose_us JSONB NOT NULL DEFAULT '[]'::jsonb,
  contact_email TEXT NOT NULL DEFAULT '',
  contact_phone TEXT NOT NULL DEFAULT '',
  contact_whatsapp TEXT NOT NULL DEFAULT '',
  headquarters_address_en TEXT NOT NULL DEFAULT '',
  headquarters_address_ar TEXT NOT NULL DEFAULT '',
  business_hours_en TEXT NOT NULL DEFAULT '',
  business_hours_ar TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 12. Table 11: audit_logs
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_email TEXT NOT NULL,
  actor_role public.app_role NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  details TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);`,
  },
  {
    id: '20261108000002_security_functions',
    filename: '20261108000002_security_functions.sql',
    title_en: '02. RBAC Security Functions & Server-Side Order RPC',
    title_ar: '02. دوال الأمان والتحقق من الصلاحيات ومعالجة الطلبات',
    description_en:
      'Implements SECURITY DEFINER functions public.has_role(p_user_id, p_required_role) and public.process_guest_order(...) with authoritative USD price lookup and America/New_York order numbering.',
    description_ar:
      'ينفذ دوال التحقق من الصلاحيات ومعالجة طلبات الشراء مع جلب السعر المعتمد بالدولار وتوقيت نيويورك.',
    sql: `-- ============================================================================
-- TRIO GROUP – TGC CORPORATION
-- Migration: 20261108000002_security_functions.sql
-- ============================================================================

-- 1. Authoritative Role Verification Function
CREATE OR REPLACE FUNCTION public.has_role(
  p_user_id UUID,
  p_required_role public.app_role
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_user_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- super_admin satisfies both super_admin and admin checks
  IF EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = p_user_id AND role = 'super_admin'
  ) THEN
    RETURN TRUE;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = p_user_id AND role = p_required_role
  );
END;
$$;

-- 2. Authoritative Server-Side Order Processing RPC
CREATE OR REPLACE FUNCTION public.process_guest_order(
  p_customer_name TEXT,
  p_customer_email TEXT,
  p_customer_phone TEXT,
  p_shipping_address TEXT,
  p_city TEXT,
  p_state_zip TEXT,
  p_notes TEXT,
  p_locale TEXT,
  p_items JSONB -- Array of {"product_id": UUID, "quantity": INT}
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order_id UUID;
  v_ny_date TEXT;
  v_random_suffix TEXT;
  v_order_number TEXT;
  v_subtotal NUMERIC(12, 2) := 0;
  v_item JSONB;
  v_prod RECORD;
  v_qty INTEGER;
  v_line_total NUMERIC(12, 2);
BEGIN
  IF jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Order inquiry must contain at least one product.';
  END IF;

  -- Generate TGC-YYYYMMDD-XXXX strictly in America/New_York
  v_ny_date := to_char(timezone('America/New_York', NOW()), 'YYYYMMDD');
  v_random_suffix := lpad((floor(1000 + random() * 9000)::int)::text, 4, '0');
  v_order_number := 'TGC-' || v_ny_date || '-' || v_random_suffix;

  INSERT INTO public.orders (
    order_number, customer_name, customer_email, customer_phone,
    shipping_address, city, state_zip, notes, locale, status, currency, subtotal_usd
  ) VALUES (
    v_order_number, trim(p_customer_name), trim(p_customer_email), trim(p_customer_phone),
    trim(p_shipping_address), trim(p_city), trim(p_state_zip), COALESCE(p_notes, ''),
    CASE WHEN p_locale = 'ar' THEN 'ar' ELSE 'en' END,
    'pending', 'USD', 0
  ) RETURNING id INTO v_order_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_qty := (v_item->>'quantity')::INTEGER;
    IF v_qty IS NULL OR v_qty <= 0 THEN
      RAISE EXCEPTION 'Invalid quantity specified.';
    END IF;

    SELECT p.* INTO v_prod
    FROM public.products p
    JOIN public.categories c ON c.id = p.category_id
    WHERE p.id = (v_item->>'product_id')::UUID
      AND p.is_active = TRUE
      AND p.is_archived = FALSE
      AND c.is_active = TRUE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Requested product is unavailable or inactive.';
    END IF;

    v_line_total := round(v_prod.price_usd * v_qty, 2);
    v_subtotal := v_subtotal + v_line_total;

    INSERT INTO public.order_items (
      order_id, product_id, sku_snapshot,
      title_en_snapshot, title_ar_snapshot,
      unit_price_usd_snapshot, quantity, line_total_usd
    ) VALUES (
      v_order_id, v_prod.id, v_prod.sku,
      v_prod.title_en, v_prod.title_ar,
      v_prod.price_usd, v_qty, v_line_total
    );
  END LOOP;

  UPDATE public.orders
  SET subtotal_usd = v_subtotal
  WHERE id = v_order_id;

  RETURN jsonb_build_object(
    'order_id', v_order_id,
    'order_number', v_order_number,
    'subtotal_usd', v_subtotal,
    'status', 'pending'
  );
END;
$$;`,
  },
  {
    id: '20261108000003_rls_policies',
    filename: '20261108000003_rls_policies.sql',
    title_en: '03. Row-Level Security (RLS) Policies',
    title_ar: '03. سياسات أمان مستوى الصفوف (RLS)',
    description_en:
      'Enforces strict RLS on all 11 tables: public visitors only read active catalog records; admin/super_admin manage catalog and orders; audit_logs restricted to super_admin.',
    description_ar:
      'تفرض سياسات أمان صارمة على كافة الجداول الأحد عشر حسب صلاحيات المستخدمين.',
    sql: `-- ============================================================================
-- TRIO GROUP – TGC CORPORATION
-- Migration: 20261108000003_rls_policies.sql
-- ============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_specs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Public Read Access for Active Catalog & Site Settings
CREATE POLICY "Public can view active categories"
  ON public.categories FOR SELECT
  USING (is_active = TRUE OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Public can view active non-archived products"
  ON public.products FOR SELECT
  USING ((is_active = TRUE AND is_archived = FALSE) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Public can view product images"
  ON public.product_images FOR SELECT USING (TRUE);

CREATE POLICY "Public can view product specs"
  ON public.product_specs FOR SELECT USING (TRUE);

CREATE POLICY "Public can view site settings"
  ON public.site_settings FOR SELECT USING (TRUE);

-- Admin & Super Admin Full Management on Catalog & Orders
CREATE POLICY "Admins manage categories"
  ON public.categories FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage products"
  ON public.products FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage orders"
  ON public.orders FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins view order items"
  ON public.order_items FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage site settings"
  ON public.site_settings FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Super Admin Exclusive Access to Audit Logs & Role Assignments
CREATE POLICY "Super Admins view audit logs"
  ON public.audit_logs FOR SELECT
  USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Admins insert audit logs"
  ON public.audit_logs FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));`,
  },
  {
    id: '20261108000004_storage_policies',
    filename: '20261108000004_storage_policies.sql',
    title_en: '04. Supabase Storage Bucket & Policies (`product-images`)',
    title_ar: '04. سياسات تخزين صور المنتجات (Storage RLS)',
    description_en:
      'Configures the public product-images bucket with MIME-type validation (JPEG, PNG, WEBP, AVIF), 5MB file size limit, and Admin-only upload/delete permissions.',
    description_ar:
      'يضبط حاوية تخزين صور المنتجات مع التحقق من الصيغ والحجم وصلاحيات الرفع للمديرين فقط.',
    sql: `-- ============================================================================
-- TRIO GROUP – TGC CORPORATION
-- Migration: 20261108000004_storage_policies.sql
-- ============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-images',
  'product-images',
  TRUE,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE POLICY "Public read access for product-images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'product-images');

CREATE POLICY "Admins upload product-images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'product-images'
    AND public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Admins update or delete product-images"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'product-images'
    AND public.has_role(auth.uid(), 'admin')
  );`,
  },
];
