import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.tsx';
import { api } from '../lib/api.ts';
import { StatusBadge } from '../components/StatusBadge.tsx';
import { PriorityBadge } from '../components/PriorityBadge.tsx';
import { TableSkeleton } from '../components/Skeleton.tsx';
import { EmptyState } from '../components/EmptyState.tsx';
import { ErrorState } from '../components/ErrorState.tsx';
import { Search, PlusCircle, Filter, X, FileQuestion, RefreshCw, RotateCcw } from 'lucide-react';

interface TicketItem {
  id: number;
  ticketNumber: string;
  subject: string;
  category: string;
  priority: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  requester: {
    id: number;
    name: string;
  };
  assignee: {
    id: number;
    name: string;
  } | null;
}

const CATEGORIES = [
  'Application Error',
  'Account / Access',
  'API / Integration',
  'Configuration',
  'Performance',
  'Data',
  'General',
];

const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

const ALL_STATUSES = [
  { value: 'OPEN', label: 'Open' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'WAITING_FOR_REQUESTER', label: 'Waiting on User' },
  { value: 'RESOLVED', label: 'Resolved' },
  { value: 'CLOSED', label: 'Closed' },
];

interface TicketListPageProps {
  isMyWork?: boolean;
}

export const TicketListPage: React.FC<TicketListPageProps> = ({ isMyWork = false }) => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const isMyWorkView = isMyWork || searchParams.get('assignee') === 'me';

  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '');
  const [priorityFilter, setPriorityFilter] = useState(searchParams.get('priority') || '');
  const [categoryFilter, setCategoryFilter] = useState(searchParams.get('category') || '');

  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFiltering, setIsFiltering] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isFirstLoad = useRef(true);

  const fetchTickets = useCallback(async () => {
    try {
      if (isFirstLoad.current) {
        setIsLoading(true);
      } else {
        setIsFiltering(true);
      }
      setError(null);

      const params: Record<string, string> = {};
      if (searchTerm.trim()) params.search = searchTerm.trim();
      if (statusFilter) params.status = statusFilter;
      if (priorityFilter) params.priority = priorityFilter;
      if (categoryFilter) params.category = categoryFilter;

      if (isMyWorkView) {
        params.assignee = 'me';
      }

      setSearchParams(params, { replace: true });

      const res = await api.get('/tickets', { params });
      setTickets(res.data.tickets || []);
    } catch (err: any) {
      console.error('Failed to fetch tickets:', err);
      setError('Unable to load tickets. Please check connection and try again.');
    } finally {
      setIsLoading(false);
      setIsFiltering(false);
      isFirstLoad.current = false;
    }
  }, [searchTerm, statusFilter, priorityFilter, categoryFilter, isMyWorkView, setSearchParams]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const formatDate = (dateString: string) => {
    const d = new Date(dateString);
    return d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getPageTitle = () => {
    if (isMyWorkView) return 'My Work';
    if (user?.role === 'REQUESTER') return 'My Tickets';
    if (user?.role === 'SUPPORT_AGENT') return 'Ticket Queue';
    return 'All Tickets';
  };

  const getPageDescription = () => {
    if (isMyWorkView) return 'Technical support cases currently assigned to you.';
    if (user?.role === 'REQUESTER') return 'Track, inspect, and update your submitted support requests.';
    return 'Triage, assign, and resolve technical issues across company services.';
  };

  const hasActiveFilters = Boolean(
    searchTerm.trim() || statusFilter || priorityFilter || categoryFilter
  );

  const resetFilters = () => {
    setSearchTerm('');
    setStatusFilter('');
    setPriorityFilter('');
    setCategoryFilter('');
  };

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[#E1E6EE] dark:border-[#344153]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-[#202B3C] dark:text-[#F1F5F9]">
              {getPageTitle()}
            </h1>
            {!isLoading && (
              <span className="text-xs text-[#667085] dark:text-[#A5B1C2] font-mono tabular-nums px-2 py-0.5 rounded bg-[#F0F3F7] dark:bg-[#202C3B] border border-[#E1E6EE] dark:border-[#344153]">
                {tickets.length} {tickets.length === 1 ? 'ticket' : 'tickets'}
              </span>
            )}
            {isFiltering && (
              <RefreshCw className="w-3.5 h-3.5 text-role-primary animate-spin" />
            )}
          </div>
          <p className="text-xs text-[#667085] dark:text-[#A5B1C2] mt-1">
            {getPageDescription()}
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {user?.role === 'REQUESTER' && (
            <Link
              to="/tickets/new"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold btn-role-primary rounded-md transition-all shadow-xs"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Raise Ticket</span>
            </Link>
          )}

          {!isMyWorkView && (user?.role === 'SUPPORT_AGENT' || user?.role === 'ADMIN') && (
            <Link
              to="/my-work"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold btn-role-primary rounded-md transition-all shadow-xs"
            >
              <span>Go to My Work</span>
            </Link>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-[#192330] p-3 rounded-lg border border-[#E1E6EE] dark:border-[#344153] flex flex-col md:flex-row gap-3 items-center justify-between shadow-xs">
        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-[#8B95A5] dark:text-[#6B7B92]" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search subject or reference..."
            className="w-full pl-8 pr-8 py-1.5 border border-[#E1E6EE] dark:border-[#344153] rounded-md text-xs bg-white dark:bg-[#202C3B] text-[#202B3C] dark:text-[#F1F5F9] placeholder-[#8B95A5] dark:placeholder-[#6B7B92] focus-role-ring"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-2 text-[#8B95A5] hover:text-[#202B3C] dark:text-[#6B7B92] dark:hover:text-[#F1F5F9]"
              aria-label="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter Dropdowns */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 border border-[#E1E6EE] dark:border-[#344153] rounded-md text-xs bg-white dark:bg-[#202C3B] text-[#202B3C] dark:text-[#F1F5F9] focus-role-ring"
          >
            <option value="">All Statuses</option>
            {ALL_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>

          {/* Priority Filter */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-2.5 py-1.5 border border-[#E1E6EE] dark:border-[#344153] rounded-md text-xs bg-white dark:bg-[#202C3B] text-[#202B3C] dark:text-[#F1F5F9] focus-role-ring"
          >
            <option value="">All Priorities</option>
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-2.5 py-1.5 border border-[#E1E6EE] dark:border-[#344153] rounded-md text-xs bg-white dark:bg-[#202C3B] text-[#202B3C] dark:text-[#F1F5F9] focus-role-ring"
          >
            <option value="">All Categories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          {/* Reset Filters Button */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs text-[#667085] hover:text-[#202B3C] dark:text-[#A5B1C2] dark:hover:text-[#F1F5F9] hover:bg-[#F0F3F7] dark:hover:bg-[#202C3B] rounded-md transition-colors"
              title="Reset all filters"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Error state */}
      {error && (
        <ErrorState
          title="Could not load tickets"
          message={error}
          onRetry={fetchTickets}
        />
      )}

      {/* Tickets Data Table or Skeletons */}
      {isLoading ? (
        <TableSkeleton rows={8} columns={isMyWorkView ? 7 : 8} showMobileCards={true} />
      ) : tickets.length === 0 ? (
        <div className="bg-white dark:bg-[#192330] rounded-lg border border-[#E1E6EE] dark:border-[#344153]">
          <EmptyState
            icon={FileQuestion}
            title={isMyWorkView ? 'No tickets assigned to you' : 'No tickets match your filters'}
            description={
              isMyWorkView
                ? 'Tickets assigned to your user account will appear in this workspace.'
                : hasActiveFilters
                ? 'Try adjusting or resetting your search query, status, or category filters.'
                : 'No support tickets have been created yet.'
            }
            actionLabel={hasActiveFilters ? 'Clear Filters' : isMyWorkView ? 'View All Tickets' : undefined}
            onAction={
              hasActiveFilters
                ? resetFilters
                : isMyWorkView
                ? () => window.location.assign('/tickets')
                : undefined
            }
          />
        </div>
      ) : (
        <div className="bg-white dark:bg-[#192330] rounded-lg border border-[#E1E6EE] dark:border-[#344153] overflow-hidden shadow-xs">
          {/* Mobile Card List (Visible on phones < 640px) */}
          <div className="divide-y divide-[#E1E6EE] dark:divide-[#344153] sm:hidden">
            {tickets.map((t) => (
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
                  <div className="truncate pr-2">
                    <span className="font-medium text-[#202B3C] dark:text-[#F1F5F9]">{t.requester.name}</span>
                    <span className="mx-1">·</span>
                    <span>{t.category}</span>
                  </div>
                  <span className="shrink-0 font-mono text-[10px] text-[#8B95A5] dark:text-[#6B7B92]">
                    {formatDate(t.updatedAt)}
                  </span>
                </div>
              </Link>
            ))}
          </div>

          {/* Desktop / Tablet Data Table (Visible >= 640px) */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="min-w-full divide-y divide-[#E1E6EE] dark:divide-[#344153] text-left text-xs">
              <thead className="bg-[#F0F3F7] dark:bg-[#202C3B] text-[#667085] dark:text-[#A5B1C2] font-semibold">
                <tr>
                  <th scope="col" className="px-4 py-2.5">Ticket</th>
                  <th scope="col" className="px-4 py-2.5">Subject</th>
                  <th scope="col" className="px-4 py-2.5">Category</th>
                  <th scope="col" className="px-4 py-2.5">Priority</th>
                  <th scope="col" className="px-4 py-2.5">Status</th>
                  <th scope="col" className="px-4 py-2.5">Requester</th>
                  {!isMyWorkView && (
                    <th scope="col" className="px-4 py-2.5">Assignee</th>
                  )}
                  <th scope="col" className="px-4 py-2.5 text-right">Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E1E6EE] dark:divide-[#344153] bg-white dark:bg-[#192330]">
                {tickets.map((t) => (
                  <tr
                    key={t.id}
                    className="hover:bg-[#F5F7FA] dark:hover:bg-[#202C3B]/60 transition-colors group"
                  >
                    {/* Ticket Reference */}
                    <td className="px-4 py-2.5 whitespace-nowrap font-mono font-medium text-role-primary">
                      <Link to={`/tickets/${t.id}`} className="hover:underline">
                        {t.ticketNumber}
                      </Link>
                    </td>

                    {/* Subject */}
                    <td className="px-4 py-2.5 font-medium text-[#202B3C] dark:text-[#F1F5F9] max-w-sm lg:max-w-md">
                      <Link
                        to={`/tickets/${t.id}`}
                        className="hover:text-role-primary transition-colors line-clamp-1"
                      >
                        {t.subject}
                      </Link>
                    </td>

                    {/* Category */}
                    <td className="px-4 py-2.5 whitespace-nowrap text-[#667085] dark:text-[#A5B1C2]">
                      {t.category}
                    </td>

                    {/* Priority */}
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      <PriorityBadge priority={t.priority} size="sm" />
                    </td>

                    {/* Status */}
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      <StatusBadge status={t.status} size="sm" />
                    </td>

                    {/* Requester */}
                    <td className="px-4 py-2.5 whitespace-nowrap text-[#202B3C] dark:text-[#F1F5F9]">
                      {t.requester.name}
                    </td>

                    {/* Assignee */}
                    {!isMyWorkView && (
                      <td className="px-4 py-2.5 whitespace-nowrap text-[#667085] dark:text-[#A5B1C2]">
                        {t.assignee ? (
                          <span className="font-medium text-[#202B3C] dark:text-[#F1F5F9]">
                            {t.assignee.name}
                          </span>
                        ) : (
                          <span className="text-[#8B95A5] dark:text-[#6B7B92] italic">
                            Unassigned
                          </span>
                        )}
                      </td>
                    )}

                    {/* Updated */}
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
  );
};
