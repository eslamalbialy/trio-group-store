import React, { useState } from 'react';
import { Globe, Menu, ShoppingBag, X } from 'lucide-react';
import { Locale, SiteSettings } from '../types/schema';
import { useTranslations } from '../i18n/translations';

interface PublicHeaderProps {
  locale: Locale;
  onToggleLocale: () => void;
  cartCount: number;
  onOpenCart: () => void;
  onNavigateSection: (sectionId: string) => void;
  settings: SiteSettings;
}

export const PublicHeader: React.FC<PublicHeaderProps> = ({
  locale,
  onToggleLocale,
  cartCount,
  onOpenCart,
  onNavigateSection,
  settings,
}) => {
  const t = useTranslations(locale);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const companyDisplay =
    locale === 'ar'
      ? settings.company_name_ar || t.brand.shortName
      : settings.company_name_en || t.brand.shortName;

  const handleNavClick = (sectionId: string) => {
    setMobileMenuOpen(false);
    onNavigateSection(sectionId);
  };

  return (
    <header className="sticky top-0 z-40 bg-[#090D16] text-white border-b border-white/10 w-full">
      <div className="max-w-[1440px] mx-auto px-3 sm:px-8 h-16 sm:h-20 flex items-center justify-between gap-2 sm:gap-8">
        {/* Zone 1: Single-line Brand Wordmark */}
        <button
          type="button"
          onClick={() => handleNavClick('hero')}
          className="text-base sm:text-2xl font-serif-display font-semibold tracking-wider text-white hover:text-[#D4AF37] transition-colors whitespace-nowrap shrink-0 truncate max-w-[150px] sm:max-w-none cursor-pointer"
        >
          {companyDisplay}
        </button>

        {/* Zone 2: 5 concise single-line text navigation links */}
        <nav
          aria-label="Primary Navigation"
          className="hidden lg:flex items-center gap-7 text-sm font-medium text-slate-300"
        >
          <button
            type="button"
            onClick={() => handleNavClick('hero')}
            className="hover:text-[#D4AF37] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {t.nav.home}
          </button>
          <button
            type="button"
            onClick={() => handleNavClick('catalog')}
            className="hover:text-[#D4AF37] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {t.nav.catalog}
          </button>
          <button
            type="button"
            onClick={() => handleNavClick('categories')}
            className="hover:text-[#D4AF37] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {t.nav.categories}
          </button>
          <button
            type="button"
            onClick={() => handleNavClick('about')}
            className="hover:text-[#D4AF37] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {t.nav.about}
          </button>
          <button
            type="button"
            onClick={() => handleNavClick('contact')}
            className="hover:text-[#D4AF37] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {t.nav.contact}
          </button>
        </nav>

        {/* Zone 3: Language Switcher & Order Request Action */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <button
            type="button"
            onClick={onToggleLocale}
            aria-label={locale === 'en' ? 'Switch language to Arabic' : 'Switch language to English'}
            className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs font-medium text-slate-200 hover:text-[#D4AF37] border border-white/15 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Globe className="w-3.5 h-3.5 text-[#C5A059]" />
            <span>{t.nav.languageToggle}</span>
          </button>

          <button
            type="button"
            onClick={onOpenCart}
            aria-label={`${t.nav.purchaseRequest} (${cartCount})`}
            className="inline-flex items-center gap-1.5 sm:gap-2.5 px-2.5 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold text-[#090D16] bg-[#C5A059] hover:bg-[#D4AF37] rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <ShoppingBag className="w-4 h-4 shrink-0" />
            <span className="hidden sm:inline">{t.nav.purchaseRequest}</span>
            <span className="font-mono-tabular font-bold px-1.5 py-0.5 text-xs bg-[#090D16] text-[#D4AF37] rounded">
              {cartCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle Mobile Navigation Menu"
            aria-expanded={mobileMenuOpen}
            className="lg:hidden p-1.5 sm:p-2 text-slate-200 hover:text-[#D4AF37] border border-white/15 rounded-md"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-[#0F172A] border-t border-white/10 px-4 py-5 space-y-3">
          <div className="flex flex-col space-y-2 text-sm font-medium text-slate-200">
            <button
              type="button"
              onClick={() => handleNavClick('hero')}
              className="text-start py-2 px-3 rounded hover:bg-white/5 hover:text-[#D4AF37]"
            >
              {t.nav.home}
            </button>
            <button
              type="button"
              onClick={() => handleNavClick('catalog')}
              className="text-start py-2 px-3 rounded hover:bg-white/5 hover:text-[#D4AF37]"
            >
              {t.nav.catalog}
            </button>
            <button
              type="button"
              onClick={() => handleNavClick('categories')}
              className="text-start py-2 px-3 rounded hover:bg-white/5 hover:text-[#D4AF37]"
            >
              {t.nav.categories}
            </button>
            <button
              type="button"
              onClick={() => handleNavClick('about')}
              className="text-start py-2 px-3 rounded hover:bg-white/5 hover:text-[#D4AF37]"
            >
              {t.nav.about}
            </button>
            <button
              type="button"
              onClick={() => handleNavClick('contact')}
              className="text-start py-2 px-3 rounded hover:bg-white/5 hover:text-[#D4AF37]"
            >
              {t.nav.contact}
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
