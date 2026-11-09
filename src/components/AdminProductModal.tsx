import React, { useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  ImagePlus,
  Plus,
  Sparkles,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import {
  AvailabilityStatus,
  Category,
  Locale,
  Product,
  ProductImage,
  ProductSpec,
} from '../types/schema';

interface AdminProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  locale: Locale;
  categories: Category[];
  editingProduct: Product | null;
  onSaveProduct: (
    payload: Omit<Product, 'id' | 'created_at' | 'updated_at'> & { id?: string }
  ) => void;
}

export const AdminProductModal: React.FC<AdminProductModalProps> = ({
  isOpen,
  onClose,
  categories,
  editingProduct,
  onSaveProduct,
}) => {
  const [sku, setSku] = useState(editingProduct?.sku || '');
  const [titleEn, setTitleEn] = useState(editingProduct?.title_en || '');
  const [titleAr, setTitleAr] = useState(editingProduct?.title_ar || '');
  const [shortDescEn, setShortDescEn] = useState(
    editingProduct?.short_description_en || ''
  );
  const [shortDescAr, setShortDescAr] = useState(
    editingProduct?.short_description_ar || ''
  );
  const [descEn, setDescEn] = useState(editingProduct?.description_en || '');
  const [descAr, setDescAr] = useState(editingProduct?.description_ar || '');
  const [priceUsd, setPriceUsd] = useState(
    editingProduct ? String(editingProduct.price_usd) : ''
  );
  const [categoryId, setCategoryId] = useState(
    editingProduct?.category_id || categories[0]?.id || ''
  );
  const [availabilityStatus, setAvailabilityStatus] = useState<AvailabilityStatus>(
    editingProduct?.availability_status || 'in_stock'
  );
  const [isActive, setIsActive] = useState(
    editingProduct ? editingProduct.is_active : true
  );
  const [isFeatured, setIsFeatured] = useState(
    editingProduct ? editingProduct.is_featured : false
  );
  const [isArchived, setIsArchived] = useState(
    editingProduct ? editingProduct.is_archived : false
  );

  const [images, setImages] = useState<ProductImage[]>(
    editingProduct?.images
      ? [...editingProduct.images].sort((a, b) => a.display_order - b.display_order)
      : []
  );
  const [newImageUrl, setNewImageUrl] = useState('');
  const [newImageAltEn, setNewImageAltEn] = useState('');
  const [newImageAltAr, setNewImageAltAr] = useState('');

  const [specs, setSpecs] = useState<ProductSpec[]>(
    editingProduct?.specs
      ? [...editingProduct.specs].sort((a, b) => a.display_order - b.display_order)
      : []
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setErrorMsg(null);

    Array.from(files).forEach((file) => {
      if (!['image/jpeg', 'image/png', 'image/webp', 'image/avif'].includes(file.type)) {
        setErrorMsg('Only JPEG, PNG, WEBP, or AVIF image formats are permitted.');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setErrorMsg('Image file size must not exceed 5MB.');
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setImages((prev) => [
            ...prev,
            {
              id: `img_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
              product_id: editingProduct?.id || '',
              url: reader.result as string,
              alt_en: titleEn || file.name,
              alt_ar: titleAr || file.name,
              display_order: prev.length,
            },
          ]);
        }
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  const handleAddImageUrl = () => {
    const cleanUrl = newImageUrl.trim();
    if (!cleanUrl) return;
    setImages((prev) => [
      ...prev,
      {
        id: `img_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        product_id: editingProduct?.id || '',
        url: cleanUrl,
        alt_en: newImageAltEn.trim() || titleEn || 'TRIO GROUP Product Image',
        alt_ar: newImageAltAr.trim() || titleAr || 'صورة منتج تريو جروب',
        display_order: prev.length,
      },
    ]);
    setNewImageUrl('');
    setNewImageAltEn('');
    setNewImageAltAr('');
  };

  const handleAttachStudioAsset = () => {
    setImages((prev) => [
      ...prev,
      {
        id: `img_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        product_id: editingProduct?.id || '',
        url: '/src/assets/images/tgc_corporate_hero_1794217596491.jpg',
        alt_en: titleEn || 'TRIO GROUP Architectural Showcase',
        alt_ar: titleAr || 'عرض معماري تريو جروب',
        display_order: prev.length,
      },
    ]);
  };

  const moveImage = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= images.length) return;
    const copy = [...images];
    const [removed] = copy.splice(index, 1);
    copy.splice(target, 0, removed);
    setImages(copy.map((img, i) => ({ ...img, display_order: i })));
  };

  const setPrimaryImage = (index: number) => {
    if (index === 0) return;
    const copy = [...images];
    const [selected] = copy.splice(index, 1);
    copy.unshift(selected);
    setImages(copy.map((img, i) => ({ ...img, display_order: i })));
  };

  const removeImage = (id: string) => {
    setImages((prev) =>
      prev.filter((img) => img.id !== id).map((img, i) => ({ ...img, display_order: i }))
    );
  };

  const addSpecRow = () => {
    setSpecs((prev) => [
      ...prev,
      {
        id: `spec_${Date.now()}_${prev.length}`,
        product_id: editingProduct?.id || '',
        key_en: '',
        key_ar: '',
        value_en: '',
        value_ar: '',
        display_order: prev.length,
      },
    ]);
  };

  const updateSpecRow = (
    id: string,
    field: 'key_en' | 'key_ar' | 'value_en' | 'value_ar',
    value: string
  ) => {
    setSpecs((prev) =>
      prev.map((s) => (s.id === id ? { ...s, [field]: value } : s))
    );
  };

  const moveSpec = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= specs.length) return;
    const copy = [...specs];
    const [removed] = copy.splice(index, 1);
    copy.splice(target, 0, removed);
    setSpecs(copy.map((s, i) => ({ ...s, display_order: i })));
  };

  const removeSpecRow = (id: string) => {
    setSpecs((prev) =>
      prev.filter((s) => s.id !== id).map((s, i) => ({ ...s, display_order: i }))
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    try {
      const numericPrice = Number(priceUsd);
      if (!Number.isFinite(numericPrice) || numericPrice <= 0) {
        throw new Error('Authoritative USD Price must be a valid number greater than $0.00.');
      }
      onSaveProduct({
        id: editingProduct?.id,
        sku,
        title_en: titleEn,
        title_ar: titleAr,
        short_description_en: shortDescEn,
        short_description_ar: shortDescAr,
        description_en: descEn,
        description_ar: descAr,
        price_usd: numericPrice,
        category_id: categoryId,
        availability_status: availabilityStatus,
        is_active: isActive,
        is_featured: isFeatured,
        is_archived: isArchived,
        images,
        specs,
      });
      onClose();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to save product.');
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={editingProduct ? 'Edit Product' : 'Create New Product'}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#090D16]/75 backdrop-blur-xs overflow-y-auto"
    >
      <div className="w-full max-w-4xl bg-white border border-slate-200 rounded-lg shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        <div className="px-6 py-4 bg-[#090D16] text-white flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-lg font-serif-display font-bold">
              {editingProduct
                ? `Edit Product · ${editingProduct.sku}`
                : 'Publish New Catalog Product (USD)'}
            </h2>
            <p className="text-xs text-slate-400">
              Bilingual Catalog Entry · Authoritative USD ($) Pricing
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close product form modal"
            className="p-1.5 text-slate-300 hover:text-white border border-white/15 rounded cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form
          id="admin-product-form"
          onSubmit={handleSubmit}
          className="p-6 overflow-y-auto space-y-6 flex-1"
        >
          {errorMsg && (
            <div
              role="alert"
              className="p-3.5 bg-rose-50 border border-rose-200 rounded-md text-xs font-semibold text-rose-700"
            >
              {errorMsg}
            </div>
          )}

          {/* Row 1: SKU, USD Price, Category, Availability */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label
                htmlFor="prod-sku"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                SKU Code *
              </label>
              <input
                id="prod-sku"
                type="text"
                required
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                placeholder="e.g. TGC-SYS-101"
                className="w-full px-3 py-2 text-xs font-mono-tabular border border-slate-300 rounded focus:outline-none focus:border-[#C5A059]"
              />
            </div>

            <div>
              <label
                htmlFor="prod-price-usd"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Price in USD ($) *
              </label>
              <input
                id="prod-price-usd"
                type="number"
                step="0.01"
                min="0.01"
                required
                value={priceUsd}
                onChange={(e) => setPriceUsd(e.target.value)}
                placeholder="1250.00"
                className="w-full px-3 py-2 text-xs font-mono-tabular border border-slate-300 rounded focus:outline-none focus:border-[#C5A059]"
              />
            </div>

            <div>
              <label
                htmlFor="prod-category"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Category Division *
              </label>
              <select
                id="prod-category"
                required
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded focus:outline-none focus:border-[#C5A059]"
              >
                <option value="">Select Category...</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name_en} / {c.name_ar} {!c.is_active ? '(Inactive)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="prod-availability"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Availability Status
              </label>
              <select
                id="prod-availability"
                value={availabilityStatus}
                onChange={(e) =>
                  setAvailabilityStatus(e.target.value as AvailabilityStatus)
                }
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded focus:outline-none focus:border-[#C5A059]"
              >
                <option value="in_stock">In Stock</option>
                <option value="made_to_order">Made to Order</option>
                <option value="out_of_stock">Out of Stock</option>
              </select>
            </div>
          </div>

          {/* Row 2: Bilingual Titles */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="prod-title-en"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Product Title (English) *
              </label>
              <input
                id="prod-title-en"
                type="text"
                required
                value={titleEn}
                onChange={(e) => setTitleEn(e.target.value)}
                placeholder="Executive Architectural Acoustic Partition System"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded focus:outline-none focus:border-[#C5A059]"
              />
            </div>

            <div dir="rtl">
              <label
                htmlFor="prod-title-ar"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                اسم المنتج (بالعربية) *
              </label>
              <input
                id="prod-title-ar"
                type="text"
                required
                value={titleAr}
                onChange={(e) => setTitleAr(e.target.value)}
                placeholder="نظام القواطع المعمارية الصوتية التنفيذية"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded focus:outline-none focus:border-[#C5A059]"
              />
            </div>
          </div>

          {/* Row 3: Bilingual Short Descriptions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="prod-short-en"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Short Summary (English)
              </label>
              <input
                id="prod-short-en"
                type="text"
                value={shortDescEn}
                onChange={(e) => setShortDescEn(e.target.value)}
                placeholder="Commercial-grade anodized bronze & double-glazed acoustic system."
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded focus:outline-none focus:border-[#C5A059]"
              />
            </div>

            <div dir="rtl">
              <label
                htmlFor="prod-short-ar"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                وصف مختصر (بالعربية)
              </label>
              <input
                id="prod-short-ar"
                type="text"
                value={shortDescAr}
                onChange={(e) => setShortDescAr(e.target.value)}
                placeholder="نظام معماري عازل للصوت بإطارات البرونز المؤكسد والزجاج المزدوج."
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded focus:outline-none focus:border-[#C5A059]"
              />
            </div>
          </div>

          {/* Row 4: Full Bilingual Descriptions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="prod-desc-en"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Full Commercial Description (English)
              </label>
              <textarea
                id="prod-desc-en"
                rows={3}
                value={descEn}
                onChange={(e) => setDescEn(e.target.value)}
                placeholder="Detailed engineering, material finishes, and installation scope..."
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded focus:outline-none focus:border-[#C5A059]"
              />
            </div>

            <div dir="rtl">
              <label
                htmlFor="prod-desc-ar"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                الوصف التفصيلي الكامل (بالعربية)
              </label>
              <textarea
                id="prod-desc-ar"
                rows={3}
                value={descAr}
                onChange={(e) => setDescAr(e.target.value)}
                placeholder="التفاصيل الهندسية والتشطيبات ونطاق التوريد والتركيب..."
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded focus:outline-none focus:border-[#C5A059]"
              />
            </div>
          </div>

          {/* Visibility & Status Switches */}
          <div className="flex flex-wrap items-center gap-6 p-4 bg-slate-50 border border-slate-200 rounded-md">
            <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-800 cursor-pointer">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="rounded border-slate-300"
              />
              <span>Active & Published on Public Storefront</span>
            </label>

            <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-800 cursor-pointer">
              <input
                type="checkbox"
                checked={isFeatured}
                onChange={(e) => setIsFeatured(e.target.checked)}
                className="rounded border-slate-300"
              />
              <span>Featured Catalog Item</span>
            </label>

            {editingProduct && (
              <label className="inline-flex items-center gap-2 text-xs font-semibold text-amber-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isArchived}
                  onChange={(e) => setIsArchived(e.target.checked)}
                  className="rounded border-slate-300"
                />
                <span>Archived (Hidden from Storefront, Preserved for Orders)</span>
              </label>
            )}
          </div>

          {/* Multi-Image Manager (product_images) */}
          <div className="p-4 border border-slate-200 rounded-md space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-xs font-bold text-[#090D16] uppercase tracking-wider">
                  Multi-Image Gallery Manager (product_images)
                </h3>
                <p className="text-[11px] text-slate-500">
                  Upload files from device (JPEG/PNG/WEBP/AVIF ≤ 5MB) or attach a verified image URL.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <label className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#090D16] bg-[#C5A059] hover:bg-[#D4AF37] rounded cursor-pointer">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload From Device</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/avif"
                    multiple
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
                <button
                  type="button"
                  onClick={handleAttachStudioAsset}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-950 border border-slate-300 rounded cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#C5A059]" />
                  <span>Attach TGC Studio Photo</span>
                </button>
              </div>
            </div>

            {/* Add by URL Row */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
              <input
                type="text"
                value={newImageUrl}
                onChange={(e) => setNewImageUrl(e.target.value)}
                placeholder="Image URL (e.g. /src/assets/images/...)"
                aria-label="Image URL"
                className="sm:col-span-5 px-3 py-1.5 text-xs border border-slate-300 rounded"
              />
              <input
                type="text"
                value={newImageAltEn}
                onChange={(e) => setNewImageAltEn(e.target.value)}
                placeholder="Alt Text (EN)"
                aria-label="Image Alt Text English"
                className="sm:col-span-3 px-3 py-1.5 text-xs border border-slate-300 rounded"
              />
              <input
                type="text"
                value={newImageAltAr}
                onChange={(e) => setNewImageAltAr(e.target.value)}
                placeholder="نص بديل (AR)"
                aria-label="Image Alt Text Arabic"
                dir="rtl"
                className="sm:col-span-2 px-3 py-1.5 text-xs border border-slate-300 rounded"
              />
              <button
                type="button"
                onClick={handleAddImageUrl}
                className="sm:col-span-2 inline-flex items-center justify-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-[#090D16] hover:bg-slate-800 rounded cursor-pointer"
              >
                <ImagePlus className="w-3.5 h-3.5" />
                <span>Add URL</span>
              </button>
            </div>

            {images.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
                {images.map((img, idx) => (
                  <div
                    key={img.id}
                    className="p-2.5 border border-slate-200 rounded flex items-center gap-3 bg-slate-50"
                  >
                    <img
                      src={img.url}
                      alt={img.alt_en}
                      referrerPolicy="no-referrer"
                      className="w-14 h-14 object-cover rounded border border-slate-200 shrink-0 bg-slate-900"
                    />
                    <div className="flex-1 min-w-0">
                      <span className="text-[11px] font-mono-tabular font-semibold text-[#090D16] block">
                        #{idx + 1} {idx === 0 ? '· Primary Image' : ''}
                      </span>
                      <p className="text-[11px] text-slate-500 truncate">{img.alt_en}</p>
                      <div className="flex items-center gap-1.5 mt-1.5">
                        {idx !== 0 && (
                          <button
                            type="button"
                            onClick={() => setPrimaryImage(idx)}
                            className="text-[10px] font-semibold text-[#8A6D3B] hover:underline cursor-pointer"
                          >
                            Set Primary
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => moveImage(idx, -1)}
                          disabled={idx === 0}
                          aria-label="Move image up"
                          className="p-1 text-slate-500 hover:text-slate-900 disabled:opacity-30 cursor-pointer"
                        >
                          <ArrowUp className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveImage(idx, 1)}
                          disabled={idx === images.length - 1}
                          aria-label="Move image down"
                          className="p-1 text-slate-500 hover:text-slate-900 disabled:opacity-30 cursor-pointer"
                        >
                          <ArrowDown className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeImage(img.id)}
                          aria-label="Delete image"
                          className="p-1 text-rose-600 hover:text-rose-800 ms-auto cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Technical Specifications Builder (product_specs) */}
          <div className="p-4 border border-slate-200 rounded-md space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-[#090D16] uppercase tracking-wider">
                  Technical Specifications Builder (product_specs)
                </h3>
                <p className="text-[11px] text-slate-500">
                  Add bilingual specification rows (Key EN / Key AR → Value EN / Value AR).
                </p>
              </div>
              <button
                type="button"
                onClick={addSpecRow}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-[#090D16] hover:bg-slate-800 rounded cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Specification Row</span>
              </button>
            </div>

            {specs.length > 0 && (
              <div className="space-y-2 pt-2">
                {specs.map((spec, idx) => (
                  <div
                    key={spec.id}
                    className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center bg-slate-50 p-2 rounded border border-slate-200"
                  >
                    <input
                      type="text"
                      value={spec.key_en}
                      onChange={(e) =>
                        updateSpecRow(spec.id, 'key_en', e.target.value)
                      }
                      placeholder="Key (EN) e.g. Material"
                      aria-label={`Specification ${idx + 1} Key English`}
                      className="sm:col-span-3 px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded"
                    />
                    <input
                      type="text"
                      value={spec.value_en}
                      onChange={(e) =>
                        updateSpecRow(spec.id, 'value_en', e.target.value)
                      }
                      placeholder="Value (EN) e.g. Brushed Bronze"
                      aria-label={`Specification ${idx + 1} Value English`}
                      className="sm:col-span-3 px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded"
                    />
                    <input
                      type="text"
                      dir="rtl"
                      value={spec.key_ar}
                      onChange={(e) =>
                        updateSpecRow(spec.id, 'key_ar', e.target.value)
                      }
                      placeholder="المعيار (AR) مثال: الخامة"
                      aria-label={`Specification ${idx + 1} Key Arabic`}
                      className="sm:col-span-2 px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded"
                    />
                    <input
                      type="text"
                      dir="rtl"
                      value={spec.value_ar}
                      onChange={(e) =>
                        updateSpecRow(spec.id, 'value_ar', e.target.value)
                      }
                      placeholder="القيمة (AR) مثال: برونز مصقول"
                      aria-label={`Specification ${idx + 1} Value Arabic`}
                      className="sm:col-span-2 px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded"
                    />
                    <div className="sm:col-span-2 flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => moveSpec(idx, -1)}
                        disabled={idx === 0}
                        aria-label="Move specification up"
                        className="p-1 text-slate-500 hover:text-slate-900 disabled:opacity-30 cursor-pointer"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveSpec(idx, 1)}
                        disabled={idx === specs.length - 1}
                        aria-label="Move specification down"
                        className="p-1 text-slate-500 hover:text-slate-900 disabled:opacity-30 cursor-pointer"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeSpecRow(spec.id)}
                        aria-label="Remove specification row"
                        className="p-1 text-rose-600 hover:text-rose-800 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </form>

        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 hover:text-slate-950 border border-slate-300 rounded cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="admin-product-form"
            className="px-6 py-2 text-xs font-semibold text-[#090D16] bg-[#C5A059] hover:bg-[#D4AF37] rounded cursor-pointer"
          >
            {editingProduct ? 'Save Product Updates' : 'Publish Product to Catalog'}
          </button>
        </div>
      </div>
    </div>
  );
};
