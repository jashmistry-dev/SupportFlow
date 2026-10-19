import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.tsx';
import { api } from '../lib/api.ts';
import { StatusBadge } from '../components/StatusBadge.tsx';
import { PriorityBadge } from '../components/PriorityBadge.tsx';
import { RoleBadge } from '../components/RoleBadge.tsx';
import { MetricCardSkeleton, TableSkeleton } from '../components/Skeleton.tsx';
import { ErrorState } from '../components/ErrorState.tsx';
import { EmptyState } from '../components/EmptyState.tsx';
import {
  Inbox,
  Clock,
  CheckCircle2,
  AlertCircle,
  PlusCircle,
  ArrowRight,
  Briefcase,
  Users,
  RefreshCw,
  FolderOpen,
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
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = useCallback(async (isSilent = false) => {
    try {
      if (isSilent) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);
      const res = await api.get('/dashboard/summary');
      setSummary(res.data.summary);
      setRecentTickets(res.data.recentTickets || []);
    } catch (err: any) {
      console.error('Failed to load dashboard:', err);
      setError('Unable to load dashboard data. Please check connection and try again.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData(false);
  }, [fetchDashboardData]);

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
    <div className="space-y-6 animate-fade-in">
      {/* Top Header & Page Context */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[#E1E6EE] dark:border-[#344153]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-[#202B3C] dark:text-[#F1F5F9]">
              Support Operations Overview
            </h1>
            {user && <RoleBadge role={user.role} size="sm" />}
          </div>
          <p className="text-xs text-[#667085] dark:text-[#A5B1C2] mt-1">
            Current system workload, triage status, and active technical tickets.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Silent Refresh Button */}
          <button
            type="button"
            onClick={() => fetchDashboardData(true)}
            disabled={isLoading || isRefreshing}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-[#667085] dark:text-[#A5B1C2] bg-white dark:bg-[#192330] border border-[#E1E6EE] dark:border-[#344153] hover:text-[#202B3C] dark:hover:text-[#F1F5F9] hover:bg-[#F0F3F7] dark:hover:bg-[#202C3B] rounded-md transition-colors disabled:opacity-50"
            title="Refresh dashboard metrics"
            aria-label="Refresh dashboard metrics"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          {user?.role === 'REQUESTER' && (
            <Link
              to="/tickets/new"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold btn-role-primary rounded-md transition-all shadow-xs"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Raise New Ticket</span>
            </Link>
          )}

          {user?.role === 'SUPPORT_AGENT' && (
            <Link
              to="/my-work"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold btn-role-primary rounded-md transition-all shadow-xs"
            >
              <Briefcase className="w-3.5 h-3.5" />
              <span>Go to My Work</span>
            </Link>
          )}

          {user?.role === 'ADMIN' && (
            <>
              <Link
                to="/admin/users"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold btn-role-primary rounded-md transition-all shadow-xs"
              >
                <Users className="w-3.5 h-3.5" />
                <span>Invite / Users</span>
              </Link>

              <Link
                to="/my-work"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#202B3C] dark:text-[#F1F5F9] bg-white dark:bg-[#192330] border border-[#E1E6EE] dark:border-[#344153] hover:bg-[#F0F3F7] dark:hover:bg-[#202C3B] rounded-md transition-colors"
              >
                <Briefcase className="w-3.5 h-3.5 text-[#667085] dark:text-[#A5B1C2]" />
                <span>My Work</span>
              </Link>
            </>
          )}

          <Link
            to="/tickets"
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-[#202B3C] dark:text-[#F1F5F9] bg-white dark:bg-[#192330] border border-[#E1E6EE] dark:border-[#344153] hover:bg-[#F0F3F7] dark:hover:bg-[#202C3B] rounded-md transition-colors"
          >
            <span>{user?.role === 'REQUESTER' ? 'My Tickets' : 'Ticket Queue'}</span>
            <ArrowRight className="w-3.5 h-3.5 text-[#667085] dark:text-[#A5B1C2]" />
          </Link>
        </div>
      </div>

      {/* Error state with retry action */}
      {error && (
        <ErrorState
          title="Dashboard unavailable"
          message={error}
          onRetry={() => fetchDashboardData(false)}
        />
      )}

      {/* Metric Panels: Skeletons while loading; Structured cards once loaded */}
      {isLoading ? (
        <MetricCardSkeleton count={4} />
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* Open */}
          <Link
            to="/tickets?status=OPEN"
            className="group bg-white dark:bg-[#192330] p-4 rounded-lg border border-[#E1E6EE] dark:border-[#344153] hover:border-role-primary transition-all duration-150 shadow-xs hover:shadow-sm"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[#667085] dark:text-[#A5B1C2]">Open</span>
              <Inbox className="w-4 h-4 text-[#8B95A5] dark:text-[#6B7B92] group-hover:text-role-primary transition-colors" />
            </div>
            <div className="text-2xl font-bold text-[#202B3C] dark:text-[#F1F5F9] mt-2 font-mono tabular-nums">
              {summary?.open ?? 0}
            </div>
            <div className="text-[11px] text-[#8B95A5] dark:text-[#6B7B92] mt-1">
              Awaiting triage
            </div>
          </Link>

          {/* In Progress */}
          <Link
            to="/tickets?status=IN_PROGRESS"
            className="group bg-white dark:bg-[#192330] p-4 rounded-lg border border-[#E1E6EE] dark:border-[#344153] hover:border-role-primary transition-all duration-150 shadow-xs hover:shadow-sm"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[#667085] dark:text-[#A5B1C2]">In Progress</span>
              <Clock className="w-4 h-4 text-[#8B95A5] dark:text-[#6B7B92] group-hover:text-role-primary transition-colors" />
            </div>
            <div className="text-2xl font-bold text-[#202B3C] dark:text-[#F1F5F9] mt-2 font-mono tabular-nums">
              {summary?.inProgress ?? 0}
            </div>
            <div className="text-[11px] text-[#8B95A5] dark:text-[#6B7B92] mt-1">
              Under active investigation
            </div>
          </Link>

          {/* Waiting on User */}
          <Link
            to="/tickets?status=WAITING_FOR_REQUESTER"
            className="group bg-white dark:bg-[#192330] p-4 rounded-lg border border-[#E1E6EE] dark:border-[#344153] hover:border-role-primary transition-all duration-150 shadow-xs hover:shadow-sm"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[#667085] dark:text-[#A5B1C2]">Waiting on User</span>
              <AlertCircle className="w-4 h-4 text-[#8B95A5] dark:text-[#6B7B92] group-hover:text-role-primary transition-colors" />
            </div>
            <div className="text-2xl font-bold text-[#202B3C] dark:text-[#F1F5F9] mt-2 font-mono tabular-nums">
              {summary?.waitingForRequester ?? 0}
            </div>
            <div className="text-[11px] text-[#8B95A5] dark:text-[#6B7B92] mt-1">
              Pending user response
            </div>
          </Link>

          {/* Resolved */}
          <Link
            to="/tickets?status=RESOLVED"
            className="group bg-white dark:bg-[#192330] p-4 rounded-lg border border-[#E1E6EE] dark:border-[#344153] hover:border-role-primary transition-all duration-150 shadow-xs hover:shadow-sm"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[#667085] dark:text-[#A5B1C2]">Resolved</span>
              <CheckCircle2 className="w-4 h-4 text-[#8B95A5] dark:text-[#6B7B92] group-hover:text-role-primary transition-colors" />
            </div>
            <div className="text-2xl font-bold text-[#202B3C] dark:text-[#F1F5F9] mt-2 font-mono tabular-nums">
              {summary?.resolved ?? 0}
            </div>
            <div className="text-[11px] text-[#8B95A5] dark:text-[#6B7B92] mt-1">
              Completed & verified
            </div>
          </Link>
        </div>
      )}

      {/* Recent Activity / Queue Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-[#202B3C] dark:text-[#F1F5F9]">
              Recent Technical Tickets
            </h2>
            <p className="text-xs text-[#667085] dark:text-[#A5B1C2]">
              Latest support cases submitted or updated across services.
            </p>
          </div>
          <Link
            to="/tickets"
            className="text-xs font-semibold text-role-primary hover:underline flex items-center gap-1"
          >
            <span>View all</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Recent Tickets Table or Skeletons */}
        {isLoading ? (
          <TableSkeleton rows={5} columns={6} showMobileCards={true} />
        ) : recentTickets.length === 0 ? (
          <div className="bg-white dark:bg-[#192330] rounded-lg border border-[#E1E6EE] dark:border-[#344153]">
            <EmptyState
              icon={FolderOpen}
              title="No tickets recorded yet"
              description="When tickets are created by requesters or synchronized with the desk, they will appear here in real time."
              actionLabel={user?.role === 'REQUESTER' ? 'Raise First Ticket' : undefined}
              onAction={user?.role === 'REQUESTER' ? () => window.location.assign('/tickets/new') : undefined}
            />
          </div>
        ) : (
          <div className="bg-white dark:bg-[#192330] rounded-lg border border-[#E1E6EE] dark:border-[#344153] overflow-hidden shadow-xs">
            {/* Mobile Card View (< 640px) */}
            <div className="divide-y divide-[#E1E6EE] dark:divide-[#344153] sm:hidden">
              {recentTickets.map((t) => (
                <Link
                  key={t.id}
                  to={`/tickets/${t.id}`}
                  className="block p-3.5 hover:bg-[#F5F7FA] dark:hover:bg-[#202C3B]/60 transition-colors"
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="font-mono font-semibold text-xs text-role-primary">
                      {t.ticketNumber}
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <PriorityBadge priority={t.priority} size="sm" />
                      <StatusBadge status={t.status} size="sm" />
                    </div>
                  </div>
                  <div className="font-medium text-xs text-[#202B3C] dark:text-[#F1F5F9] line-clamp-2 mb-2 leading-relaxed">
                    {t.subject}
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-[#667085] dark:text-[#A5B1C2] pt-1 border-t border-[#E1E6EE]/60 dark:border-[#344153]/60">
                    <span className="truncate pr-2">{t.category}</span>
                    <span className="shrink-0 font-mono text-[10px] text-[#8B95A5] dark:text-[#6B7B92]">
                      {formatDate(t.updatedAt)}
                    </span>
                  </div>
                </Link>
              ))}
            </div>

            {/* Desktop Table (>= 640px) */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="min-w-full divide-y divide-[#E1E6EE] dark:divide-[#344153] text-left text-xs">
                <thead className="bg-[#F0F3F7] dark:bg-[#202C3B] text-[#667085] dark:text-[#A5B1C2] font-semibold">
                  <tr>
                    <th scope="col" className="px-4 py-2.5">Ticket</th>
                    <th scope="col" className="px-4 py-2.5">Subject</th>
                    <th scope="col" className="px-4 py-2.5">Category</th>
                    <th scope="col" className="px-4 py-2.5">Priority</th>
                    <th scope="col" className="px-4 py-2.5">Status</th>
                    <th scope="col" className="px-4 py-2.5 text-right">Updated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E1E6EE] dark:divide-[#344153] bg-white dark:bg-[#192330]">
                  {recentTickets.map((t) => (
                    <tr
                      key={t.id}
                      className="hover:bg-[#F5F7FA] dark:hover:bg-[#202C3B]/60 transition-colors group"
                    >
                      <td className="px-4 py-2.5 whitespace-nowrap font-mono font-medium text-role-primary">
                        <Link to={`/tickets/${t.id}`} className="hover:underline">
                          {t.ticketNumber}
                        </Link>
                      </td>
                      <td className="px-4 py-2.5 font-medium text-[#202B3C] dark:text-[#F1F5F9] max-w-sm lg:max-w-md">
                        <Link
                          to={`/tickets/${t.id}`}
                          className="hover:text-role-primary transition-colors line-clamp-1"
                        >
                          {t.subject}
                        </Link>
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap text-[#667085] dark:text-[#A5B1C2]">
                        {t.category}
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        <PriorityBadge priority={t.priority} size="sm" />
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        <StatusBadge status={t.status} size="sm" />
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap text-right text-[#8B95A5] dark:text-[#6B7B92] font-mono tabular-nums">
                        {formatDate(t.updatedAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
