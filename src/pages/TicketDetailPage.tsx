import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.tsx';
import { api } from '../lib/api.ts';
import { StatusBadge } from '../components/StatusBadge.tsx';
import { PriorityBadge } from '../components/PriorityBadge.tsx';
import { TicketDetailSkeleton } from '../components/Skeleton.tsx';
import { useToast } from '../context/ToastContext.tsx';
import {
  ArrowLeft,
  Paperclip,
  Clock,
  Sparkles,
  ChevronDown,
  ChevronRight,
  Send,
  X,
  ExternalLink,
  UserCheck,
  CheckCircle2,
  AlertCircle,
  FileImage,
  FileVideo,
  FileText,
  Download,
} from 'lucide-react';

interface TicketData {
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
  attemptedSolution?: string | null;
  createdAt: string;
  updatedAt: string;
  requester: {
    id: number;
    name: string;
    email: string;
    role: string;
  };
  assignee: {
    id: number;
    name: string;
    email: string;
    role: string;
  } | null;
}

interface Attachment {
  id: number;
  fileName: string;
  originalName: string;
  fileSize: number;
  fileType: string;
  fileUrl: string;
  createdAt: string;
}

interface Comment {
  id: number;
  body: string;
  createdAt: string;
  userId: number;
  userName: string;
  userRole: string;
}

interface TicketEvent {
  id: number;
  eventType: string;
  oldValue: string | null;
  newValue: string | null;
  createdAt: string;
  userName: string;
}

interface AISummary {
  issueSummary: string;
  impact: string;
  whatHasBeenTried: string;
  currentSituation: string;
  missingInformation: string;
  suggestedTroubleshootingSteps: string[];
}

const ALL_STATUSES = [
  { value: 'OPEN', label: 'Open' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'WAITING_FOR_REQUESTER', label: 'Waiting on User' },
  { value: 'RESOLVED', label: 'Resolved' },
  { value: 'CLOSED', label: 'Closed' },
];

