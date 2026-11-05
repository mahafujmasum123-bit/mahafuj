import React, { useState, useEffect } from 'react';
import { useAppSelector } from '../../app/hooks';
import {
  Clock,
  Shield,
  Search,
  Filter,
  RefreshCw,
  Eye,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  User,
  Calendar,
  Lock,
  ChevronLeft,
  ChevronRight,
  Sliders,
  Settings,
  Package,
  Layers,
  ArrowUpDown,
} from 'lucide-react';
import { Modal } from '../../components/modal/Modal';

interface AuditLogsAdminPageProps {
  initialTab?: 'activity' | 'security';
}

export const AuditLogsAdminPage: React.FC<AuditLogsAdminPageProps> = ({
  initialTab = 'activity',
}) => {
  const { token } = useAppSelector((state) => state.auth);

  const [activeTab, setActiveTab] = useState<'activity' | 'security'>(initialTab);
  const [loading, setLoading] = useState(false);
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [securityLogs, setSecurityLogs] = useState<any[]>([]);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [eventTypeFilter, setEventTypeFilter] = useState('all');
  const [outcomeFilter, setOutcomeFilter] = useState('all');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  // Detail Modal
  const [selectedLog, setSelectedLog] = useState<any | null>(null);

  useEffect(() => {
    fetchLogs();
  }, [token, activeTab]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

      if (activeTab === 'activity') {
        const res = await fetch('/api/admin/logs/activity', { headers });
        const data = await res.json();
        if (data.success && Array.isArray(data.data)) {
          setActivityLogs(data.data);
        }
      } else {
        const res = await fetch('/api/admin/logs/security', { headers });
        const data = await res.json();
        if (data.success && Array.isArray(data.data)) {
          setSecurityLogs(data.data);
        }
      }
    } catch (err) {
      console.error('Failed to fetch logs', err);
    } finally {
      setLoading(false);
    }
  };

  // Filtered Activity Logs
  const filteredActivityLogs = activityLogs.filter((log) => {
    if (categoryFilter !== 'all' && log.category !== categoryFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchAction = log.action?.toLowerCase().includes(q);
      const matchActor = log.actorName?.toLowerCase().includes(q) || log.actorEmail?.toLowerCase().includes(q);
      const matchDetails = log.details?.toLowerCase().includes(q);
      const matchRes = log.resourceId?.toLowerCase().includes(q);
      if (!matchAction && !matchActor && !matchDetails && !matchRes) return false;
    }
    return true;
  });

  // Filtered Security Logs
  const filteredSecurityLogs = securityLogs.filter((log) => {
    if (eventTypeFilter !== 'all' && log.eventType !== eventTypeFilter) return false;
    if (outcomeFilter !== 'all' && log.outcome !== outcomeFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchEvent = log.eventType?.toLowerCase().includes(q);
      const matchEmail = log.actorEmail?.toLowerCase().includes(q);
      const matchReason = log.reason?.toLowerCase().includes(q);
      const matchIp = log.ipAddress?.toLowerCase().includes(q);
      if (!matchEvent && !matchEmail && !matchReason && !matchIp) return false;
    }
    return true;
  });

  const activeList = activeTab === 'activity' ? filteredActivityLogs : filteredSecurityLogs;
  const totalPages = Math.ceil(activeList.length / itemsPerPage) || 1;
  const paginatedList = activeList.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case 'banner':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'hero_slider':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'settings':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'catalog':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'order':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getOutcomeBadge = (outcome: string) => {
    switch (outcome) {
      case 'success':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200 flex items-center gap-1';
      case 'failure':
        return 'bg-red-50 text-red-700 border-red-200 flex items-center gap-1';
      case 'blocked':
        return 'bg-amber-50 text-amber-700 border-amber-200 flex items-center gap-1';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-gray-200/80 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-800">
            {activeTab === 'activity' ? <Clock className="w-5 h-5" /> : <Shield className="w-5 h-5" />}
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">
              {activeTab === 'activity' ? 'System Activity Audit Logs' : 'Admin Security & Access Logs'}
            </h1>
            <p className="text-xs text-gray-500">
              Append-only immutable record of all administrative operations, configuration changes, and authentication events.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Tabs */}
          <div className="flex items-center bg-gray-100 p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => {
                setActiveTab('activity');
                setCurrentPage(1);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition cursor-pointer ${
                activeTab === 'activity' ? 'bg-white text-emerald-800 shadow-2xs font-bold' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Activity Logs</span>
            </button>
            <button
              onClick={() => {
                setActiveTab('security');
                setCurrentPage(1);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition cursor-pointer ${
                activeTab === 'security' ? 'bg-white text-emerald-800 shadow-2xs font-bold' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Security Logs</span>
            </button>
          </div>

          <button
            onClick={fetchLogs}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-xl border border-gray-200 text-xs font-semibold transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-2xs flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={
              activeTab === 'activity'
                ? 'Search actions, actor email, details...'
                : 'Search event, actor IP, reason...'
            }
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:bg-white focus:outline-emerald-600"
          />
        </div>

        {activeTab === 'activity' ? (
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 font-semibold shrink-0">Category:</span>
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 font-semibold focus:outline-emerald-600"
            >
              <option value="all">All Categories</option>
              <option value="banner">Banner Builder</option>
              <option value="hero_slider">Hero Slider</option>
              <option value="settings">System Settings</option>
              <option value="catalog">Catalog</option>
              <option value="order">Orders</option>
              <option value="general">General</option>
            </select>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-gray-500 font-semibold">Event:</span>
              <select
                value={eventTypeFilter}
                onChange={(e) => {
                  setEventTypeFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 font-semibold focus:outline-emerald-600"
              >
                <option value="all">All Events</option>
                <option value="login_success">Login Success</option>
                <option value="login_failed">Login Failed</option>
                <option value="logout">Logout</option>
                <option value="unauthorized_attempt">Unauthorized Access</option>
                <option value="security_alert">Security Alert</option>
                <option value="config_change">Configuration Change</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-xs text-gray-500 font-semibold">Outcome:</span>
              <select
                value={outcomeFilter}
                onChange={(e) => {
                  setOutcomeFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 font-semibold focus:outline-emerald-600"
              >
                <option value="all">All Outcomes</option>
                <option value="success">Success</option>
                <option value="failure">Failure</option>
                <option value="blocked">Blocked</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs overflow-hidden">
        {activeTab === 'activity' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 border-b border-gray-100 text-gray-500 font-bold uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3">Timestamp</th>
                  <th className="px-5 py-3">Category</th>
                  <th className="px-5 py-3">Action</th>
                  <th className="px-5 py-3">Actor</th>
                  <th className="px-5 py-3">Details</th>
                  <th className="px-5 py-3 text-right">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium">
                {paginatedList.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-8 text-center text-gray-400">
                      No activity logs match the selected filter.
                    </td>
                  </tr>
                ) : (
                  paginatedList.map((log: any) => (
                    <tr key={log.id || log._id} className="hover:bg-gray-50/70 transition">
                      <td className="px-5 py-3 whitespace-nowrap text-gray-500 font-mono text-[11px]">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td className="px-5 py-3 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getCategoryBadge(
                            log.category
                          )}`}
                        >
                          {log.category.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-5 py-3 whitespace-nowrap font-bold text-gray-900 font-mono">
                        {log.action}
                      </td>
                      <td className="px-5 py-3 whitespace-nowrap text-gray-700">
                        <div className="font-semibold text-gray-900">{log.actorName}</div>
                        <div className="text-[10px] text-gray-400">{log.actorEmail || log.actorRole}</div>
                      </td>
                      <td className="px-5 py-3 text-gray-600 max-w-md truncate">
                        {log.details}
                      </td>
                      <td className="px-5 py-3 text-right whitespace-nowrap">
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-emerald-700 transition cursor-pointer"
                          title="View Full Metadata"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 border-b border-gray-100 text-gray-500 font-bold uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3">Timestamp</th>
                  <th className="px-5 py-3">Event Type</th>
                  <th className="px-5 py-3">Outcome</th>
                  <th className="px-5 py-3">Actor / IP</th>
                  <th className="px-5 py-3">Reason / Context</th>
                  <th className="px-5 py-3 text-right">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium">
                {paginatedList.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-8 text-center text-gray-400">
                      No security audit logs match the selected filter.
                    </td>
                  </tr>
                ) : (
                  paginatedList.map((log: any) => (
                    <tr key={log.id || log._id} className="hover:bg-gray-50/70 transition">
                      <td className="px-5 py-3 whitespace-nowrap text-gray-500 font-mono text-[11px]">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td className="px-5 py-3 whitespace-nowrap font-bold text-gray-900 font-mono">
                        {log.eventType}
                      </td>
                      <td className="px-5 py-3 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getOutcomeBadge(
                            log.outcome
                          )}`}
                        >
                          {log.outcome === 'success' && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                          {log.outcome === 'failure' && <XCircle className="w-3 h-3 text-red-600" />}
                          {log.outcome === 'blocked' && <AlertTriangle className="w-3 h-3 text-amber-600" />}
                          <span>{log.outcome.toUpperCase()}</span>
                        </span>
                      </td>
                      <td className="px-5 py-3 whitespace-nowrap text-gray-700">
                        <div className="font-semibold text-gray-900">{log.actorEmail || 'Anonymous'}</div>
                        <div className="text-[10px] text-gray-400 font-mono">{log.ipAddress || 'Internal'}</div>
                      </td>
                      <td className="px-5 py-3 text-gray-600 max-w-md truncate">
                        {log.reason || 'Normal operation'}
                      </td>
                      <td className="px-5 py-3 text-right whitespace-nowrap">
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-emerald-700 transition cursor-pointer"
                          title="View Full Metadata"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination controls */}
        {totalPages > 1 && (
          <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
            <span>
              Showing {(currentPage - 1) * itemsPerPage + 1} to{' '}
              {Math.min(currentPage * itemsPerPage, activeList.length)} of {activeList.length} logs
            </span>
            <div className="flex items-center gap-1">
              <button
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50 transition cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-3 py-1 font-semibold text-gray-800">
                Page {currentPage} of {totalPages}
              </span>
              <button
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="p-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50 transition cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Log Inspection Modal */}
      {selectedLog && (
        <Modal
          isOpen={Boolean(selectedLog)}
          onClose={() => setSelectedLog(null)}
          title="Audit Log Inspector"
          description="Structured telemetry record captured during administrative operations."
          maxWidth="lg"
        >
          <div className="space-y-4">
            <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-gray-500 font-semibold">Event / Action:</span>
                <span className="font-bold text-gray-900 font-mono">
                  {selectedLog.action || selectedLog.eventType}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 font-semibold">Timestamp:</span>
                <span className="font-mono text-gray-700">
                  {new Date(selectedLog.timestamp).toISOString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 font-semibold">Actor:</span>
                <span className="font-medium text-gray-800">
                  {selectedLog.actorName || selectedLog.actorEmail || 'System'}
                </span>
              </div>
              {selectedLog.resourceId && (
                <div className="flex justify-between">
                  <span className="text-gray-500 font-semibold">Resource ID:</span>
                  <span className="font-mono text-gray-800">{selectedLog.resourceId}</span>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Details &amp; Explanation
              </label>
              <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-800 font-medium">
                {selectedLog.details || selectedLog.reason || 'No extended reason given'}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Safe Payload Metadata (JSON)
              </label>
              <pre className="p-3 bg-slate-900 text-emerald-400 border border-slate-800 rounded-xl text-[11px] font-mono overflow-x-auto max-h-56">
                {JSON.stringify(selectedLog.metadata || {}, null, 2)}
              </pre>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
