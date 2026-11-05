import React, { useState, useEffect } from 'react';
import { ProductCard } from '../components/ui/ProductCard';
import { SeedProduct, INITIAL_CATEGORIES } from '../../server/data/initialData';
import {
  ArrowRight,
  ShieldCheck,
  Truck,
  RotateCcw,
  Smartphone,
  Shirt,
  Home,
  Sparkles,
  Dumbbell,
  Gamepad2,
  ChevronLeft,
  ChevronRight,
  Crown,
  Star,
  Quote,
  Eye,
  Settings,
} from 'lucide-react';
import { AdvertisementPopup } from '../components/common/AdvertisementPopup';
import { useVisitorAnalytics } from '../hooks/useVisitorAnalytics';
import {
  HomepageSectionConfig,
  GenericBanner,
  interleaveProductsAndBanners,
} from '../utils/homepageBuilderRules';
import { useDelayedSkeleton } from '../hooks/useDelayedSkeleton';
import { HomepageSkeleton } from '../components/skeletons/HomepageSkeleton';
import { handleImageFallback } from '../utils/safeMarkdown';
import { BannerRenderer, sanitizeBannerLink } from '../components/banner/BannerRenderer';

interface HomePageProps {
  onNavigate: (view: string, params?: any) => void;
}

interface DynamicSlider {
  id: string;
  imageUrl?: string;
  lifestyleImage?: string;
  destinationLink?: string;
  openInNewTab?: boolean;
  altText?: string;
  displayOrder: number;
}

