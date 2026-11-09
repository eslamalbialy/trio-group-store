import React, { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Copy,
  Mail,
  MessageSquare,
  Minus,
  Phone,
  Plus,
  ShieldCheck,
  ShoppingBag,
  Trash2,
  X,
} from 'lucide-react';
import {
  CartItem,
  GuestOrderInput,
  Locale,
  Order,
  Product,
  SiteSettings,
} from '../types/schema';
import { useTranslations } from '../i18n/translations';
import { formatNewYorkDateTime, formatUSD } from '../utils/commerceRules';

interface CartCheckoutDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  locale: Locale;
  cart: CartItem[];
  products: Product[];
  settings: SiteSettings;
  onUpdateQty: (productId: string, quantity: number) => void;
  onRemoveItem: (productId: string) => void;
  onSubmitOrder: (input: GuestOrderInput) => Order;
}

export const CartCheckoutDrawer: React.FC<CartCheckoutDrawerProps> = ({
  isOpen,
  onClose,
  locale,
  cart,
  products,
  settings,
  onUpdateQty,
  onRemoveItem,
  onSubmitOrder,
}) => {
  const t = useTranslations(locale);
  const [step, setStep] = useState<'cart' | 'form' | 'confirmed'>('cart');
  const [confirmedOrder, setConfirmedOrder] = useState<Order | null>(null);
  const [copiedRef, setCopiedRef] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');
  const [city, setCity] = useState('');
  const [stateZip, setStateZip] = useState('');
  const [notes, setNotes] = useState('');

  if (!isOpen) return null;

  const enrichedItems = cart
    .map((ci) => {
      const product = products.find(
        (p) => p.id === ci.product_id && p.is_active && !p.is_archived
      );
      if (!product) return null;
      return {
        product,
        quantity: ci.quantity,
        lineTotal: Math.round(product.price_usd * ci.quantity * 100) / 100,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  const subtotalUsd = enrichedItems.reduce(
    (sum, item) => Math.round((sum + item.lineTotal) * 100) / 100,
    0
  );

  const handleCloseDrawer = () => {
    if (step === 'confirmed') {
      setStep('cart');
      setConfirmedOrder(null);
    }
    setFormError(null);
    onClose();
  };

  const handleOrderSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    try {
      const created = onSubmitOrder({
        customer_name: customerName,
        customer_email: customerEmail,
        customer_phone: customerPhone,
        shipping_address: shippingAddress,
        city,
        state_zip: stateZip,
        notes,
        locale,
        items: enrichedItems.map((i) => ({
          product_id: i.product.id,
          quantity: i.quantity,
        })),
      });
      setConfirmedOrder(created);
      setStep('confirmed');
      setCustomerName('');
      setCustomerEmail('');
      setCustomerPhone('');
      setShippingAddress('');
      setCity('');
      setStateZip('');
      setNotes('');
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : 'Unable to process purchase request.'
      );
    }
  };

  const handleCopyRef = (orderNumber: string) => {
    try {
      navigator.clipboard.writeText(orderNumber);
      setCopiedRef(true);
      setTimeout(() => setCopiedRef(false), 2500);
    } catch {
      setCopiedRef(true);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t.cartDrawer.title}
      className="fixed inset-0 z-50 flex justify-end bg-[#090D16]/70 backdrop-blur-xs"
    >
      <div className="relative w-full max-w-xl bg-white h-full shadow-2xl border-s border-slate-200 flex flex-col justify-between overflow-hidden">
        {/* Top Drawer Header */}
        <div className="px-6 py-5 bg-[#090D16] text-white border-b border-white/10 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-lg font-serif-display font-bold tracking-wide text-white">
              {step === 'confirmed' ? t.confirmationModal.title : t.cartDrawer.title}
            </h2>
            <p className="text-xs text-slate-300 mt-0.5">{t.cartDrawer.subtitle}</p>
          </div>
          <button
            type="button"
            onClick={handleCloseDrawer}
            aria-label="Close purchase request drawer"
            className="p-2 text-slate-300 hover:text-white border border-white/15 rounded-md cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {step === 'confirmed' && confirmedOrder ? (
            <div className="space-y-6">
              <div className="p-5 bg-emerald-50/70 border border-emerald-200 rounded-lg space-y-3">
                <div className="flex items-center gap-2 text-emerald-800 text-xs font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{t.confirmationModal.kicker}</span>
                </div>
                <p className="text-xs text-slate-700 leading-relaxed">
                  {t.confirmationModal.subtitle}
                </p>

                <div className="p-4 bg-white border border-emerald-200 rounded-md flex items-center justify-between gap-4">
                  <div>
                    <span className="block text-[11px] text-slate-500">
                      {t.confirmationModal.referenceLabel}
                    </span>
                    <span
                      data-testid="confirmed-order-number"
                      className="text-xl font-mono-tabular font-bold text-[#090D16]"
                    >
                      {confirmedOrder.order_number}
                    </span>
                    <span className="block text-[11px] font-mono-tabular text-slate-500 mt-0.5">
                      {formatNewYorkDateTime(confirmedOrder.created_at, locale)} · America/New_York
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopyRef(confirmedOrder.order_number)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-[#090D16] bg-[#C5A059] hover:bg-[#D4AF37] rounded transition-colors cursor-pointer shrink-0"
                  >
                    {copiedRef ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>{t.confirmationModal.copied}</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>{t.confirmationModal.copyRef}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Authoritative Order Items Snapshot */}
              <div className="border border-slate-200 rounded-md overflow-hidden">
                <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-800">
                  {t.confirmationModal.summaryTitle}
                </div>
                <div className="divide-y divide-slate-200">
                  {confirmedOrder.items.map((item) => (
                    <div
                      key={item.id}
                      className="px-4 py-3 flex items-center justify-between gap-4 text-xs"
                    >
                      <div>
                        <span className="font-mono-tabular text-slate-500">
                          {item.sku_snapshot}
                        </span>
                        <p className="font-semibold text-slate-900 mt-0.5">
                          {locale === 'ar'
                            ? item.title_ar_snapshot
                            : item.title_en_snapshot}
                        </p>
                        <span className="text-slate-500 font-mono-tabular">
                          {item.quantity} × {formatUSD(item.unit_price_usd_snapshot)}
                        </span>
                      </div>
                      <span className="font-mono-tabular font-bold text-slate-900">
                        {formatUSD(item.line_total_usd)}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-sm font-bold text-[#090D16]">
                  <span>{t.cartDrawer.subtotal}</span>
                  <span className="font-mono-tabular">
                    {formatUSD(confirmedOrder.subtotal_usd)}
                  </span>
                </div>
              </div>

              {/* Verified Contact Channels to Finalize */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-md space-y-3">
                <h3 className="text-xs font-semibold text-slate-900">
                  {t.confirmationModal.nextStepsTitle}
                </h3>
                <p className="text-xs text-slate-600">
                  {t.confirmationModal.nextStepsDesc}
                </p>
                <div className="space-y-2 text-xs">
                  {settings.contact_email && (
                    <a
                      href={`mailto:${settings.contact_email}?subject=Order%20Inquiry%20${confirmedOrder.order_number}`}
                      className="flex items-center gap-2 text-slate-800 hover:text-[#C5A059] font-medium"
                    >
                      <Mail className="w-3.5 h-3.5 text-[#C5A059]" />
                      <span>{settings.contact_email}</span>
                    </a>
                  )}
                  {settings.contact_phone && (
                    <a
                      href={`tel:${settings.contact_phone}`}
                      className="flex items-center gap-2 text-slate-800 hover:text-[#C5A059] font-mono-tabular font-medium"
                    >
                      <Phone className="w-3.5 h-3.5 text-[#C5A059]" />
                      <span>{settings.contact_phone}</span>
                    </a>
                  )}
                  {settings.contact_whatsapp && (
                    <div className="flex items-center gap-2 text-slate-800 font-mono-tabular">
                      <MessageSquare className="w-3.5 h-3.5 text-[#C5A059]" />
                      <span>WhatsApp: {settings.contact_whatsapp}</span>
                    </div>
                  )}
                  {!settings.contact_email &&
                    !settings.contact_phone &&
                    !settings.contact_whatsapp && (
                      <p className="text-slate-500 italic">
                        {t.contactSection.notConfiguredYet}
                      </p>
                    )}
                </div>
              </div>
            </div>
          ) : enrichedItems.length === 0 ? (
            <div className="py-16 text-center space-y-4">
              <div className="w-14 h-14 mx-auto rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                <ShoppingBag className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-serif-display font-bold text-slate-900">
                {t.cartDrawer.emptyTitle}
              </h3>
              <p className="text-xs text-slate-600 max-w-sm mx-auto leading-relaxed">
                {t.cartDrawer.emptyDesc}
              </p>
              <button
                type="button"
                onClick={handleCloseDrawer}
                className="px-5 py-2.5 text-xs font-semibold text-[#090D16] bg-[#C5A059] hover:bg-[#D4AF37] rounded-md transition-colors cursor-pointer"
              >
                {t.cartDrawer.browseBtn}
              </button>
            </div>
          ) : step === 'cart' ? (
            <div className="space-y-4">
              <div className="divide-y divide-slate-200 border border-slate-200 rounded-md">
                {enrichedItems.map(({ product, quantity, lineTotal }) => {
                  const title =
                    locale === 'ar' ? product.title_ar : product.title_en;
                  return (
                    <div
                      key={product.id}
                      className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white"
                    >
                      <div className="space-y-1">
                        <span className="text-[11px] font-mono-tabular text-slate-500">
                          {product.sku}
                        </span>
                        <h4 className="text-sm font-semibold text-slate-900">
                          {title}
                        </h4>
                        <p className="text-xs font-mono-tabular text-slate-600">
                          {formatUSD(product.price_usd)} / unit
                        </p>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-4">
                        <div className="flex items-center border border-slate-300 rounded">
                          <button
                            type="button"
                            onClick={() => onUpdateQty(product.id, quantity - 1)}
                            aria-label={`Decrease quantity for ${title}`}
                            className="p-1.5 text-slate-600 hover:text-slate-900 cursor-pointer"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="px-3 py-1 text-xs font-mono-tabular font-semibold">
                            {quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => onUpdateQty(product.id, quantity + 1)}
                            aria-label={`Increase quantity for ${title}`}
                            className="p-1.5 text-slate-600 hover:text-slate-900 cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="text-end min-w-[85px]">
                          <span className="block text-sm font-mono-tabular font-bold text-slate-900">
                            {formatUSD(lineTotal)}
                          </span>
                          <button
                            type="button"
                            onClick={() => onRemoveItem(product.id)}
                            aria-label={`Remove ${title} from purchase request`}
                            className="inline-flex items-center gap-1 text-[11px] text-rose-600 hover:text-rose-800 mt-0.5 cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>{t.cartDrawer.remove}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-md flex items-start gap-2.5 text-xs text-slate-600">
                <ShieldCheck className="w-4 h-4 text-[#C5A059] shrink-0 mt-0.5" />
                <div>
                  <strong className="block text-slate-900 mb-0.5">
                    {t.cartDrawer.settlementPolicyTitle}
                  </strong>
                  <span>{t.cartDrawer.settlementPolicyText}</span>
                </div>
              </div>
            </div>
          ) : (
            <form
              id="guest-order-inquiry-form"
              onSubmit={handleOrderSubmit}
              className="space-y-4"
            >
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <h3 className="text-sm font-semibold text-slate-900">
                  {t.cartDrawer.formTitle}
                </h3>
                <button
                  type="button"
                  onClick={() => setStep('cart')}
                  className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-900 cursor-pointer"
                >
                  {locale === 'ar' ? (
                    <ArrowRight className="w-3.5 h-3.5" />
                  ) : (
                    <ArrowLeft className="w-3.5 h-3.5" />
                  )}
                  <span>{t.cartDrawer.backToItems}</span>
                </button>
              </div>

              {formError && (
                <div
                  role="alert"
                  className="p-3 bg-rose-50 border border-rose-200 rounded text-xs font-medium text-rose-700"
                >
                  {formError}
                </div>
              )}

              <div>
                <label
                  htmlFor="order-customer-name"
                  className="block text-xs font-medium text-slate-700 mb-1"
                >
                  {t.cartDrawer.fullName}
                </label>
                <input
                  id="order-customer-name"
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="e.g. Jonathan Vance — Vance Architectural LLC"
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:border-[#C5A059]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="order-customer-email"
                    className="block text-xs font-medium text-slate-700 mb-1"
                  >
                    {t.cartDrawer.email}
                  </label>
                  <input
                    id="order-customer-email"
                    type="email"
                    required
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder="buyer@company.com"
                    className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:border-[#C5A059]"
                  />
                </div>
                <div>
                  <label
                    htmlFor="order-customer-phone"
                    className="block text-xs font-medium text-slate-700 mb-1"
                  >
                    {t.cartDrawer.phone}
                  </label>
                  <input
                    id="order-customer-phone"
                    type="tel"
                    required
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="+1 (212) 555-0140"
                    className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:border-[#C5A059]"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="order-shipping-address"
                  className="block text-xs font-medium text-slate-700 mb-1"
                >
                  {t.cartDrawer.address}
                </label>
                <input
                  id="order-shipping-address"
                  type="text"
                  required
                  value={shippingAddress}
                  onChange={(e) => setShippingAddress(e.target.value)}
                  placeholder="725 Fifth Avenue, Suite 2400"
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:border-[#C5A059]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="order-city"
                    className="block text-xs font-medium text-slate-700 mb-1"
                  >
                    {t.cartDrawer.city}
                  </label>
                  <input
                    id="order-city"
                    type="text"
                    required
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="New York"
                    className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:border-[#C5A059]"
                  />
                </div>
                <div>
                  <label
                    htmlFor="order-state-zip"
                    className="block text-xs font-medium text-slate-700 mb-1"
                  >
                    {t.cartDrawer.stateZip}
                  </label>
                  <input
                    id="order-state-zip"
                    type="text"
                    required
                    value={stateZip}
                    onChange={(e) => setStateZip(e.target.value)}
                    placeholder="NY 10022"
                    className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:border-[#C5A059]"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="order-notes"
                  className="block text-xs font-medium text-slate-700 mb-1"
                >
                  {t.cartDrawer.notes}
                </label>
                <textarea
                  id="order-notes"
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Project timeline, freight dock requirements, or PO reference..."
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:border-[#C5A059]"
                />
              </div>
            </form>
          )}
        </div>

        {/* Bottom Sticky Action Footer */}
        <div className="p-6 bg-slate-50 border-t border-slate-200 shrink-0 space-y-4">
          {step === 'confirmed' ? (
            <button
              type="button"
              onClick={handleCloseDrawer}
              className="w-full py-3 px-6 text-sm font-semibold text-white bg-[#090D16] hover:bg-[#1E293B] rounded-md transition-colors cursor-pointer"
            >
              {t.confirmationModal.doneBtn}
            </button>
          ) : (
            enrichedItems.length > 0 && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-600">
                    {t.cartDrawer.subtotal}
                  </span>
                  <span className="text-xl font-mono-tabular font-bold text-[#090D16]">
                    {formatUSD(subtotalUsd)}
                  </span>
                </div>

                {step === 'cart' ? (
                  <button
                    type="button"
                    onClick={() => setStep('form')}
                    className="w-full py-3 px-6 text-sm font-semibold text-[#090D16] bg-[#C5A059] hover:bg-[#D4AF37] rounded-md transition-colors cursor-pointer"
                  >
                    {t.cartDrawer.proceedToInquiry}
                  </button>
                ) : (
                  <button
                    type="submit"
                    form="guest-order-inquiry-form"
                    className="w-full py-3 px-6 text-sm font-semibold text-[#090D16] bg-[#C5A059] hover:bg-[#D4AF37] rounded-md transition-colors cursor-pointer"
                  >
                    {t.cartDrawer.submitInquiry}
                  </button>
                )}
              </>
            )
          )}
        </div>
      </div>
    </div>
  );
};
