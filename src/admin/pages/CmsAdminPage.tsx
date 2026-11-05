import React, { useState, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { addToast } from '../../features/toast/toastSlice';
import { Modal } from '../../components/modal/Modal';
import {
  Sparkles,
  Save,
  Truck,
  Image as ImageIcon,
  Layout,
  ExternalLink,
  Plus,
  Trash2,
  Edit,
  Eye,
  CheckCircle2,
  XCircle,
  Sliders as SlidersIcon,
  Megaphone,
  Layers,
  ArrowUpDown,
  Calendar,
  MousePointerClick,
  Clock,
  RefreshCw,
  BookOpen,
  FileText,
  Menu as MenuIcon,
  Copy,
} from 'lucide-react';
import { handleImageFallback } from '../../utils/safeMarkdown';
import { HeroSliderModal, HeroSliderFormData } from '../components/cms/HeroSliderModal';
import { BannerDesignerModal, BannerFormData } from '../components/cms/BannerDesignerModal';
import { BannerRenderer } from '../../components/banner/BannerRenderer';

interface CmsAdminPageProps {
  cmsData: any;
  activeModule?: string;
  onRefresh: () => void;
}

export interface SliderItem {
  id: string;
  imageUrl: string;
  destinationLink?: string;
  openInNewTab?: boolean;
  altText?: string;
  displayOrder: number;
  isActive: boolean;
  tag?: string;
  headline?: string;
  subheadline?: string;
  buttonText?: string;
  buttonLink?: string;
  lifestyleImage?: string;
  modelScript?: string;
  badge?: string;
}

export interface BannerItem extends BannerFormData {
  id: string;
}

interface AdvertisementItem {
  id: string;
  title: string;
  description?: string;
  imageUrl: string;
  destinationUrl: string;
  buttonText: string;
  priority: number;
  frequency: 'once_per_session' | 'always' | 'daily';
  isActive: boolean;
  startDate?: string;
  endDate?: string;
  impressions: number;
  clicks: number;
  dismissals: number;
}

interface BlogArticleItem {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string[];
  category: string;
  author: {
    name: string;
    role: string;
    avatar: string;
  };
  coverImage: string;
  readTime: string;
  publishedAt: string;
  featured: boolean;
  tags: string[];
}

const PRESET_SLIDER_IMAGES = [
  'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=1000&q=80',
  'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=1000&q=80',
  'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=1000&q=80',
  'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=1000&q=80',
  'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1000&q=80',
];

const PRESET_BANNER_IMAGES = [
  'https://images.unsplash.com/photo-1550009158-9ebf69173e03?w=800&q=80',
  'https://images.unsplash.com/photo-1445205170230-053b83016050?w=800&q=80',
  'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=800&q=80',
  'https://images.unsplash.com/photo-1607083206869-4c7672e72a8a?w=1000&q=80',
];

const PRESET_AD_IMAGES = [
  'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=1000&q=80',
  'https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=1000&q=80',
  'https://images.unsplash.com/photo-1607083206869-4c7672e72a8a?w=1000&q=80',
];

export const CmsAdminPage: React.FC<CmsAdminPageProps> = ({
  cmsData,
  activeModule,
  onRefresh,
}) => {
  const dispatch = useAppDispatch();
  const { token } = useAppSelector((state) => state.auth);

  // Tab Selection
  const [activeTab, setActiveTab] = useState<
    'sliders' | 'banners' | 'ads' | 'blog' | 'pages' | 'menu'
  >(
    activeModule === 'cms-ads'
      ? 'ads'
      : activeModule === 'cms-banners'
      ? 'banners'
      : activeModule === 'cms-blog'
      ? 'blog'
      : activeModule === 'cms-pages'
      ? 'pages'
      : activeModule === 'cms-menu'
      ? 'menu'
      : 'sliders'
  );

  useEffect(() => {
    if (activeModule === 'cms-ads') setActiveTab('ads');
    else if (activeModule === 'cms-banners') setActiveTab('banners');
    else if (activeModule === 'cms-blog') setActiveTab('blog');
    else if (activeModule === 'cms-pages') setActiveTab('pages');
    else if (activeModule === 'cms-menu') setActiveTab('menu');
    else if (activeModule === 'cms-home') setActiveTab('pages');
  }, [activeModule]);

  // Sliders State
  const [sliders, setSliders] = useState<SliderItem[]>([]);
  const [sliderModalOpen, setSliderModalOpen] = useState(false);
  const [editingSlider, setEditingSlider] = useState<SliderItem | null>(null);
  const [previewSlider, setPreviewSlider] = useState<SliderItem | null>(null);
  const [deleteSliderId, setDeleteSliderId] = useState<string | null>(null);

  // Banners State
  const [banners, setBanners] = useState<BannerItem[]>([]);
  const [bannerFilterPlacement, setBannerFilterPlacement] = useState<string>('all');
  const [bannerModalOpen, setBannerModalOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<BannerItem | null>(null);
  const [deleteBannerId, setDeleteBannerId] = useState<string | null>(null);

  // Advertisements State
  const [advertisements, setAdvertisements] = useState<AdvertisementItem[]>([]);
  const [adModalOpen, setAdModalOpen] = useState(false);
  const [editingAd, setEditingAd] = useState<AdvertisementItem | null>(null);
  const [testPreviewAd, setTestPreviewAd] = useState<AdvertisementItem | null>(null);
  const [deleteAdId, setDeleteAdId] = useState<string | null>(null);

  // Announcement Bar State
  const [announcementText, setAnnouncementText] = useState('');
  const [guaranteeText, setGuaranteeText] = useState('');
  const [supportText, setSupportText] = useState('');
  const [isSavingAnnouncement, setIsSavingAnnouncement] = useState(false);

  // Blog Articles State
  const [articles, setArticles] = useState<BlogArticleItem[]>([]);
  const [blogModalOpen, setBlogModalOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState<BlogArticleItem | null>(null);
  const [deleteArticleId, setDeleteArticleId] = useState<string | null>(null);
  const [blogForm, setBlogForm] = useState({
    title: '',
    category: 'Lifestyle',
    excerpt: '',
    contentText: '',
    coverImage: PRESET_SLIDER_IMAGES[0],
    readTime: '5 min read',
    authorName: 'Novara Editorial',
    authorRole: 'Senior Editor',
    tagsText: 'Trending, Guide',
    featured: false,
  });

  // Navigation Menu Categories State
  const [navCategories, setNavCategories] = useState<any[]>([]);

  // Ad Form State
  const [adForm, setAdForm] = useState({
    title: 'Flash Sale: 20% Off Your Entire Cart',
    description: 'Use promo code FLASH20 during checkout to unlock an exclusive 20% discount on all premium electronics.',
    imageUrl: PRESET_AD_IMAGES[0],
    destinationUrl: '/shop?coupon=FLASH20',
    buttonText: 'Claim 20% Off',
    priority: 1,
    frequency: 'once_per_session' as 'once_per_session' | 'always' | 'daily',
    isActive: true,
    startDate: '',
    endDate: '',
  });

  // Load Sliders, Banners, Advertisements, Blog, and Categories
  useEffect(() => {
    loadSliders();
    loadBanners();
    loadAdvertisements();
    loadArticles();
    loadNavCategories();
  }, [token]);

  useEffect(() => {
    if (cmsData) {
      setAnnouncementText(cmsData.announcementBar?.freeShippingText || 'Free shipping on orders over ৳2,500 across Bangladesh');
      setGuaranteeText(cmsData.announcementBar?.guaranteeText || '30 Days Money Back Guarantee');
      setSupportText(cmsData.announcementBar?.supportText || '24/7 Dedicated Customer Care');
    }
  }, [cmsData]);

  const loadSliders = async () => {
    try {
      const res = await fetch('/api/cms/sliders');
      const data = await res.json();
      if (data.success) {
        setSliders(data.data);
      }
    } catch (err) {
      console.error('Failed to load sliders', err);
    }
  };

  const loadBanners = async () => {
    try {
      const res = await fetch('/api/cms/banners');
      const data = await res.json();
      if (data.success) {
        setBanners(data.data);
      }
    } catch (err) {
      console.error('Failed to load banners', err);
    }
  };

  const loadAdvertisements = async () => {
    try {
      const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await fetch('/api/cms/advertisements', { headers });
      const data = await res.json();
      if (data.success) {
        setAdvertisements(data.data);
      }
    } catch (err) {
      console.error('Failed to load advertisements', err);
    }
  };

  const loadArticles = async () => {
    try {
      const res = await fetch('/api/blog');
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setArticles(data.data);
      }
    } catch (err) {
      console.error('Failed to load blog articles', err);
    }
  };

  const loadNavCategories = async () => {
    try {
      const res = await fetch('/api/categories');
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setNavCategories(data.data);
      }
    } catch (err) {
      console.error('Failed to load categories', err);
    }
  };

  const handleOpenAddArticle = () => {
    setEditingArticle(null);
    setBlogForm({
      title: '',
      category: 'Lifestyle',
      excerpt: '',
      contentText: '',
      coverImage: PRESET_SLIDER_IMAGES[0],
      readTime: '5 min read',
      authorName: 'Novara Editorial',
      authorRole: 'Senior Editor',
      tagsText: 'Trending, Guide',
      featured: false,
    });
    setBlogModalOpen(true);
  };

  const handleOpenEditArticle = (article: BlogArticleItem) => {
    setEditingArticle(article);
    setBlogForm({
      title: article.title,
      category: article.category || 'Lifestyle',
      excerpt: article.excerpt || '',
      contentText: Array.isArray(article.content) ? article.content.join('\n\n') : '',
      coverImage: article.coverImage || PRESET_SLIDER_IMAGES[0],
      readTime: article.readTime || '5 min read',
      authorName: article.author?.name || 'Novara Editorial',
      authorRole: article.author?.role || 'Senior Editor',
      tagsText: Array.isArray(article.tags) ? article.tags.join(', ') : '',
      featured: Boolean(article.featured),
    });
    setBlogModalOpen(true);
  };

  const handleSaveArticle = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const paragraphs = blogForm.contentText
        .split(/\n{2,}/)
        .map((p) => p.trim())
        .filter(Boolean);
      const tags = blogForm.tagsText
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      const payload = {
        title: blogForm.title.trim(),
        category: blogForm.category.trim() || 'Lifestyle',
        excerpt: blogForm.excerpt.trim(),
        content: paragraphs.length > 0 ? paragraphs : [blogForm.excerpt.trim()],
        coverImage: blogForm.coverImage.trim(),
        readTime: blogForm.readTime.trim() || '5 min read',
        author: {
          name: blogForm.authorName.trim() || 'Novara Editorial',
          role: blogForm.authorRole.trim() || 'Senior Editor',
          avatar:
            editingArticle?.author?.avatar ||
            'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&q=80',
        },
        tags,
        featured: blogForm.featured,
      };

      const url = editingArticle ? `/api/blog/${editingArticle.id}` : '/api/blog';
      const method = editingArticle ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to save article');

      dispatch(
        addToast({
          type: 'success',
          title: editingArticle ? 'Article Updated' : 'Article Published',
          message: `"${payload.title}" is live on the Storefront Blog.`,
        })
      );
      setBlogModalOpen(false);
      loadArticles();
    } catch (err: any) {
      dispatch(addToast({ type: 'error', message: err.message }));
    }
  };

  const handleConfirmDeleteArticle = async () => {
    if (!deleteArticleId) return;
    try {
      const res = await fetch(`/api/blog/${deleteArticleId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to delete article');

      dispatch(
        addToast({
          type: 'info',
          title: 'Article Deleted',
          message: 'Blog article removed from storefront.',
        })
      );
      setDeleteArticleId(null);
      loadArticles();
    } catch (err: any) {
      dispatch(addToast({ type: 'error', message: err.message }));
    }
  };

  const handleToggleNavCategory = async (cat: any) => {
    try {
      const res = await fetch(`/api/categories/${cat.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ ...cat, isActive: !cat.isActive }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to update menu item');
      dispatch(
        addToast({
          type: 'success',
          message: `${cat.name} ${!cat.isActive ? 'shown in' : 'hidden from'} storefront navigation`,
        })
      );
      loadNavCategories();
    } catch (err: any) {
      dispatch(addToast({ type: 'error', message: err.message }));
    }
  };

  // ==========================================
  // SLIDER ACTIONS
  // ==========================================

  const handleOpenAddSlider = () => {
    setEditingSlider(null);
    setSliderModalOpen(true);
  };

  const handleOpenEditSlider = (slider: SliderItem) => {
    setEditingSlider(slider);
    setSliderModalOpen(true);
  };

  const handleSaveSlider = async (data: HeroSliderFormData) => {
    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };

    const url = editingSlider ? `/api/cms/sliders/${editingSlider.id}` : '/api/cms/sliders';
    const method = editingSlider ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers,
      body: JSON.stringify(data),
    });

    const resData = await res.json();
    if (!res.ok || !resData.success) throw new Error(resData.error || 'Failed to save slider');

    dispatch(
      addToast({
        type: 'success',
        title: editingSlider ? 'Hero Slide Updated' : 'Hero Slide Published',
        message: resData.message || 'Image-only hero slide saved successfully.',
      })
    );

    loadSliders();
    onRefresh();
  };

  const handleToggleSliderActive = async (slider: SliderItem) => {
    try {
      const res = await fetch(`/api/cms/sliders/${slider.id}/toggle`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to toggle slider');

      dispatch(
        addToast({
          type: 'success',
          message: data.message || `Slider ${slider.id} status updated`,
        })
      );
      loadSliders();
      onRefresh();
    } catch (err: any) {
      dispatch(addToast({ type: 'error', message: err.message }));
    }
  };

  const handleConfirmDeleteSlider = async () => {
    if (!deleteSliderId) return;
    try {
      const res = await fetch(`/api/cms/sliders/${deleteSliderId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to delete slider');

      dispatch(addToast({ type: 'info', title: 'Slider Deleted', message: data.message }));
      setDeleteSliderId(null);
      loadSliders();
      onRefresh();
    } catch (err: any) {
      dispatch(addToast({ type: 'error', message: err.message }));
    }
  };

  // ==========================================
  // BANNER ACTIONS
  // ==========================================

  const handleOpenAddBanner = () => {
    setEditingBanner(null);
    setBannerModalOpen(true);
  };

  const handleOpenEditBanner = (banner: BannerItem) => {
    setEditingBanner(banner);
    setBannerModalOpen(true);
  };

  const handleSaveBanner = async (data: BannerFormData) => {
    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };

    const url = editingBanner ? `/api/cms/banners/${editingBanner.id}` : '/api/cms/banners';
    const method = editingBanner ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers,
      body: JSON.stringify(data),
    });

    const resData = await res.json();
    if (!res.ok || !resData.success) throw new Error(resData.error || 'Failed to save banner');

    dispatch(
      addToast({
        type: 'success',
        title: editingBanner ? 'Banner Updated' : 'Banner Published',
        message: resData.message || 'Banner saved to live homepage.',
      })
    );

    loadBanners();
    onRefresh();
  };

  const handleDuplicateBanner = async (bannerId: string) => {
    try {
      const res = await fetch(`/api/cms/banners/${bannerId}/duplicate`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to duplicate banner');

      dispatch(
        addToast({
          type: 'success',
          title: 'Banner Duplicated',
          message: data.message || 'Duplicate created as draft.',
        })
      );
      loadBanners();
      onRefresh();
    } catch (err: any) {
      dispatch(addToast({ type: 'error', message: err.message }));
    }
  };

  const handleToggleBannerActive = async (banner: BannerItem) => {
    try {
      const res = await fetch(`/api/cms/banners/${banner.id}/toggle`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to toggle banner');

      dispatch(
        addToast({
          type: 'success',
          message: data.message || `Banner status updated.`,
        })
      );
      loadBanners();
      onRefresh();
    } catch (err: any) {
      dispatch(addToast({ type: 'error', message: err.message }));
    }
  };

  const handleConfirmDeleteBanner = async () => {
    if (!deleteBannerId) return;
    try {
      const res = await fetch(`/api/cms/banners/${deleteBannerId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to delete banner');

      dispatch(addToast({ type: 'info', title: 'Banner Deleted', message: data.message }));
      setDeleteBannerId(null);
      loadBanners();
      onRefresh();
    } catch (err: any) {
      dispatch(addToast({ type: 'error', message: err.message }));
    }
  };

  // ==========================================
  // ADVERTISEMENT ACTIONS
  // ==========================================

  const handleOpenAddAd = () => {
    setEditingAd(null);
    setAdForm({
      title: 'Flash Sale: 20% Off Your Entire Cart',
      description: 'Use promo code FLASH20 during checkout to unlock an exclusive 20% discount on all premium electronics.',
      imageUrl: PRESET_AD_IMAGES[0],
      destinationUrl: '/shop?coupon=FLASH20',
      buttonText: 'Claim 20% Off',
      priority: 1,
      frequency: 'once_per_session',
      isActive: true,
      startDate: '',
      endDate: '',
    });
    setAdModalOpen(true);
  };

  const handleOpenEditAd = (ad: AdvertisementItem) => {
    setEditingAd(ad);
    setAdForm({
      title: ad.title,
      description: ad.description || '',
      imageUrl: ad.imageUrl,
      destinationUrl: ad.destinationUrl,
      buttonText: ad.buttonText,
      priority: ad.priority,
      frequency: ad.frequency,
      isActive: ad.isActive,
      startDate: ad.startDate || '',
      endDate: ad.endDate || '',
    });
    setAdModalOpen(true);
  };

  const handleSaveAd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const headers = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      };

      const url = editingAd ? `/api/cms/advertisements/${editingAd.id}` : '/api/cms/advertisements';
      const method = editingAd ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers,
        body: JSON.stringify(adForm),
      });

      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to save advertisement');

      dispatch(
        addToast({
          type: 'success',
          title: editingAd ? 'Advertisement Updated' : 'Advertisement Created',
          message: data.message || 'Campaign is live for storefront visitors.',
        })
      );

      setAdModalOpen(false);
      loadAdvertisements();
      onRefresh();
    } catch (err: any) {
      dispatch(addToast({ type: 'error', message: err.message }));
    }
  };

  const handleToggleAdActive = async (ad: AdvertisementItem) => {
    try {
      const res = await fetch(`/api/cms/advertisements/${ad.id}/toggle`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to toggle advertisement');

      dispatch(
        addToast({
          type: 'success',
          message: data.message || `Advertisement ${ad.id} updated`,
        })
      );
      loadAdvertisements();
      onRefresh();
    } catch (err: any) {
      dispatch(addToast({ type: 'error', message: err.message }));
    }
  };

  const handleConfirmDeleteAd = async () => {
    if (!deleteAdId) return;
    try {
      const res = await fetch(`/api/cms/advertisements/${deleteAdId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to delete advertisement');

      dispatch(addToast({ type: 'info', title: 'Ad Campaign Deleted', message: data.message }));
      setDeleteAdId(null);
      loadAdvertisements();
      onRefresh();
    } catch (err: any) {
      dispatch(addToast({ type: 'error', message: err.message }));
    }
  };

  // ==========================================
  // ANNOUNCEMENT BAR ACTIONS
  // ==========================================

  const handleSaveAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingAnnouncement(true);
    try {
      const payload = {
        announcementBar: {
          enabled: true,
          freeShippingText: announcementText,
          guaranteeText: guaranteeText,
          supportText: supportText,
        },
      };

      const res = await fetch('/api/cms/homepage', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to update announcements');

      dispatch(
        addToast({
          type: 'success',
          title: 'Storefront Announcements Saved',
          message: 'Top announcement bar updated across storefront.',
        })
      );
      onRefresh();
    } catch (err: any) {
      dispatch(addToast({ type: 'error', message: err.message }));
    } finally {
      setIsSavingAnnouncement(false);
    }
  };

  const filteredBanners = banners.filter((b) =>
    bannerFilterPlacement === 'all' ? true : b.placement === bannerFilterPlacement
  );

  return (
    <div className="space-y-6">
      {/* Top Header & Tab Controls */}
      <div className="bg-white rounded-2xl p-5 border border-gray-200/80 shadow-2xs flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
            <h2 className="text-base font-extrabold text-gray-900 tracking-tight">
              Dynamic Homepage & Content Management
            </h2>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Control Hero Sliders, Promotional Banners, Visitor Campaigns, Blog Editorial, Storefront Pages, and Navigation Menus.
          </p>
        </div>

        {/* Tab navigation buttons */}
        <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-xl border border-gray-200/80 shrink-0 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('sliders')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer shrink-0 ${
              activeTab === 'sliders'
                ? 'bg-white text-emerald-800 shadow-2xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <SlidersIcon className="w-3.5 h-3.5" />
            <span>Hero Sliders</span>
            <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-100 text-emerald-800 font-bold tabular-nums">
              {sliders.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('banners')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer shrink-0 ${
              activeTab === 'banners'
                ? 'bg-white text-emerald-800 shadow-2xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Banners</span>
            <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] bg-blue-100 text-blue-800 font-bold tabular-nums">
              {banners.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('ads')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer shrink-0 ${
              activeTab === 'ads'
                ? 'bg-white text-emerald-800 shadow-2xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Megaphone className="w-3.5 h-3.5" />
            <span>Ads</span>
            <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] bg-amber-100 text-amber-800 font-bold tabular-nums">
              {advertisements.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('blog')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer shrink-0 ${
              activeTab === 'blog'
                ? 'bg-white text-emerald-800 shadow-2xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Blog</span>
            <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] bg-purple-100 text-purple-800 font-bold tabular-nums">
              {articles.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('pages')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer shrink-0 ${
              activeTab === 'pages'
                ? 'bg-white text-emerald-800 shadow-2xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Pages & Top Bar</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('menu')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer shrink-0 ${
              activeTab === 'menu'
                ? 'bg-white text-emerald-800 shadow-2xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <MenuIcon className="w-3.5 h-3.5" />
            <span>Navigation</span>
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* TAB 1: HERO SLIDERS MANAGEMENT */}
      {/* ======================================================== */}
      {activeTab === 'sliders' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-emerald-50/60 border border-emerald-200/80 rounded-2xl p-4">
            <div>
              <h3 className="text-sm font-bold text-emerald-950">
                Hero Slider Carousel ({sliders.filter((s) => s.isActive).length} Active on Storefront)
              </h3>
              <p className="text-xs text-emerald-800/80">
                Sliders rotate automatically on the customer homepage with auto-play, pause-on-hover, and swipe navigation.
              </p>
            </div>
            <button
              onClick={handleOpenAddSlider}
              className="flex items-center gap-2 px-4 py-2 bg-[#00875a] hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Slider</span>
            </button>
          </div>

          {/* Sliders Grid / Table */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {sliders.map((slider) => {
              const slideImg = slider.imageUrl || slider.lifestyleImage || 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1600&q=80';
              const destLink = slider.destinationLink || slider.buttonLink;
              return (
                <div
                  key={slider.id}
                  className={`bg-white rounded-2xl border transition-all overflow-hidden flex flex-col justify-between shadow-xs ${
                    slider.isActive ? 'border-gray-200/90' : 'border-dashed border-gray-300 opacity-75'
                  }`}
                >
                  {/* Clean Slide Image (Phase 10: Strict Image-Only) */}
                  <div className="relative aspect-[16/9] bg-gray-900 overflow-hidden group">
                    <img
                      src={slideImg}
                      alt={slider.altText || 'Hero slide'}
                      referrerPolicy="no-referrer"
                      onError={handleImageFallback}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                    />

                    {/* Badges */}
                    <div className="absolute top-3 left-3 flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-black/70 text-white backdrop-blur-xs">
                        Slide #{slider.displayOrder}
                      </span>
                    </div>

                    <div className="absolute top-3 right-3">
                      <button
                        onClick={() => handleToggleSliderActive(slider)}
                        className={`px-2.5 py-1 rounded-full text-[11px] font-bold cursor-pointer transition shadow-xs flex items-center gap-1 ${
                          slider.isActive
                            ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                            : 'bg-gray-800 text-gray-200 hover:bg-gray-900'
                        }`}
                        title={slider.isActive ? 'Click to deactivate' : 'Click to activate'}
                      >
                        {slider.isActive ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                        <span>{slider.isActive ? 'Live' : 'Hidden'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Details Footer */}
                  <div className="p-4 space-y-3">
                    <div className="flex items-center justify-between text-xs text-gray-600">
                      <span className="font-semibold text-gray-900">Destination Link:</span>
                      {destLink ? (
                        <span className="font-mono text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded flex items-center gap-1 max-w-[170px] truncate" title={destLink}>
                          {destLink}
                          {slider.openInNewTab && <ExternalLink className="w-3 h-3 inline shrink-0" />}
                        </span>
                      ) : (
                        <span className="text-[11px] text-gray-400 italic">None (Display only)</span>
                      )}
                    </div>

                    {slider.altText && (
                      <div className="text-[11px] text-gray-500 truncate" title={slider.altText}>
                        Alt: "{slider.altText}"
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                      <button
                        onClick={() => setPreviewSlider(slider)}
                        className="flex items-center gap-1 text-xs text-gray-600 hover:text-emerald-700 font-semibold cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Preview</span>
                      </button>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleOpenEditSlider(slider)}
                          className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 transition cursor-pointer"
                          title="Edit slide"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => setDeleteSliderId(slider.id)}
                          className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 transition cursor-pointer"
                          title="Delete slide"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: HOMEPAGE BANNERS MANAGEMENT */}
      {/* ======================================================== */}
      {activeTab === 'banners' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-blue-50/60 border border-blue-200/80 rounded-2xl p-4">
            <div>
              <h3 className="text-sm font-bold text-blue-950">
                Promotional Banners by Placement
              </h3>
              <p className="text-xs text-blue-800/80">
                Manage promotional strips, dual campaign cards (Smart Tech & Fashion), category spotlight banners, and discount strips.
              </p>
            </div>
            <button
              onClick={handleOpenAddBanner}
              className="flex items-center gap-2 px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Banner</span>
            </button>
          </div>

          {/* Placement Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {[
              { id: 'all', label: 'All Placements' },
              { id: 'homepage-main', label: 'Main Promo' },
              { id: 'homepage-secondary', label: 'Dual Split Cards' },
              { id: 'homepage-category', label: 'Category Spotlight' },
              { id: 'homepage-promotion', label: 'Discount Strip' },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => setBannerFilterPlacement(p.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 ${
                  bannerFilterPlacement === p.id
                    ? 'bg-blue-700 text-white shadow-xs'
                    : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Banners List */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredBanners.map((banner) => {
              const statusColors: Record<string, string> = {
                published: 'bg-emerald-100 text-emerald-800 border-emerald-200',
                draft: 'bg-amber-100 text-amber-800 border-amber-200',
                scheduled: 'bg-blue-100 text-blue-800 border-blue-200',
                disabled: 'bg-gray-100 text-gray-700 border-gray-200',
              };
              const status = banner.status || (banner.isActive ? 'published' : 'draft');

              return (
                <div
                  key={banner.id}
                  className="bg-white rounded-2xl border border-gray-200/90 shadow-xs overflow-hidden flex flex-col justify-between group hover:border-gray-300 transition"
                >
                  {/* Visual Live Preview using BannerRenderer */}
                  <div className="relative overflow-hidden bg-gray-900 border-b border-gray-100">
                    <div className="pointer-events-none transform origin-top-left">
                      <BannerRenderer banner={banner as any} isEditorPreview={true} />
                    </div>

                    {/* Overlay Placement Pill & Status */}
                    <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between z-20 pointer-events-none">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-black/60 text-white backdrop-blur-xs">
                        {banner.placement}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold border capitalize backdrop-blur-xs ${
                          statusColors[status] || statusColors.published
                        }`}
                      >
                        {status}
                      </span>
                    </div>
                  </div>

                  {/* Banner Metadata & Action Bar */}
                  <div className="p-4 space-y-3 bg-white">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="text-xs font-bold text-gray-900 line-clamp-1">
                          {banner.headline || banner.tag || 'Custom Visual Banner'}
                        </h4>
                        <div className="text-[11px] text-gray-500 font-mono mt-0.5">
                          Order: #{banner.displayOrder || 1} • {banner.bgType || 'solid'}
                        </div>
                      </div>

                      <button
                        onClick={() => handleToggleBannerActive(banner)}
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold cursor-pointer transition flex items-center gap-1 shrink-0 ${
                          banner.isActive ? 'bg-emerald-500 text-white' : 'bg-gray-500 text-gray-100'
                        }`}
                        title={banner.isActive ? 'Click to pause' : 'Click to activate'}
                      >
                        {banner.isActive ? 'Active' : 'Paused'}
                      </button>
                    </div>

                    {(banner.buttonLink || banner.buttonText) && (
                      <div className="text-[11px] text-gray-600 flex items-center justify-between pt-1 border-t border-gray-50">
                        <span className="font-semibold text-gray-700 truncate max-w-[120px]">
                          {banner.buttonText || 'Link'}:
                        </span>
                        <span className="font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[10px] truncate max-w-[150px]">
                          {banner.buttonLink || '/'}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                      <button
                        onClick={() => handleDuplicateBanner(banner.id)}
                        className="flex items-center gap-1 text-xs text-blue-700 hover:text-blue-800 font-semibold cursor-pointer"
                        title="Duplicate as new draft banner"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>Duplicate</span>
                      </button>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleOpenEditBanner(banner)}
                          className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 transition cursor-pointer"
                          title="Open visual designer"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteBannerId(banner.id)}
                          className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 transition cursor-pointer"
                          title="Delete banner"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 3: ADVERTISEMENTS MANAGEMENT */}
      {/* ======================================================== */}
      {activeTab === 'ads' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-amber-50/70 border border-amber-200/80 rounded-2xl p-4">
            <div>
              <h3 className="text-sm font-bold text-amber-950">
                Visitor Advertisement Popup System
              </h3>
              <p className="text-xs text-amber-900/80">
                Configure promotional popup modals shown to visitors. Includes visible Close button, frequency controls, impression/click analytics, and session dismissal rules.
              </p>
            </div>
            <button
              onClick={handleOpenAddAd}
              className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Create Advertisement</span>
            </button>
          </div>

          {/* Advertisements List */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {advertisements.map((ad) => {
              const ctr = ad.impressions > 0 ? ((ad.clicks / ad.impressions) * 100).toFixed(1) : '0.0';
              return (
                <div
                  key={ad.id}
                  className="bg-white rounded-2xl border border-gray-200/90 shadow-xs overflow-hidden flex flex-col justify-between"
                >
                  {/* Image preview with tag */}
                  <div className="relative aspect-[16/10] bg-gray-100 overflow-hidden">
                    <img
                      src={ad.imageUrl}
                      alt={ad.title}
                      referrerPolicy="no-referrer"
                      onError={handleImageFallback}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                    <div className="absolute top-3 left-3 flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-white shadow-xs">
                        Priority #{ad.priority}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-black/60 text-white backdrop-blur-xs">
                        {ad.frequency.replace(/_/g, ' ')}
                      </span>
                    </div>

                    <div className="absolute top-3 right-3">
                      <button
                        onClick={() => handleToggleAdActive(ad)}
                        className={`px-2.5 py-1 rounded-full text-[11px] font-bold cursor-pointer transition shadow-xs flex items-center gap-1 ${
                          ad.isActive
                            ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                            : 'bg-gray-700 text-gray-200 hover:bg-gray-800'
                        }`}
                      >
                        {ad.isActive ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                        <span>{ad.isActive ? 'Active' : 'Paused'}</span>
                      </button>
                    </div>

                    <div className="absolute bottom-3 left-3 right-3 text-white">
                      <h4 className="text-base font-extrabold leading-tight line-clamp-1 drop-shadow-md">
                        {ad.title}
                      </h4>
                      <p className="text-[11px] text-gray-200 line-clamp-1 mt-0.5">
                        {ad.description}
                      </p>
                    </div>
                  </div>

                  {/* Real-Time Ad Performance Metrics */}
                  <div className="p-4 space-y-3 bg-white">
                    <div className="grid grid-cols-3 gap-2 p-2.5 bg-gray-50 rounded-xl text-center border border-gray-100">
                      <div>
                        <div className="text-[10px] text-gray-500 font-medium">Impressions</div>
                        <div className="text-sm font-extrabold text-gray-900">{ad.impressions}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-gray-500 font-medium">Clicks</div>
                        <div className="text-sm font-extrabold text-emerald-700">{ad.clicks}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-gray-500 font-medium">CTR</div>
                        <div className="text-sm font-extrabold text-blue-600">{ctr}%</div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs text-gray-600">
                      <span className="font-semibold text-gray-900">Destination:</span>
                      <span className="font-mono text-[11px] text-emerald-700 truncate max-w-[150px]">
                        {ad.destinationUrl}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                      <button
                        onClick={() => setTestPreviewAd(ad)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold transition cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Test Modal Popup</span>
                      </button>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleOpenEditAd(ad)}
                          className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 transition cursor-pointer"
                          title="Edit advertisement"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteAdId(ad.id)}
                          className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 transition cursor-pointer"
                          title="Delete advertisement"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 4: BLOG EDITORIAL MANAGEMENT */}
      {/* ======================================================== */}
      {activeTab === 'blog' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-purple-50/70 border border-purple-200/80 rounded-2xl p-4">
            <div>
              <h3 className="text-sm font-bold text-purple-950">
                Storefront Blog & Editorial ({articles.length} Published Articles)
              </h3>
              <p className="text-xs text-purple-900/80">
                Publish buying guides, product stories, and seasonal lookbooks directly to `/blog`. Supports `**bold**` formatting safely.
              </p>
            </div>
            <button
              onClick={handleOpenAddArticle}
              className="flex items-center gap-2 px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Write New Article</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {articles.map((article) => (
              <div
                key={article.id}
                className="bg-white rounded-2xl border border-gray-200/90 shadow-xs overflow-hidden flex flex-col justify-between"
              >
                <div className="relative aspect-[16/10] bg-gray-100 overflow-hidden">
                  <img
                    src={article.coverImage}
                    alt={article.title}
                    referrerPolicy="no-referrer"
                    onError={handleImageFallback}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent" />
                  <div className="absolute top-3 left-3 flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white/95 text-purple-900">
                      {article.category}
                    </span>
                    {article.featured && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500 text-white">
                        Featured
                      </span>
                    )}
                  </div>
                  <div className="absolute bottom-3 left-3 right-3 text-white">
                    <h4 className="text-sm font-extrabold leading-snug line-clamp-2 drop-shadow-xs">
                      {article.title}
                    </h4>
                  </div>
                </div>

                <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                  <p className="text-xs text-gray-600 line-clamp-2">{article.excerpt}</p>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-[11px] text-gray-500">
                      <span>{article.author?.name || 'Novara Editorial'}</span>
                      <span>{article.readTime}</span>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                      <span className="font-mono text-[11px] text-gray-400 truncate max-w-[160px]">
                        /blog#{article.slug}
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleOpenEditArticle(article)}
                          className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 transition cursor-pointer"
                          title="Edit article"
                          aria-label={`Edit ${article.title}`}
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteArticleId(article.id)}
                          className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 transition cursor-pointer"
                          title="Delete article"
                          aria-label={`Delete ${article.title}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 5: STOREFRONT PAGES & TOP BAR ANNOUNCEMENTS */}
      {/* ======================================================== */}
      {activeTab === 'pages' && (
        <div className="space-y-6">
          <form onSubmit={handleSaveAnnouncement} className="space-y-6">
            <div className="bg-white rounded-2xl p-5 border border-gray-200/80 shadow-2xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <Truck className="w-4 h-4 text-emerald-700" />
                  <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                    Top Announcement Bar (Storefront Header)
                  </h3>
                </div>

                <button
                  type="submit"
                  disabled={isSavingAnnouncement}
                  className="flex items-center gap-1.5 px-5 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer self-start sm:self-auto"
                >
                  {isSavingAnnouncement ? (
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Save className="w-3.5 h-3.5" />
                  )}
                  <span>Save Header Messages</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Free Shipping Headline
                  </label>
                  <input
                    type="text"
                    value={announcementText}
                    onChange={(e) => setAnnouncementText(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-900 focus:bg-white focus:outline-emerald-600 transition"
                    placeholder="e.g. Free shipping on orders over ৳2,500 across Bangladesh"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Guarantee Badge Text
                  </label>
                  <input
                    type="text"
                    value={guaranteeText}
                    onChange={(e) => setGuaranteeText(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-900 focus:bg-white focus:outline-emerald-600 transition"
                    placeholder="e.g. 30 Days Money Back Guarantee"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Support Hotline / Hours
                  </label>
                  <input
                    type="text"
                    value={supportText}
                    onChange={(e) => setSupportText(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-900 focus:bg-white focus:outline-emerald-600 transition"
                    placeholder="e.g. 24/7 Dedicated Customer Care"
                  />
                </div>
              </div>
            </div>
          </form>

          {/* Storefront Core Pages Directory */}
          <div className="bg-white rounded-2xl p-5 border border-gray-200/80 shadow-2xs space-y-4">
            <div>
              <h3 className="text-sm font-bold text-gray-900">Storefront Core & Legal Pages</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Active public routes and policy dialogs served across your storefront.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {[
                { name: 'About ShopMax', route: '/about', status: 'Published', desc: 'Brand story, quality standards, and fulfillment network.' },
                { name: 'Customer Contact', route: '/contact', status: 'Published', desc: 'Direct inquiry form synced with Admin Messages inbox.' },
                { name: 'Editorial Blog', route: '/blog', status: 'Published', desc: 'Dynamic buying guides managed from the Blog tab.' },
                { name: 'Terms & Privacy', route: 'Footer & Checkout Modal', status: 'Active', desc: 'Return policy, warranty coverage, and data privacy terms.' },
              ].map((pg) => (
                <div key={pg.name} className="p-4 rounded-xl border border-gray-200 bg-gray-50/60 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-900">{pg.name}</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      {pg.status}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-600 leading-relaxed">{pg.desc}</p>
                  <div className="text-[11px] font-mono text-emerald-700 pt-1">{pg.route}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 6: STOREFRONT NAVIGATION MENU */}
      {/* ======================================================== */}
      {activeTab === 'menu' && (
        <div className="bg-white rounded-2xl p-5 border border-gray-200/80 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-gray-100">
            <div>
              <h3 className="text-sm font-bold text-gray-900">
                Header Category Navigation Bar ({navCategories.filter((c) => c.isActive !== false).length} Visible)
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Toggle which catalog categories appear in the main storefront header navigation and mobile drawer.
              </p>
            </div>
          </div>

          <div className="divide-y divide-gray-100">
            {navCategories.map((cat) => {
              const isVisible = cat.isActive !== false;
              return (
                <div key={cat.id || cat.slug} className="py-3 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-800 font-bold text-xs flex items-center justify-center shrink-0">
                      {cat.name?.charAt(0) || 'C'}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-gray-900 truncate">{cat.name}</div>
                      <div className="text-[11px] font-mono text-gray-500 truncate">
                        /shop?category={cat.slug}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleToggleNavCategory(cat)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer flex items-center gap-1.5 shrink-0 ${
                      isVisible
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100'
                        : 'bg-gray-100 border-gray-200 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {isVisible ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                    <span>{isVisible ? 'Shown in Menu' : 'Hidden'}</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 1: ADD / EDIT HERO SLIDER (IMAGE-ONLY) */}
      {/* ======================================================== */}
      <HeroSliderModal
        isOpen={sliderModalOpen}
        onClose={() => setSliderModalOpen(false)}
        onSave={handleSaveSlider}
        initialData={editingSlider}
        token={token}
      />

      {/* ======================================================== */}
      {/* MODAL 2: ADD / EDIT BANNER (ADVANCED VISUAL DESIGNER) */}
      {/* ======================================================== */}
      <BannerDesignerModal
        isOpen={bannerModalOpen}
        onClose={() => setBannerModalOpen(false)}
        onSave={handleSaveBanner}
        initialData={editingBanner}
        token={token}
      />

      {/* ======================================================== */}
      {/* MODAL 3: ADD / EDIT ADVERTISEMENT */}
      {/* ======================================================== */}
      <Modal
        isOpen={adModalOpen}
        onClose={() => setAdModalOpen(false)}
        title={editingAd ? 'Edit Advertisement Campaign' : 'Create Visitor Advertisement Campaign'}
        description="Set up high-converting popup promotions with priority, scheduling, and session rules."
        maxWidth="2xl"
      >
        <form onSubmit={handleSaveAd} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Campaign Title
            </label>
            <input
              type="text"
              required
              value={adForm.title}
              onChange={(e) => setAdForm({ ...adForm, title: e.target.value })}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:bg-white focus:outline-amber-600 font-semibold"
              placeholder="e.g. Flash Sale: 20% Off Your Entire Cart"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Campaign Description / Promo Code
            </label>
            <textarea
              rows={2}
              value={adForm.description}
              onChange={(e) => setAdForm({ ...adForm, description: e.target.value })}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:bg-white focus:outline-amber-600"
              placeholder="e.g. Use promo code FLASH20 during checkout to unlock 20% off."
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Button Text
              </label>
              <input
                type="text"
                required
                value={adForm.buttonText}
                onChange={(e) => setAdForm({ ...adForm, buttonText: e.target.value })}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900"
                placeholder="Claim 20% Off"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Destination Link URL
              </label>
              <input
                type="text"
                required
                value={adForm.destinationUrl}
                onChange={(e) => setAdForm({ ...adForm, destinationUrl: e.target.value })}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 font-mono"
                placeholder="/shop?coupon=FLASH20"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Display Priority (1 = Top)
              </label>
              <input
                type="number"
                min={1}
                max={100}
                value={adForm.priority}
                onChange={(e) =>
                  setAdForm({ ...adForm, priority: parseInt(e.target.value, 10) || 1 })
                }
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Display Frequency Rule
              </label>
              <select
                value={adForm.frequency}
                onChange={(e) => setAdForm({ ...adForm, frequency: e.target.value as any })}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 font-semibold"
              >
                <option value="once_per_session">Once Per Session (Recommended)</option>
                <option value="daily">Once Daily</option>
                <option value="always">Every Visit</option>
              </select>
            </div>
          </div>

          {/* Ad Image URL */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-gray-700">
              Advertisement Image URL
            </label>
            <input
              type="url"
              required
              value={adForm.imageUrl}
              onChange={(e) => setAdForm({ ...adForm, imageUrl: e.target.value })}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 font-mono"
              placeholder="https://images.unsplash.com/..."
            />

            {/* Presets */}
            <div className="flex items-center gap-2 pt-1">
              <span className="text-[11px] text-gray-500 font-semibold">Presets:</span>
              <div className="flex items-center gap-2 overflow-x-auto">
                {PRESET_AD_IMAGES.map((img, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setAdForm({ ...adForm, imageUrl: img })}
                    className={`w-10 h-10 rounded-lg overflow-hidden border-2 shrink-0 transition ${
                      adForm.imageUrl === img
                        ? 'border-amber-600 scale-105'
                        : 'border-transparent opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img src={img} alt="Preset" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setAdModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-700 hover:bg-gray-100 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
            >
              {editingAd ? 'Save Campaign' : 'Launch Campaign'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ======================================================== */}
      {/* MODAL 4: INTERACTIVE VISITOR ADVERTISEMENT TEST PREVIEW */}
      {/* ======================================================== */}
      {testPreviewAd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg bg-white rounded-3xl overflow-hidden shadow-2xl border border-gray-100 animate-in zoom-in-95 duration-200">
            {/* Prominent Close button matching requirements */}
            <button
              onClick={() => setTestPreviewAd(null)}
              className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center transition cursor-pointer shadow-md"
              aria-label="Close advertisement popup"
            >
              <XCircle className="w-5 h-5" />
            </button>

            {/* Image banner */}
            <div className="relative aspect-[16/9] bg-gray-100 overflow-hidden">
              <img
                src={testPreviewAd.imageUrl}
                alt={testPreviewAd.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              <div className="absolute bottom-4 left-5 right-5 text-white">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-amber-500 text-white shadow-xs">
                  Exclusive Offer
                </span>
                <h3 className="text-xl font-extrabold text-white mt-1 drop-shadow-md">
                  {testPreviewAd.title}
                </h3>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 text-center">
              <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                {testPreviewAd.description ||
                  'Limited time promotion available across all categories.'}
              </p>

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  onClick={() => {
                    dispatch(
                      addToast({
                        type: 'info',
                        title: 'Destination Triggered',
                        message: `Visitor redirected to: ${testPreviewAd.destinationUrl}`,
                      })
                    );
                    setTestPreviewAd(null);
                  }}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-full bg-[#00875a] hover:bg-emerald-700 text-white text-xs font-bold transition shadow-md shadow-emerald-950/20 cursor-pointer"
                >
                  {testPreviewAd.buttonText || 'Claim Deal'}
                </button>

                <button
                  onClick={() => setTestPreviewAd(null)}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold transition cursor-pointer"
                >
                  Dismiss
                </button>
              </div>

              <div className="text-[11px] text-gray-500 pt-2 border-t border-gray-100">
                Visitor View Mode • Session Dismissal: Active
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* CONFIRMATION DELETION MODALS (NO WINDOW.CONFIRM) */}
      {/* ======================================================== */}
      <Modal
        isOpen={Boolean(deleteSliderId)}
        onClose={() => setDeleteSliderId(null)}
        title="Confirm Slider Deletion"
        description="Are you sure you want to delete this hero slider from the storefront? This action cannot be undone."
        maxWidth="sm"
      >
        <div className="flex items-center justify-end gap-3 pt-4">
          <button
            onClick={() => setDeleteSliderId(null)}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-700 hover:bg-gray-100 transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirmDeleteSlider}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition cursor-pointer"
          >
            Confirm Delete
          </button>
        </div>
      </Modal>

      <Modal
        isOpen={Boolean(deleteBannerId)}
        onClose={() => setDeleteBannerId(null)}
        title="Confirm Banner Deletion"
        description="Are you sure you want to delete this promotional banner? It will be immediately removed from the customer homepage."
        maxWidth="sm"
      >
        <div className="flex items-center justify-end gap-3 pt-4">
          <button
            onClick={() => setDeleteBannerId(null)}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-700 hover:bg-gray-100 transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirmDeleteBanner}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition cursor-pointer"
          >
            Confirm Delete
          </button>
        </div>
      </Modal>

      <Modal
        isOpen={Boolean(deleteAdId)}
        onClose={() => setDeleteAdId(null)}
        title="Confirm Advertisement Deletion"
        description="Are you sure you want to delete this visitor popup campaign? Visitors will no longer receive this popup."
        maxWidth="sm"
      >
        <div className="flex items-center justify-end gap-3 pt-4">
          <button
            onClick={() => setDeleteAdId(null)}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-700 hover:bg-gray-100 transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirmDeleteAd}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition cursor-pointer"
          >
            Confirm Delete
          </button>
        </div>
      </Modal>

      {/* Hero Slider Live Preview Modal (Image-Only) */}
      <Modal
        isOpen={Boolean(previewSlider)}
        onClose={() => setPreviewSlider(null)}
        title="Hero Slider Storefront Preview (Image-Only)"
        maxWidth="3xl"
      >
        {previewSlider && (
          <div className="space-y-4">
            <div className="relative rounded-2xl overflow-hidden bg-gray-900 border border-gray-200 aspect-[16/9] shadow-inner">
              <img
                src={previewSlider.imageUrl || previewSlider.lifestyleImage}
                alt={previewSlider.altText || 'Hero slide'}
                referrerPolicy="no-referrer"
                onError={handleImageFallback}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gray-50 p-3 rounded-xl border border-gray-100 text-xs">
              <div className="text-gray-600">
                <span className="font-semibold text-gray-900">Destination Link: </span>
                {previewSlider.destinationLink || previewSlider.buttonLink ? (
                  <span className="font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    {previewSlider.destinationLink || previewSlider.buttonLink}
                    {previewSlider.openInNewTab ? ' (Opens new tab)' : ' (Same tab)'}
                  </span>
                ) : (
                  <span className="text-gray-400 italic">None (Display-only image)</span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setPreviewSlider(null)}
                className="px-4 py-1.5 rounded-xl bg-gray-200 hover:bg-gray-300 text-gray-800 text-xs font-bold cursor-pointer self-end sm:self-auto"
              >
                Close Preview
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Add / Edit Blog Article Modal */}
      <Modal
        isOpen={blogModalOpen}
        onClose={() => setBlogModalOpen(false)}
        title={editingArticle ? 'Edit Blog Article' : 'Publish New Blog Article'}
        description="Articles appear immediately on the public /blog page. Separate paragraphs with a blank line."
        maxWidth="2xl"
      >
        <form onSubmit={handleSaveArticle} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block font-bold text-gray-700 mb-1">Article Title</label>
              <input
                type="text"
                required
                value={blogForm.title}
                onChange={(e) => setBlogForm({ ...blogForm, title: e.target.value })}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:bg-white focus:outline-emerald-600"
                placeholder="e.g. Top 5 Ergonomic Desk Upgrades for 2026"
              />
            </div>
            <div>
              <label className="block font-bold text-gray-700 mb-1">Category</label>
              <input
                type="text"
                required
                value={blogForm.category}
                onChange={(e) => setBlogForm({ ...blogForm, category: e.target.value })}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:bg-white focus:outline-emerald-600"
                placeholder="Lifestyle, Tech, Audio..."
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-gray-700 mb-1">Short Excerpt</label>
            <textarea
              required
              rows={2}
              value={blogForm.excerpt}
              onChange={(e) => setBlogForm({ ...blogForm, excerpt: e.target.value })}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:bg-white focus:outline-emerald-600"
              placeholder="A concise 1-2 sentence summary shown on blog cards..."
            />
          </div>

          <div>
            <label className="block font-bold text-gray-700 mb-1">
              Article Body (Use **bold** for emphasis; separate paragraphs with blank lines)
            </label>
            <textarea
              required
              rows={6}
              value={blogForm.contentText}
              onChange={(e) => setBlogForm({ ...blogForm, contentText: e.target.value })}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:bg-white focus:outline-emerald-600 leading-relaxed"
              placeholder="Write full editorial content here..."
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block font-bold text-gray-700 mb-1">Author Name</label>
              <input
                type="text"
                value={blogForm.authorName}
                onChange={(e) => setBlogForm({ ...blogForm, authorName: e.target.value })}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-gray-900"
              />
            </div>
            <div>
              <label className="block font-bold text-gray-700 mb-1">Read Time</label>
              <input
                type="text"
                value={blogForm.readTime}
                onChange={(e) => setBlogForm({ ...blogForm, readTime: e.target.value })}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-gray-900"
                placeholder="5 min read"
              />
            </div>
            <div>
              <label className="block font-bold text-gray-700 mb-1">Tags (comma-separated)</label>
              <input
                type="text"
                value={blogForm.tagsText}
                onChange={(e) => setBlogForm({ ...blogForm, tagsText: e.target.value })}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-gray-900"
                placeholder="Tech, Setup, Guide"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-gray-700 mb-1">Cover Image URL</label>
            <input
              type="url"
              required
              value={blogForm.coverImage}
              onChange={(e) => setBlogForm({ ...blogForm, coverImage: e.target.value })}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 font-mono"
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={blogForm.featured}
              onChange={(e) => setBlogForm({ ...blogForm, featured: e.target.checked })}
              className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500"
            />
            <span className="font-bold text-gray-800">Feature as Hero Spotlight on Blog Page</span>
          </label>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setBlogModalOpen(false)}
              className="px-4 py-2 rounded-xl font-semibold text-gray-700 hover:bg-gray-100 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl font-bold transition shadow-xs cursor-pointer"
            >
              {editingArticle ? 'Save Article' : 'Publish Article'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={Boolean(deleteArticleId)}
        onClose={() => setDeleteArticleId(null)}
        title="Confirm Blog Article Deletion"
        description="Are you sure you want to permanently remove this article from the Storefront Blog?"
        maxWidth="sm"
      >
        <div className="flex items-center justify-end gap-3 pt-4">
          <button
            onClick={() => setDeleteArticleId(null)}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-700 hover:bg-gray-100 transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirmDeleteArticle}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition cursor-pointer"
          >
            Confirm Delete
          </button>
        </div>
      </Modal>
    </div>
  );
};
