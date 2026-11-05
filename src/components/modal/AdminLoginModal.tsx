import React, { useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { closeAdminLoginModal, setCredentials } from '../../features/auth/authSlice';
import { addToast } from '../../features/toast/toastSlice';
import { Modal } from './Modal';
import { Shield, Lock, Mail, Eye, EyeOff, Loader2 } from 'lucide-react';

interface AdminLoginModalProps {
  onNavigate: (view: string, params?: any) => void;
}

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({ onNavigate }) => {
  const dispatch = useAppDispatch();
  const isOpen = useAppSelector((state) => state.auth.isAdminLoginModalOpen);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleClose = () => {
    setErrorMessage(null);
    dispatch(closeAdminLoginModal());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setErrorMessage('Please enter both administrator email and password.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/admin-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: trimmedEmail,
          password,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMessage(data.error || 'Authentication failed. Please verify your credentials.');
        return;
      }

      dispatch(
        setCredentials({
          user: data.data.user,
          token: data.data.token,
        })
      );
      dispatch(closeAdminLoginModal());
      dispatch(
        addToast({
          type: 'success',
          title: 'Admin Authorized',
          message: `Welcome back, ${data.data.user.name}.`,
        })
      );
      onNavigate('admin');
      setPassword('');
    } catch {
      setErrorMessage('Network error connecting to administrative verification gateway.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Restricted Staff Access"
      description="Administrative Verification Gateway"
      maxWidth="md"
    >
      <div className="py-2">
        <div className="mb-5 flex items-center gap-3 p-3 rounded-xl bg-slate-900 text-white">
          <div className="w-9 h-9 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-semibold tracking-wide text-slate-100">
              Operations &amp; Security Portal
            </div>
            <div className="text-[11px] text-slate-400">
              Authorized personnel only. Access logs are audited.
            </div>
          </div>
        </div>

        {errorMessage && (
          <div
            role="alert"
            className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2"
          >
            <Lock className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Administrator Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@shopmax.com"
                required
                autoComplete="email"
                className="w-full pl-9 pr-3 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-emerald-600 focus:outline-none transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Security Key / Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                required
                autoComplete="current-password"
                className="w-full pl-9 pr-10 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-emerald-600 focus:outline-none transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-slate-900 hover:bg-black text-white text-xs font-semibold rounded-xl transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <>
                  <Shield className="w-4 h-4 text-emerald-400" />
                  <span>Sign In as Administrator</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
};
