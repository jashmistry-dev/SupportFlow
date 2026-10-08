import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.tsx';
import { api } from '../lib/api.ts';
import { StatusBadge } from '../components/StatusBadge.tsx';
import { PriorityBadge } from '../components/PriorityBadge.tsx';
import {
  Inbox,
  Clock,
  CheckCircle2,
  AlertCircle,
  PlusCircle,
  ArrowRight,
  LifeBuoy,
  FileQuestion,
} from 'lucide-react';

interface DashboardSummary {
  total: number;
  open: number;
  inProgress: number;
  waitingForRequester: number;
  resolved: number;
  closed: number;
  urgentOrHigh: number;
}

interface TicketSummaryItem {
  id: number;
  ticketNumber: string;
  subject: string;
  priority: string;
  status: string;
  category: string;
  updatedAt: string;
}

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [recentTickets, setRecentTickets] = useState<TicketSummaryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await api.get('/dashboard/summary');
      setSummary(res.data.summary);
      setRecentTickets(res.data.recentTickets || []);
    } catch (err: any) {
      console.error('Failed to load dashboard:', err);
      setError('Unable to load dashboard data.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const formatDate = (dateString: string) => {
    const d = new Date(dateString);
    return d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              {getGreeting()}, {user?.name}
            </h1>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
              {user?.role === 'ADMIN'
                ? 'Administrator'
                : user?.role === 'SUPPORT_AGENT'
                ? 'Support Engineer'
                : 'Employee / Requester'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            SupportFlow Internal Technical Support Operations
          </p>
        </div>

        <div className="flex items-center gap-2">
          {user?.role === 'REQUESTER' && (
            <Link
              to="/tickets/new"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors shadow-xs"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              Raise Ticket
            </Link>
          )}

          <Link
            to="/tickets"
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-md transition-colors"
          >
            <span>{user?.role === 'REQUESTER' ? 'My Tickets' : 'View Queue'}</span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
          </Link>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md text-xs text-red-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
          <span>{error}</span>
        </div>
      )}

      {/* Structured Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Open */}
        <Link
          to="/tickets?status=OPEN"
          className="group bg-white p-4 rounded-lg border border-slate-200 hover:border-blue-400 hover:shadow-xs transition-all relative overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Open Tickets</span>
            <span className="w-7 h-7 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center">
              <Inbox className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">
            {isLoading ? '—' : summary?.open ?? 0}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
            <span>Awaiting triage</span>
          </div>
        </Link>

        {/* In Progress */}
        <Link
          to="/tickets?status=IN_PROGRESS"
          className="group bg-white p-4 rounded-lg border border-slate-200 hover:border-amber-400 hover:shadow-xs transition-all relative overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">In Progress</span>
            <span className="w-7 h-7 rounded-md bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">
            {isLoading ? '—' : summary?.inProgress ?? 0}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
            <span>Actively investigated</span>
          </div>
        </Link>

        {/* Waiting on Requester */}
        <Link
          to="/tickets?status=WAITING_FOR_REQUESTER"
          className="group bg-white p-4 rounded-lg border border-slate-200 hover:border-purple-400 hover:shadow-xs transition-all relative overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Waiting on User</span>
            <span className="w-7 h-7 rounded-md bg-purple-50 text-purple-600 flex items-center justify-center">
              <AlertCircle className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">
            {isLoading ? '—' : summary?.waitingForRequester ?? 0}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
            <span>Pending feedback</span>
          </div>
        </Link>

        {/* Resolved */}
        <Link
          to="/tickets?status=RESOLVED"
          className="group bg-white p-4 rounded-lg border border-slate-200 hover:border-emerald-400 hover:shadow-xs transition-all relative overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Resolved</span>
            <span className="w-7 h-7 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">
            {isLoading ? '—' : summary?.resolved ?? 0}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
            <span>Ready for closure</span>
          </div>
        </Link>
      </div>

      {/* Recent Tickets Section */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Recent Tickets
            </h2>
            <span className="text-xs font-medium text-slate-500">
              ({recentTickets.length})
            </span>
          </div>
          <Link
            to="/tickets"
            className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
          >
            <span>View all tickets</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-xs text-slate-400">
            Loading tickets...
          </div>
        ) : recentTickets.length === 0 ? (
          <div className="py-14 px-4 text-center">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400 mb-3">
              <FileQuestion className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-semibold text-slate-800">No tickets found</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              {user?.role === 'REQUESTER'
                ? 'Create your first support ticket to get started.'
                : 'No technical support tickets have been submitted yet.'}
            </p>
            {user?.role === 'REQUESTER' && (
              <div className="mt-4">
                <Link
                  to="/tickets/new"
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors shadow-xs"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  Create your first support ticket
                </Link>
              </div>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold">
                <tr>
                  <th scope="col" className="px-4 py-3">Ticket</th>
                  <th scope="col" className="px-4 py-3">Subject</th>
                  <th scope="col" className="px-4 py-3">Category</th>
                  <th scope="col" className="px-4 py-3">Priority</th>
                  <th scope="col" className="px-4 py-3">Status</th>
                  <th scope="col" className="px-4 py-3 text-right">Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {recentTickets.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap font-mono font-semibold text-blue-600">
                      <Link to={`/tickets/${t.id}`} className="hover:underline">
                        {t.ticketNumber}
                      </Link>
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900 max-w-md">
                      <Link
                        to={`/tickets/${t.id}`}
                        className="hover:text-blue-600 line-clamp-1"
                      >
                        {t.subject}
                      </Link>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-slate-500">
                      {t.category}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <PriorityBadge priority={t.priority} size="sm" />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <StatusBadge status={t.status} size="sm" />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right text-slate-400 font-mono text-[11px]">
                      {formatDate(t.updatedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
