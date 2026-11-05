import React, { useState, useRef, useEffect } from 'react';
import { useAppSelector, useAppDispatch } from '../../app/hooks';
import { logout } from '../../features/auth/authSlice';
import { addToast } from '../../features/toast/toastSlice';
import { handleImageFallback } from '../../utils/safeMarkdown';
import {
  Menu,
  Search,
  Bell,
  ChevronDown,
  LogOut,
  ExternalLink,
  ArrowRight,
} from 'lucide-react';

interface AdminTopbarProps {
  onToggleMobileMenu: () => void;
  currentModule: string;
  onSelectModule?: (mod: string) => void;
  onGoToStorefront: () => void;
  onQuickAddProduct?: () => void;
  systemStatus?: any;
  onRefreshData?: () => void;
  isRefreshing?: boolean;
  unreadMessagesCount?: number;
  pendingOrdersCount?: number;
  lowStockCount?: number;
}

const ADMIN_SEARCH_TARGETS = [
  { id: 'dashboard', label: 'Dashboard Overview', keywords: 'home overview sales kpi' },
  { id: 'products', label: 'Products Catalog', keywords: 'sku item price catalog create add' },
  { id: 'categories', label: 'Categories', keywords: 'taxonomy department group' },
  { id: 'inventory', label: 'Warehouse Inventory', keywords: 'stock threshold restock' },
  { id: 'orders', label: 'Order Fulfillment', keywords: 'orders shipping status invoice' },
  { id: 'messages', label: 'Customer Inquiries', keywords: 'contact inbox support email' },
  { id: 'customers', label: 'Customers Directory', keywords: 'users accounts buyers' },
  { id: 'coupons', label: 'Promo Coupons', keywords: 'discount voucher code' },
  { id: 'reviews', label: 'Product Reviews', keywords: 'ratings feedback moderation' },
  { id: 'cms-home', label: 'Homepage Builder', keywords: 'layout sections publish draft' },
  { id: 'cms-banners', label: 'Banners & Hero Sliders', keywords: 'carousel hero promo' },
  { id: 'cms-ads', label: 'Visitor Advertisements', keywords: 'popup campaign modal' },
  { id: 'cms-blog', label: 'Blog & Editorial Management', keywords: 'articles journal posts' },
  { id: 'cms-pages', label: 'Storefront Pages', keywords: 'about contact policy' },
  { id: 'cms-menu', label: 'Navigation Menu', keywords: 'header links nav' },
  { id: 'analytics', label: 'Analytics & Audit Logs', keywords: 'metrics reports logs' },
  { id: 'settings-general', label: 'System Settings', keywords: 'payment shipping email config' },
];

