import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.tsx';
import { api } from '../lib/api.ts';
import { StatusBadge } from '../components/StatusBadge.tsx';
import { PriorityBadge } from '../components/PriorityBadge.tsx';
import {
  ChevronDown,
  ChevronRight,
  Paperclip,
  X,
  ExternalLink,
  Clock,
  UserCheck,
  CheckCircle2,
} from 'lucide-react';

interface AttachmentItem {
  id: number;
  originalName: string;
  storedName: string;
  fileType: string;
  fileSize: number;
  fileUrl: string;
  createdAt: string;
  uploaderName: string;
}

interface CommentItem {
  id: number;
  body: string;
  createdAt: string;
  userName: string;
  userRole: string;
}

interface HistoryItem {
  id: number;
  eventType: string;
  oldValue: string | null;
  newValue: string | null;
  createdAt: string;
  userName: string;
}

interface TicketDetail {
  id: number;
  ticketNumber: string;
  subject: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  tryingToDo?: string | null;
  expectedResult?: string | null;
  actualResult?: string | null;
  errorMessage?: string | null;
  affectedModule?: string | null;
  attemptedSolution?: string | null;
  aiSummary?: string | null;
  aiGeneratedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  requester: {
    id: number;
    name: string;
    email: string;
  };
  assignee: {
    id: number;
    name: string;
    email: string;
  } | null;
}

interface AISummaryData {
  issueSummary: string;
  impact: string;
  whatHasBeenTried: string;
  currentSituation: string;
  missingInformation: string;
  suggestedTroubleshootingSteps: string[];
}

type AIState = 'IDLE' | 'LOADING' | 'SUCCESS' | 'ERROR';

const ALL_STATUSES = [
  { value: 'OPEN', label: 'Open' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'WAITING_FOR_REQUESTER', label: 'Waiting for User' },
  { value: 'RESOLVED', label: 'Resolved' },
  { value: 'CLOSED', label: 'Closed' },
];

