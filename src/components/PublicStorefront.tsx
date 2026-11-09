import React, { useMemo, useState } from 'react';
import {
  ArrowUpRight,
  Building2,
  Clock,
  Eye,
  Lock,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  Search,
  ShoppingBag,
  SlidersHorizontal,
} from 'lucide-react';
import { Category, Locale, Product, SiteSettings } from '../types/schema';
import { useTranslations } from '../i18n/translations';
import { formatUSD, getPublicVisibleProducts } from '../utils/commerceRules';

interface PublicStorefrontProps {
  locale: Locale;
  categories: Category[];
  products: Product[];
  settings: SiteSettings;
  onSelectProduct: (product: Product) => void;
  onAddToCart: (product: Product, quantity: number) => void;
  onOpenAdminPortal: () => void;
}

const ITEMS_PER_PAGE = 8;

export const PublicStorefront: React.FC<PublicStorefrontProps> = ({
  locale,
  categories,
  products,
  settings,
  onSelectProduct,
  onAddToCart,
  onOpenAdminPortal,
}) => {
  const t = useTranslations(locale);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'price_asc' | 'price_desc' | 'name_asc'>('newest');
  const [currentPage, setCurrentPage] = useState(1);
  const [heroImgFailed, setHeroImgFailed] = useState(false);
  const [failedProductImages, setFailedProductImages] = useState<Record<string, boolean>>({});

  const activeCategories = useMemo(
    () => categories.filter((c) => c.is_active),
    [categories]
  );

  const visibleProducts = useMemo(
    () => getPublicVisibleProducts(products, categories),
    [products, categories]
  );

  const filteredAndSortedProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const filtered = visibleProducts.filter((p) => {
      if (selectedCategoryId !== 'all' && p.category_id !== selectedCategoryId) {
        return false;
      }
      if (!q) return true;
      return (
        p.title_en.toLowerCase().includes(q) ||
        p.title_ar.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.short_description_en.toLowerCase().includes(q) ||
        p.short_description_ar.toLowerCase().includes(q) ||
        p.description_en.toLowerCase().includes(q) ||
        p.description_ar.toLowerCase().includes(q)
      );
    });

    return [...filtered].sort((a, b) => {
      if (sortBy === 'price_asc') return a.price_usd - b.price_usd;
      if (sortBy === 'price_desc') return b.price_usd - a.price_usd;
      if (sortBy === 'name_asc') {
        const nameA = locale === 'ar' ? a.title_ar : a.title_en;
        const nameB = locale === 'ar' ? b.title_ar : b.title_en;
        return nameA.localeCompare(nameB);
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [visibleProducts, selectedCategoryId, searchQuery, sortBy, locale]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredAndSortedProducts.length / ITEMS_PER_PAGE)
  );
  const safePage = Math.min(currentPage, totalPages);
  const paginatedProducts = filteredAndSortedProducts.slice(
    (safePage - 1) * ITEMS_PER_PAGE,
    safePage * ITEMS_PER_PAGE
  );

  const heroHeadline =
    locale === 'ar'
      ? settings.hero_headline_ar || t.hero.defaultHeadline
      : settings.hero_headline_en || t.hero.defaultHeadline;

  const heroSubheadline =
    locale === 'ar'
      ? settings.hero_subheadline_ar || t.hero.defaultSubheadline
      : settings.hero_subheadline_en || t.hero.defaultSubheadline;

  const aboutText =
    locale === 'ar'
      ? settings.about_ar || t.aboutSection.defaultAbout
      : settings.about_en || t.aboutSection.defaultAbout;

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <main className="min-h-screen bg-[#F8FAFC] text-[#0F172A]">
      {/* 1. EXECUTIVE HERO SECTION */}
      <section
        id="hero"
        className="relative bg-[#090D16] text-white border-b border-white/10 overflow-hidden"
      >
        <div className="max-w-[1440px] mx-auto px-4 sm:px-8 py-14 lg:py-20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-stretch">
            {/* Hero Copy Column */}
            <div className="lg:col-span-7 flex flex-col justify-between space-y-8">
              <div className="space-y-5">
                <p className="text-xs font-mono-tabular tracking-widest text-[#D4AF37]">
                  {t.hero.kicker}
                </p>
                <h1
                  style={{ textWrap: 'balance' }}
                  className="text-3xl sm:text-5xl lg:text-[52px] font-serif-display font-bold text-white leading-[1.12] tracking-tight"
                >
                  {heroHeadline}
                </h1>
                <p className="text-base sm:text-lg text-slate-300 max-w-2xl leading-relaxed">
                  {heroSubheadline}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-4 pt-2">
                <button
                  type="button"
                  onClick={() => scrollToSection('catalog')}
                  className="px-6 py-3.5 text-sm font-semibold text-[#090D16] bg-[#C5A059] hover:bg-[#D4AF37] rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  {t.hero.exploreCatalog}
                </button>
                <button
                  type="button"
                  onClick={() => scrollToSection('contact')}
                  className="px-6 py-3.5 text-sm font-semibold text-white border border-white/25 hover:border-[#D4AF37] hover:text-[#D4AF37] rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  {t.hero.corporateInquiry}
                </button>
              </div>
            </div>

            {/* Hero Architectural Visual Column */}
            <div className="lg:col-span-5 flex">
              <div className="w-full min-h-[280px] lg:h-full rounded-lg overflow-hidden border border-white/15 bg-[#0F172A] relative flex items-end">
                {!heroImgFailed ? (
                  <img
                    src="/src/assets/images/tgc_corporate_hero_1794217596491.jpg"
                    alt="TRIO GROUP – TGC CORPORATION Manhattan Executive Headquarters"
                    referrerPolicy="no-referrer"
                    onError={() => setHeroImgFailed(true)}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                ) : null}
                <div className="relative z-10 w-full p-6 bg-gradient-to-t from-[#090D16] via-[#090D16]/75 to-transparent">
                  <p className="text-xs font-mono-tabular text-[#D4AF37]">
                    {settings.corporate_name}
                  </p>
                  <p className="text-sm font-medium text-slate-200 mt-1">
                    {t.brand.marketTag}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Full-Width 4-Column Corporate Fact Strip Below Hero Split */}
          <div className="mt-12 pt-8 border-t border-white/10 grid grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <span className="block text-xs text-slate-400">
                {t.hero.metrics.activeProducts}
              </span>
              <span
                data-testid="hero-active-products-count"
                className="text-2xl font-mono-tabular font-bold text-white mt-1 block"
              >
                {visibleProducts.length}
              </span>
            </div>
            <div>
              <span className="block text-xs text-slate-400">
                {t.hero.metrics.activeCategories}
              </span>
              <span
                data-testid="hero-active-categories-count"
                className="text-2xl font-mono-tabular font-bold text-white mt-1 block"
              >
                {activeCategories.length}
              </span>
            </div>
            <div>
              <span className="block text-xs text-slate-400">
                {t.hero.metrics.settlementCurrency}
              </span>
              <span className="text-2xl font-mono-tabular font-bold text-[#D4AF37] mt-1 block">
                USD ($)
              </span>
            </div>
            <div>
              <span className="block text-xs text-slate-400">
                {t.hero.metrics.jurisdiction}
              </span>
              <span className="text-base sm:text-lg font-mono-tabular font-semibold text-slate-200 mt-1 block">
                America/New_York
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. ACTIVE CATEGORIES DIVISION SHOWCASE */}
      <section
        id="categories"
        className="max-w-[1440px] mx-auto px-4 sm:px-8 py-14 border-b border-slate-200"
      >
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <p className="text-xs font-mono-tabular text-[#8A6D3B] font-semibold">
              {t.categoriesSection.kicker}
            </p>
            <h2 className="text-2xl sm:text-3xl font-serif-display font-bold text-[#090D16] mt-1">
              {t.categoriesSection.title}
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-600">
            {t.categoriesSection.subtitle}
          </p>
        </div>

        {activeCategories.length === 0 ? (
          <div className="p-6 bg-white border border-slate-200 rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <p className="text-sm text-slate-600">{t.categoriesSection.empty}</p>
            <button
              type="button"
              onClick={onOpenAdminPortal}
              className="px-4 py-2 text-xs font-semibold text-[#090D16] bg-slate-100 hover:bg-[#C5A059] rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {t.nav.staffPortal}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {activeCategories.map((cat) => {
              const count = visibleProducts.filter(
                (p) => p.category_id === cat.id
              ).length;
              const isSelected = selectedCategoryId === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    setSelectedCategoryId(isSelected ? 'all' : cat.id);
                    setCurrentPage(1);
                    scrollToSection('catalog');
                  }}
                  className={`text-start p-5 rounded-lg border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#090D16] text-white border-[#C5A059]'
                      : 'bg-white text-[#0F172A] border-slate-200 hover:border-[#C5A059]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-xs font-mono-tabular text-[#C5A059]">
                      /{cat.slug}
                    </span>
                    <span className="text-xs font-mono-tabular opacity-75">
                      {count} {t.categoriesSection.productsCount}
                    </span>
                  </div>
                  <h3 className="text-lg font-serif-display font-bold">
                    {locale === 'ar' ? cat.name_ar : cat.name_en}
                  </h3>
                  {(locale === 'ar' ? cat.description_ar : cat.description_en) && (
                    <p
                      className={`text-xs mt-1.5 line-clamp-2 ${
                        isSelected ? 'text-slate-300' : 'text-slate-600'
                      }`}
                    >
                      {locale === 'ar' ? cat.description_ar : cat.description_en}
                    </p>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* 3. INTERACTIVE PRODUCT CATALOG & SEARCH/FILTER ENGINE */}
      <section
        id="catalog"
        className="max-w-[1440px] mx-auto px-4 sm:px-8 py-16 border-b border-slate-200"
      >
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-8">
          <div>
            <p className="text-xs font-mono-tabular text-[#8A6D3B] font-semibold">
              {t.catalogSection.kicker}
            </p>
            <h2 className="text-3xl font-serif-display font-bold text-[#090D16] mt-1">
              {t.catalogSection.title}
            </h2>
          </div>

          {/* Search & Sort Controls */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
            <div className="relative flex-1 sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute top-1/2 -translate-y-1/2 start-3.5 pointer-events-none" />
              <input
                type="search"
                aria-label={t.catalogSection.searchPlaceholder}
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder={t.catalogSection.searchPlaceholder}
                className="w-full ps-10 pe-4 py-2.5 text-xs sm:text-sm bg-white border border-slate-300 rounded-md focus:outline-none focus:border-[#C5A059]"
              />
            </div>

            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-slate-500 shrink-0" />
              <select
                aria-label={t.catalogSection.sortLabel}
                value={sortBy}
                onChange={(e) =>
                  setSortBy(
                    e.target.value as 'newest' | 'price_asc' | 'price_desc' | 'name_asc'
                  )
                }
                className="px-3.5 py-2.5 text-xs sm:text-sm bg-white border border-slate-300 rounded-md focus:outline-none focus:border-[#C5A059]"
              >
                <option value="newest">{t.catalogSection.sortNewest}</option>
                <option value="price_asc">{t.catalogSection.sortPriceAsc}</option>
                <option value="price_desc">{t.catalogSection.sortPriceDesc}</option>
                <option value="name_asc">{t.catalogSection.sortNameAsc}</option>
              </select>
            </div>
          </div>
        </div>

        {/* Interactive Category Filter Segmented Control Bar */}
        {activeCategories.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 p-1.5 bg-slate-200/70 rounded-lg mb-8 w-fit">
            <button
              type="button"
              onClick={() => {
                setSelectedCategoryId('all');
                setCurrentPage(1);
              }}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                selectedCategoryId === 'all'
                  ? 'bg-[#090D16] text-[#D4AF37] shadow-xs'
                  : 'text-slate-700 hover:text-slate-950'
              }`}
            >
              {t.categoriesSection.viewAll} ({visibleProducts.length})
            </button>
            {activeCategories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  setSelectedCategoryId(cat.id);
                  setCurrentPage(1);
                }}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  selectedCategoryId === cat.id
                    ? 'bg-[#090D16] text-[#D4AF37] shadow-xs'
                    : 'text-slate-700 hover:text-slate-950'
                }`}
              >
                {locale === 'ar' ? cat.name_ar : cat.name_en}
              </button>
            ))}
          </div>
        )}

        {/* STRICT ZERO-FAKE-DATA POLICY: Luxury Empty Catalog State when 0 active products exist */}
        {visibleProducts.length === 0 ? (
          <div
            data-testid="empty-catalog-state"
            className="p-8 sm:p-14 bg-white border border-slate-200 rounded-lg text-center max-w-3xl mx-auto my-4 space-y-5 shadow-xs"
          >
            <div className="w-14 h-14 mx-auto rounded-full bg-[#090D16] text-[#D4AF37] flex items-center justify-center">
              <Building2 className="w-6 h-6" />
            </div>
            <p className="text-xs font-mono-tabular tracking-widest uppercase text-[#8A6D3B] font-semibold">
              {t.emptyCatalog.kicker}
            </p>
            <h3
              style={{ textWrap: 'balance' }}
              className="text-2xl sm:text-3xl font-serif-display font-bold text-[#090D16]"
            >
              {t.emptyCatalog.title}
            </h3>
            <p className="text-sm text-slate-600 max-w-xl mx-auto leading-relaxed">
              {t.emptyCatalog.description}
            </p>
            <div className="pt-3 flex flex-wrap items-center justify-center gap-4">
              <button
                type="button"
                onClick={onOpenAdminPortal}
                className="inline-flex items-center gap-2 px-6 py-3 text-xs sm:text-sm font-semibold text-[#090D16] bg-[#C5A059] hover:bg-[#D4AF37] rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Lock className="w-4 h-4" />
                <span>{t.emptyCatalog.adminCta}</span>
              </button>
              <button
                type="button"
                onClick={() => scrollToSection('contact')}
                className="px-5 py-3 text-xs sm:text-sm font-semibold text-slate-700 hover:text-slate-950 border border-slate-300 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                {t.emptyCatalog.inquiryCta}
              </button>
            </div>
          </div>
        ) : filteredAndSortedProducts.length === 0 ? (
          <div className="p-12 bg-white border border-slate-200 rounded-lg text-center space-y-4">
            <h3 className="text-xl font-serif-display font-bold text-slate-900">
              {t.catalogSection.noMatchTitle}
            </h3>
            <p className="text-xs text-slate-600">{t.catalogSection.noMatchDesc}</p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSelectedCategoryId('all');
                setCurrentPage(1);
              }}
              className="px-4 py-2 text-xs font-semibold text-[#090D16] bg-[#C5A059] hover:bg-[#D4AF37] rounded cursor-pointer"
            >
              {t.catalogSection.clearFilters}
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {paginatedProducts.map((product) => {
                const sortedImages = [...(product.images || [])].sort(
                  (a, b) => a.display_order - b.display_order
                );
                const primaryImg = sortedImages[0];
                const cat = categories.find((c) => c.id === product.category_id);
                const title =
                  locale === 'ar' ? product.title_ar : product.title_en;
                const shortDesc =
                  locale === 'ar'
                    ? product.short_description_ar
                    : product.short_description_en;
                const catName = cat
                  ? locale === 'ar'
                    ? cat.name_ar
                    : cat.name_en
                  : '';
                const isOutOfStock =
                  product.availability_status === 'out_of_stock';

                return (
                  <article
                    key={product.id}
                    data-testid={`catalog-product-card-${product.sku}`}
                    className="bg-white border border-slate-200 rounded-lg overflow-hidden flex flex-col justify-between transition-transform duration-150 hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <div>
                      {/* Lead with 4:3 Imagery */}
                      <div
                        onClick={() => onSelectProduct(product)}
                        className="aspect-4/3 w-full bg-slate-100 border-b border-slate-200 overflow-hidden cursor-pointer relative"
                      >
                        {primaryImg && !failedProductImages[primaryImg.id] ? (
                          <img
                            src={primaryImg.url}
                            alt={
                              locale === 'ar'
                                ? primaryImg.alt_ar || title
                                : primaryImg.alt_en || title
                            }
                            referrerPolicy="no-referrer"
                            onError={() =>
                              setFailedProductImages((prev) => ({
                                ...prev,
                                [primaryImg.id]: true,
                              }))
                            }
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-[#090D16] to-[#1E293B] text-white flex flex-col items-center justify-center p-6 text-center">
                            <Building2 className="w-9 h-9 text-[#C5A059] mb-2 opacity-80" />
                            <span className="text-[11px] font-mono-tabular text-[#D4AF37]">
                              {product.sku}
                            </span>
                            <span className="text-xs text-slate-300 mt-1 line-clamp-1">
                              {title}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Card Body — Clean Unboxed Metadata */}
                      <div className="p-5 space-y-2.5">
                        <div className="flex items-center gap-1.5 text-xs text-slate-500">
                          <span className="font-mono-tabular font-medium text-slate-700">
                            {product.sku}
                          </span>
                          {catName && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="truncate">{catName}</span>
                            </>
                          )}
                        </div>

                        <h3 className="text-base font-semibold text-[#090D16] leading-snug">
                          <button
                            type="button"
                            onClick={() => onSelectProduct(product)}
                            className="text-start hover:text-[#8A6D3B] transition-colors cursor-pointer"
                          >
                            {title}
                          </button>
                        </h3>

                        {shortDesc && (
                          <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                            {shortDesc}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Card Footer — Authoritative USD Price & Actions */}
                    <div className="px-5 pb-5 pt-3 border-t border-slate-100 space-y-3">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-lg font-mono-tabular font-bold text-[#090D16]">
                          {formatUSD(product.price_usd)}
                        </span>
                        <span
                          className={`text-[11px] font-medium ${
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

                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => onSelectProduct(product)}
                          className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:text-slate-950 border border-slate-300 rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>{t.catalogSection.viewDetails}</span>
                        </button>
                        <button
                          type="button"
                          disabled={isOutOfStock}
                          onClick={() => onAddToCart(product, 1)}
                          className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-[#090D16] bg-[#C5A059] hover:bg-[#D4AF37] disabled:bg-slate-200 disabled:text-slate-500 rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                        >
                          <ShoppingBag className="w-3.5 h-3.5" />
                          <span className="truncate">
                            {isOutOfStock
                              ? t.catalogSection.outOfStock
                              : t.catalogSection.addToRequest}
                          </span>
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>

            {/* Pagination Bar */}
            {totalPages > 1 && (
              <div className="mt-10 flex items-center justify-between border-t border-slate-200 pt-6">
                <p className="text-xs text-slate-600 font-mono-tabular">
                  {t.catalogSection.showingResults} {paginatedProducts.length}{' '}
                  {t.catalogSection.of} {filteredAndSortedProducts.length}{' '}
                  {t.catalogSection.activeItems}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={safePage <= 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="px-3.5 py-1.5 text-xs font-semibold border border-slate-300 rounded disabled:opacity-40 cursor-pointer"
                  >
                    {t.catalogSection.prevPage}
                  </button>
                  <span className="text-xs font-mono-tabular px-2">
                    {safePage} / {totalPages}
                  </span>
                  <button
                    type="button"
                    disabled={safePage >= totalPages}
                    onClick={() =>
                      setCurrentPage((p) => Math.min(totalPages, p + 1))
                    }
                    className="px-3.5 py-1.5 text-xs font-semibold border border-slate-300 rounded disabled:opacity-40 cursor-pointer"
                  >
                    {t.catalogSection.nextPage}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </section>

      {/* 4. CORPORATE IDENTITY & WHY CHOOSE TRIO GROUP */}
      <section
        id="about"
        className="max-w-[1440px] mx-auto px-4 sm:px-8 py-16 border-b border-slate-200"
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          <div className="lg:col-span-5 space-y-4">
            <p className="text-xs font-mono-tabular text-[#8A6D3B] font-semibold">
              {t.aboutSection.kicker}
            </p>
            <h2 className="text-3xl font-serif-display font-bold text-[#090D16]">
              {t.aboutSection.title}
            </h2>
            <p className="text-sm sm:text-base text-slate-700 leading-relaxed whitespace-pre-line">
              {aboutText}
            </p>
          </div>

          <div className="lg:col-span-7 space-y-4">
            <h3 className="text-lg font-serif-display font-bold text-[#090D16]">
              {t.aboutSection.whyTitle}
            </h3>
            {settings.why_choose_us.length === 0 ? (
              <div className="p-6 bg-white border border-slate-200 rounded-lg space-y-3">
                <p className="text-xs text-slate-600 leading-relaxed">
                  {t.aboutSection.unconfiguredNotice}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100 text-xs">
                  <div>
                    <strong className="block text-slate-900">
                      01. Authoritative USD ($) Settlement
                    </strong>
                    <span className="text-slate-600">
                      All commercial quotations and order snapshots are strictly
                      denominated in United States Dollars.
                    </span>
                  </div>
                  <div>
                    <strong className="block text-slate-900">
                      02. Direct Executive Fulfillment
                    </strong>
                    <span className="text-slate-600">
                      Every order request receives an official TGC reference
                      number in America/New_York time for direct B2B handling.
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {settings.why_choose_us.map((point, idx) => (
                  <div
                    key={point.id}
                    className="p-5 bg-white border border-slate-200 rounded-lg space-y-1.5"
                  >
                    <span className="text-xs font-mono-tabular text-[#8A6D3B] font-semibold">
                      0{idx + 1}.
                    </span>
                    <h4 className="text-base font-semibold text-[#090D16]">
                      {locale === 'ar' ? point.title_ar : point.title_en}
                    </h4>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {locale === 'ar' ? point.desc_ar : point.desc_en}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 5. VERIFIED CONTACT SECTION */}
      <section id="contact" className="max-w-[1440px] mx-auto px-4 sm:px-8 py-16">
        <div className="max-w-3xl mb-10 space-y-2">
          <p className="text-xs font-mono-tabular text-[#8A6D3B] font-semibold">
            {t.contactSection.kicker}
          </p>
          <h2 className="text-3xl font-serif-display font-bold text-[#090D16]">
            {t.contactSection.title}
          </h2>
          <p className="text-sm text-slate-600">{t.contactSection.subtitle}</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Email */}
          <div className="p-5 bg-white border border-slate-200 rounded-lg space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
              <Mail className="w-4 h-4 text-[#C5A059]" />
              <span>{t.contactSection.emailLabel}</span>
            </div>
            {settings.contact_email ? (
              <a
                href={`mailto:${settings.contact_email}`}
                className="block text-sm font-semibold text-[#090D16] hover:text-[#8A6D3B] break-all"
              >
                {settings.contact_email}
              </a>
            ) : (
              <p className="text-xs text-slate-400 italic">
                {t.contactSection.notConfiguredYet}
              </p>
            )}
          </div>

          {/* Phone */}
          <div className="p-5 bg-white border border-slate-200 rounded-lg space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
              <Phone className="w-4 h-4 text-[#C5A059]" />
              <span>{t.contactSection.phoneLabel}</span>
            </div>
            {settings.contact_phone ? (
              <a
                href={`tel:${settings.contact_phone}`}
                className="block text-sm font-mono-tabular font-semibold text-[#090D16] hover:text-[#8A6D3B]"
              >
                {settings.contact_phone}
              </a>
            ) : (
              <p className="text-xs text-slate-400 italic">
                {t.contactSection.notConfiguredYet}
              </p>
            )}
          </div>

          {/* WhatsApp */}
          <div className="p-5 bg-white border border-slate-200 rounded-lg space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
              <MessageSquare className="w-4 h-4 text-[#C5A059]" />
              <span>{t.contactSection.whatsappLabel}</span>
            </div>
            {settings.contact_whatsapp ? (
              <p className="text-sm font-mono-tabular font-semibold text-[#090D16]">
                {settings.contact_whatsapp}
              </p>
            ) : (
              <p className="text-xs text-slate-400 italic">
                {t.contactSection.notConfiguredYet}
              </p>
            )}
          </div>

          {/* US Headquarters & Hours */}
          <div className="p-5 bg-white border border-slate-200 rounded-lg space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
              <MapPin className="w-4 h-4 text-[#C5A059]" />
              <span>{t.contactSection.addressLabel}</span>
            </div>
            {(
              locale === 'ar'
                ? settings.headquarters_address_ar || settings.headquarters_address_en
                : settings.headquarters_address_en
            ) ? (
              <p className="text-xs font-medium text-slate-800 leading-relaxed">
                {locale === 'ar'
                  ? settings.headquarters_address_ar ||
                    settings.headquarters_address_en
                  : settings.headquarters_address_en}
              </p>
            ) : (
              <p className="text-xs text-slate-400 italic">
                {t.contactSection.notConfiguredYet}
              </p>
            )}
            {(locale === 'ar'
              ? settings.business_hours_ar || settings.business_hours_en
              : settings.business_hours_en) && (
              <div className="pt-2 border-t border-slate-100 flex items-center gap-1.5 text-[11px] text-slate-500">
                <Clock className="w-3.5 h-3.5 text-[#C5A059]" />
                <span>
                  {locale === 'ar'
                    ? settings.business_hours_ar || settings.business_hours_en
                    : settings.business_hours_en}
                </span>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 6. EXECUTIVE FOOTER WITH DISCREET STAFF PORTAL LINK */}
      <footer className="bg-[#090D16] text-slate-400 border-t border-white/10">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-8 py-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="space-y-1">
            <p className="text-sm font-serif-display font-bold text-white tracking-wider">
              {settings.corporate_name}
            </p>
            <p className="text-xs text-slate-400">{t.footer.policyNote}</p>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-xs">
            <span>
              © {new Date().getFullYear()} {settings.corporate_name}.{' '}
              {t.footer.rights}
            </span>
            <button
              type="button"
              onClick={onOpenAdminPortal}
              className="inline-flex items-center gap-1 text-slate-300 hover:text-[#D4AF37] transition-colors cursor-pointer"
            >
              <span>{t.nav.staffPortal}</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </footer>
    </main>
  );
};