export const AdminTopbar: React.FC<AdminTopbarProps> = ({
  onToggleMobileMenu,
  onSelectModule,
  onGoToStorefront,
  unreadMessagesCount = 0,
  pendingOrdersCount = 0,
  lowStockCount = 0,
}) => {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);

  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [allRead, setAllRead] = useState(false);

  const profileRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileDropdownOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotificationOpen(false);
      }
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        const searchInput = document.getElementById('admin-quick-search');
        searchInput?.focus();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSignOut = () => {
    dispatch(logout());
    dispatch(addToast({ type: 'info', title: 'Signed Out', message: 'Admin session concluded.' }));
  };

  const notifications = [
    {
      id: 'orders',
      title:
        pendingOrdersCount > 0
          ? `${pendingOrdersCount} order(s) awaiting fulfillment review`
          : 'Order queue is up to date',
      module: 'orders',
      unread: !allRead && pendingOrdersCount > 0,
    },
    {
      id: 'messages',
      title:
        unreadMessagesCount > 0
          ? `${unreadMessagesCount} unread customer inquiry message(s)`
          : 'Customer inquiry inbox reviewed',
      module: 'messages',
      unread: !allRead && unreadMessagesCount > 0,
    },
    {
      id: 'inventory',
      title:
        lowStockCount > 0
          ? `${lowStockCount} SKU(s) at or below low-stock threshold`
          : 'Catalog stock levels healthy',
      module: 'inventory',
      unread: !allRead && lowStockCount > 0,
    },
  ];

  const unreadBadgeCount = notifications.filter((n) => n.unread).length;

  const filteredModules = searchQuery.trim()
    ? ADMIN_SEARCH_TARGETS.filter((t) => {
        const q = searchQuery.toLowerCase();
        return t.label.toLowerCase().includes(q) || t.keywords.includes(q);
      })
    : ADMIN_SEARCH_TARGETS.slice(0, 6);

  const formattedRole = user?.role
    ? user.role.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    : 'Super Admin';

  return (
    <header className="h-20 bg-white border-b border-gray-100 flex items-center justify-between px-4 sm:px-8 shrink-0 z-20">
      {/* Left Area: Mobile Menu Trigger + Search Bar */}
      <div className="flex items-center gap-4 flex-1 max-w-xl">
        <button
          onClick={onToggleMobileMenu}
          className="lg:hidden p-2 rounded-xl text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition cursor-pointer"
          aria-label="Open mobile navigation"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Global Admin Quick Jump Search */}
        <div className="relative w-full max-w-md" ref={searchRef}>
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            id="admin-quick-search"
            type="text"
            value={searchQuery}
            onFocus={() => setSearchOpen(true)}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setSearchOpen(true);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && filteredModules.length > 0 && onSelectModule) {
                onSelectModule(filteredModules[0].id);
                setSearchOpen(false);
                setSearchQuery('');
              }
            }}
            placeholder="Jump to module (Orders, Inventory, Blog...)"
            className="w-full pl-10 pr-20 py-2.5 bg-gray-50/80 hover:bg-gray-100/70 focus:bg-white text-xs sm:text-sm text-gray-900 rounded-xl border border-gray-200/90 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 transition outline-none"
          />
          <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none">
            <kbd className="hidden sm:inline-flex items-center gap-0.5 px-2 py-0.5 text-[10px] font-semibold text-gray-500 bg-white border border-gray-200 rounded-md shadow-2xs">
              Ctrl + K
            </kbd>
          </div>

          {searchOpen && (
            <div className="absolute left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-gray-200 py-2 z-50 max-h-72 overflow-y-auto">
              <div className="px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                Quick Module Navigation
              </div>
              {filteredModules.length === 0 ? (
                <div className="px-4 py-3 text-xs text-gray-500">No matching admin modules.</div>
              ) : (
                filteredModules.map((mod) => (
                  <button
                    key={mod.id}
                    type="button"
                    onClick={() => {
                      onSelectModule?.(mod.id);
                      setSearchOpen(false);
                      setSearchQuery('');
                    }}
                    className="w-full px-3.5 py-2 text-left text-xs font-semibold text-gray-800 hover:bg-emerald-50 hover:text-emerald-800 flex items-center justify-between transition cursor-pointer"
                  >
                    <span>{mod.label}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-gray-400" />
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right Area: Notification Bell + Admin Profile */}
      <div className="flex items-center gap-3 sm:gap-4 shrink-0">
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setNotificationOpen(!notificationOpen)}
            className="relative p-2.5 rounded-full text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition cursor-pointer"
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5 text-gray-600" />
            {unreadBadgeCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white shadow-2xs">
                {unreadBadgeCount}
              </span>
            )}
          </button>

          {notificationOpen && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 py-3 z-50">
              <div className="px-4 pb-2 border-b border-gray-100 flex items-center justify-between">
                <span className="text-xs font-bold text-gray-900">
                  Operational Alerts ({unreadBadgeCount})
                </span>
                <button
                  type="button"
                  onClick={() => setAllRead(true)}
                  className="text-[10px] font-semibold text-emerald-700 cursor-pointer hover:underline"
                >
                  Mark all read
                </button>
              </div>
              <div className="divide-y divide-gray-50 max-h-64 overflow-y-auto">
                {notifications.map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => {
                      onSelectModule?.(n.module);
                      setNotificationOpen(false);
                    }}
                    className="w-full p-3.5 hover:bg-gray-50 transition flex items-start gap-3 text-left cursor-pointer"
                  >
                    <span
                      className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                        n.unread ? 'bg-emerald-500' : 'bg-gray-300'
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-800">{n.title}</p>
                      <span className="text-[10px] text-emerald-700 font-semibold">
                        Open {n.module} &rarr;
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Profile Menu */}
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
            className="flex items-center gap-3 p-1.5 pl-2 sm:pl-3 pr-2 rounded-full hover:bg-gray-100/80 transition cursor-pointer"
          >
            <img
              src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80"
              alt={user?.name || 'Admin Profile'}
              referrerPolicy="no-referrer"
              onError={handleImageFallback}
              className="w-10 h-10 rounded-full object-cover border border-gray-200 shadow-2xs"
            />
            <div className="hidden sm:block text-left">
              <div className="text-sm font-bold text-gray-900 leading-tight">
                {user?.name || 'Admin'}
              </div>
              <div className="text-[11px] text-gray-500 font-medium leading-none mt-0.5">
                {formattedRole}
              </div>
            </div>
            <ChevronDown className="w-4 h-4 text-gray-400" />
          </button>

          {profileDropdownOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-50">
              <div className="px-4 py-2.5 border-b border-gray-100">
                <div className="text-xs font-bold text-gray-900">{user?.name || 'Admin'}</div>
                <div className="text-[11px] text-gray-500 truncate">
                  {user?.email || 'staff@shopmax.com'}
                </div>
              </div>

              <div className="py-1">
                <button
                  onClick={onGoToStorefront}
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-gray-700 hover:bg-gray-50 transition text-left cursor-pointer"
                >
                  <ExternalLink className="w-4 h-4 text-emerald-600" />
                  <span>View Public Storefront</span>
                </button>
                <div className="border-t border-gray-100 my-1" />
                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-rose-600 hover:bg-rose-50 transition text-left cursor-pointer"
                >
                  <LogOut className="w-4 h-4 text-rose-500" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