export const TicketDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [ticket, setTicket] = useState<TicketData | null>(null);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [history, setHistory] = useState<TicketEvent[]>([]);
  const [agents, setAgents] = useState<{ id: number; name: string; email: string }[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Attachment lightbox & failed load tracks
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [failedImages, setFailedImages] = useState<Record<number, boolean>>({});

  // Comment & file uploads
  const [newComment, setNewComment] = useState('');
  const [isPostingComment, setIsPostingComment] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Ticket actions
  const [isUpdating, setIsUpdating] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Gemini AI summary
  const [aiState, setAiState] = useState<'IDLE' | 'LOADING' | 'SUCCESS' | 'ERROR'>('IDLE');
  const [aiSummary, setAiSummary] = useState<AISummary | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [isAiExpanded, setIsAiExpanded] = useState(true);

  const { showToast } = useToast();

  const fetchTicketDetails = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await api.get(`/tickets/${id}`);
      setTicket(res.data.ticket);
      setAttachments(res.data.attachments || []);
      setComments(res.data.comments || []);
      setHistory(res.data.history || []);

      if (res.data.aiSummary) {
        setAiSummary(res.data.aiSummary);
        setAiState('SUCCESS');
      }
    } catch (err: any) {
      console.error('Failed to load ticket:', err);
      setError(err.response?.data?.error || 'Failed to load ticket details.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAgents = async () => {
    if (user?.role === 'SUPPORT_AGENT' || user?.role === 'ADMIN') {
      try {
        const res = await api.get('/users?role=SUPPORT_AGENT');
        const adminRes = await api.get('/users?role=ADMIN');
        const combined = [...(res.data.users || []), ...(adminRes.data.users || [])];
        const unique = Array.from(new Map(combined.map((m: any) => [m.id, m])).values());
        setAgents(unique);
      } catch (err) {
        // ignore agent load errors
      }
    }
  };

  useEffect(() => {
    if (id) {
      fetchTicketDetails();
      fetchAgents();
    }
  }, [id]);

  const handleStatusChange = async (newStatus: string) => {
    if (!ticket) return;
    try {
      setIsUpdating(true);
      setActionError(null);
      const res = await api.patch(`/tickets/${ticket.id}/status`, { status: newStatus });
      setTicket((prev) => (prev ? { ...prev, status: res.data.ticket.status } : null));
      showToast(`Status updated to ${newStatus.replace(/_/g, ' ')}`, 'success');
      await fetchTicketDetails();
    } catch (err: any) {
      console.error('Failed to change status:', err);
      setActionError(err.response?.data?.error || 'Failed to change ticket status.');
      showToast('Failed to change ticket status', 'error');
    } finally {
      setIsUpdating(false);
    }
  };

  const handlePriorityChange = async (newPriority: string) => {
    if (!ticket) return;
    try {
      setIsUpdating(true);
      setActionError(null);
      const res = await api.patch(`/tickets/${ticket.id}/priority`, { priority: newPriority });
      setTicket((prev) => (prev ? { ...prev, priority: res.data.ticket.priority } : null));
      showToast(`Priority updated to ${newPriority}`, 'success');
      await fetchTicketDetails();
    } catch (err: any) {
      console.error('Failed to change priority:', err);
      setActionError(err.response?.data?.error || 'Failed to update priority.');
      showToast('Failed to update priority', 'error');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAssigneeChange = async (newAssigneeId: number | null) => {
    if (!ticket) return;
    try {
      setIsUpdating(true);
      setActionError(null);
      const res = await api.patch(`/tickets/${ticket.id}/assign`, { assigneeId: newAssigneeId });
      setTicket((prev) => (prev ? { ...prev, assignee: res.data.ticket.assignee, assigneeId: res.data.ticket.assigneeId } : null));
      showToast(newAssigneeId ? 'Ticket assignment updated' : 'Ticket unassigned', 'success');
      await fetchTicketDetails();
    } catch (err: any) {
      console.error('Failed to assign ticket:', err);
      setActionError(err.response?.data?.error || 'Failed to assign ticket.');
      showToast('Failed to assign ticket', 'error');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !ticket) return;

    try {
      setIsPostingComment(true);
      setActionError(null);
      const res = await api.post(`/tickets/${ticket.id}/comments`, { body: newComment.trim() });
      setComments((prev) => [...prev, res.data.comment]);
      setNewComment('');
      showToast('Comment posted successfully', 'success');
    } catch (err: any) {
      console.error('Failed to add reply:', err);
      setActionError(err.response?.data?.error || 'Failed to post reply.');
      showToast('Failed to post reply', 'error');
    } finally {
      setIsPostingComment(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !files.length || !ticket) return;

    try {
      setIsUploading(true);
      setActionError(null);
      const formData = new FormData();
      for (let i = 0; i < files.length; i++) {
        formData.append('files', files[i]);
      }

      const res = await api.post(`/tickets/${ticket.id}/attachments`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setAttachments((prev) => [...prev, ...(res.data.attachments || [])]);
      if (fileInputRef.current) fileInputRef.current.value = '';
      showToast('Attachment uploaded successfully', 'success');
    } catch (err: any) {
      console.error('Failed to upload attachment:', err);
      setActionError(err.response?.data?.error || 'Failed to upload attachment.');
      showToast('Failed to upload attachment', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const handleGenerateAISummary = async () => {
    if (!ticket) return;
    try {
      setAiState('LOADING');
      setAiError(null);
      const res = await api.post(`/tickets/${ticket.id}/ai-summary`);
      setAiSummary(res.data.summary);
      setAiState('SUCCESS');
      await fetchTicketDetails();
    } catch (err: any) {
      console.error('AI summary failed:', err);
      setAiState('ERROR');
      setAiError(
        err.response?.data?.message ||
          'AI summary is temporarily unavailable. Please try again later.'
      );
    }
  };

  const formatDate = (dateString: string) => {
    const d = new Date(dateString);
    return d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (isLoading) {
    return <TicketDetailSkeleton />;
  }

  if (error || !ticket) {
    return (
      <div className="bg-white dark:bg-[#192330] rounded-lg border border-[#E1E6EE] dark:border-[#344153] p-12 text-center max-w-lg mx-auto">
        <h2 className="text-sm font-semibold text-[#202B3C] dark:text-[#F1F5F9]">
          Ticket Not Found
        </h2>
        <p className="text-xs text-[#667085] dark:text-[#A5B1C2] mt-1">
          {error || 'This ticket could not be found or you do not have permission to view it.'}
        </p>
        <Link
          to="/tickets"
          className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold btn-role-primary rounded-md transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Return to tickets</span>
        </Link>
      </div>
    );
  }

  const isRequester = user?.role === 'REQUESTER';
  const isAgentOrAdmin = user?.role === 'SUPPORT_AGENT' || user?.role === 'ADMIN';

  return (
    <div className="space-y-6">
      {/* Top Bar / Header */}
      <div className="pb-4 border-b border-[#E1E6EE] dark:border-[#344153]">
        <div className="flex items-center gap-2 mb-1">
          <Link
            to="/tickets"
            className="text-xs text-[#667085] hover:text-[#202B3C] dark:text-[#A5B1C2] dark:hover:text-[#F1F5F9] font-medium flex items-center gap-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Tickets</span>
          </Link>
          <span className="text-[#8B95A5] dark:text-[#6B7B92] text-xs">/</span>
          <span className="text-xs font-mono font-semibold text-role-primary">
            {ticket.ticketNumber}
          </span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div className="space-y-1">
            <h1 className="text-xl font-bold tracking-tight text-[#202B3C] dark:text-[#F1F5F9]">
              {ticket.subject}
            </h1>
            <div className="text-xs text-[#667085] dark:text-[#A5B1C2] flex flex-wrap items-center gap-2">
              <span>Opened by <strong className="text-[#202B3C] dark:text-[#F1F5F9]">{ticket.requester.name}</strong></span>
              <span>·</span>
              <span className="font-mono tabular-nums">{formatDate(ticket.createdAt)}</span>
              <span>·</span>
              <span className="px-2 py-0.5 rounded bg-[#F0F3F7] dark:bg-[#202C3B] text-[11px] font-medium">
                {ticket.category}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start shrink-0">
            <PriorityBadge priority={ticket.priority} />
            <StatusBadge status={ticket.status} />
          </div>
        </div>
      </div>

      {actionError && (
        <div className="p-3 bg-red-50 dark:bg-[#381E24] border border-red-200 dark:border-[#5C2A34] rounded-md text-xs text-red-700 dark:text-[#F87171] flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
          <span>{actionError}</span>
        </div>
      )}

      {/* 2-Column Responsive Workspace Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Left Column (Dominant, 2/3 width) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Problem & Diagnostic Context */}
          <div className="bg-white dark:bg-[#192330] p-5 rounded-lg border border-[#E1E6EE] dark:border-[#344153] space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#667085] dark:text-[#A5B1C2]">
              Problem Description
            </h2>
            <div className="text-xs text-[#202B3C] dark:text-[#F1F5F9] whitespace-pre-line leading-relaxed">
              {ticket.description}
            </div>

            {/* Diagnostic Fields if provided */}
            {(ticket.tryingToDo || ticket.expectedResult || ticket.actualResult || ticket.errorMessage || ticket.attemptedSolution) && (
              <div className="pt-4 border-t border-[#E1E6EE] dark:border-[#344153] space-y-3">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-[#8B95A5] dark:text-[#6B7B92]">
                  Diagnostic Context
                </div>

                {ticket.tryingToDo && (
                  <div>
                    <div className="text-[11px] font-medium text-[#667085] dark:text-[#A5B1C2]">
                      Goal / What was being attempted
                    </div>
                    <div className="text-xs text-[#202B3C] dark:text-[#F1F5F9] mt-0.5">
                      {ticket.tryingToDo}
                    </div>
                  </div>
                )}

                {ticket.expectedResult && (
                  <div>
                    <div className="text-[11px] font-medium text-[#667085] dark:text-[#A5B1C2]">
                      Expected Behavior
                    </div>
                    <div className="text-xs text-[#202B3C] dark:text-[#F1F5F9] mt-0.5">
                      {ticket.expectedResult}
                    </div>
                  </div>
                )}

                {ticket.actualResult && (
                  <div>
                    <div className="text-[11px] font-medium text-[#667085] dark:text-[#A5B1C2]">
                      Actual Outcome
                    </div>
                    <div className="text-xs text-[#202B3C] dark:text-[#F1F5F9] mt-0.5">
                      {ticket.actualResult}
                    </div>
                  </div>
                )}

                {ticket.errorMessage && (
                  <div>
                    <div className="text-[11px] font-medium text-[#667085] dark:text-[#A5B1C2]">
                      Raw Error Message / Trace
                    </div>
                    <div className="mt-1 p-2.5 bg-[#F0F3F7] dark:bg-[#202C3B] border border-[#E1E6EE] dark:border-[#344153] rounded text-xs font-mono text-red-600 dark:text-red-400 whitespace-pre-wrap break-words">
                      {ticket.errorMessage}
                    </div>
                  </div>
                )}

                {ticket.attemptedSolution && (
                  <div>
                    <div className="text-[11px] font-medium text-[#667085] dark:text-[#A5B1C2]">
                      Troubleshooting Already Attempted
                    </div>
                    <div className="text-xs text-[#202B3C] dark:text-[#F1F5F9] mt-0.5">
                      {ticket.attemptedSolution}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Evidence / Attachments with Resilient Fallback States */}
          <div className="bg-white dark:bg-[#192330] p-5 rounded-lg border border-[#E1E6EE] dark:border-[#344153] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="text-xs font-bold uppercase tracking-wider text-[#667085] dark:text-[#A5B1C2]">
                  Evidence & Attachments
                </h2>
                <span className="text-xs font-mono text-[#8B95A5] dark:text-[#6B7B92]">
                  ({attachments.length})
                </span>
              </div>

              <label className="cursor-pointer inline-flex items-center gap-1 text-xs font-semibold text-role-primary hover:underline">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  multiple
                  className="hidden"
                />
                <Paperclip className="w-3.5 h-3.5" />
                <span>Add Evidence</span>
              </label>
            </div>

            {isUploading && (
              <div className="text-xs text-role-primary py-1">
                Uploading attachment...
              </div>
            )}

            {attachments.length === 0 ? (
              <div className="text-xs text-[#8B95A5] dark:text-[#6B7B92] py-2">
                No evidence or diagnostic files attached to this ticket.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {attachments.map((att) => {
                  const isImage = att.fileType.startsWith('image/');
                  const isVideo = att.fileType.startsWith('video/');
                  const imageFailed = failedImages[att.id];

                  return (
                    <div
                      key={att.id}
                      className="border border-[#E1E6EE] dark:border-[#344153] rounded-md p-2.5 bg-[#F0F3F7] dark:bg-[#202C3B] flex flex-col justify-between"
                    >
                      {/* Media Viewport Container */}
                      <div className="aspect-video w-full rounded bg-[#E1E6EE] dark:bg-[#192330] overflow-hidden flex items-center justify-center mb-2 relative">
                        {isImage && !imageFailed ? (
                          <img
                            src={att.fileUrl}
                            alt={att.originalName}
                            referrerPolicy="no-referrer"
                            onError={() =>
                              setFailedImages((prev) => ({ ...prev, [att.id]: true }))
                            }
                            onClick={() => setLightboxUrl(att.fileUrl)}
                            className="w-full h-full object-cover cursor-pointer hover:opacity-95 transition-opacity"
                          />
                        ) : isVideo ? (
                          <video
                            src={att.fileUrl}
                            controls
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          /* Resilient Fallback Container when preview unavailable */
                          <div className="flex flex-col items-center justify-center p-3 text-center">
                            {isImage ? (
                              <FileImage className="w-8 h-8 text-[#8B95A5] dark:text-[#6B7B92] mb-1" />
                            ) : isVideo ? (
                              <FileVideo className="w-8 h-8 text-[#8B95A5] dark:text-[#6B7B92] mb-1" />
                            ) : (
                              <FileText className="w-8 h-8 text-[#8B95A5] dark:text-[#6B7B92] mb-1" />
                            )}
                            <span className="text-[11px] font-medium text-[#667085] dark:text-[#A5B1C2] truncate max-w-[160px]">
                              {att.originalName}
                            </span>
                            <span className="text-[10px] text-[#8B95A5] dark:text-[#6B7B92]">
                              Preview unavailable
                            </span>
                          </div>
                        )}
                      </div>

                      {/* File Info & Action */}
                      <div className="flex items-center justify-between text-xs pt-1">
                        <div className="min-w-0 pr-2">
                          <div
                            className="truncate text-[#202B3C] dark:text-[#F1F5F9] font-medium text-xs"
                            title={att.originalName}
                          >
                            {att.originalName}
                          </div>
                          <div className="text-[10px] text-[#8B95A5] dark:text-[#6B7B92] font-mono tabular-nums">
                            {formatFileSize(att.fileSize)}
                          </div>
                        </div>

                        <a
                          href={att.fileUrl}
                          download={att.originalName}
                          target="_blank"
                          rel="noreferrer"
                          title="Open or download file"
                          className="p-1 rounded text-[#667085] hover:text-[#202B3C] dark:text-[#A5B1C2] dark:hover:text-[#F1F5F9] hover:bg-[#E1E6EE] dark:hover:bg-[#344153] transition-colors shrink-0"
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

          {/* Conversation & Replies */}
          <div className="bg-white dark:bg-[#192330] p-5 rounded-lg border border-[#E1E6EE] dark:border-[#344153] space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-[#667085] dark:text-[#A5B1C2]">
                Conversation Thread
              </h2>
              <span className="text-xs text-[#8B95A5] dark:text-[#6B7B92] font-mono tabular-nums">
                ({comments.length})
              </span>
            </div>

            {/* Message Thread */}
            <div className="space-y-3">
              {comments.length === 0 ? (
                <div className="text-xs text-[#8B95A5] dark:text-[#6B7B92] py-2">
                  No conversation messages recorded yet.
                </div>
              ) : (
                comments.map((c) => (
                  <div
                    key={c.id}
                    className="p-3.5 bg-[#F0F3F7] dark:bg-[#202C3B] border border-[#E1E6EE] dark:border-[#344153] rounded-md text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-[#8B95A5] dark:text-[#6B7B92] text-[11px]">
                      <div className="flex items-center gap-1.5 font-semibold text-[#202B3C] dark:text-[#F1F5F9]">
                        <span>{c.userName}</span>
                        <span className="text-[10px] font-normal px-1.5 py-0.2 rounded bg-[#E1E6EE] dark:bg-[#344153] text-[#667085] dark:text-[#A5B1C2]">
                          {c.userRole === 'REQUESTER'
                            ? 'Requester'
                            : c.userRole === 'ADMIN'
                            ? 'Admin'
                            : 'Support Engineer'}
                        </span>
                      </div>
                      <span className="font-mono tabular-nums">{formatDate(c.createdAt)}</span>
                    </div>
                    <div className="text-[#202B3C] dark:text-[#F1F5F9] whitespace-pre-line leading-relaxed">
                      {c.body}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Reply Composer */}
            <form onSubmit={handleAddComment} className="pt-3 border-t border-[#E1E6EE] dark:border-[#344153] space-y-2.5">
              <label className="block text-xs font-medium text-[#667085] dark:text-[#A5B1C2]">
                Post a response
              </label>
              <textarea
                rows={3}
                required
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Type update or instruction here..."
                className="w-full p-2.5 border border-[#E1E6EE] dark:border-[#344153] rounded-md text-xs bg-white dark:bg-[#202C3B] text-[#202B3C] dark:text-[#F1F5F9] placeholder-[#8B95A5] dark:placeholder-[#6B7B92] focus-role-ring"
              />
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isPostingComment || !newComment.trim()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold btn-role-primary rounded-md transition-colors disabled:opacity-50 shadow-xs"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isPostingComment ? 'Posting...' : 'Post Reply'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Ticket Activity / History Audit Trail */}
          <div className="bg-white dark:bg-[#192330] p-5 rounded-lg border border-[#E1E6EE] dark:border-[#344153] space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-[#667085] dark:text-[#A5B1C2] flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                <span>Ticket Audit History</span>
              </h2>
              <span className="text-xs text-[#8B95A5] dark:text-[#6B7B92] font-mono tabular-nums">
                ({history.length})
              </span>
            </div>

            {history.length === 0 ? (
              <div className="text-xs text-[#8B95A5] dark:text-[#6B7B92] py-2">
                No activity history recorded.
              </div>
            ) : (
              <div className="divide-y divide-[#E1E6EE] dark:divide-[#344153] text-xs">
                {history.map((ev) => (
                  <div key={ev.id} className="py-2.5 flex items-start justify-between gap-3">
                    <div>
                      <div className="text-[#202B3C] dark:text-[#F1F5F9] font-medium">
                        {ev.eventType === 'STATUS_CHANGED' && (
                          <span>
                            Status changed from <span className="font-semibold">{ev.oldValue}</span> to{' '}
                            <span className="font-semibold text-role-primary">{ev.newValue}</span>
                          </span>
                        )}
                        {ev.eventType === 'ASSIGNED' && (
                          <span>
                            Assignee changed to{' '}
                            <span className="font-semibold text-role-primary">{ev.newValue}</span>{' '}
                            (was {ev.oldValue})
                          </span>
                        )}
                        {ev.eventType === 'PRIORITY_CHANGED' && (
                          <span>
                            Priority updated from <span className="font-semibold">{ev.oldValue}</span> to{' '}
                            <span className="font-semibold">{ev.newValue}</span>
                          </span>
                        )}
                        {ev.eventType === 'CREATED' && (
                          <span>{ev.newValue || 'Ticket created'}</span>
                        )}
                        {ev.eventType === 'AI_SUMMARY_GENERATED' && (
                          <span>{ev.newValue || 'Advisory AI assistance summary generated'}</span>
                        )}
                        {ev.eventType !== 'STATUS_CHANGED' &&
                          ev.eventType !== 'ASSIGNED' &&
                          ev.eventType !== 'PRIORITY_CHANGED' &&
                          ev.eventType !== 'CREATED' &&
                          ev.eventType !== 'AI_SUMMARY_GENERATED' && (
                            <span>{ev.newValue || ev.eventType}</span>
                          )}
                      </div>
                      <div className="text-[11px] text-[#8B95A5] dark:text-[#6B7B92] mt-0.5">
                        by {ev.userName}
                      </div>
                    </div>
                    <div className="text-[11px] text-[#8B95A5] dark:text-[#6B7B92] font-mono tabular-nums whitespace-nowrap">
                      {formatDate(ev.createdAt)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Small Properties & Actions Sidebar (1/3 width) */}
        <div className="space-y-4">
          {/* Properties Panel */}
          <div className="bg-white dark:bg-[#192330] p-4 rounded-lg border border-[#E1E6EE] dark:border-[#344153] space-y-4 text-xs">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#667085] dark:text-[#A5B1C2] pb-2 border-b border-[#E1E6EE] dark:border-[#344153]">
              Ticket Properties
            </h2>

            {/* Status (with selector for Agent/Admin) */}
            <div>
              <div className="text-[11px] font-medium text-[#667085] dark:text-[#A5B1C2] mb-1">
                Status
              </div>
              {isAgentOrAdmin ? (
                <select
                  value={ticket.status}
                  disabled={isUpdating}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  className="w-full p-1.5 border border-[#E1E6EE] dark:border-[#344153] rounded-md text-xs bg-white dark:bg-[#202C3B] font-medium text-[#202B3C] dark:text-[#F1F5F9] focus-role-ring"
                >
                  {ALL_STATUSES.map((st) => (
                    <option key={st.value} value={st.value}>
                      {st.label}
                    </option>
                  ))}
                </select>
              ) : (
                <StatusBadge status={ticket.status} />
              )}
            </div>

            {/* Priority */}
            <div>
              <div className="text-[11px] font-medium text-[#667085] dark:text-[#A5B1C2] mb-1">
                Priority
              </div>
              {isAgentOrAdmin ? (
                <select
                  value={ticket.priority}
                  disabled={isUpdating}
                  onChange={(e) => handlePriorityChange(e.target.value)}
                  className="w-full p-1.5 border border-[#E1E6EE] dark:border-[#344153] rounded-md text-xs bg-white dark:bg-[#202C3B] text-[#202B3C] dark:text-[#F1F5F9] focus-role-ring"
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
              <div className="text-[11px] font-medium text-[#667085] dark:text-[#A5B1C2] mb-1">
                Category
              </div>
              <div className="font-medium text-[#202B3C] dark:text-[#F1F5F9]">
                {ticket.category}
              </div>
            </div>

            {/* Assignee */}
            <div>
              <div className="text-[11px] font-medium text-[#667085] dark:text-[#A5B1C2] mb-1">
                Assignee
              </div>
              {isAgentOrAdmin ? (
                <div className="space-y-1.5">
                  <select
                    value={ticket.assignee?.id || ''}
                    disabled={isUpdating}
                    onChange={(e) => {
                      const val = e.target.value ? parseInt(e.target.value, 10) : null;
                      handleAssigneeChange(val);
                    }}
                    className="w-full p-1.5 border border-[#E1E6EE] dark:border-[#344153] rounded-md text-xs bg-white dark:bg-[#202C3B] font-medium text-[#202B3C] dark:text-[#F1F5F9] focus-role-ring"
                  >
                    <option value="">(Unassigned)</option>
                    {agents.map((ag) => (
                      <option key={ag.id} value={ag.id}>
                        {ag.name}
                      </option>
                    ))}
                  </select>

                  {user && ticket.assignee?.id !== user.id && (
                    <button
                      type="button"
                      disabled={isUpdating}
                      onClick={() => handleAssigneeChange(user.id)}
                      className="text-[11px] text-role-primary hover:underline font-semibold flex items-center gap-1"
                    >
                      <UserCheck className="w-3 h-3" />
                      <span>Assign to me</span>
                    </button>
                  )}
                </div>
              ) : (
                <div className="font-medium text-[#202B3C] dark:text-[#F1F5F9]">
                  {ticket.assignee ? ticket.assignee.name : 'Unassigned'}
                </div>
              )}
            </div>

            {/* Requester Action (Confirm & Close if Resolved) */}
            {isRequester && ticket.status === 'RESOLVED' && (
              <div className="pt-3 border-t border-[#E1E6EE] dark:border-[#344153]">
                <button
                  type="button"
                  disabled={isUpdating}
                  onClick={() => handleStatusChange('CLOSED')}
                  className="w-full text-center px-3 py-1.5 rounded-md bg-[#202B3C] hover:bg-black dark:bg-[#F1F5F9] dark:hover:bg-white text-xs font-semibold text-white dark:text-[#111821] flex items-center justify-center gap-1.5 transition-colors"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Confirm & Close Ticket</span>
                </button>
              </div>
            )}
          </div>

          {/* Gemini AI Assistance Panel */}
          <div className="bg-white dark:bg-[#192330] rounded-lg border border-[#E1E6EE] dark:border-[#344153] text-xs overflow-hidden">
            <div
              onClick={() => setIsAiExpanded(!isAiExpanded)}
              className="px-3.5 py-2.5 bg-[#F0F3F7] dark:bg-[#202C3B] border-b border-[#E1E6EE] dark:border-[#344153] flex items-center justify-between cursor-pointer select-none"
            >
              <div className="font-semibold text-[#202B3C] dark:text-[#F1F5F9] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-role-primary" />
                <span>AI Assistance</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-[#8B95A5] dark:text-[#6B7B92]">Advisory</span>
                {isAiExpanded ? (
                  <ChevronDown className="w-3.5 h-3.5 text-[#8B95A5] dark:text-[#6B7B92]" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 text-[#8B95A5] dark:text-[#6B7B92]" />
                )}
              </div>
            </div>

            {isAiExpanded && (
              <div className="p-3.5 space-y-3">
                {aiState === 'IDLE' && (
                  <div className="text-center py-2 space-y-2">
                    <p className="text-xs text-[#667085] dark:text-[#A5B1C2]">
                      Generate an advisory summary and troubleshooting checklist from ticket details and comments.
                    </p>
                    {isAgentOrAdmin && (
                      <button
                        type="button"
                        onClick={handleGenerateAISummary}
                        className="px-3 py-1.5 text-xs font-semibold btn-role-primary rounded-md transition-colors shadow-xs"
                      >
                        Generate Summary
                      </button>
                    )}
                  </div>
                )}

                {aiState === 'LOADING' && (
                  <div className="p-3 bg-[#F0F3F7] dark:bg-[#202C3B] rounded-md text-center space-y-1">
                    <div className="font-medium text-[#202B3C] dark:text-[#F1F5F9]">
                      Analyzing ticket details...
                    </div>
                    <div className="text-[11px] text-[#8B95A5] dark:text-[#6B7B92]">
                      Processing diagnosis with Gemini
                    </div>
                  </div>
                )}

                {aiState === 'ERROR' && (
                  <div className="p-3 bg-red-50 dark:bg-[#381E24] border border-red-200 dark:border-[#5C2A34] rounded-md space-y-2">
                    <div className="text-red-700 dark:text-[#F87171]">
                      {aiError || 'AI assistance is temporarily unavailable.'}
                    </div>
                    {isAgentOrAdmin && (
                      <button
                        type="button"
                        onClick={handleGenerateAISummary}
                        className="px-2.5 py-1 text-xs font-medium text-red-800 dark:text-red-200 bg-white dark:bg-[#192330] border border-red-300 dark:border-[#5C2A34] rounded hover:bg-red-50 dark:hover:bg-[#202C3B]"
                      >
                        Retry Analysis
                      </button>
                    )}
                  </div>
                )}

                {aiState === 'SUCCESS' && aiSummary && (
                  <div className="space-y-3">
                    <div>
                      <div className="font-bold text-[#202B3C] dark:text-[#F1F5F9] text-[11px]">
                        Issue Summary
                      </div>
                      <div className="text-[#667085] dark:text-[#A5B1C2] mt-0.5 leading-normal">
                        {aiSummary.issueSummary}
                      </div>
                    </div>

                    <div>
                      <div className="font-bold text-[#202B3C] dark:text-[#F1F5F9] text-[11px]">
                        Impact
                      </div>
                      <div className="text-[#667085] dark:text-[#A5B1C2] mt-0.5 leading-normal">
                        {aiSummary.impact}
                      </div>
                    </div>

                    <div>
                      <div className="font-bold text-[#202B3C] dark:text-[#F1F5F9] text-[11px]">
                        What Has Been Tried
                      </div>
                      <div className="text-[#667085] dark:text-[#A5B1C2] mt-0.5 leading-normal">
                        {aiSummary.whatHasBeenTried}
                      </div>
                    </div>

                    <div>
                      <div className="font-bold text-[#202B3C] dark:text-[#F1F5F9] text-[11px]">
                        Current Situation
                      </div>
                      <div className="text-[#667085] dark:text-[#A5B1C2] mt-0.5 leading-normal">
                        {aiSummary.currentSituation}
                      </div>
                    </div>

                    {aiSummary.missingInformation && (
                      <div>
                        <div className="font-bold text-[#202B3C] dark:text-[#F1F5F9] text-[11px]">
                          Missing Information
                        </div>
                        <div className="text-[#667085] dark:text-[#A5B1C2] mt-0.5 leading-normal">
                          {aiSummary.missingInformation}
                        </div>
                      </div>
                    )}

                    {aiSummary.suggestedTroubleshootingSteps?.length > 0 && (
                      <div>
                        <div className="font-bold text-[#202B3C] dark:text-[#F1F5F9] text-[11px]">
                          Suggested Troubleshooting
                        </div>
                        <ol className="mt-1 list-decimal list-inside space-y-1 text-[#667085] dark:text-[#A5B1C2] leading-normal">
                          {aiSummary.suggestedTroubleshootingSteps.map((step, idx) => (
                            <li key={idx}>{step}</li>
                          ))}
                        </ol>
                      </div>
                    )}

                    <div className="pt-2 border-t border-[#E1E6EE] dark:border-[#344153] flex items-center justify-between text-[10px] text-[#8B95A5] dark:text-[#6B7B92]">
                      <span>AI Advisory. Verify before action.</span>
                      {isAgentOrAdmin && (
                        <button
                          type="button"
                          onClick={handleGenerateAISummary}
                          className="text-role-primary hover:underline font-medium"
                        >
                          Regenerate
                        </button>
                      )}
                    </div>
                  </div>
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
          className="fixed inset-0 z-50 bg-[#111821]/80 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-4xl max-h-[90vh] bg-white dark:bg-[#192330] p-2 rounded-lg border border-[#E1E6EE] dark:border-[#344153]"
          >
            <button
              onClick={() => setLightboxUrl(null)}
              className="absolute -top-9 right-0 text-white hover:text-slate-300 p-1"
              aria-label="Close image preview"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={lightboxUrl}
              alt="Evidence preview"
              className="max-h-[80vh] w-auto max-w-full rounded"
            />
          </div>
        </div>
      )}
    </div>
  );
};
