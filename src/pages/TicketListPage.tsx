import React, { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.tsx';
import { api } from '../lib/api.ts';
import { StatusBadge } from '../components/StatusBadge.tsx';
import { PriorityBadge } from '../components/PriorityBadge.tsx';

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
  const [error, setError] = useState<string | null>(null);

  const fetchTickets = useCallback(async () => {
    try {
      setIsLoading(true);
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
      setError('Unable to load tickets.');
    } finally {
      setIsLoading(false);
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
    if (user?.role === 'SUPPORT_AGENT') return 'Support Queue';
    return 'All Tickets';
  };

  const getPageSubtitle = () => {
    if (isMyWorkView) return 'Tickets currently assigned to you for investigation';
    if (user?.role === 'REQUESTER') return 'Support tickets you have raised';
    if (user?.role === 'SUPPORT_AGENT') return 'Incoming requests and unassigned queues';
    return 'Complete company ticket inventory';
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-4">
      {/* Page Title & Action */}
      <div className="flex items-center justify-between pb-3 border-b border-gray-200">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{getPageTitle()}</h1>
          <p className="text-xs text-gray-500 mt-0.5">{getPageSubtitle()}</p>
        </div>

        {user?.role === 'REQUESTER' && (
          <Link
            to="/tickets/new"
            className="px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded transition-colors"
          >
            Raise Ticket
          </Link>
        )}
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded text-xs text-red-700">
          {error}
        </div>
      )}

      {/* Quick Status Filter Tabs for My Work */}
      {isMyWorkView && (
        <div className="flex items-center gap-1.5 border-b border-gray-200 pb-2 text-xs">
          {[
            { label: 'All', value: '' },
            { label: 'Open', value: 'OPEN' },
            { label: 'In Progress', value: 'IN_PROGRESS' },
            { label: 'Waiting', value: 'WAITING_FOR_REQUESTER' },
            { label: 'Resolved', value: 'RESOLVED' },
          ].map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setStatusFilter(tab.value)}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                statusFilter === tab.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* Compact Filters & Search Bar */}
      <div className="flex flex-wrap items-center gap-2 bg-white p-2.5 rounded border border-gray-200 text-xs">
        {/* Search */}
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search tickets..."
          className="px-2.5 py-1.5 border border-gray-300 rounded text-xs w-48 sm:w-60 focus:ring-1 focus:ring-blue-500"
        />

        {/* Status Dropdown (when not in My Work quick tabs) */}
        {!isMyWorkView && (
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2 py-1.5 border border-gray-300 rounded text-xs bg-white"
          >
            <option value="">Status (All)</option>
            <option value="OPEN">Open</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="WAITING_FOR_REQUESTER">Waiting on User</option>
            <option value="RESOLVED">Resolved</option>
            <option value="CLOSED">Closed</option>
          </select>
        )}

        {/* Priority */}
        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="px-2 py-1.5 border border-gray-300 rounded text-xs bg-white"
        >
          <option value="">Priority (All)</option>
          {PRIORITIES.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>

        {/* Category */}
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-2 py-1.5 border border-gray-300 rounded text-xs bg-white"
        >
          <option value="">Category (All)</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        {/* Clear filters button */}
        {(searchTerm || statusFilter || priorityFilter || categoryFilter) && (
          <button
            type="button"
            onClick={() => {
              setSearchTerm('');
              setStatusFilter('');
              setPriorityFilter('');
              setCategoryFilter('');
            }}
            className="text-gray-500 hover:text-gray-900 ml-auto"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Tickets Table */}
      <div className="bg-white rounded border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-xs text-gray-500">Loading tickets...</div>
        ) : tickets.length === 0 ? (
          <div className="p-12 text-center text-xs text-gray-500">
            {isMyWorkView
              ? 'No tickets currently assigned to you in this filter.'
              : 'No tickets found matching criteria.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-left text-xs">
              <thead className="bg-gray-50 text-gray-600 font-medium">
                <tr>
                  <th scope="col" className="px-4 py-2.5">Ticket</th>
                  <th scope="col" className="px-4 py-2.5">Subject</th>
                  <th scope="col" className="px-4 py-2.5">Priority</th>
                  <th scope="col" className="px-4 py-2.5">Status</th>
                  <th scope="col" className="px-4 py-2.5">Requester</th>
                  {!isMyWorkView && (
                    <th scope="col" className="px-4 py-2.5">Assignee</th>
                  )}
                  <th scope="col" className="px-4 py-2.5">Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {tickets.map((t) => (
                  <tr key={t.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5 whitespace-nowrap font-mono font-medium text-blue-600">
                      <Link to={`/tickets/${t.id}`} className="hover:underline">
                        {t.ticketNumber}
                      </Link>
                    </td>

                    <td className="px-4 py-2.5">
                      <Link
                        to={`/tickets/${t.id}`}
                        className="font-medium text-gray-900 hover:text-blue-600 line-clamp-1"
                      >
                        {t.subject}
                      </Link>
                    </td>

                    <td className="px-4 py-2.5 whitespace-nowrap">
                      <PriorityBadge priority={t.priority} />
                    </td>

                    <td className="px-4 py-2.5 whitespace-nowrap">
                      <StatusBadge status={t.status} />
                    </td>

                    <td className="px-4 py-2.5 whitespace-nowrap text-gray-700">
                      {t.requester.name}
                    </td>

                    {!isMyWorkView && (
                      <td className="px-4 py-2.5 whitespace-nowrap text-gray-600">
                        {t.assignee ? t.assignee.name : <span className="text-gray-400 italic">Unassigned</span>}
                      </td>
                    )}

                    <td className="px-4 py-2.5 whitespace-nowrap text-gray-500">
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