export const HomePage: React.FC<HomePageProps> = ({ onNavigate }) => {
  useVisitorAnalytics('/');

  // Query parameter preview mode check
  const searchParams = new URLSearchParams(window.location.search);
  const isPreviewDraft = searchParams.get('preview') === 'draft';

  const [products, setProducts] = useState<SeedProduct[]>([]);
  const [sections, setSections] = useState<HomepageSectionConfig[]>([]);
  const [sliders, setSliders] = useState<DynamicSlider[]>([]);
  const [bannersMap, setBannersMap] = useState<Record<string, any>>({});
  const [categories, setCategories] = useState<any[]>(INITIAL_CATEGORIES);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isSliderHovered, setIsSliderHovered] = useState(false);
  const [loading, setLoading] = useState(true);
  const [testimonialIndex, setTestimonialIndex] = useState(0);

  useEffect(() => {
    async function loadData() {
      try {
        const configUrl = isPreviewDraft
          ? '/api/homepage/config?preview=draft'
          : '/api/homepage/config';

        const [prodRes, configRes, slidersRes, bannersRes, catRes] = await Promise.all([
          fetch('/api/products?limit=50'),
          fetch(configUrl),
          fetch('/api/cms/sliders?activeOnly=true'),
          fetch('/api/cms/banners?status=published'),
          fetch('/api/categories?activeOnly=true'),
        ]);

        const prodData = await prodRes.json();
        const configData = await configRes.json();
        const slidersData = await slidersRes.json();
        const bannersData = await bannersRes.json();
        const catData = await catRes.json();

        if (prodData.success) {
          setProducts(prodData.data);
        }

        if (catData.success && Array.isArray(catData.data) && catData.data.length > 0) {
          setCategories(catData.data);
        }

        if (configData.success && configData.data) {
          setSections(configData.data.sections || []);
        }

        // Merge published banners into bannersMap
        const bMap: Record<string, any> = { ...(configData.data?.bannersMap || {}) };
        if (bannersData.success && Array.isArray(bannersData.data)) {
          for (const bnr of bannersData.data) {
            bMap[bnr.id] = bnr;
            if (bnr.placement) {
              bMap[bnr.placement] = bnr;
            }
          }
        }
        setBannersMap(bMap);

        // Populate image-only sliders from database
        if (slidersData.success && Array.isArray(slidersData.data) && slidersData.data.length > 0) {
          setSliders(slidersData.data);
        } else if (configData.data?.sliders?.length > 0) {
          setSliders(configData.data.sliders);
        }
      } catch (err) {
        console.error('Failed to load dynamic homepage data', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [isPreviewDraft]);

  // Slider Autoplay (5s rotation, pauses when hovered)
  useEffect(() => {
    if (sliders.length <= 1 || isSliderHovered) return;

    const interval = setInterval(() => {
      setCurrentSlideIndex((prev) => (prev + 1) % sliders.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [sliders.length, isSliderHovered]);

  const currentSlider = sliders.length > 0 ? sliders[currentSlideIndex] : null;

  const handlePrevSlide = () => {
    if (sliders.length <= 1) return;
    setCurrentSlideIndex((prev) => (prev > 0 ? prev - 1 : sliders.length - 1));
  };

  const handleNextSlide = () => {
    if (sliders.length <= 1) return;
    setCurrentSlideIndex((prev) => (prev + 1) % sliders.length);
  };

  const categoryIcons: Record<string, React.ReactNode> = {
    electronics: <Smartphone className="w-5 h-5 text-gray-700" />,
    fashion: <Shirt className="w-5 h-5 text-gray-700" />,
    'home-living': <Home className="w-5 h-5 text-gray-700" />,
    'beauty-personal-care': <Sparkles className="w-5 h-5 text-gray-700" />,
    'sports-outdoors': <Dumbbell className="w-5 h-5 text-gray-700" />,
    'toys-games': <Gamepad2 className="w-5 h-5 text-gray-700" />,
  };

  // Helper to resolve products for a given product grid section
  const resolveProductsForSection = (sec: HomepageSectionConfig): SeedProduct[] => {
    const { productSource = 'featured', categorySlug, productLimit = 8, productIds = [] } =
      sec.settings;

    let result = [...products];

    if (productSource === 'featured') {
      result = result.filter((p) => p.isPopular);
    } else if (productSource === 'best_seller') {
      result = result.filter((p) => p.isBestSeller);
    } else if (productSource === 'new_arrivals') {
      result = [...products].reverse();
    } else if (productSource === 'discount') {
      result = result.filter((p) => (p as any).discountPercentage || (p.salePrice && p.salePrice < p.price));
    } else if (productSource === 'category' && categorySlug) {
      result = result.filter(
        (p) => p.category?.toLowerCase() === categorySlug.toLowerCase()
      );
    } else if (productSource === 'manual' && productIds.length > 0) {
      result = result.filter((p) => productIds.includes(p.id));
    }

    // Fallback if filter returned empty
    if (result.length === 0) {
      result = products;
    }

    return result.slice(0, productLimit);
  };

  const showSkeleton = useDelayedSkeleton(loading);

  if (loading) {
    if (showSkeleton) {
      return <HomepageSkeleton />;
    }
    return null;
  }

  return (
    <div className="space-y-16 pb-12">
      {/* Draft Mode Indicator Banner */}
      {isPreviewDraft && (
        <div className="bg-amber-500 text-slate-950 px-4 py-2 text-center text-xs font-bold flex items-center justify-center gap-3 shadow-md sticky top-0 z-50">
          <Eye className="w-4 h-4" />
          <span>STAGING PREVIEW: Viewing unpublished draft layout.</span>
          <button
            onClick={() => onNavigate('admin', { module: 'cms-home' })}
            className="underline cursor-pointer hover:text-black font-extrabold flex items-center gap-1"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Open Builder</span>
          </button>
          <span>•</span>
          <a href="/" className="underline hover:text-black">
            Exit Preview
          </a>
        </div>
      )}

      {/* Render Dynamic Sections in Configured Sequence */}
      {sections.map((section) => {
        // 1. IMAGE-ONLY HERO SLIDER (Phase 10 Compliant)
        if (section.sectionType === 'hero_slider') {
          const activeSlide = sliders.length > 0 ? sliders[currentSlideIndex] : null;
          const slideImg = activeSlide?.imageUrl || activeSlide?.lifestyleImage || 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=1600&q=85';
          const slideTarget = sanitizeBannerLink(activeSlide?.destinationLink);

          return (
            <section key={section.id} className="relative w-full max-w-7xl mx-auto px-4 sm:px-6 pt-4 space-y-4">
              <div
                onMouseEnter={() => setIsSliderHovered(true)}
                onMouseLeave={() => setIsSliderHovered(false)}
                className="relative rounded-3xl bg-gray-950 border border-gray-100 overflow-hidden shadow-xs group select-none min-h-[240px] sm:min-h-[360px] lg:min-h-[480px] flex items-center justify-center"
              >
                {/* Navigation arrow buttons */}
                {sliders.length > 1 && (
                  <>
                    <button
                      onClick={handlePrevSlide}
                      className="hidden sm:flex absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 hover:bg-white shadow-md items-center justify-center text-gray-800 z-20 transition cursor-pointer hover:scale-105"
                      aria-label="Previous slide"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      onClick={handleNextSlide}
                      className="hidden sm:flex absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 hover:bg-white shadow-md items-center justify-center text-gray-800 z-20 transition cursor-pointer hover:scale-105"
                      aria-label="Next slide"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </>
                )}

                {/* Hero Slide Image Container with Optional Click Action */}
                <div
                  onClick={() => {
                    if (!slideTarget) return;
                    if (slideTarget.isExternal) {
                      if (activeSlide?.openInNewTab) {
                        window.open(slideTarget.safeUrl, '_blank', 'noopener,noreferrer');
                      } else {
                        window.location.href = slideTarget.safeUrl;
                      }
                    } else {
                      onNavigate(slideTarget.safeUrl.replace(/^\//, '') || 'shop');
                    }
                  }}
                  className={`w-full h-full relative ${
                    slideTarget ? 'cursor-pointer' : ''
                  }`}
                >
                  <img
                    src={slideImg}
                    alt={activeSlide?.altText || 'Novara Hero Slide'}
                    onError={handleImageFallback}
                    className="w-full h-[240px] sm:h-[360px] lg:h-[480px] object-cover object-center transition-transform duration-700 group-hover:scale-[1.01]"
                  />
                </div>

                {/* Pagination Dots */}
                {sliders.length > 1 && (
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 z-20 bg-black/40 backdrop-blur-xs px-3.5 py-1.5 rounded-full">
                    {sliders.map((s, idx) => (
                      <button
                        key={s.id || idx}
                        onClick={() => setCurrentSlideIndex(idx)}
                        className={`transition-all duration-300 rounded-full cursor-pointer ${
                          currentSlideIndex === idx
                            ? 'w-7 h-2 bg-white shadow-xs'
                            : 'w-2 h-2 bg-white/60 hover:bg-white/90'
                        }`}
                        aria-label={`Go to slide ${idx + 1}`}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* 3 Trust Badges below Hero Slider */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white/90 border border-gray-100 rounded-2xl p-4 shadow-2xs">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center shrink-0 border border-emerald-100">
                    <ShieldCheck className="w-4 h-4 text-[#00875a]" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-gray-900 block">Premium Quality Products</span>
                    <span className="text-[11px] text-gray-500">100% genuine verified items</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center shrink-0 border border-emerald-100">
                    <Truck className="w-4 h-4 text-[#00875a]" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-gray-900 block">Fast &amp; Reliable Delivery</span>
                    <span className="text-[11px] text-gray-500">All 64 districts of Bangladesh</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center shrink-0 border border-emerald-100">
                    <RotateCcw className="w-4 h-4 text-[#00875a]" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-gray-900 block">Easy Return &amp; Refund</span>
                    <span className="text-[11px] text-gray-500">Hassle-free 30-day policy</span>
                  </div>
                </div>
              </div>
            </section>
          );
        }

        // 2. TRUST & VALUE BADGES
        if (section.sectionType === 'trust_badges') {
          return (
            <section key={section.id} className="max-w-7xl mx-auto px-4 sm:px-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 bg-emerald-50/40 border border-emerald-100 rounded-3xl p-6 sm:p-8">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-[#0c593f] flex items-center justify-center shrink-0">
                    <Truck className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 text-sm">Free Express Shipping</h4>
                    <p className="text-xs text-gray-500 mt-0.5">On all domestic orders over ৳2,500</p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-[#0c593f] flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 text-sm">30-Day Money Guarantee</h4>
                    <p className="text-xs text-gray-500 mt-0.5">Hassle-free 100% money back returns</p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-[#0c593f] flex items-center justify-center shrink-0">
                    <RotateCcw className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 text-sm">24/7 Dedicated Support</h4>
                    <p className="text-xs text-gray-500 mt-0.5">Live support anytime, anywhere</p>
                  </div>
                </div>
              </div>
            </section>
          );
        }

        // 3. CATEGORY SHOWCASE
        if (section.sectionType === 'category_showcase') {
          return (
            <section key={section.id} className="max-w-7xl mx-auto px-4 sm:px-6">
              <div className="flex items-center justify-between mb-6 pb-3 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <h2 className="text-xl sm:text-2xl font-extrabold text-gray-900 tracking-tight">
                    {section.title || 'Shop by Category'}
                  </h2>
                  <span className="w-8 h-0.5 bg-[#00875a] hidden sm:inline-block rounded-full" />
                </div>
                {section.settings.viewAllText && (
                  <button
                    onClick={() => onNavigate('shop')}
                    className="text-xs sm:text-sm font-bold text-[#00875a] hover:text-[#00724c] flex items-center gap-1 transition cursor-pointer"
                  >
                    <span>{section.settings.viewAllText}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
                {categories.map((cat) => (
                  <div
                    key={cat.slug || cat.id}
                    onClick={() => onNavigate('shop', { category: cat.slug })}
                    className="group relative flex flex-col items-center justify-between p-4 sm:p-5 rounded-2xl bg-white border border-gray-100 hover:border-emerald-300 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 cursor-pointer overflow-hidden text-center"
                  >
                    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-[#f0fdf4] group-hover:bg-[#dcfce7] text-[#00875a] flex items-center justify-center transition-transform duration-300 group-hover:scale-105 shadow-2xs border border-emerald-100 mb-3 shrink-0 overflow-hidden">
                      {cat.image ? (
                        <img
                          src={cat.image}
                          alt={cat.name}
                          className="w-full h-full object-cover"
                          onError={handleImageFallback}
                        />
                      ) : (
                        categoryIcons[cat.slug] || <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-[#00875a]" />
                      )}
                    </div>
                    <span className="text-xs sm:text-sm font-bold text-gray-900 group-hover:text-[#00875a] transition-colors line-clamp-1 w-full text-center">
                      {cat.name}
                    </span>
                    <span className="text-[11px] text-gray-400 font-medium mt-1 group-hover:text-[#00875a] transition-colors flex items-center gap-0.5">
                      Explore &rarr;
                    </span>
                  </div>
                ))}
              </div>
            </section>
          );
        }

        // 4. SPLIT CAMPAIGN CARDS
        if (section.sectionType === 'split_banners') {
          const bannerIds = section.settings.bannerIds || ['bnr-sec-1', 'bnr-sec-2'];
          const card1 = bannersMap[bannerIds[0]] || bannersMap['bnr-sec-1'] || {
            tag: 'Smart Tech',
            headline: 'Smart Tech\nSmarter You',
            subheadline: 'Latest gadgets. Unbeatable prices.',
            buttonText: 'Shop Now',
            buttonLink: '/shop?category=electronics',
            imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&q=80',
            backgroundColor: '#0c3328',
            theme: 'dark',
          };

          const card2 = bannersMap[bannerIds[1]] || bannersMap['bnr-sec-2'] || {
            tag: 'Fashion',
            headline: 'Fashion\nThat Speaks You',
            subheadline: 'Trendy styles for every mood.',
            buttonText: 'Shop Now',
            buttonLink: '/shop?category=fashion',
            imageUrl: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600&q=80',
            backgroundColor: '#fbe7dc',
            theme: 'peach',
          };

          const isDark2 = card2.theme === 'dark' || card2.backgroundColor === '#0c261e';

          return (
            <section key={section.id} className="max-w-7xl mx-auto px-4 sm:px-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <BannerRenderer banner={card1} onNavigate={onNavigate} />
                <BannerRenderer banner={card2} onNavigate={onNavigate} />
              </div>
            </section>
          );
        }

        // 5. FULL-WIDTH PROMOTIONAL BANNER
        if (section.sectionType === 'promotional_banner') {
          const banner =
            bannersMap[section.settings.bannerId || ''] ||
            bannersMap['homepage-promotion'] ||
            bannersMap['bnr-main-1'] || {
              tag: 'LIMITED TIME OFFER',
              headline: 'UP TO 50% OFF',
              subheadline: 'On Your Favorite Brands across Tech, Living & Footwear.',
              buttonText: 'Claim Discount',
              buttonLink: '/shop?discount=true',
              imageUrl: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1600&q=85',
              backgroundColor: '#064e3b',
              bgType: 'image-overlay',
              overlay: { enabled: true, color: '#064e3b', opacity: 0.65 },
            };

          return (
            <section key={section.id} className="max-w-7xl mx-auto px-4 sm:px-6">
              <BannerRenderer banner={banner} onNavigate={onNavigate} />
            </section>
          );
        }

        // 6. DYNAMIC PRODUCT GRID WITH INTERLEAVED BANNERS
        if (section.sectionType === 'product_grid') {
          const sectionProducts = resolveProductsForSection(section);
          const interleavedItems = interleaveProductsAndBanners(
            sectionProducts,
            section.settings.bannerPlacements || [],
            bannersMap
          );

          const desktopColsClass =
            section.settings.desktopColumns === 5
              ? 'lg:grid-cols-5'
              : section.settings.desktopColumns === 3
              ? 'lg:grid-cols-3'
              : 'lg:grid-cols-4';

          // Strict Phase 4: Small and standard mobile devices display 1 product per row
          const gridColsClass = `grid-cols-1 sm:grid-cols-2 md:grid-cols-3 ${desktopColsClass} gap-4 sm:gap-6`;

          return (
            <section key={section.id} className="max-w-7xl mx-auto px-4 sm:px-6">
              {/* Section Header */}
              <div className="flex items-center justify-between mb-8 pb-3 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  {section.settings.productSource === 'best_seller' && (
                    <Crown className="w-5 h-5 text-amber-500" />
                  )}
                  <h2 className="text-xl sm:text-2xl font-extrabold text-gray-900 tracking-tight">
                    {section.title}
                  </h2>
                  <span className="w-8 h-0.5 bg-emerald-700 hidden sm:inline-block" />
                </div>

                {section.settings.viewAllText && (
                  <button
                    onClick={() => {
                      const link = section.settings.viewAllLink || '/shop';
                      onNavigate(link.replace('/', '') || 'shop');
                    }}
                    className="text-xs sm:text-sm font-bold text-emerald-800 hover:text-emerald-950 flex items-center gap-1 transition cursor-pointer"
                  >
                    <span>{section.settings.viewAllText}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </div>

              {loading ? (
                <div className={`grid ${gridColsClass}`}>
                  {[...Array(section.settings.productLimit || 8)].map((_, i) => (
                    <div key={i} className="h-72 rounded-2xl bg-gray-100 animate-pulse" />
                  ))}
                </div>
              ) : (
                <div className={`grid ${gridColsClass}`}>
                  {interleavedItems.map((entry, idx) => {
                    if (entry.type === 'product') {
                      const product = entry.item as SeedProduct;
                      return (
                        <ProductCard
                          key={`${section.id}-prod-${product.id}-${idx}`}
                          product={product}
                          onViewProduct={(slug) => onNavigate('product', { slug })}
                        />
                      );
                    }

                    // INTERLEAVED BANNER (spans across the full width of the grid!)
                    const banner = entry.item as GenericBanner;
                    return (
                      <div
                        key={`${section.id}-bnr-${banner.id}-${idx}`}
                        className="col-span-full my-4 rounded-3xl p-6 sm:p-10 text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl relative overflow-hidden"
                        style={{ backgroundColor: banner.backgroundColor || '#0c261e' }}
                      >
                        <div className="relative z-10 space-y-2 max-w-xl">
                          {banner.tag && (
                            <span className="text-xs font-bold uppercase tracking-widest text-emerald-300">
                              {banner.tag}
                            </span>
                          )}
                          <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                            {banner.headline}
                          </h3>
                          {banner.subheadline && (
                            <p className="text-xs sm:text-sm text-emerald-100/90 leading-relaxed">
                              {banner.subheadline}
                            </p>
                          )}
                          <div className="pt-2">
                            <button
                              onClick={() => {
                                const link = banner.buttonLink || '/shop';
                                if (link.startsWith('/')) {
                                  onNavigate(link.replace('/', '') || 'shop');
                                } else {
                                  window.location.href = link;
                                }
                              }}
                              className="px-6 py-2.5 rounded-full bg-emerald-500 hover:bg-emerald-400 text-gray-950 font-bold text-xs transition flex items-center gap-2 shadow cursor-pointer"
                            >
                              <span>{banner.buttonText || 'Shop Now'}</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {banner.imageUrl && (
                          <div className="relative z-10 max-h-48 shrink-0">
                            <img
                              src={banner.imageUrl}
                              alt={banner.headline}
                              className="max-h-40 sm:max-h-48 object-contain rounded-2xl drop-shadow-lg"
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          );
        }

        // 7. TESTIMONIALS
        if (section.sectionType === 'testimonials') {
          const allTestimonials = [
            {
              name: 'Sarah Khan',
              meta: 'Verified Buyer • Dhaka',
              avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&q=80',
              quote:
                'The active noise cancellation on the Soundcore headphones is mindblowing for the price! Customer service helped me track delivery within minutes.',
            },
            {
              name: 'Tanvir Rahman',
              meta: 'Verified Buyer • Chittagong',
              avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&q=80',
              quote:
                'I ordered the waterproof backpack and smart watch together. Delivered in pristine condition in 2 days. ShopMax is my default store now.',
            },
            {
              name: 'Nusrat Jahan',
              meta: 'Verified Buyer • Sylhet',
              avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&q=80',
              quote:
                'Seamless checkout experience and genuine products with official manufacturer warranties. Highly recommended!',
            },
            {
              name: 'Arif Chowdhury',
              meta: 'Verified Buyer • Gulshan, Dhaka',
              avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&q=80',
              quote:
                'Ordered the ErgoPro Mesh Chair for my home studio. Build quality exceeded expectations and Cash on Delivery was effortless.',
            },
            {
              name: 'Maliha Tasnim',
              meta: 'Verified Buyer • Uttara, Dhaka',
              avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=120&q=80',
              quote:
                'Love how easy it is to save items to my wishlist and check out only the ones I select. Fast packaging and authentic skincare.',
            },
            {
              name: 'Rafiq Hasan',
              meta: 'Verified Buyer • Rajshahi',
              avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=120&q=80',
              quote:
                'Transparent pricing, instant order tracking in my account dashboard, and responsive support team.',
            },
          ];
          const visibleTestimonials = allTestimonials.slice(testimonialIndex * 3, testimonialIndex * 3 + 3);

          return (
            <section key={section.id} className="max-w-7xl mx-auto px-4 sm:px-6">
              <div className="flex items-center justify-between mb-8 pb-3 border-b border-gray-100">
                <h2 className="text-xl sm:text-2xl font-extrabold text-gray-900 tracking-tight">
                  {section.title || 'What Our Customers Say'}
                </h2>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setTestimonialIndex((prev) => (prev > 0 ? prev - 1 : 1))}
                    className="w-8 h-8 rounded-full border border-gray-200 hover:border-gray-400 flex items-center justify-center text-gray-600 transition cursor-pointer"
                    aria-label="Previous review"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setTestimonialIndex((prev) => (prev < 1 ? prev + 1 : 0))}
                    className="w-8 h-8 rounded-full border border-gray-200 hover:border-gray-400 flex items-center justify-center text-gray-600 transition cursor-pointer"
                    aria-label="Next review"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {visibleTestimonials.map((item) => (
                  <div
                    key={item.name}
                    className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-3 mb-4">
                        <img
                          src={item.avatar}
                          alt={item.name}
                          onError={handleImageFallback}
                          className="w-11 h-11 rounded-full object-cover border border-emerald-100"
                        />
                        <div>
                          <div className="text-sm font-bold text-gray-900">{item.name}</div>
                          <div className="text-[11px] text-gray-500">{item.meta}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 text-amber-400 mb-3">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className="w-3.5 h-3.5 fill-current" />
                        ))}
                      </div>
                      <p className="text-xs text-gray-600 leading-relaxed italic">
                        "{item.quote}"
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          );
        }

        return null;
      })}

      {/* Promotional Ad Popup (if configured) */}
      <AdvertisementPopup onNavigate={onNavigate} />
    </div>
  );
};
