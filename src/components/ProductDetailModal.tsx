import React, { useState } from 'react';
import { Building2, Minus, Plus, ShieldCheck, ShoppingBag, X } from 'lucide-react';
import { Category, Locale, Product } from '../types/schema';
import { useTranslations } from '../i18n/translations';
import { formatUSD } from '../utils/commerceRules';

interface ProductDetailModalProps {
  product: Product | null;
  categories: Category[];
  locale: Locale;
  onClose: () => void;
  onAddToCart: (product: Product, quantity: number) => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  product,
  categories,
  locale,
  onClose,
  onAddToCart,
}) => {
  const t = useTranslations(locale);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

  if (!product) return null;

  const sortedImages = [...(product.images || [])].sort(
    (a, b) => a.display_order - b.display_order
  );
  const sortedSpecs = [...(product.specs || [])].sort(
    (a, b) => a.display_order - b.display_order
  );

  const activeImage = sortedImages[selectedImageIndex] || sortedImages[0];
  const category = categories.find((c) => c.id === product.category_id);

  const title = locale === 'ar' ? product.title_ar : product.title_en;
  const shortDesc =
    locale === 'ar' ? product.short_description_ar : product.short_description_en;
  const fullDesc = locale === 'ar' ? product.description_ar : product.description_en;
  const categoryName = category
    ? locale === 'ar'
      ? category.name_ar
      : category.name_en
    : '—';

  const isOutOfStock = product.availability_status === 'out_of_stock';

  const handleAdd = () => {
    if (isOutOfStock) return;
    onAddToCart(product, quantity);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="pdp-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-[#090D16]/75 backdrop-blur-xs overflow-y-auto"
    >
      <div className="relative w-full max-w-5xl bg-white border border-slate-200 rounded-lg shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Top Modal Bar */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#090D16] text-white border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-300">
            <span className="font-mono-tabular text-[#D4AF37]">{product.sku}</span>
            <span aria-hidden="true">·</span>
            <span>{categoryName}</span>
            <span aria-hidden="true">·</span>
            <span>{t.availability[product.availability_status]}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.productModal.close}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white border border-white/15 rounded transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
            <span>{t.productModal.close}</span>
          </button>
        </div>

        {/* Contiguous 2-Column Purchase Module */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 p-6 sm:p-8 overflow-y-auto">
          {/* Left Column: Multi-Image Gallery */}
          <div className="lg:col-span-6 flex flex-col gap-4">
            <div className="aspect-4/3 w-full bg-slate-100 border border-slate-200 rounded-md overflow-hidden flex items-center justify-center relative">
              {activeImage && !failedImages[activeImage.id] ? (
                <img
                  src={activeImage.url}
                  alt={
                    locale === 'ar'
                      ? activeImage.alt_ar || title
                      : activeImage.alt_en || title
                  }
                  referrerPolicy="no-referrer"
                  onError={() =>
                    setFailedImages((prev) => ({ ...prev, [activeImage.id]: true }))
                  }
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex flex-col items-center justify-center p-8 text-center bg-gradient-to-br from-[#090D16] to-[#1E293B] text-white w-full h-full">
                  <Building2 className="w-12 h-12 text-[#C5A059] mb-3 opacity-80" />
                  <span className="text-xs font-mono-tabular tracking-widest text-[#D4AF37] mb-1">
                    {product.sku}
                  </span>
                  <span className="text-sm font-medium text-slate-200 max-w-xs">
                    {title}
                  </span>
                </div>
              )}
            </div>

            {sortedImages.length > 1 && (
              <div className="grid grid-cols-4 sm:grid-cols-5 gap-2.5">
                {sortedImages.map((img, idx) => (
                  <button
                    key={img.id}
                    type="button"
                    onClick={() => setSelectedImageIndex(idx)}
                    aria-label={`View product image ${idx + 1}`}
                    className={`aspect-4/3 rounded border overflow-hidden cursor-pointer transition-all ${
                      idx === selectedImageIndex
                        ? 'border-[#C5A059] ring-2 ring-[#C5A059]/40'
                        : 'border-slate-200 opacity-75 hover:opacity-100'
                    }`}
                  >
                    {!failedImages[img.id] ? (
                      <img
                        src={img.url}
                        alt={locale === 'ar' ? img.alt_ar || title : img.alt_en || title}
                        referrerPolicy="no-referrer"
                        onError={() =>
                          setFailedImages((prev) => ({ ...prev, [img.id]: true }))
                        }
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-slate-900 flex items-center justify-center text-[10px] text-[#D4AF37] font-mono-tabular">
                        {idx + 1}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right Column: Authoritative Purchase Info & Specs */}
          <div className="lg:col-span-6 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="text-xs text-slate-500 flex flex-wrap items-center gap-2">
                <span>
                  {t.productModal.sku}:{' '}
                  <strong className="font-mono-tabular text-slate-900">
                    {product.sku}
                  </strong>
                </span>
                <span aria-hidden="true">·</span>
                <span>
                  {t.productModal.category}:{' '}
                  <strong className="text-slate-900">{categoryName}</strong>
                </span>
              </div>

              <h2
                id="pdp-modal-title"
                className="text-2xl sm:text-3xl font-serif-display font-bold text-[#090D16] leading-tight"
              >
                {title}
              </h2>

              <div className="pt-2 pb-4 border-b border-slate-200 flex items-baseline justify-between gap-4">
                <div>
                  <span className="block text-xs text-slate-500 mb-1">
                    {t.productModal.unitPrice}
                  </span>
                  <span className="text-3xl font-mono-tabular font-bold text-[#090D16]">
                    {formatUSD(product.price_usd)}
                  </span>
                </div>
                <span
                  className={`text-xs font-semibold ${
                    product.availability_status === 'in_stock'
                      ? 'text-emerald-700'
                      : product.availability_status === 'made_to_order'
                        ? 'text-amber-700'
                        : 'text-rose-700'
                  }`}
                >
                  {t.availability[product.availability_status]}
                </span>
              </div>

              {shortDesc && (
                <p className="text-sm font-medium text-slate-700 leading-relaxed">
                  {shortDesc}
                </p>
              )}

              {fullDesc && (
                <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">
                  {fullDesc}
                </p>
              )}

              {/* Technical Specifications Table */}
              <div className="pt-4">
                <h3 className="text-sm font-semibold text-[#090D16] mb-3">
                  {t.productModal.specsTitle}
                </h3>
                {sortedSpecs.length === 0 ? (
                  <p className="text-xs text-slate-500 italic">
                    {t.productModal.noSpecs}
                  </p>
                ) : (
                  <div className="border border-slate-200 rounded-md divide-y divide-slate-200">
                    {sortedSpecs.map((spec) => (
                      <div
                        key={spec.id}
                        className="grid grid-cols-2 px-3.5 py-2.5 text-xs sm:text-sm bg-slate-50/50"
                      >
                        <span className="font-medium text-slate-600">
                          {locale === 'ar' ? spec.key_ar || spec.key_en : spec.key_en}
                        </span>
                        <span className="font-semibold text-slate-900 text-end">
                          {locale === 'ar'
                            ? spec.value_ar || spec.value_en
                            : spec.value_en}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Quantity & Add to Purchase Request Action */}
            <div className="pt-6 border-t border-slate-200 space-y-4">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center border border-slate-300 rounded-md bg-white">
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    disabled={isOutOfStock}
                    aria-label="Decrease quantity"
                    className="p-2.5 text-slate-600 hover:text-slate-900 disabled:opacity-40 cursor-pointer"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="px-4 py-2 font-mono-tabular font-semibold text-sm text-slate-900">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => q + 1)}
                    disabled={isOutOfStock}
                    aria-label="Increase quantity"
                    className="p-2.5 text-slate-600 hover:text-slate-900 disabled:opacity-40 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleAdd}
                  disabled={isOutOfStock}
                  className="flex-1 inline-flex items-center justify-center gap-2.5 px-6 py-3 text-sm font-semibold text-[#090D16] bg-[#C5A059] hover:bg-[#D4AF37] disabled:bg-slate-200 disabled:text-slate-500 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>
                    {isOutOfStock ? t.catalogSection.outOfStock : t.productModal.addToCart}
                  </span>
                  {!isOutOfStock && (
                    <span className="font-mono-tabular font-bold">
                      · {formatUSD(product.price_usd * quantity)}
                    </span>
                  )}
                </button>
              </div>

              <div className="flex items-start gap-2.5 p-3 bg-slate-50 border border-slate-200 rounded text-xs text-slate-600">
                <ShieldCheck className="w-4 h-4 text-[#C5A059] shrink-0 mt-0.5" />
                <span>{t.productModal.commercialNotice}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