export const TicketDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();

  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [attachments, setAttachments] = useState<AttachmentItem[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [agents, setAgents] = useState<Array<{ id: number; name: string }>>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Comments
  const [newComment, setNewComment] = useState('');
  const [isPostingComment, setIsPostingComment] = useState(false);

  // Status & Assignment Actions
  const [isUpdating, setIsUpdating] = useState(false);

  // AI Summary State
  const [aiState, setAiState] = useState<AIState>('IDLE');
  const [aiSummary, setAiSummary] = useState<AISummaryData | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [isAiExpanded, setIsAiExpanded] = useState(true);

  // Lightbox & Attachments
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const fetchTicket = useCallback(async () => {
    if (!id) return;
    try {
      setIsLoading(true);
      setError(null);
      const res = await api.get(`/tickets/${id}`);
      const t = res.data.ticket;
      setTicket(t);
      setComments(res.data.comments || []);
      setAttachments(res.data.attachments || []);
      setHistory(res.data.history || []);

      // If existing AI summary exists
      if (t.aiSummary) {
        try {
          const parsed = JSON.parse(t.aiSummary);
          setAiSummary(parsed);
          setAiState('SUCCESS');
        } catch {
          // ignore parsing error
        }
      }

      if (user?.role !== 'REQUESTER') {
        const agRes = await api.get('/users/agents');
        setAgents(agRes.data.agents || []);
      }
    } catch (err: any) {
      console.error('Failed to load ticket:', err);
      setError(err.response?.data?.error || 'Unable to load ticket details.');
    } finally {
      setIsLoading(false);
    }
  }, [id, user?.role]);

  useEffect(() => {
    fetchTicket();
  }, [fetchTicket]);

  // Handle Comment Submission
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !ticket) return;

    try {
      setIsPostingComment(true);
      const res = await api.post(`/tickets/${ticket.id}/comments`, {
        body: newComment.trim(),
      });
      setComments((prev) => [...prev, res.data.comment]);
      setNewComment('');
      // Refetch history
      const ref = await api.get(`/tickets/${ticket.id}`);
      setHistory(ref.data.history || []);
    } catch (err: any) {
      console.error('Failed to post comment:', err);
      alert(err.response?.data?.error || 'Failed to add reply');
    } finally {
      setIsPostingComment(false);
    }
  };

  // Status Change
  const handleStatusChange = async (newStatus: string) => {
    if (!ticket) return;
    try {
      setIsUpdating(true);
      await api.patch(`/tickets/${ticket.id}/status`, { status: newStatus });
      await fetchTicket();
    } catch (err: any) {
      console.error('Failed to update status:', err);
      alert(err.response?.data?.error || 'Failed to update status');
    } finally {
      setIsUpdating(false);
    }
  };

  // Priority Change
  const handlePriorityChange = async (newPriority: string) => {
    if (!ticket) return;
    try {
      setIsUpdating(true);
      await api.patch(`/tickets/${ticket.id}/priority`, { priority: newPriority });
      await fetchTicket();
    } catch (err: any) {
      console.error('Failed to update priority:', err);
      alert(err.response?.data?.error || 'Failed to update priority');
    } finally {
      setIsUpdating(false);
    }
  };

  // Assignee Change (Admin / Agent)
  const handleAssigneeChange = async (assigneeId: number | null) => {
    if (!ticket) return;
    try {
      setIsUpdating(true);
      await api.patch(`/tickets/${ticket.id}/assign`, { assigneeId });
      await fetchTicket();
    } catch (err: any) {
      console.error('Failed to assign ticket:', err);
      alert(err.response?.data?.error || 'Failed to assign ticket');
    } finally {
      setIsUpdating(false);
    }
  };

  // AI Summary Generation with AbortController & 30s Timeout
  const handleGenerateAISummary = async () => {
    if (!ticket) return;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, 30000); // 30 seconds client timeout

    setAiState('LOADING');
    setAiError(null);

    try {
      const res = await api.post(
        `/tickets/${ticket.id}/ai-summary`,
        {},
        { signal: controller.signal }
      );

      clearTimeout(timeoutId);

      if (res.data?.success && res.data?.summary) {
        setAiSummary(res.data.summary);
        setAiState('SUCCESS');
        setIsAiExpanded(true);
        // Refresh ticket details & history
        const refreshed = await api.get(`/tickets/${ticket.id}`);
        setHistory(refreshed.data.history || []);
      } else {
        setAiError(res.data?.message || 'AI summary is temporarily unavailable.');
        setAiState('ERROR');
      }
    } catch (err: any) {
      clearTimeout(timeoutId);
      console.error('AI summary request error:', err);

      if (
        err.name === 'CanceledError' ||
        err.code === 'ECONNABORTED' ||
        err.message?.includes('timeout') ||
        controller.signal.aborted
      ) {
        setAiError('AI summary timed out. Please try again.');
      } else {
        setAiError(err.response?.data?.message || 'AI summary is temporarily unavailable.');
      }
      setAiState('ERROR');
    } finally {
      // Guaranteed to exit loading
    }
  };

  // Upload Additional Attachment
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!ticket) return;
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const formData = new FormData();
    files.forEach((f) => formData.append('files', f));

    try {
      setIsUploading(true);
      await api.post(`/tickets/${ticket.id}/attachments`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      await fetchTicket();
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err: any) {
      console.error('Failed to upload file:', err);
      alert(err.response?.data?.error || 'Failed to upload attachment');
    } finally {
      setIsUploading(false);
    }
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

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-16 text-center text-xs text-gray-500">
        Loading ticket details...
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <h2 className="text-sm font-semibold text-gray-900">Ticket not found</h2>
        <p className="text-xs text-gray-500 mt-1">{error || 'This ticket could not be found.'}</p>
        <Link to="/tickets" className="mt-4 inline-block text-xs text-blue-600 hover:underline">
          Return to tickets
        </Link>
      </div>
    );
  }

  const isRequester = user?.role === 'REQUESTER';
  const isAgentOrAdmin = user?.role === 'SUPPORT_AGENT' || user?.role === 'ADMIN';
  const isAdmin = user?.role === 'ADMIN';

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* ================= HEADER ================= */}
      <div className="pb-4 border-b border-gray-200">
        <div className="text-xs font-mono text-gray-500 mb-1">
          {ticket.ticketNumber}
        </div>
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-gray-900">
              {ticket.subject}
            </h1>
            <div className="text-xs text-gray-500 mt-1">
              Opened by {ticket.requester.name} on {formatDate(ticket.createdAt)}
            </div>
          </div>
          <div className="flex items-center gap-2 self-start">
            <PriorityBadge priority={ticket.priority} />
            <StatusBadge status={ticket.status} />
          </div>
        </div>
      </div>

      {/* ================= 2-COLUMN LAYOUT ================= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ================= LEFT / MAIN AREA (2 COLUMNS) ================= */}
        <div className="lg:col-span-2 space-y-6">
          {/* Problem Description */}
          <div className="bg-white p-4 rounded border border-gray-200 space-y-3">
            <h2 className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
              Problem
            </h2>
            <div className="text-xs text-gray-900 whitespace-pre-line leading-relaxed">
              {ticket.description}
            </div>

            {/* Diagnostic Context Fields */}
            {(ticket.tryingToDo || ticket.expectedResult || ticket.actualResult || ticket.errorMessage || ticket.attemptedSolution) && (
              <div className="pt-3 border-t border-gray-100 space-y-3">
                {ticket.tryingToDo && (
                  <div>
                    <div className="text-[11px] font-medium text-gray-500">What I was trying to do</div>
                    <div className="text-xs text-gray-800 mt-0.5">{ticket.tryingToDo}</div>
                  </div>
                )}

                {ticket.expectedResult && (
                  <div>
                    <div className="text-[11px] font-medium text-gray-500">Expected result</div>
                    <div className="text-xs text-gray-800 mt-0.5">{ticket.expectedResult}</div>
                  </div>
                )}

                {ticket.actualResult && (
                  <div>
                    <div className="text-[11px] font-medium text-gray-500">Actual result</div>
                    <div className="text-xs text-gray-800 mt-0.5">{ticket.actualResult}</div>
                  </div>
                )}

                {ticket.errorMessage && (
                  <div>
                    <div className="text-[11px] font-medium text-gray-500">Error message</div>
                    <div className="mt-0.5 p-2 bg-gray-50 border border-gray-200 rounded text-xs font-mono text-red-700 whitespace-pre-wrap break-words">
                      {ticket.errorMessage}
                    </div>
                  </div>
                )}

                {ticket.attemptedSolution && (
                  <div>
                    <div className="text-[11px] font-medium text-gray-500">Already tried</div>
                    <div className="text-xs text-gray-800 mt-0.5">{ticket.attemptedSolution}</div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Evidence Attachments */}
          <div className="bg-white p-4 rounded border border-gray-200 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Evidence ({attachments.length})
              </h2>

              <label className="cursor-pointer text-xs font-medium text-blue-600 hover:text-blue-800">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  multiple
                  className="hidden"
                />
                + Add Evidence
              </label>
            </div>

            {isUploading && (
              <div className="text-xs text-blue-600">Uploading attachment...</div>
            )}

            {attachments.length === 0 ? (
              <div className="text-xs text-gray-400 py-1">No evidence attached.</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {attachments.map((att) => {
                  const isImage = att.fileType.startsWith('image/');
                  const isVideo = att.fileType.startsWith('video/');

                  return (
                    <div
                      key={att.id}
                      className="border border-gray-200 rounded p-2 bg-gray-50 flex flex-col justify-between"
                    >
                      <div className="aspect-video w-full rounded bg-gray-200 overflow-hidden flex items-center justify-center mb-1.5">
                        {isImage ? (
                          <img
                            src={att.fileUrl}
                            alt={att.originalName}
                            onClick={() => setLightboxUrl(att.fileUrl)}
                            className="w-full h-full object-cover cursor-pointer hover:opacity-95"
                          />
                        ) : isVideo ? (
                          <video
                            src={att.fileUrl}
                            controls
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Paperclip className="w-6 h-6 text-gray-400" />
                        )}
                      </div>

                      <div className="flex items-center justify-between text-xs">
                        <span className="truncate text-gray-700 font-medium max-w-[180px]" title={att.originalName}>
                          {att.originalName}
                        </span>
                        <a
                          href={att.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Conversation Area */}
          <div className="bg-white p-4 rounded border border-gray-200 space-y-4">
            <h2 className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
              Conversation ({comments.length})
            </h2>

            {/* Comment Thread */}
            <div className="space-y-3">
              {comments.length === 0 ? (
                <div className="text-xs text-gray-400 py-2">
                  No conversation messages yet.
                </div>
              ) : (
                comments.map((c) => (
                  <div
                    key={c.id}
                    className="p-3 bg-gray-50 border border-gray-200 rounded text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between text-gray-500 text-[11px]">
                      <span className="font-semibold text-gray-900">
                        {c.userName} ({c.userRole === 'REQUESTER' ? 'Requester' : 'Support Agent'})
                      </span>
                      <span>{formatDate(c.createdAt)}</span>
                    </div>
                    <div className="text-gray-800 whitespace-pre-line leading-relaxed">
                      {c.body}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Reply Box */}
            <form onSubmit={handleAddComment} className="pt-2 border-t border-gray-100 space-y-2">
              <textarea
                rows={3}
                required
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Write a reply..."
                className="w-full p-2.5 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isPostingComment || !newComment.trim()}
                  className="px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded transition-colors disabled:opacity-50"
                >
                  {isPostingComment ? 'Sending...' : 'Add Reply'}
                </button>
              </div>
            </form>
          </div>

          {/* Ticket Activity / History Audit Trail */}
          <div className="bg-white p-4 rounded border border-gray-200 space-y-3">
            <h2 className="text-xs font-semibold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-gray-500" />
              Ticket Activity History ({history.length})
            </h2>

            {history.length === 0 ? (
              <div className="text-xs text-gray-400 py-2">No history recorded yet.</div>
            ) : (
              <div className="divide-y divide-gray-100 text-xs">
                {history.map((ev) => (
                  <div key={ev.id} className="py-2.5 flex items-start justify-between gap-3">
                    <div>
                      <div className="text-gray-900 font-medium">
                        {ev.eventType === 'STATUS_CHANGED' && (
                          <span>Status changed from <span className="font-semibold">{ev.oldValue}</span> to <span className="font-semibold text-blue-600">{ev.newValue}</span></span>
                        )}
                        {ev.eventType === 'ASSIGNED' && (
                          <span>Assignee updated to <span className="font-semibold text-blue-600">{ev.newValue}</span> (was {ev.oldValue})</span>
                        )}
                        {ev.eventType === 'PRIORITY_CHANGED' && (
                          <span>Priority updated from <span className="font-semibold">{ev.oldValue}</span> to <span className="font-semibold">{ev.newValue}</span></span>
                        )}
                        {ev.eventType === 'CREATED' && (
                          <span>{ev.newValue || 'Ticket created'}</span>
                        )}
                        {ev.eventType === 'AI_SUMMARY_GENERATED' && (
                          <span>{ev.newValue || 'Advisory Gemini AI summary generated'}</span>
                        )}
                        {ev.eventType !== 'STATUS_CHANGED' &&
                          ev.eventType !== 'ASSIGNED' &&
                          ev.eventType !== 'PRIORITY_CHANGED' &&
                          ev.eventType !== 'CREATED' &&
                          ev.eventType !== 'AI_SUMMARY_GENERATED' && (
                            <span>{ev.newValue || ev.eventType}</span>
                          )}
                      </div>
                      <div className="text-[11px] text-gray-500 mt-0.5">
                        by {ev.userName}
                      </div>
                    </div>
                    <div className="text-[11px] text-gray-400 whitespace-nowrap">
                      {formatDate(ev.createdAt)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ================= RIGHT / SMALL SIDEBAR (1 COLUMN) ================= */}
        <div className="space-y-4">
          {/* Ticket Metadata & Actions Box */}
          <div className="bg-white p-4 rounded border border-gray-200 space-y-3.5 text-xs">
            {/* Status (with Admin & Agent Update selector) */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-medium text-gray-500">Status</span>
                <StatusBadge status={ticket.status} />
              </div>

              {isAgentOrAdmin && (
                <div className="mt-1.5">
                  <label className="block text-[10px] text-gray-400 mb-0.5 font-medium">
                    Change Status
                  </label>
                  <select
                    value={ticket.status}
                    disabled={isUpdating}
                    onChange={(e) => handleStatusChange(e.target.value)}
                    className="w-full p-1.5 border border-gray-300 rounded text-xs bg-white font-medium text-gray-800"
                  >
                    {ALL_STATUSES.map((st) => (
                      <option key={st.value} value={st.value}>
                        {st.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Priority */}
            <div>
              <div className="text-[11px] font-medium text-gray-500 mb-1">Priority</div>
              {isAgentOrAdmin ? (
                <select
                  value={ticket.priority}
                  disabled={isUpdating}
                  onChange={(e) => handlePriorityChange(e.target.value)}
                  className="w-full p-1.5 border border-gray-300 rounded text-xs bg-white"
                >
                  {['LOW', 'MEDIUM', 'HIGH', 'URGENT'].map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              ) : (
                <PriorityBadge priority={ticket.priority} />
              )}
            </div>

            {/* Category */}
            <div>
              <div className="text-[11px] font-medium text-gray-500 mb-1">Category</div>
              <div className="font-medium text-gray-900">{ticket.category}</div>
            </div>

            {/* Assigned To (Admin & Agent Assign / Reassign / Unassign) */}
            <div>
              <div className="text-[11px] font-medium text-gray-500 mb-1 flex items-center justify-between">
                <span>Assigned To</span>
                {ticket.assignee && (
                  <span className="text-[10px] text-blue-600 font-medium">Assigned</span>
                )}
              </div>

              {isAgentOrAdmin ? (
                <div className="space-y-1">
                  <select
                    value={ticket.assignee?.id || ''}
                    disabled={isUpdating}
                    onChange={(e) => {
                      const val = e.target.value ? parseInt(e.target.value, 10) : null;
                      handleAssigneeChange(val);
                    }}
                    className="w-full p-1.5 border border-gray-300 rounded text-xs bg-white font-medium text-gray-800"
                  >
                    <option value="">(Unassigned)</option>
                    {agents.map((ag) => (
                      <option key={ag.id} value={ag.id}>
                        {ag.name}
                      </option>
                    ))}
                  </select>

                  {/* Assign to Me button for quick pickup */}
                  {user && ticket.assignee?.id !== user.id && (
                    <button
                      type="button"
                      disabled={isUpdating}
                      onClick={() => handleAssigneeChange(user.id)}
                      className="text-[11px] text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1 mt-1"
                    >
                      <UserCheck className="w-3 h-3" />
                      Assign to me
                    </button>
                  )}
                </div>
              ) : (
                <div className="font-medium text-gray-900">
                  {ticket.assignee ? ticket.assignee.name : 'Unassigned'}
                </div>
              )}
            </div>

            {/* Requester Action (Can confirm & close if resolved) */}
            {isRequester && ticket.status === 'RESOLVED' && (
              <div className="pt-3 border-t border-gray-100">
                <button
                  type="button"
                  disabled={isUpdating}
                  onClick={() => handleStatusChange('CLOSED')}
                  className="w-full text-center px-3 py-1.5 rounded bg-gray-900 hover:bg-black text-xs font-semibold text-white flex items-center justify-center gap-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Confirm & Close Ticket
                </button>
              </div>
            )}
          </div>

          {/* ================= AI SUMMARY SECTION ================= */}
          <div className="bg-white rounded border border-gray-200 text-xs">
            <div
              onClick={() => setIsAiExpanded(!isAiExpanded)}
              className="px-3.5 py-2.5 bg-gray-50 border-b border-gray-200 flex items-center justify-between cursor-pointer select-none"
            >
              <div className="font-semibold text-gray-800 flex items-center gap-1.5">
                {isAiExpanded ? (
                  <ChevronDown className="w-3.5 h-3.5 text-gray-500" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 text-gray-500" />
                )}
                AI Summary
              </div>
              <span className="text-[11px] text-gray-400">Advisory</span>
            </div>

            {isAiExpanded && (
              <div className="p-3.5 space-y-3">
                {/* AI Loading State */}
                {aiState === 'LOADING' && (
                  <div className="p-3 bg-gray-50 border border-gray-200 rounded text-center space-y-1">
                    <div className="font-medium text-gray-800">Generating summary...</div>
                    <div className="text-[11px] text-gray-500">
                      Analyzing ticket details and conversation with Gemini
                    </div>
                  </div>
                )}

                {/* AI Error State */}
                {aiState === 'ERROR' && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded space-y-2">
                    <div className="text-red-700">
                      {aiError || 'AI summary is temporarily unavailable.'}
                    </div>
                    {isAgentOrAdmin && (
                      <button
                        type="button"
                        onClick={handleGenerateAISummary}
                        className="px-2.5 py-1 text-xs font-medium text-red-800 bg-white border border-red-300 rounded hover:bg-red-50"
                      >
                        Try Again
                      </button>
                    )}
                  </div>
                )}

                {/* AI Success / Content Display */}
                {aiState === 'SUCCESS' && aiSummary && (
                  <div className="space-y-2.5 pt-1">
                    <div>
                      <div className="font-bold text-gray-900 text-[11px]">Issue Summary</div>
                      <div className="text-gray-700 mt-0.5 leading-normal">{aiSummary.issueSummary}</div>
                    </div>

                    <div>
                      <div className="font-bold text-gray-900 text-[11px]">Impact</div>
                      <div className="text-gray-700 mt-0.5 leading-normal">{aiSummary.impact}</div>
                    </div>

                    <div>
                      <div className="font-bold text-gray-900 text-[11px]">What Has Been Tried</div>
                      <div className="text-gray-700 mt-0.5 leading-normal">{aiSummary.whatHasBeenTried}</div>
                    </div>

                    <div>
                      <div className="font-bold text-gray-900 text-[11px]">Current Situation</div>
                      <div className="text-gray-700 mt-0.5 leading-normal">{aiSummary.currentSituation}</div>
                    </div>

                    <div>
                      <div className="font-bold text-gray-900 text-[11px]">Missing Information</div>
                      <div className="text-gray-700 mt-0.5 leading-normal">{aiSummary.missingInformation}</div>
                    </div>

                    <div>
                      <div className="font-bold text-gray-900 text-[11px]">Suggested Troubleshooting</div>
                      <ol className="mt-1 list-decimal list-inside space-y-1 text-gray-700 leading-normal">
                        {aiSummary.suggestedTroubleshootingSteps.map((s, idx) => (
                          <li key={idx}>{s}</li>
                        ))}
                      </ol>
                    </div>

                    <div className="pt-2 border-t border-gray-100 text-[10px] text-gray-400">
                      AI-generated assistance. Verify before taking action.
                    </div>
                  </div>
                )}

                {/* Generate / Regenerate Button (Available to Agents/Admins) */}
                {isAgentOrAdmin && aiState !== 'LOADING' && (
                  <button
                    type="button"
                    onClick={handleGenerateAISummary}
                    className="w-full mt-1 px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-50 border border-gray-300 rounded hover:bg-gray-100 transition-colors"
                  >
                    {aiState === 'SUCCESS' ? 'Regenerate Summary' : 'Generate Summary'}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Lightbox Modal */}
      {lightboxUrl && (
        <div
          onClick={() => setLightboxUrl(null)}
          className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4"
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <button
              onClick={() => setLightboxUrl(null)}
              className="absolute -top-8 right-0 text-white hover:text-gray-300"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={lightboxUrl}
              alt="Evidence zoom"
              className="max-h-[85vh] w-auto max-w-full rounded"
            />
          </div>
        </div>
      )}
    </div>
  );
};
