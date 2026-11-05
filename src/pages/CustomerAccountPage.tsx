import React, { useState, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../app/hooks';
import {
  openAuthModal,
  updateUserAddresses,
  updateUserProfile,
} from '../features/auth/authSlice';
import { addToast } from '../features/toast/toastSlice';
import { handleImageFallback } from '../utils/safeMarkdown';
import { formatBDT } from '../utils/currency';
import {
  getDivisions,
  getDistricts,
  getUpazilas,
  getUnionsOrWards,
} from '../data/bangladeshLocations';
import { Modal } from '../components/modal/Modal';
import {
  Package,
  MapPin,
  Settings,
  Plus,
  Trash2,
  Edit,
  Check,
  LogIn,
  Lock,
  User as UserIcon,
  RefreshCw,
} from 'lucide-react';

interface CustomerAccountPageProps {
  initialTab?: 'orders' | 'addresses' | 'settings';
  onNavigateToShop: () => void;
}

export const CustomerAccountPage: React.FC<CustomerAccountPageProps> = ({
  initialTab = 'orders',
  onNavigateToShop,
}) => {
  const dispatch = useAppDispatch();
  const { user, token } = useAppSelector((state) => state.auth);

  const [activeTab, setActiveTab] = useState<'orders' | 'addresses' | 'settings'>(initialTab);
  const [orders, setOrders] = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [retryingOrderNum, setRetryingOrderNum] = useState<string | null>(null);

  // Sync activeTab if header dropdown navigates to a different tab
  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  // Address modal state
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [newAddrName, setNewAddrName] = useState('');
  const [newAddrPhone, setNewAddrPhone] = useState('');
  const [newAddrDivision, setNewAddrDivision] = useState('Dhaka');
  const [newAddrDistrict, setNewAddrDistrict] = useState('Dhaka');
  const [newAddrUpazila, setNewAddrUpazila] = useState('Dhanmondi');
  const [newAddrUnionWard, setNewAddrUnionWard] = useState('Ward 15');
  const [newAddrPostalCode, setNewAddrPostalCode] = useState('1205');
  const [newAddrStreet, setNewAddrStreet] = useState('');
  const [savingAddress, setSavingAddress] = useState(false);

  const handleOpenAddModal = () => {
    setEditingAddressId(null);
    setNewAddrName(user?.name || '');
    setNewAddrPhone(user?.phone || '');
    setNewAddrDivision('Dhaka');
    setNewAddrDistrict('Dhaka');
    setNewAddrUpazila('Dhanmondi');
    setNewAddrUnionWard('Ward 15');
    setNewAddrPostalCode('1205');
    setNewAddrStreet('');
    setIsAddressModalOpen(true);
  };

  const handleEditAddress = (addr: any) => {
    setEditingAddressId(addr.id);
    setNewAddrName(addr.name || '');
    setNewAddrPhone(addr.phone || '');
    setNewAddrDivision(addr.division || 'Dhaka');
    setNewAddrDistrict(addr.district || 'Dhaka');
    setNewAddrUpazila(addr.upazila || '');
    setNewAddrUnionWard(addr.unionWard || '');
    setNewAddrPostalCode(addr.postalCode || '');
    setNewAddrStreet(addr.street || '');
    setIsAddressModalOpen(true);
  };

  const handleModalDivisionChange = (div: string) => {
    setNewAddrDivision(div);
    const districts = getDistricts(div);
    const dist = districts[0] || '';
    setNewAddrDistrict(dist);
    const upzs = getUpazilas(div, dist);
    const upz = upzs[0] || '';
    setNewAddrUpazila(upz);
    const unions = getUnionsOrWards(div, dist, upz);
    setNewAddrUnionWard(unions[0] || '');
  };

  const handleModalDistrictChange = (dist: string) => {
    setNewAddrDistrict(dist);
    const upzs = getUpazilas(newAddrDivision, dist);
    const upz = upzs[0] || '';
    setNewAddrUpazila(upz);
    const unions = getUnionsOrWards(newAddrDivision, dist, upz);
    setNewAddrUnionWard(unions[0] || '');
  };

  const handleModalUpazilaChange = (upz: string) => {
    setNewAddrUpazila(upz);
    const unions = getUnionsOrWards(newAddrDivision, newAddrDistrict, upz);
    setNewAddrUnionWard(unions[0] || '');
  };

  // Profile & Password Settings state
  const [profileName, setProfileName] = useState(user?.name || '');
  const [profilePhone, setProfilePhone] = useState(user?.phone || '');
  const [savingProfile, setSavingProfile] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    if (user) {
      setProfileName(user.name || '');
      setProfilePhone(user.phone || '');
    }
  }, [user]);

  useEffect(() => {
    async function loadOrders() {
      if (!token) return;
      setLoadingOrders(true);
      try {
        const res = await fetch('/api/orders/my-orders', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.success) {
          setOrders(data.data);
        }
      } catch (err) {
        console.error('Failed to load orders', err);
      } finally {
        setLoadingOrders(false);
      }
    }
    loadOrders();
  }, [token]);

  const handleCancelOrder = async (orderNumber: string) => {
    try {
      const res = await fetch(`/api/orders/${orderNumber}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reason: 'Customer requested cancellation from account' }),
      });
      const data = await res.json();
      if (data.success) {
        dispatch(addToast({ type: 'success', title: 'Order Cancelled', message: data.message }));
        setOrders((prev) =>
          prev.map((o) => (o.orderNumber === orderNumber ? { ...o, status: 'cancelled' } : o))
        );
      } else {
        dispatch(addToast({ type: 'error', message: data.error }));
      }
    } catch {
      dispatch(addToast({ type: 'error', message: 'Failed to cancel order' }));
    }
  };

  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAddrName.trim() || !newAddrPhone.trim() || !newAddrStreet.trim()) {
      dispatch(addToast({ type: 'warning', message: 'Please fill all required address fields.' }));
      return;
    }

    setSavingAddress(true);
    try {
      const url = editingAddressId
        ? `/api/auth/address/${encodeURIComponent(editingAddressId)}`
        : '/api/auth/address';
      const method = editingAddressId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: newAddrName.trim(),
          phone: newAddrPhone.trim(),
          division: newAddrDivision,
          district: newAddrDistrict,
          upazila: newAddrUpazila.trim(),
          unionWard: newAddrUnionWard.trim(),
          postalCode: newAddrPostalCode.trim(),
          street: newAddrStreet.trim(),
          isDefault: false,
        }),
      });

      const data = await res.json();
      if (data.success && data.addresses) {
        dispatch(updateUserAddresses(data.addresses));
        dispatch(addToast({
          type: 'success',
          title: editingAddressId ? 'Address Updated' : 'Address Saved',
          message: editingAddressId ? 'Address updated successfully.' : 'New address added to your account.',
        }));
        setIsAddressModalOpen(false);
        setEditingAddressId(null);
        setNewAddrName('');
        setNewAddrPhone('');
        setNewAddrStreet('');
        setNewAddrPostalCode('1205');
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      dispatch(addToast({ type: 'error', message: err.message || 'Failed to save address' }));
    } finally {
      setSavingAddress(false);
    }
  };

  const handleSetDefaultAddress = async (addrId: string) => {
    try {
      const res = await fetch(`/api/auth/address/${encodeURIComponent(addrId)}/default`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success && data.addresses) {
        dispatch(updateUserAddresses(data.addresses));
        dispatch(addToast({ type: 'success', message: 'Default delivery address updated.' }));
      } else {
        throw new Error(data.error || 'Failed to set default address');
      }
    } catch (err: any) {
      dispatch(addToast({ type: 'error', message: err.message || 'Failed to update address' }));
    }
  };

  const handleDeleteAddress = async (addrId: string) => {
    try {
      const res = await fetch(`/api/auth/address/${encodeURIComponent(addrId)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success && data.addresses) {
        dispatch(updateUserAddresses(data.addresses));
        dispatch(addToast({ type: 'info', message: 'Address removed from your profile.' }));
      } else {
        throw new Error(data.error || 'Failed to delete address');
      }
    } catch (err: any) {
      dispatch(addToast({ type: 'error', message: err.message || 'Failed to delete address' }));
    }
  };

  const handleRetryPayment = async (orderNumber: string, gateway: string) => {
    setRetryingOrderNum(orderNumber);
    try {
      const res = await fetch('/api/payment/retry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderNumber, gateway }),
      });
      const data = await res.json();
      if (data.success && data.redirectUrl) {
        window.location.href = data.redirectUrl;
        return;
      }
      dispatch(
        addToast({
          type: 'warning',
          title: 'Gateway Credentials Required',
          message:
            data.error ||
            `Live ${gateway.toUpperCase()} merchant credentials are not configured in this environment.`,
        })
      );
    } catch (err: any) {
      dispatch(addToast({ type: 'error', message: err.message || 'Payment retry failed' }));
    } finally {
      setRetryingOrderNum(null);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileName.trim() || profileName.trim().length < 2) {
      dispatch(addToast({ type: 'warning', message: 'Full name must be at least 2 characters.' }));
      return;
    }
    setSavingProfile(true);
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: profileName.trim(),
          phone: profilePhone.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to update profile');
      }
      dispatch(updateUserProfile({ name: data.user.name, phone: data.user.phone }));
      dispatch(addToast({ type: 'success', title: 'Profile Updated', message: 'Your account details have been saved.' }));
    } catch (err: any) {
      dispatch(addToast({ type: 'error', message: err.message || 'Failed to update profile' }));
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      dispatch(addToast({ type: 'warning', message: 'New password must be at least 6 characters.' }));
      return;
    }
    if (newPassword !== confirmNewPassword) {
      dispatch(addToast({ type: 'warning', message: 'New passwords do not match.' }));
      return;
    }
    setSavingPassword(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Password change failed');
      }
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      dispatch(addToast({ type: 'success', title: 'Password Updated', message: data.message || 'Password changed successfully.' }));
    } catch (err: any) {
      dispatch(addToast({ type: 'error', message: err.message || 'Failed to change password' }));
    } finally {
      setSavingPassword(false);
    }
  };

  if (!user) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <div className="bg-white rounded-3xl border border-gray-200 p-8 shadow-2xs space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-800 flex items-center justify-center mx-auto">
            <UserIcon className="w-7 h-7" />
          </div>
          <h2 className="text-2xl font-extrabold text-gray-900">Sign In to Your Account</h2>
          <p className="text-xs sm:text-sm text-gray-500 leading-relaxed">
            Access your order history, track courier shipments, manage saved delivery addresses, and update your profile settings.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => dispatch(openAuthModal({ mode: 'login' }))}
              className="w-full sm:w-auto px-6 py-3 bg-emerald-800 hover:bg-emerald-900 text-white text-xs sm:text-sm font-bold rounded-xl transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <LogIn className="w-4 h-4" />
              <span>Sign In / Register</span>
            </button>
            <button
              type="button"
              onClick={onNavigateToShop}
              className="w-full sm:w-auto px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs sm:text-sm font-semibold rounded-xl transition cursor-pointer"
            >
              Continue Shopping
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Header Profile summary */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-2xs mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-800 text-white font-extrabold text-xl flex items-center justify-center shadow-md shadow-emerald-950/10">
            {user.name[0]}
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900 tracking-tight">
              {user.name}
            </h1>
            <p className="text-xs text-gray-500">{user.email} • {user.phone || '+880 Bangladesh'}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 uppercase tracking-wider">
            {user.role.replace('_', ' ')}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 sm:gap-4 border-b border-gray-200 mb-8 overflow-x-auto">
        <button
          onClick={() => setActiveTab('orders')}
          className={`flex items-center gap-2 pb-3 px-2 text-xs sm:text-sm font-bold border-b-2 transition whitespace-nowrap cursor-pointer ${
            activeTab === 'orders'
              ? 'border-emerald-800 text-emerald-950'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>My Orders ({orders.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('addresses')}
          className={`flex items-center gap-2 pb-3 px-2 text-xs sm:text-sm font-bold border-b-2 transition whitespace-nowrap cursor-pointer ${
            activeTab === 'addresses'
              ? 'border-emerald-800 text-emerald-950'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <MapPin className="w-4 h-4" />
          <span>Saved Addresses ({user.addresses?.length || 0})</span>
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`flex items-center gap-2 pb-3 px-2 text-xs sm:text-sm font-bold border-b-2 transition whitespace-nowrap cursor-pointer ${
            activeTab === 'settings'
              ? 'border-emerald-800 text-emerald-950'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>Account Settings</span>
        </button>
      </div>

      {/* TAB 1: MY ORDERS */}
      {activeTab === 'orders' && (
        <div className="space-y-6">
          {loadingOrders ? (
            <div className="py-12 flex justify-center">
              <div className="w-8 h-8 border-3 border-emerald-800 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 p-8 space-y-3">
              <Package className="w-12 h-12 text-gray-300 mx-auto" />
              <h3 className="text-base font-bold text-gray-900">No orders placed yet</h3>
              <p className="text-xs text-gray-500 max-w-sm mx-auto">
                Explore our popular electronics, footwear, and fashion items to place your first order.
              </p>
              <button
                onClick={onNavigateToShop}
                className="mt-2 px-6 py-2.5 bg-emerald-800 text-white text-xs font-bold rounded-xl"
              >
                Browse Shop
              </button>
            </div>
          ) : (
            orders.map((order) => {
              const isCancellable = order.status === 'pending' || order.status === 'confirmed';
              const isPaid = order.paymentStatus === 'paid';
              const canRetryOnline =
                order.status !== 'cancelled' &&
                !isPaid &&
                (order.paymentMethod === 'sslcommerz' || order.paymentMethod === 'bkash');

              return (
                <div
                  key={order.orderNumber}
                  className="bg-white rounded-2xl border border-gray-100 p-6 shadow-2xs space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-gray-100 gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-extrabold font-mono text-gray-900">
                          Order #{order.orderNumber}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2.5 py-0.5 rounded-md uppercase tracking-wider ${
                            order.status === 'delivered'
                              ? 'bg-emerald-100 text-emerald-800'
                              : order.status === 'cancelled'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {order.status}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2.5 py-0.5 rounded-md uppercase tracking-wider ${
                            isPaid
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : order.paymentStatus === 'failed'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          Payment: {order.paymentStatus || 'unpaid'}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        Placed on {new Date(order.createdAt).toLocaleDateString()} via{' '}
                        {order.paymentMethod?.toUpperCase()}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="text-base font-extrabold text-gray-900 tabular-nums mr-1">
                        {formatBDT(Number(order.finalTotal || 0))}
                      </span>
                      {canRetryOnline && (
                        <button
                          type="button"
                          disabled={retryingOrderNum === order.orderNumber}
                          onClick={() => handleRetryPayment(order.orderNumber, order.paymentMethod)}
                          className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                          <RefreshCw
                            className={`w-3.5 h-3.5 ${
                              retryingOrderNum === order.orderNumber ? 'animate-spin' : ''
                            }`}
                          />
                          <span>Retry Payment</span>
                        </button>
                      )}
                      {isCancellable && (
                        <button
                          type="button"
                          onClick={() => handleCancelOrder(order.orderNumber)}
                          className="px-3 py-1.5 rounded-lg border border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-semibold transition cursor-pointer"
                        >
                          Cancel Order
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Items snapshot */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {order.items?.map((item: any, idx: number) => {
                      const itemPrice = item.unitPrice ?? item.price ?? 0;
                      return (
                        <div
                          key={idx}
                          className="flex items-center gap-3 p-2.5 rounded-xl bg-gray-50 border border-gray-100"
                        >
                          <img
                            src={item.image}
                            alt={item.name}
                            referrerPolicy="no-referrer"
                            onError={handleImageFallback}
                            className="w-12 h-12 rounded-lg object-cover bg-white shrink-0 border border-gray-100"
                          />
                          <div className="min-w-0">
                            <div className="text-xs font-semibold text-gray-900 truncate">
                              {item.name}
                            </div>
                            <div className="text-[11px] text-gray-500 tabular-nums">
                              Qty: {item.quantity} × {formatBDT(Number(itemPrice))}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Delivery address snapshot */}
                  <div className="pt-2 text-xs text-gray-600 flex flex-wrap gap-x-6 gap-y-1">
                    <div>
                      <strong className="text-gray-800">Ship To:</strong> {order.shippingAddress?.name} ({order.shippingAddress?.phone})
                    </div>
                    <div>
                      <strong className="text-gray-800">Address:</strong> {order.shippingAddress?.street}, {order.shippingAddress?.upazila}, {order.shippingAddress?.district}, {order.shippingAddress?.division}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* TAB 2: SAVED ADDRESSES */}
      {activeTab === 'addresses' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
              Saved Delivery Addresses
            </h2>
            <button
              onClick={handleOpenAddModal}
              className="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add New Address</span>
            </button>
          </div>

          {(!user.addresses || user.addresses.length === 0) ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center space-y-2">
              <MapPin className="w-10 h-10 text-gray-300 mx-auto" />
              <h3 className="text-sm font-bold text-gray-900">No saved addresses yet</h3>
              <p className="text-xs text-gray-500">Add a delivery address for faster 1-click checkout.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {user.addresses.map((addr) => (
                <div
                  key={addr.id}
                  className="bg-white p-5 rounded-2xl border border-gray-100 shadow-2xs space-y-2.5 relative flex flex-col justify-between"
                >
                  <div>
                    {addr.isDefault && (
                      <span className="inline-flex items-center gap-1 mb-2 text-[10px] font-bold px-2.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800">
                        <Check className="w-3 h-3" />
                        <span>Default Address</span>
                      </span>
                    )}
                    <div className="text-sm font-bold text-gray-900">{addr.name}</div>
                    <div className="text-xs text-gray-500 leading-relaxed mt-1">
                      {addr.street}
                      {addr.unionWard ? `, ${addr.unionWard}` : ''}
                      {addr.upazila ? `, ${addr.upazila}` : ''} <br />
                      {addr.district}, {addr.division} {addr.postalCode ? ` - ${addr.postalCode}` : ''}
                    </div>
                    <div className="text-xs font-semibold text-gray-700 pt-1">{addr.phone}</div>
                  </div>

                  <div className="pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
                    {!addr.isDefault ? (
                      <button
                        type="button"
                        onClick={() => handleSetDefaultAddress(addr.id)}
                        className="text-xs font-semibold text-emerald-800 hover:text-emerald-950 hover:underline cursor-pointer"
                      >
                        Set as Default
                      </button>
                    ) : (
                      <span className="text-[11px] text-gray-400">Primary checkout address</span>
                    )}

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleEditAddress(addr)}
                        className="inline-flex items-center gap-1 text-xs font-medium text-emerald-800 hover:text-emerald-950 px-2 py-1 rounded-lg hover:bg-emerald-50 transition cursor-pointer"
                        aria-label={`Edit address for ${addr.name}`}
                      >
                        <Edit className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteAddress(addr.id)}
                        className="inline-flex items-center gap-1 text-xs font-medium text-rose-600 hover:text-rose-700 px-2 py-1 rounded-lg hover:bg-rose-50 transition cursor-pointer"
                        aria-label={`Delete address for ${addr.name}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add / Edit Address Modal */}
          <Modal
            isOpen={isAddressModalOpen}
            onClose={() => {
              setIsAddressModalOpen(false);
              setEditingAddressId(null);
            }}
            title={editingAddressId ? 'Edit Delivery Address' : 'Add New Delivery Address'}
            description={
              editingAddressId
                ? 'Update your delivery details and administrative location.'
                : 'Address will be saved to your profile for 1-click checkout.'
            }
          >
            <form onSubmit={handleSaveAddress} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">
                  Recipient Name *
                </label>
                <input
                  type="text"
                  required
                  value={newAddrName}
                  onChange={(e) => setNewAddrName(e.target.value)}
                  placeholder="e.g. Sarah Khan"
                  className="w-full text-xs p-2.5 border border-gray-200 rounded-xl outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  required
                  value={newAddrPhone}
                  onChange={(e) => setNewAddrPhone(e.target.value)}
                  placeholder="+880 17XX XXXXXX"
                  className="w-full text-xs p-2.5 border border-gray-200 rounded-xl outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1">Division *</label>
                  <select
                    value={newAddrDivision}
                    onChange={(e) => handleModalDivisionChange(e.target.value)}
                    className="w-full text-xs p-2.5 border border-gray-200 rounded-xl outline-none bg-white cursor-pointer"
                  >
                    {getDivisions().map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1">District *</label>
                  <select
                    value={newAddrDistrict}
                    onChange={(e) => handleModalDistrictChange(e.target.value)}
                    className="w-full text-xs p-2.5 border border-gray-200 rounded-xl outline-none bg-white cursor-pointer"
                  >
                    {getDistricts(newAddrDivision).map((dist) => (
                      <option key={dist} value={dist}>
                        {dist}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1">
                    Upazila / Thana *
                  </label>
                  <select
                    value={newAddrUpazila}
                    onChange={(e) => handleModalUpazilaChange(e.target.value)}
                    className="w-full text-xs p-2.5 border border-gray-200 rounded-xl outline-none bg-white cursor-pointer"
                  >
                    {getUpazilas(newAddrDivision, newAddrDistrict).map((upz) => (
                      <option key={upz} value={upz}>
                        {upz}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1">
                    Union / Ward *
                  </label>
                  <select
                    value={newAddrUnionWard}
                    onChange={(e) => setNewAddrUnionWard(e.target.value)}
                    className="w-full text-xs p-2.5 border border-gray-200 rounded-xl outline-none bg-white cursor-pointer"
                  >
                    {getUnionsOrWards(newAddrDivision, newAddrDistrict, newAddrUpazila).map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">
                  Postal Code (Optional)
                </label>
                <input
                  type="text"
                  value={newAddrPostalCode}
                  onChange={(e) => setNewAddrPostalCode(e.target.value)}
                  placeholder="e.g. 1205"
                  className="w-full text-xs p-2.5 border border-gray-200 rounded-xl outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">
                  Street Address *
                </label>
                <input
                  type="text"
                  required
                  value={newAddrStreet}
                  onChange={(e) => setNewAddrStreet(e.target.value)}
                  placeholder="House 42, Road 9/A"
                  className="w-full text-xs p-2.5 border border-gray-200 rounded-xl outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={savingAddress}
                className="w-full py-3 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs rounded-xl transition"
              >
                {savingAddress ? 'Saving...' : editingAddressId ? 'Update Address' : 'Save Address'}
              </button>
            </form>
          </Modal>
        </div>
      )}

      {/* TAB 3: SETTINGS */}
      {activeTab === 'settings' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Edit Profile Card */}
          <form
            onSubmit={handleUpdateProfile}
            className="bg-white p-6 rounded-2xl border border-gray-100 shadow-2xs space-y-4"
          >
            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider pb-2 border-b border-gray-100 flex items-center gap-2">
              <UserIcon className="w-4 h-4 text-emerald-800" />
              <span>Profile Details</span>
            </h2>

            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1">Full Name</label>
              <input
                type="text"
                required
                minLength={2}
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                className="w-full text-xs sm:text-sm px-3.5 py-2.5 border border-gray-200 rounded-xl outline-none focus:border-emerald-700"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1">
                Email Address (Verified)
              </label>
              <input
                type="email"
                disabled
                value={user.email}
                className="w-full text-xs sm:text-sm px-3.5 py-2.5 border border-gray-100 bg-gray-50 text-gray-500 rounded-xl cursor-not-allowed"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1">Phone Number</label>
              <input
                type="tel"
                value={profilePhone}
                onChange={(e) => setProfilePhone(e.target.value)}
                placeholder="+880 17XX XXXXXX"
                className="w-full text-xs sm:text-sm px-3.5 py-2.5 border border-gray-200 rounded-xl outline-none focus:border-emerald-700"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={savingProfile}
                className="px-5 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold rounded-xl transition cursor-pointer disabled:opacity-50"
              >
                {savingProfile ? 'Saving Changes...' : 'Save Profile Changes'}
              </button>
            </div>
          </form>

          {/* Change Password Card */}
          <form
            onSubmit={handleChangePassword}
            className="bg-white p-6 rounded-2xl border border-gray-100 shadow-2xs space-y-4"
          >
            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider pb-2 border-b border-gray-100 flex items-center gap-2">
              <Lock className="w-4 h-4 text-emerald-800" />
              <span>Change Password</span>
            </h2>

            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1">
                Current Password
              </label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                className="w-full text-xs sm:text-sm px-3.5 py-2.5 border border-gray-200 rounded-xl outline-none focus:border-emerald-700"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1">
                New Password
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimum 6 characters"
                className="w-full text-xs sm:text-sm px-3.5 py-2.5 border border-gray-200 rounded-xl outline-none focus:border-emerald-700"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1">
                Confirm New Password
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                placeholder="Repeat new password"
                className="w-full text-xs sm:text-sm px-3.5 py-2.5 border border-gray-200 rounded-xl outline-none focus:border-emerald-700"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={savingPassword}
                className="px-5 py-2.5 bg-gray-900 hover:bg-gray-800 text-white text-xs font-bold rounded-xl transition cursor-pointer disabled:opacity-50"
              >
                {savingPassword ? 'Updating...' : 'Update Password'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
