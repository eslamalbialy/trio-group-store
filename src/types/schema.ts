export type Locale = 'en' | 'ar';

export type UserRole = 'super_admin' | 'admin' | 'customer';

export type AvailabilityStatus = 'in_stock' | 'made_to_order' | 'out_of_stock';

export type OrderStatus =
  | 'pending'
  | 'under_review'
  | 'contacted'
  | 'confirmed'
  | 'completed'
  | 'cancelled';

export interface Category {
  id: string;
  name_en: string;
  name_ar: string;
  slug: string;
  description_en: string;
  description_ar: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProductImage {
  id: string;
  product_id: string;
  url: string;
  alt_en: string;
  alt_ar: string;
  display_order: number;
}

export interface ProductSpec {
  id: string;
  product_id: string;
  key_en: string;
  key_ar: string;
  value_en: string;
  value_ar: string;
  display_order: number;
}

export interface Product {
  id: string;
  sku: string;
  title_en: string;
  title_ar: string;
  short_description_en: string;
  short_description_ar: string;
  description_en: string;
  description_ar: string;
  price_usd: number;
  category_id: string;
  availability_status: AvailabilityStatus;
  is_active: boolean;
  is_featured: boolean;
  is_archived: boolean;
  images: ProductImage[];
  specs: ProductSpec[];
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  sku_snapshot: string;
  title_en_snapshot: string;
  title_ar_snapshot: string;
  unit_price_usd_snapshot: number;
  quantity: number;
  line_total_usd: number;
}

export interface Order {
  id: string;
  order_number: string; // Format: TGC-YYYYMMDD-XXXX in America/New_York
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  shipping_address: string;
  city: string;
  state_zip: string;
  notes: string;
  admin_notes: string;
  locale: Locale;
  status: OrderStatus;
  currency: 'USD';
  subtotal_usd: number;
  items: OrderItem[];
  created_at: string;
  updated_at: string;
}

export interface WhyChooseUsItem {
  id: string;
  title_en: string;
  title_ar: string;
  desc_en: string;
  desc_ar: string;
}

export interface SiteSettings {
  company_name_en: string;
  company_name_ar: string;
  corporate_name: string;
  hero_headline_en: string;
  hero_headline_ar: string;
  hero_subheadline_en: string;
  hero_subheadline_ar: string;
  about_en: string;
  about_ar: string;
  why_choose_us: WhyChooseUsItem[];
  contact_email: string;
  contact_phone: string;
  contact_whatsapp: string;
  headquarters_address_en: string;
  headquarters_address_ar: string;
  business_hours_en: string;
  business_hours_ar: string;
}

export interface AuditLog {
  id: string;
  actor_email: string;
  actor_role: UserRole;
  action: string;
  entity_type: 'product' | 'category' | 'order' | 'settings' | 'auth' | 'database';
  entity_id: string;
  details: string;
  created_at: string;
}

export interface AdminSession {
  id: string;
  email: string;
  name: string;
  role: 'super_admin' | 'admin';
  authenticated_at: string;
}

export interface CartItem {
  product_id: string;
  quantity: number;
}

export interface GuestOrderInput {
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  shipping_address: string;
  city: string;
  state_zip: string;
  notes: string;
  locale: Locale;
  items: CartItem[];
}

export interface SupabaseConnectionConfig {
  url: string;
  publishableKey: string;
  mode: 'local_persistent' | 'supabase_live';
  lastTestedAt?: string;
}
