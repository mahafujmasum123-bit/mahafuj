import React, { useState, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { addToast } from '../../features/toast/toastSlice';
import {
  Settings,
  Database,
  Cloud,
  Mail,
  CreditCard,
  Truck,
  Shield,
  Save,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Send,
  Eye,
  EyeOff,
  Server,
  Lock,
  Layers,
  Sparkles,
} from 'lucide-react';

interface SystemSettingsPageProps {
  systemStatus: any;
  onRefresh: () => void;
  initialTab?: 'general' | 'payment' | 'shipping' | 'email' | 'telemetry';
}

export const SystemSettingsPage: React.FC<SystemSettingsPageProps> = ({
  systemStatus,
  onRefresh,
  initialTab = 'general',
}) => {
  const dispatch = useAppDispatch();
  const { token } = useAppSelector((state) => state.auth);

  const [activeTab, setActiveTab] = useState<'general' | 'payment' | 'shipping' | 'email' | 'telemetry'>(
    initialTab
  );

  // General Settings State
  const [generalSettings, setGeneralSettings] = useState({
    storeName: 'NOVARA COMMERCE',
    tagline: 'Premium Lifestyle & Tech Electronics',
    supportEmail: 'support@novara.com',
    supportPhone: '+880 1711 000000',
    currency: 'BDT',
    currencySymbol: '৳',
    taxRatePercent: 0,
  });

  // Shipping Settings State
  const [shippingSettings, setShippingSettings] = useState({
    freeShippingThreshold: 2500,
    insideDhakaFee: 60,
    outsideDhakaFee: 120,
    estimatedDaysInside: '1-2 Days',
    estimatedDaysOutside: '3-5 Days',
    expressDeliveryAvailable: true,
    expressFee: 150,
  });

  // Payment Settings State
  const [paymentSettings, setPaymentSettings] = useState({
    cod: {
      enabled: true,
      title: 'Cash on Delivery (COD)',
      description: 'Pay with cash upon courier delivery across Bangladesh.',
      maxOrderLimit: 50000,
    },
    bkash: {
      enabled: true,
      isSandbox: true,
      merchantNumber: '01700000000',
      appKey: '',
      appSecret: '',
      hasAppKey: false,
      hasAppSecret: false,
      appKeyMasked: '',
      appSecretMasked: '',
    },
    nagad: {
      enabled: true,
      isSandbox: true,
      merchantId: 'NAGAD_NOVARA_01',
    },
    card: {
      enabled: true,
      isSandbox: true,
      storeId: '',
      storePassword: '',
      hasStorePassword: false,
      storeIdMasked: '',
      provider: 'sslcommerz',
    },
  });

  // Email Settings State
  const [emailSettings, setEmailSettings] = useState({
    smtp: {
      host: 'smtp.resend.com',
      port: 587,
      secure: false,
      username: 'resend',
      password: '',
      senderName: 'ShopMax by Novara',
      senderEmail: 'orders@shopmax.com',
      enabled: true,
      hasPassword: false,
      passwordMasked: '',
    },
  });

  // Edit secret toggles
  const [editBkashSecret, setEditBkashSecret] = useState(false);
  const [editCardSecret, setEditCardSecret] = useState(false);
  const [editEmailPassword, setEditEmailPassword] = useState(false);

  // Test Email Modal State
  const [testEmailAddress, setTestEmailAddress] = useState('admin@novara.com');
  const [testEmailLoading, setTestEmailLoading] = useState(false);
  const [testEmailResult, setTestEmailResult] = useState<{ success: boolean; message: string } | null>(null);

  // Loading & Saving States
  const [loading, setLoading] = useState(false);
  const [savingSection, setSavingSection] = useState<string | null>(null);

  useEffect(() => {
    fetchAllSettings();
  }, [token]);

  const fetchAllSettings = async () => {
    setLoading(true);
    try {
      const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await fetch('/api/admin/settings', { headers });
      const data = await res.json();
      if (data.success && data.data) {
        if (data.data.general) setGeneralSettings(data.data.general);
        if (data.data.shipping) setShippingSettings(data.data.shipping);
        if (data.data.payment) setPaymentSettings(data.data.payment);
        if (data.data.email) setEmailSettings(data.data.email);
      }
    } catch (err) {
      console.error('Failed to load settings', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveGeneral = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSection('general');
    try {
      const res = await fetch('/api/admin/settings/general', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(generalSettings),
      });
      const data = await res.json();
      if (data.success) {
        dispatch(
          addToast({
            type: 'success',
            title: 'General Settings Saved',
            message: 'Store profile, currency, and tax parameters updated.',
          })
        );
        onRefresh();
      } else {
        dispatch(addToast({ type: 'error', message: data.error || 'Failed to save settings' }));
      }
    } catch {
      dispatch(addToast({ type: 'error', message: 'Network error saving general settings' }));
    } finally {
      setSavingSection(null);
    }
  };

  const handleSaveShipping = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSection('shipping');
    try {
      const res = await fetch('/api/admin/settings/shipping', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(shippingSettings),
      });
      const data = await res.json();
      if (data.success) {
        dispatch(
          addToast({
            type: 'success',
            title: 'Shipping Settings Saved',
            message: 'Delivery charges and free shipping threshold updated.',
          })
        );
        onRefresh();
      } else {
        dispatch(addToast({ type: 'error', message: data.error || 'Failed to save shipping settings' }));
      }
    } catch {
      dispatch(addToast({ type: 'error', message: 'Network error saving shipping settings' }));
    } finally {
      setSavingSection(null);
    }
  };

  const handleSavePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSection('payment');
    try {
      // Build safe payload: if secrets not edited, do not send masked placeholders
      const payload: any = {
        cod: paymentSettings.cod,
        bkash: {
          enabled: paymentSettings.bkash.enabled,
          isSandbox: paymentSettings.bkash.isSandbox,
          merchantNumber: paymentSettings.bkash.merchantNumber,
        },
        nagad: paymentSettings.nagad,
        card: {
          enabled: paymentSettings.card.enabled,
          isSandbox: paymentSettings.card.isSandbox,
          provider: paymentSettings.card.provider,
        },
      };

      if (editBkashSecret && paymentSettings.bkash.appKey) {
        payload.bkash.appKey = paymentSettings.bkash.appKey;
      }
      if (editBkashSecret && paymentSettings.bkash.appSecret) {
        payload.bkash.appSecret = paymentSettings.bkash.appSecret;
      }
      if (editCardSecret && paymentSettings.card.storeId) {
        payload.card.storeId = paymentSettings.card.storeId;
      }
      if (editCardSecret && paymentSettings.card.storePassword) {
        payload.card.storePassword = paymentSettings.card.storePassword;
      }

      const res = await fetch('/api/admin/settings/payment', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        dispatch(
          addToast({
            type: 'success',
            title: 'Payment Settings Saved',
            message: 'Payment gateways and credential policies persisted.',
          })
        );
        setEditBkashSecret(false);
        setEditCardSecret(false);
        fetchAllSettings();
        onRefresh();
      } else {
        dispatch(addToast({ type: 'error', message: data.error || 'Failed to save payment settings' }));
      }
    } catch {
      dispatch(addToast({ type: 'error', message: 'Network error saving payment settings' }));
    } finally {
      setSavingSection(null);
    }
  };

  const handleSaveEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSection('email');
    try {
      const payload: any = {
        smtp: {
          host: emailSettings.smtp.host,
          port: Number(emailSettings.smtp.port) || 587,
          secure: Boolean(emailSettings.smtp.secure),
          username: emailSettings.smtp.username,
          senderName: emailSettings.smtp.senderName,
          senderEmail: emailSettings.smtp.senderEmail,
          enabled: Boolean(emailSettings.smtp.enabled),
        },
      };

      if (editEmailPassword && emailSettings.smtp.password) {
        payload.smtp.password = emailSettings.smtp.password;
      }

      const res = await fetch('/api/admin/settings/email', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        dispatch(
          addToast({
            type: 'success',
            title: 'Email Settings Saved',
            message: 'SMTP credentials and sender identity persisted.',
          })
        );
        setEditEmailPassword(false);
        fetchAllSettings();
        onRefresh();
      } else {
        dispatch(addToast({ type: 'error', message: data.error || 'Failed to save email settings' }));
      }
    } catch {
      dispatch(addToast({ type: 'error', message: 'Network error saving email settings' }));
    } finally {
      setSavingSection(null);
    }
  };

  const handleTestEmail = async () => {
    if (!testEmailAddress || !testEmailAddress.includes('@')) {
      dispatch(addToast({ type: 'error', message: 'Please enter a valid recipient email address' }));
      return;
    }

    setTestEmailLoading(true);
    setTestEmailResult(null);
    try {
      const res = await fetch('/api/admin/settings/email/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ recipientEmail: testEmailAddress }),
      });
      const data = await res.json();
      if (data.success) {
        setTestEmailResult({ success: true, message: data.message });
        dispatch(
          addToast({
            type: 'success',
            title: 'SMTP Verified',
            message: data.message,
          })
        );
      } else {
        setTestEmailResult({ success: false, message: data.error || 'SMTP Connection Test Failed' });
        dispatch(
          addToast({
            type: 'error',
            title: 'SMTP Error',
            message: data.error || 'Failed to establish SMTP connection',
          })
        );
      }
    } catch (err: any) {
      setTestEmailResult({ success: false, message: err.message || 'Network exception during test' });
      dispatch(addToast({ type: 'error', message: 'Network error testing SMTP' }));
    } finally {
      setTestEmailLoading(false);
    }
  };

  const isDbConnected = Boolean(systemStatus?.mongodb?.connected);

  return (
    <div className="space-y-6">
      {/* Top Header & Tab Navigation */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Settings className="w-5 h-5 text-emerald-800" />
              <span>Administrative System Settings</span>
            </h1>
            <p className="text-xs text-gray-500">
              Configure global store parameters, payment gateways, Bangladesh delivery charges, and transactional email.
            </p>
          </div>

          <button
            onClick={fetchAllSettings}
            disabled={loading}
            className="self-start sm:self-auto flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Sync Settings</span>
          </button>
        </div>

        {/* Tab Buttons */}
        <div className="flex flex-wrap items-center gap-2 border-t border-gray-100 pt-3">
          <button
            onClick={() => setActiveTab('general')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'general'
                ? 'bg-emerald-800 text-white shadow-xs'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            <span>General Store</span>
          </button>

          <button
            onClick={() => setActiveTab('payment')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'payment'
                ? 'bg-emerald-800 text-white shadow-xs'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>Payment Gateways</span>
          </button>

          <button
            onClick={() => setActiveTab('shipping')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'shipping'
                ? 'bg-emerald-800 text-white shadow-xs'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900'
            }`}
          >
            <Truck className="w-3.5 h-3.5" />
            <span>Shipping &amp; Delivery</span>
          </button>

          <button
            onClick={() => setActiveTab('email')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'email'
                ? 'bg-emerald-800 text-white shadow-xs'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900'
            }`}
          >
            <Mail className="w-3.5 h-3.5" />
            <span>Email &amp; SMTP</span>
          </button>

          <button
            onClick={() => setActiveTab('telemetry')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'telemetry'
                ? 'bg-emerald-800 text-white shadow-xs'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900'
            }`}
          >
            <Server className="w-3.5 h-3.5" />
            <span>Infrastructure Health</span>
          </button>
        </div>
      </div>

      {/* TAB 1: GENERAL STORE SETTINGS */}
      {activeTab === 'general' && (
        <form onSubmit={handleSaveGeneral} className="bg-white rounded-2xl p-6 border border-gray-200/80 shadow-2xs space-y-6">
          <div className="pb-3 border-b border-gray-100">
            <h2 className="text-sm font-bold text-gray-900">General Store Configuration</h2>
            <p className="text-xs text-gray-500">Brand identity, contact numbers, and currency specifications</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Store Name</label>
              <input
                type="text"
                required
                value={generalSettings.storeName}
                onChange={(e) => setGeneralSettings({ ...generalSettings, storeName: e.target.value })}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:bg-white focus:outline-emerald-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Store Tagline</label>
              <input
                type="text"
                value={generalSettings.tagline}
                onChange={(e) => setGeneralSettings({ ...generalSettings, tagline: e.target.value })}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:bg-white focus:outline-emerald-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Customer Support Email</label>
              <input
                type="email"
                required
                value={generalSettings.supportEmail}
                onChange={(e) => setGeneralSettings({ ...generalSettings, supportEmail: e.target.value })}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:bg-white focus:outline-emerald-600 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Customer Support Phone</label>
              <input
                type="text"
                required
                value={generalSettings.supportPhone}
                onChange={(e) => setGeneralSettings({ ...generalSettings, supportPhone: e.target.value })}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:bg-white focus:outline-emerald-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Primary Currency</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  disabled
                  value={generalSettings.currency}
                  className="w-1/2 px-3 py-2 bg-gray-100 border border-gray-200 rounded-xl text-xs text-gray-700 font-bold"
                />
                <input
                  type="text"
                  disabled
                  value={generalSettings.currencySymbol}
                  className="w-1/2 px-3 py-2 bg-gray-100 border border-gray-200 rounded-xl text-xs text-gray-700 font-bold text-center font-mono"
                />
              </div>
              <span className="text-[10px] text-gray-400 mt-1 block">Fixed to Bangladeshi Taka (৳ BDT) across Novara platform</span>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Sales Tax / VAT Rate (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={generalSettings.taxRatePercent}
                onChange={(e) => setGeneralSettings({ ...generalSettings, taxRatePercent: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:bg-white focus:outline-emerald-600"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-gray-100 flex justify-end">
            <button
              type="submit"
              disabled={savingSection === 'general'}
              className="flex items-center gap-1.5 px-5 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{savingSection === 'general' ? 'Saving...' : 'Save General Settings'}</span>
            </button>
          </div>
        </form>
      )}

      {/* TAB 2: PAYMENT SETTINGS */}
      {activeTab === 'payment' && (
        <form onSubmit={handleSavePayment} className="space-y-6">
          {/* COD Module */}
          <div className="bg-white rounded-2xl p-6 border border-gray-200/80 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-800 flex items-center justify-center font-bold text-sm">
                  COD
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">Cash on Delivery (COD)</h3>
                  <p className="text-xs text-gray-500">Courier delivery across all 64 districts in Bangladesh</p>
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={paymentSettings.cod.enabled}
                  onChange={(e) =>
                    setPaymentSettings({
                      ...paymentSettings,
                      cod: { ...paymentSettings.cod, enabled: e.target.checked },
                    })
                  }
                  className="w-4 h-4 text-emerald-600 rounded-md focus:ring-emerald-500 cursor-pointer"
                />
                <span className="text-xs font-bold text-gray-800">Enabled</span>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Title Displayed at Checkout</label>
                <input
                  type="text"
                  value={paymentSettings.cod.title}
                  onChange={(e) =>
                    setPaymentSettings({
                      ...paymentSettings,
                      cod: { ...paymentSettings.cod, title: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Max Order Limit for COD (৳ BDT)</label>
                <input
                  type="number"
                  value={paymentSettings.cod.maxOrderLimit}
                  onChange={(e) =>
                    setPaymentSettings({
                      ...paymentSettings,
                      cod: { ...paymentSettings.cod, maxOrderLimit: parseInt(e.target.value, 10) || 50000 },
                    })
                  }
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 font-mono"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-gray-700 mb-1">Checkout Customer Instructions</label>
                <input
                  type="text"
                  value={paymentSettings.cod.description}
                  onChange={(e) =>
                    setPaymentSettings({
                      ...paymentSettings,
                      cod: { ...paymentSettings.cod, description: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900"
                />
              </div>
            </div>
          </div>

          {/* bKash Payment Module */}
          <div className="bg-white rounded-2xl p-6 border border-gray-200/80 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-pink-50 text-pink-700 font-bold flex items-center justify-center text-xs">
                  bKash
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">bKash Tokenized Checkout (v1.2.0-beta)</h3>
                  <p className="text-xs text-gray-500">Official bKash payment gateway integration</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={paymentSettings.bkash.isSandbox}
                    onChange={(e) =>
                      setPaymentSettings({
                        ...paymentSettings,
                        bkash: { ...paymentSettings.bkash, isSandbox: e.target.checked },
                      })
                    }
                    className="w-4 h-4 text-pink-600 rounded-md focus:ring-pink-500 cursor-pointer"
                  />
                  <span className="text-xs font-semibold text-gray-700">Sandbox Mode</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={paymentSettings.bkash.enabled}
                    onChange={(e) =>
                      setPaymentSettings({
                        ...paymentSettings,
                        bkash: { ...paymentSettings.bkash, enabled: e.target.checked },
                      })
                    }
                    className="w-4 h-4 text-emerald-600 rounded-md focus:ring-emerald-500 cursor-pointer"
                  />
                  <span className="text-xs font-bold text-gray-800">Enabled</span>
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Merchant Phone Number</label>
                <input
                  type="text"
                  value={paymentSettings.bkash.merchantNumber}
                  onChange={(e) =>
                    setPaymentSettings({
                      ...paymentSettings,
                      bkash: { ...paymentSettings.bkash, merchantNumber: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 font-mono"
                  placeholder="01700000000"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-bold text-gray-700">App Key</label>
                  <button
                    type="button"
                    onClick={() => setEditBkashSecret(!editBkashSecret)}
                    className="text-[10px] text-emerald-800 hover:underline font-semibold cursor-pointer"
                  >
                    {editBkashSecret ? 'Keep Existing' : 'Change Key'}
                  </button>
                </div>
                {editBkashSecret ? (
                  <input
                    type="text"
                    value={paymentSettings.bkash.appKey}
                    onChange={(e) =>
                      setPaymentSettings({
                        ...paymentSettings,
                        bkash: { ...paymentSettings.bkash, appKey: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 font-mono"
                    placeholder="Enter new bKash App Key"
                  />
                ) : (
                  <input
                    type="text"
                    disabled
                    value={paymentSettings.bkash.hasAppKey ? (paymentSettings.bkash.appKeyMasked || '••••••••') : 'Not Configured'}
                    className="w-full px-3 py-2 bg-gray-100 border border-gray-200 rounded-xl text-xs text-gray-600 font-mono"
                  />
                )}
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-bold text-gray-700">App Secret</label>
                </div>
                {editBkashSecret ? (
                  <input
                    type="password"
                    value={paymentSettings.bkash.appSecret}
                    onChange={(e) =>
                      setPaymentSettings({
                        ...paymentSettings,
                        bkash: { ...paymentSettings.bkash, appSecret: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 font-mono"
                    placeholder="Enter new bKash App Secret"
                  />
                ) : (
                  <input
                    type="text"
                    disabled
                    value={paymentSettings.bkash.hasAppSecret ? '••••••••••••••••' : 'Not Configured'}
                    className="w-full px-3 py-2 bg-gray-100 border border-gray-200 rounded-xl text-xs text-gray-600 font-mono"
                  />
                )}
              </div>
            </div>
          </div>

          {/* Nagad Module */}
          <div className="bg-white rounded-2xl p-6 border border-gray-200/80 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 font-bold flex items-center justify-center text-xs">
                  Nagad
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">Nagad Post Office DFS Gateway</h3>
                  <p className="text-xs text-gray-500">Government postal digital financial services</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={paymentSettings.nagad.isSandbox}
                    onChange={(e) =>
                      setPaymentSettings({
                        ...paymentSettings,
                        nagad: { ...paymentSettings.nagad, isSandbox: e.target.checked },
                      })
                    }
                    className="w-4 h-4 text-amber-600 rounded-md focus:ring-amber-500 cursor-pointer"
                  />
                  <span className="text-xs font-semibold text-gray-700">Sandbox Mode</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={paymentSettings.nagad.enabled}
                    onChange={(e) =>
                      setPaymentSettings({
                        ...paymentSettings,
                        nagad: { ...paymentSettings.nagad, enabled: e.target.checked },
                      })
                    }
                    className="w-4 h-4 text-emerald-600 rounded-md focus:ring-emerald-500 cursor-pointer"
                  />
                  <span className="text-xs font-bold text-gray-800">Enabled</span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Nagad Merchant ID</label>
              <input
                type="text"
                value={paymentSettings.nagad.merchantId}
                onChange={(e) =>
                  setPaymentSettings({
                    ...paymentSettings,
                    nagad: { ...paymentSettings.nagad, merchantId: e.target.value },
                  })
                }
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 font-mono"
                placeholder="NAGAD_NOVARA_01"
              />
            </div>
          </div>

          {/* SSLCommerz / Card Module */}
          <div className="bg-white rounded-2xl p-6 border border-gray-200/80 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 font-bold flex items-center justify-center text-xs">
                  Cards
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">Visa / Mastercard / SSLCommerz Gateway</h3>
                  <p className="text-xs text-gray-500">Debit, Credit cards and Net Banking across Bangladesh</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={paymentSettings.card.isSandbox}
                    onChange={(e) =>
                      setPaymentSettings({
                        ...paymentSettings,
                        card: { ...paymentSettings.card, isSandbox: e.target.checked },
                      })
                    }
                    className="w-4 h-4 text-blue-600 rounded-md focus:ring-blue-500 cursor-pointer"
                  />
                  <span className="text-xs font-semibold text-gray-700">Sandbox Mode</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={paymentSettings.card.enabled}
                    onChange={(e) =>
                      setPaymentSettings({
                        ...paymentSettings,
                        card: { ...paymentSettings.card, enabled: e.target.checked },
                      })
                    }
                    className="w-4 h-4 text-emerald-600 rounded-md focus:ring-emerald-500 cursor-pointer"
                  />
                  <span className="text-xs font-bold text-gray-800">Enabled</span>
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-bold text-gray-700">Store ID</label>
                  <button
                    type="button"
                    onClick={() => setEditCardSecret(!editCardSecret)}
                    className="text-[10px] text-emerald-800 hover:underline font-semibold cursor-pointer"
                  >
                    {editCardSecret ? 'Keep Existing' : 'Change Store ID / Password'}
                  </button>
                </div>
                {editCardSecret ? (
                  <input
                    type="text"
                    value={paymentSettings.card.storeId}
                    onChange={(e) =>
                      setPaymentSettings({
                        ...paymentSettings,
                        card: { ...paymentSettings.card, storeId: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 font-mono"
                    placeholder="Enter Store ID"
                  />
                ) : (
                  <input
                    type="text"
                    disabled
                    value={paymentSettings.card.storeIdMasked || '••••••••'}
                    className="w-full px-3 py-2 bg-gray-100 border border-gray-200 rounded-xl text-xs text-gray-600 font-mono"
                  />
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Store Password</label>
                {editCardSecret ? (
                  <input
                    type="password"
                    value={paymentSettings.card.storePassword}
                    onChange={(e) =>
                      setPaymentSettings({
                        ...paymentSettings,
                        card: { ...paymentSettings.card, storePassword: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 font-mono"
                    placeholder="Enter Store Password"
                  />
                ) : (
                  <input
                    type="text"
                    disabled
                    value={paymentSettings.card.hasStorePassword ? '••••••••••••' : 'Not Configured'}
                    className="w-full px-3 py-2 bg-gray-100 border border-gray-200 rounded-xl text-xs text-gray-600 font-mono"
                  />
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={savingSection === 'payment'}
              className="flex items-center gap-1.5 px-6 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{savingSection === 'payment' ? 'Saving...' : 'Save Payment Settings'}</span>
            </button>
          </div>
        </form>
      )}

      {/* TAB 3: SHIPPING SETTINGS */}
      {activeTab === 'shipping' && (
        <form onSubmit={handleSaveShipping} className="bg-white rounded-2xl p-6 border border-gray-200/80 shadow-2xs space-y-6">
          <div className="pb-3 border-b border-gray-100">
            <h2 className="text-sm font-bold text-gray-900">Bangladesh Delivery &amp; Shipping Charges</h2>
            <p className="text-xs text-gray-500">
              Set domestic delivery charges across divisions, express couriers, and free shipping thresholds.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Inside Dhaka Delivery Charge (৳ BDT)
              </label>
              <input
                type="number"
                min="0"
                required
                value={shippingSettings.insideDhakaFee}
                onChange={(e) =>
                  setShippingSettings({
                    ...shippingSettings,
                    insideDhakaFee: parseInt(e.target.value, 10) || 0,
                  })
                }
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 font-mono"
              />
              <span className="text-[10px] text-gray-400 mt-1 block">Default fee for Dhaka division addresses</span>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Outside Dhaka Delivery Charge (৳ BDT)
              </label>
              <input
                type="number"
                min="0"
                required
                value={shippingSettings.outsideDhakaFee}
                onChange={(e) =>
                  setShippingSettings({
                    ...shippingSettings,
                    outsideDhakaFee: parseInt(e.target.value, 10) || 0,
                  })
                }
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 font-mono"
              />
              <span className="text-[10px] text-gray-400 mt-1 block">Applied to Chittagong, Sylhet, Rajshahi, etc.</span>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Free Shipping Order Threshold (৳ BDT)
              </label>
              <input
                type="number"
                min="0"
                required
                value={shippingSettings.freeShippingThreshold}
                onChange={(e) =>
                  setShippingSettings({
                    ...shippingSettings,
                    freeShippingThreshold: parseInt(e.target.value, 10) || 0,
                  })
                }
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 font-mono"
              />
              <span className="text-[10px] text-gray-400 mt-1 block">Orders equal or above this subtotal ship free</span>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Estimated Delivery (Inside Dhaka)
              </label>
              <input
                type="text"
                required
                value={shippingSettings.estimatedDaysInside}
                onChange={(e) =>
                  setShippingSettings({
                    ...shippingSettings,
                    estimatedDaysInside: e.target.value,
                  })
                }
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900"
                placeholder="1-2 Days"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Estimated Delivery (Outside Dhaka)
              </label>
              <input
                type="text"
                required
                value={shippingSettings.estimatedDaysOutside}
                onChange={(e) =>
                  setShippingSettings({
                    ...shippingSettings,
                    estimatedDaysOutside: e.target.value,
                  })
                }
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900"
                placeholder="3-5 Days"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-gray-700">Express Delivery Option</label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={shippingSettings.expressDeliveryAvailable}
                    onChange={(e) =>
                      setShippingSettings({
                        ...shippingSettings,
                        expressDeliveryAvailable: e.target.checked,
                      })
                    }
                    className="w-3.5 h-3.5 text-emerald-600 rounded-md focus:ring-emerald-500 cursor-pointer"
                  />
                  <span className="text-[11px] font-semibold text-gray-600">Available</span>
                </label>
              </div>
              <input
                type="number"
                min="0"
                disabled={!shippingSettings.expressDeliveryAvailable}
                value={shippingSettings.expressFee}
                onChange={(e) =>
                  setShippingSettings({
                    ...shippingSettings,
                    expressFee: parseInt(e.target.value, 10) || 0,
                  })
                }
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 font-mono disabled:opacity-50"
              />
              <span className="text-[10px] text-gray-400 mt-1 block">Paperfly / RedX express courier fee</span>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-100 flex justify-end">
            <button
              type="submit"
              disabled={savingSection === 'shipping'}
              className="flex items-center gap-1.5 px-5 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{savingSection === 'shipping' ? 'Saving...' : 'Save Shipping Settings'}</span>
            </button>
          </div>
        </form>
      )}

      {/* TAB 4: EMAIL & SMTP SETTINGS */}
      {activeTab === 'email' && (
        <div className="space-y-6">
          <form onSubmit={handleSaveEmail} className="bg-white rounded-2xl p-6 border border-gray-200/80 shadow-2xs space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div>
                <h2 className="text-sm font-bold text-gray-900">Email &amp; SMTP Relay Configuration</h2>
                <p className="text-xs text-gray-500">
                  Configure outgoing mail relay for order confirmations, customer password resets, and transactional notices.
                </p>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={emailSettings.smtp.enabled}
                  onChange={(e) =>
                    setEmailSettings({
                      ...emailSettings,
                      smtp: { ...emailSettings.smtp, enabled: e.target.checked },
                    })
                  }
                  className="w-4 h-4 text-emerald-600 rounded-md focus:ring-emerald-500 cursor-pointer"
                />
                <span className="text-xs font-bold text-gray-800">Email Service Active</span>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">SMTP Host</label>
                <input
                  type="text"
                  required
                  value={emailSettings.smtp.host}
                  onChange={(e) =>
                    setEmailSettings({
                      ...emailSettings,
                      smtp: { ...emailSettings.smtp, host: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 font-mono"
                  placeholder="smtp.resend.com"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">SMTP Port</label>
                <input
                  type="number"
                  required
                  value={emailSettings.smtp.port}
                  onChange={(e) =>
                    setEmailSettings({
                      ...emailSettings,
                      smtp: { ...emailSettings.smtp, port: parseInt(e.target.value, 10) || 587 },
                    })
                  }
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 font-mono"
                  placeholder="587"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Security / Encryption</label>
                <div className="flex items-center gap-3 pt-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={emailSettings.smtp.secure}
                      onChange={(e) =>
                        setEmailSettings({
                          ...emailSettings,
                          smtp: { ...emailSettings.smtp, secure: e.target.checked },
                        })
                      }
                      className="w-4 h-4 text-emerald-600 rounded-md focus:ring-emerald-500 cursor-pointer"
                    />
                    <span className="text-xs font-semibold text-gray-700">SSL / TLS (Port 465)</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">SMTP Username</label>
                <input
                  type="text"
                  value={emailSettings.smtp.username}
                  onChange={(e) =>
                    setEmailSettings({
                      ...emailSettings,
                      smtp: { ...emailSettings.smtp, username: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 font-mono"
                  placeholder="resend or user@domain.com"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-bold text-gray-700">SMTP Password / API Key</label>
                  <button
                    type="button"
                    onClick={() => setEditEmailPassword(!editEmailPassword)}
                    className="text-[10px] text-emerald-800 hover:underline font-semibold cursor-pointer"
                  >
                    {editEmailPassword ? 'Keep Existing' : 'Change Password'}
                  </button>
                </div>
                {editEmailPassword ? (
                  <input
                    type="password"
                    value={emailSettings.smtp.password}
                    onChange={(e) =>
                      setEmailSettings({
                        ...emailSettings,
                        smtp: { ...emailSettings.smtp, password: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 font-mono"
                    placeholder="Enter SMTP password or API token"
                  />
                ) : (
                  <input
                    type="text"
                    disabled
                    value={emailSettings.smtp.hasPassword ? '••••••••••••••••' : 'Not Configured'}
                    className="w-full px-3 py-2 bg-gray-100 border border-gray-200 rounded-xl text-xs text-gray-600 font-mono"
                  />
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Sender Display Name</label>
                <input
                  type="text"
                  required
                  value={emailSettings.smtp.senderName}
                  onChange={(e) =>
                    setEmailSettings({
                      ...emailSettings,
                      smtp: { ...emailSettings.smtp, senderName: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900"
                  placeholder="ShopMax by Novara"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Sender Email Address</label>
                <input
                  type="email"
                  required
                  value={emailSettings.smtp.senderEmail}
                  onChange={(e) =>
                    setEmailSettings({
                      ...emailSettings,
                      smtp: { ...emailSettings.smtp, senderEmail: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 font-mono"
                  placeholder="orders@shopmax.com"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-gray-100 flex justify-end">
              <button
                type="submit"
                disabled={savingSection === 'email'}
                className="flex items-center gap-1.5 px-5 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{savingSection === 'email' ? 'Saving...' : 'Save Email Settings'}</span>
              </button>
            </div>
          </form>

          {/* Test Email Action Card */}
          <div className="bg-white rounded-2xl p-6 border border-gray-200/80 shadow-2xs space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-800 flex items-center justify-center">
                <Send className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900">Live SMTP Connection Verification</h3>
                <p className="text-xs text-gray-500">
                  Dispatch a real test email to verify SMTP socket negotiation and credential validity.
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="email"
                value={testEmailAddress}
                onChange={(e) => setTestEmailAddress(e.target.value)}
                placeholder="Recipient email address (e.g. admin@novara.com)"
                className="flex-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 font-mono focus:bg-white focus:outline-emerald-600"
              />

              <button
                type="button"
                onClick={handleTestEmail}
                disabled={testEmailLoading}
                className="flex items-center justify-center gap-2 px-5 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-50 shrink-0"
              >
                <Send className={`w-3.5 h-3.5 ${testEmailLoading ? 'animate-pulse' : ''}`} />
                <span>{testEmailLoading ? 'Testing SMTP...' : 'Send Test Email'}</span>
              </button>
            </div>

            {testEmailResult && (
              <div
                className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 ${
                  testEmailResult.success
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-amber-50 border-amber-200 text-amber-800'
                }`}
              >
                {testEmailResult.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                )}
                <div>
                  <div className="font-bold">{testEmailResult.success ? 'Success' : 'Notice'}</div>
                  <div>{testEmailResult.message}</div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 5: INFRASTRUCTURE & CLOUD TELEMETRY */}
      {activeTab === 'telemetry' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-gray-200/80 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div>
                <h2 className="text-sm font-bold text-gray-900">Infrastructure &amp; Cloud Integrations</h2>
                <p className="text-xs text-gray-500">Live operational telemetry across database, storage, and payment services</p>
              </div>
              <button
                onClick={onRefresh}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Probe Health</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* MongoDB Atlas */}
              <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/50 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Database className="w-4 h-4 text-emerald-700" />
                    <span className="text-xs font-bold text-gray-900">MongoDB Atlas</span>
                  </div>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      isDbConnected
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        : 'bg-amber-100 text-amber-800 border border-amber-200'
                    }`}
                  >
                    {isDbConnected ? 'Connected' : 'In-Memory Failover'}
                  </span>
                </div>
                <p className="text-[11px] text-gray-500">
                  {isDbConnected
                    ? 'Primary cloud database persistence active.'
                    : 'Atlas URI absent; failover memory cache active.'}
                </p>
              </div>

              {/* Cloudinary */}
              <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/50 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Cloud className="w-4 h-4 text-blue-700" />
                    <span className="text-xs font-bold text-gray-900">Image Asset CDN</span>
                  </div>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      systemStatus?.cloudinary?.configured
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        : 'bg-slate-100 text-slate-700 border border-slate-200'
                    }`}
                  >
                    {systemStatus?.cloudinary?.configured ? 'Cloudinary Connected' : 'Local Storage'}
                  </span>
                </div>
                <p className="text-[11px] text-gray-500">
                  {systemStatus?.cloudinary?.configured
                    ? 'Cloudinary asset storage active.'
                    : 'Uploaded files stored in /public/uploads/.'}
                </p>
              </div>

              {/* Email Relay */}
              <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/50 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-indigo-700" />
                    <span className="text-xs font-bold text-gray-900">Transactional Email</span>
                  </div>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      emailSettings.smtp.enabled
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        : 'bg-amber-100 text-amber-800 border border-amber-200'
                    }`}
                  >
                    {emailSettings.smtp.enabled ? 'SMTP Enabled' : 'Disabled'}
                  </span>
                </div>
                <p className="text-[11px] text-gray-500 font-mono">
                  {emailSettings.smtp.host}:{emailSettings.smtp.port}
                </p>
              </div>

              {/* bKash Payment */}
              <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/50 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-pink-700" />
                    <span className="text-xs font-bold text-gray-900">bKash Gateway</span>
                  </div>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      paymentSettings.bkash.enabled
                        ? 'bg-pink-100 text-pink-800 border border-pink-200'
                        : 'bg-gray-100 text-gray-700 border border-gray-200'
                    }`}
                  >
                    {paymentSettings.bkash.enabled
                      ? paymentSettings.bkash.isSandbox
                        ? 'Sandbox Active'
                        : 'Live Production'
                      : 'Disabled'}
                  </span>
                </div>
                <p className="text-[11px] text-gray-500">
                  Merchant: {paymentSettings.bkash.merchantNumber}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
