import React, { useState, useEffect } from 'react';
import { useAppSelector, useAppDispatch } from '../../app/hooks';
import { addToast } from '../../features/toast/toastSlice';
import { Modal } from '../../components/modal/Modal';
import {
  Mail,
  MailOpen,
  Search,
  CheckCircle2,
  Trash2,
  MessageSquare,
  Copy,
  Check,
  RefreshCw,
  CornerDownRight,
  X,
} from 'lucide-react';

export interface ContactMessageItem {
  id: string;
  name: string;
  email: string;
  phone?: string;
  subject: string;
  department?: string;
  message: string;
  status: 'new' | 'read' | 'replied' | 'archived';
  isRead: boolean;
  staffNotes?: string;
  repliedAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface MessagesAdminPageProps {
  onRefreshParent?: () => void;
}

export const MessagesAdminPage: React.FC<MessagesAdminPageProps> = ({ onRefreshParent }) => {
  const dispatch = useAppDispatch();
  const token = useAppSelector((state) => state.auth.token);

  const [messages, setMessages] = useState<ContactMessageItem[]>([]);
  const [stats, setStats] = useState<{
    total: number;
    unread: number;
    byStatus: { new: number; read: number; replied: number; archived: number };
  }>({ total: 0, unread: 0, byStatus: { new: 0, read: 0, replied: 0, archived: 0 } });

  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'unread' | 'new' | 'read' | 'replied' | 'archived'>('all');
  const [selectedMessage, setSelectedMessage] = useState<ContactMessageItem | null>(null);
  const [staffNoteInput, setStaffNoteInput] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  useEffect(() => {
    loadMessages();
    loadStats();
  }, [activeTab, searchQuery]);

  const loadMessages = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (activeTab !== 'all') params.append('status', activeTab);
      if (searchQuery.trim()) params.append('search', searchQuery.trim());

      const res = await fetch(`/api/admin/messages?${params.toString()}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setMessages(data.data);
      }
    } catch (err) {
      console.error('Failed to load contact messages', err);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const res = await fetch('/api/admin/messages/stats', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (data.success && data.data) {
        setStats(data.data);
      }
    } catch (err) {
      console.error('Failed to load message stats', err);
    }
  };

  const handleOpenMessage = async (msg: ContactMessageItem) => {
    setSelectedMessage(msg);
    setStaffNoteInput(msg.staffNotes || '');

    if (!msg.isRead) {
      try {
        await fetch(`/api/admin/messages/${msg.id}/status`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ isRead: true, status: msg.status === 'new' ? 'read' : msg.status }),
        });

        setMessages((prev) =>
          prev.map((m) =>
            m.id === msg.id ? { ...m, isRead: true, status: m.status === 'new' ? 'read' : m.status } : m
          )
        );
        loadStats();
        if (onRefreshParent) onRefreshParent();
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: 'new' | 'read' | 'replied' | 'archived') => {
    try {
      const res = await fetch(`/api/admin/messages/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ status: newStatus, isRead: newStatus !== 'new' }),
      });
      const data = await res.json();
      if (data.success) {
        dispatch(addToast({ type: 'success', message: `Message status set to ${newStatus}` }));
        setMessages((prev) =>
          prev.map((m) => (m.id === id ? { ...m, status: newStatus, isRead: newStatus !== 'new' } : m))
        );
        if (selectedMessage && selectedMessage.id === id) {
          setSelectedMessage((prev) => (prev ? { ...prev, status: newStatus, isRead: newStatus !== 'new' } : null));
        }
        loadStats();
        onRefreshParent?.();
      }
    } catch {
      dispatch(addToast({ type: 'error', message: 'Failed to update message status' }));
    }
  };

  const handleSaveStaffNotes = async () => {
    if (!selectedMessage) return;
    setSavingNote(true);
    try {
      const res = await fetch(`/api/admin/messages/${selectedMessage.id}/reply-note`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ staffNotes: staffNoteInput.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        dispatch(addToast({ type: 'success', message: 'Staff note recorded and status marked as Replied' }));
        setSelectedMessage((prev) =>
          prev
            ? {
                ...prev,
                staffNotes: staffNoteInput.trim(),
                status: 'replied',
                isRead: true,
                repliedAt: new Date().toISOString(),
              }
            : null
        );
        setMessages((prev) =>
          prev.map((m) =>
            m.id === selectedMessage.id
              ? {
                  ...m,
                  staffNotes: staffNoteInput.trim(),
                  status: 'replied',
                  isRead: true,
                  repliedAt: new Date().toISOString(),
                }
              : m
          )
        );
        loadStats();
        onRefreshParent?.();
      }
    } catch {
      dispatch(addToast({ type: 'error', message: 'Failed to record staff note' }));
    } finally {
      setSavingNote(false);
    }
  };

  const handleConfirmDeleteMessage = async () => {
    if (!deleteTargetId) return;
    const id = deleteTargetId;
    try {
      const res = await fetch(`/api/admin/messages/${id}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (data.success) {
        dispatch(addToast({ type: 'info', message: 'Message record removed' }));
        setMessages((prev) => prev.filter((m) => m.id !== id));
        if (selectedMessage?.id === id) setSelectedMessage(null);
        setDeleteTargetId(null);
        loadStats();
        onRefreshParent?.();
      }
    } catch {
      dispatch(addToast({ type: 'error', message: 'Failed to delete message' }));
    }
  };

  const handleCopyEmail = (email: string) => {
    navigator.clipboard.writeText(email);
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2000);
    dispatch(addToast({ type: 'success', message: 'Email copied to clipboard' }));
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'new':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            New
          </span>
        );
      case 'read':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            Read
          </span>
        );
      case 'replied':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-700" />
            Replied
          </span>
        );
      case 'archived':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-600 border border-gray-200">
            Archived
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header & KPI Cards */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900 flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 text-[#00875a] flex items-center justify-center">
              <Mail className="w-5 h-5" />
            </span>
            <span>Customer Inquiries &amp; Messages</span>
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Review incoming inquiries from the storefront contact form, respond to customer questions, and record staff resolution notes.
          </p>
        </div>

        <button
          onClick={() => {
            loadMessages();
            loadStats();
          }}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-gray-50 text-gray-700 text-xs font-semibold border border-gray-200 shadow-2xs transition cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5 text-gray-500" />
          <span>Refresh Inbox</span>
        </button>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 tabular-nums">
        <div className="bg-white border border-gray-200/80 rounded-2xl p-4 shadow-2xs space-y-1">
          <div className="text-xs text-gray-500 font-medium">Total Inquiries</div>
          <div className="text-2xl font-extrabold text-gray-900">{stats.total}</div>
          <div className="text-[11px] text-gray-400">All customer submissions</div>
        </div>

        <div className="bg-white border border-amber-200/80 rounded-2xl p-4 shadow-2xs space-y-1">
          <div className="text-xs text-amber-700 font-semibold flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            Unread / Action Required
          </div>
          <div className="text-2xl font-extrabold text-amber-700">{stats.unread}</div>
          <div className="text-[11px] text-gray-400">Pending staff review</div>
        </div>

        <div className="bg-white border border-emerald-200/80 rounded-2xl p-4 shadow-2xs space-y-1">
          <div className="text-xs text-emerald-700 font-semibold">Replied &amp; Resolved</div>
          <div className="text-2xl font-extrabold text-emerald-700">{stats.byStatus.replied}</div>
          <div className="text-[11px] text-gray-400">Documented by staff</div>
        </div>

        <div className="bg-white border border-gray-200/80 rounded-2xl p-4 shadow-2xs space-y-1">
          <div className="text-xs text-gray-500 font-medium">Archived</div>
          <div className="text-2xl font-extrabold text-gray-700">{stats.byStatus.archived}</div>
          <div className="text-[11px] text-gray-400">Historical records</div>
        </div>
      </div>

      {/* 2. Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-2.5 rounded-2xl border border-gray-200/80 shadow-2xs">
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-none pb-1 sm:pb-0">
          {(
            [
              { key: 'all', label: 'All', count: stats.total },
              { key: 'unread', label: 'Unread', count: stats.unread },
              { key: 'new', label: 'New', count: stats.byStatus.new },
              { key: 'read', label: 'Read', count: stats.byStatus.read },
              { key: 'replied', label: 'Replied', count: stats.byStatus.replied },
              { key: 'archived', label: 'Archived', count: stats.byStatus.archived },
            ] as const
          ).map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === t.key
                  ? 'bg-[#00875a] text-white shadow-2xs'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <span>{t.label}</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  activeTab === t.key ? 'bg-emerald-900/40 text-white' : 'bg-gray-100 text-gray-600'
                }`}
              >
                {t.count}
              </span>
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search name, email, topic..."
            className="w-full pl-8 pr-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:bg-white focus:outline-none focus:border-emerald-600"
          />
        </div>
      </div>

      {/* 3. Messages List & Detail Split View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className={`${selectedMessage ? 'lg:col-span-6' : 'lg:col-span-12'} space-y-3`}>
          {loading ? (
            <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center space-y-2 shadow-2xs">
              <div className="w-6 h-6 border-2 border-[#00875a] border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-gray-500">Loading customer inquiries...</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center space-y-2 shadow-2xs">
              <MailOpen className="w-10 h-10 text-gray-300 mx-auto" />
              <h3 className="text-sm font-bold text-gray-900">No messages found</h3>
              <p className="text-xs text-gray-500">
                {searchQuery ? 'Try adjusting your search criteria.' : 'No customer inquiries in this folder.'}
              </p>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                onClick={() => handleOpenMessage(msg)}
                className={`p-4 rounded-2xl border transition cursor-pointer ${
                  selectedMessage?.id === msg.id
                    ? 'bg-emerald-50/40 border-[#00875a] shadow-sm ring-1 ring-[#00875a]/20'
                    : msg.isRead
                    ? 'bg-white border-gray-200/80 hover:border-gray-300 shadow-2xs'
                    : 'bg-amber-50/30 border-amber-300 hover:border-amber-400 shadow-xs'
                }`}
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2 min-w-0 flex-wrap">
                    {!msg.isRead && (
                      <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" title="Unread" />
                    )}
                    <span className="text-xs font-bold text-gray-900">{msg.name}</span>
                    <span className="text-[11px] text-gray-500 truncate">({msg.email})</span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {getStatusBadge(msg.status)}
                    <span className="text-[10px] text-gray-400">
                      {new Date(msg.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                    {msg.department && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 border border-gray-200">
                        {msg.department}
                      </span>
                    )}
                    <span className="truncate">{msg.subject}</span>
                  </div>
                  <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">
                    {msg.message}
                  </p>
                </div>

                {msg.staffNotes && (
                  <div className="mt-2.5 pt-2 border-t border-gray-100 flex items-center gap-1.5 text-[11px] text-gray-600">
                    <CornerDownRight className="w-3 h-3 text-[#00875a] shrink-0" />
                    <span className="text-[#00875a] font-semibold">Staff Note:</span>
                    <span className="truncate text-gray-700">{msg.staffNotes}</span>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Selected Message Detail Card */}
        {selectedMessage && (
          <div className="lg:col-span-6 bg-white border border-gray-200 rounded-3xl p-6 space-y-5 sticky top-6 shadow-md">
            <div className="flex items-start justify-between gap-4 border-b border-gray-100 pb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  {getStatusBadge(selectedMessage.status)}
                  <span className="text-[11px] font-mono text-gray-400">
                    REF: {selectedMessage.id}
                  </span>
                </div>
                <h2 className="text-base font-extrabold text-gray-900">{selectedMessage.subject}</h2>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => setDeleteTargetId(selectedMessage.id)}
                  className="p-2 rounded-lg text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                  title="Delete Inquiry Record"
                  aria-label="Delete inquiry"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setSelectedMessage(null)}
                  className="p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition cursor-pointer"
                  title="Close Inspector"
                  aria-label="Close inspector"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Customer Details Box */}
            <div className="bg-gray-50 rounded-2xl p-4 border border-gray-200/80 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Customer Name:</span>
                <span className="font-bold text-gray-900">{selectedMessage.name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Email Address:</span>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-[#00875a]">{selectedMessage.email}</span>
                  <button
                    onClick={() => handleCopyEmail(selectedMessage.email)}
                    className="p-1 rounded text-gray-400 hover:text-gray-800 transition cursor-pointer"
                    title="Copy Email"
                  >
                    {copiedEmail ? <Check className="w-3.5 h-3.5 text-[#00875a]" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
              {selectedMessage.phone && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Phone:</span>
                  <span className="font-semibold text-gray-900">{selectedMessage.phone}</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Department:</span>
                <span className="text-gray-800 font-medium">{selectedMessage.department || 'General Support'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Submitted:</span>
                <span className="text-gray-700">
                  {new Date(selectedMessage.createdAt).toLocaleString()}
                </span>
              </div>
            </div>

            {/* Message Body */}
            <div className="space-y-1.5">
              <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                Inquiry Message
              </div>
              <div className="bg-gray-50/70 rounded-2xl p-4 border border-gray-200/80 text-xs text-gray-800 leading-relaxed whitespace-pre-wrap font-sans">
                {selectedMessage.message}
              </div>
            </div>

            {/* Quick Status Setter */}
            <div className="flex items-center justify-between gap-3 pt-2 border-t border-gray-100 flex-wrap">
              <span className="text-xs font-semibold text-gray-600">Change Status:</span>
              <div className="flex items-center gap-1.5">
                {(['new', 'read', 'replied', 'archived'] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => handleUpdateStatus(selectedMessage.id, st)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold capitalize transition cursor-pointer ${
                      selectedMessage.status === st
                        ? 'bg-[#00875a] text-white shadow-2xs'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            {/* Staff Internal Note */}
            <div className="space-y-2.5 pt-2 border-t border-gray-100">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-[#00875a]" />
                  <span>Internal Staff Resolution Notes</span>
                </label>
                {selectedMessage.repliedAt && (
                  <span className="text-[10px] text-gray-400">
                    Logged: {new Date(selectedMessage.repliedAt).toLocaleDateString()}
                  </span>
                )}
              </div>
              <textarea
                rows={3}
                value={staffNoteInput}
                onChange={(e) => setStaffNoteInput(e.target.value)}
                placeholder="Log internal action taken (e.g. 'Confirmed courier dispatch with customer via email')."
                className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:bg-white focus:outline-none focus:border-emerald-600 transition resize-none"
              />
              <button
                onClick={handleSaveStaffNotes}
                disabled={savingNote}
                className="w-full py-2.5 px-3 rounded-xl bg-[#00875a] hover:bg-[#00724c] text-white font-bold text-xs shadow-xs transition cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {savingNote ? (
                  <span>Saving Note...</span>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Save Resolution &amp; Mark as Replied</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal (Zero window.confirm) */}
      <Modal
        isOpen={Boolean(deleteTargetId)}
        onClose={() => setDeleteTargetId(null)}
        title="Delete Customer Inquiry"
        description="Are you sure you want to permanently remove this inquiry record? This action cannot be undone."
        maxWidth="sm"
      >
        <div className="flex items-center justify-end gap-3 pt-4">
          <button
            type="button"
            onClick={() => setDeleteTargetId(null)}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-700 hover:bg-gray-100 transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirmDeleteMessage}
            className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition cursor-pointer"
          >
            Delete Inquiry
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default MessagesAdminPage;
