import React, { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../lib/api.ts';
import { useToast } from '../context/ToastContext.tsx';
import {
  X,
  ChevronDown,
  ChevronRight,
  ArrowLeft,
  AlertCircle,
  UploadCloud,
  Send,
  FileImage,
  FileVideo,
  CheckCircle2,
} from 'lucide-react';

const CATEGORIES = [
  'Application Error',
  'Account / Access',
  'API / Integration',
  'Configuration',
  'Performance',
  'Data',
  'General',
];

interface SelectedFile {
  file: File;
  previewUrl: string;
  isImage: boolean;
  isVideo: boolean;
}

export const CreateTicketPage: React.FC = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();

  // Main fields
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState('Application Error');
  const [priority, setPriority] = useState('MEDIUM');
  const [description, setDescription] = useState('');

  // Diagnostic details accordion
  const [showDiagnosticDetails, setShowDiagnosticDetails] = useState(false);
  const [tryingToDo, setTryingToDo] = useState('');
  const [expectedResult, setExpectedResult] = useState('');
  const [actualResult, setActualResult] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [attemptedSolution, setAttemptedSolution] = useState('');

  // Evidence
  const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Submit states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ subject?: string; description?: string }>({});

  const processFiles = (files: File[]) => {
    setFileError(null);
    if (!files.length) return;

    const newSelections: SelectedFile[] = [];

    for (const file of files) {
      const isImg = file.type.startsWith('image/');
      const isVid = file.type.startsWith('video/');

      if (!isImg && !isVid) {
        setFileError(`"${file.name}" is not supported. Use JPG, PNG, WEBP, MP4, WEBM, or MOV.`);
        continue;
      }

      if (isImg && file.size > 5 * 1024 * 1024) {
        setFileError(`Image "${file.name}" exceeds 5 MB limit.`);
        continue;
      }

      if (isVid && file.size > 25 * 1024 * 1024) {
        setFileError(`Video "${file.name}" exceeds 25 MB limit.`);
        continue;
      }

      if (selectedFiles.length + newSelections.length >= 5) {
        setFileError('Maximum 5 files allowed.');
        break;
      }

      const previewUrl = URL.createObjectURL(file);
      newSelections.push({
        file,
        previewUrl,
        isImage: isImg,
        isVideo: isVid,
      });
    }

    setSelectedFiles((prev) => [...prev, ...newSelections]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    processFiles(files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files || []);
    processFiles(files);
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => {
      URL.revokeObjectURL(prev[index].previewUrl);
      return prev.filter((_, i) => i !== index);
    });
  };

  const validateForm = () => {
    const errors: { subject?: string; description?: string } = {};
    if (!subject.trim()) {
      errors.subject = 'Subject is required';
    } else if (subject.trim().length < 5) {
      errors.subject = 'Subject should be at least 5 characters';
    }

    if (!description.trim()) {
      errors.description = 'Problem description is required';
    } else if (description.trim().length < 10) {
      errors.description = 'Please describe the problem with at least 10 characters';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      setUploadProgress(15);

      // 1. Create ticket
      const payload: any = {
        subject: subject.trim(),
        category,
        priority,
        description: description.trim(),
      };

      if (tryingToDo.trim()) payload.tryingToDo = tryingToDo.trim();
      if (expectedResult.trim()) payload.expectedResult = expectedResult.trim();
      if (actualResult.trim()) payload.actualResult = actualResult.trim();
      if (errorMessage.trim()) payload.errorMessage = errorMessage.trim();
      if (attemptedSolution.trim()) payload.attemptedSolution = attemptedSolution.trim();

      const createRes = await api.post('/tickets', payload);
      const ticketId = createRes.data.ticket.id;
      setUploadProgress(50);

      // 2. Upload attachments if any
      if (selectedFiles.length > 0) {
        setUploadProgress(70);
        const formData = new FormData();
        selectedFiles.forEach((sf) => formData.append('files', sf.file));

        await api.post(`/tickets/${ticketId}/attachments`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      setUploadProgress(100);
      showToast('Support ticket created successfully', 'success');
      navigate(`/tickets/${ticketId}`);
    } catch (err: any) {
      console.error('Failed to create ticket:', err);
      setError(err.response?.data?.error || 'Failed to submit ticket. Please try again.');
      showToast('Failed to create ticket', 'error');
    } finally {
      setIsSubmitting(false);
      setUploadProgress(null);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      {/* Top Header */}
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
          <span className="text-xs text-[#202B3C] dark:text-[#F1F5F9] font-medium">New</span>
        </div>
        <h1 className="text-xl font-bold tracking-tight text-[#202B3C] dark:text-[#F1F5F9]">
          Raise Support Ticket
        </h1>
        <p className="text-xs text-[#667085] dark:text-[#A5B1C2] mt-1">
          Submit technical issues with detailed diagnostic context and evidence for faster triage.
        </p>
      </div>

      {error && (
        <div className="p-3 bg-red-50 dark:bg-[#381E24] border border-red-200 dark:border-[#5C2A34] rounded-md text-xs text-red-700 dark:text-[#F87171] flex items-center gap-2 animate-fade-in">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
          <span>{error}</span>
        </div>
      )}

      {/* Upload Progress Bar */}
      {uploadProgress !== null && (
        <div className="bg-white dark:bg-[#192330] p-4 rounded-lg border border-[#E1E6EE] dark:border-[#344153] space-y-2 animate-fade-in">
          <div className="flex justify-between text-xs font-semibold text-[#202B3C] dark:text-[#F1F5F9]">
            <span>Submitting ticket & attachments...</span>
            <span className="font-mono tabular-nums">{uploadProgress}%</span>
          </div>
          <div className="w-full bg-[#E1E6EE] dark:bg-[#344153] h-2 rounded-full overflow-hidden">
            <div
              className="bg-role-primary h-full transition-all duration-300 rounded-full"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white dark:bg-[#192330] p-6 rounded-lg border border-[#E1E6EE] dark:border-[#344153] space-y-4 shadow-xs">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#667085] dark:text-[#A5B1C2]">
            Core Information
          </h2>

          {/* Subject */}
          <div>
            <label className="block text-xs font-semibold text-[#202B3C] dark:text-[#F1F5F9] mb-1.5">
              Subject <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={subject}
              onChange={(e) => {
                setSubject(e.target.value);
                if (fieldErrors.subject) setFieldErrors((prev) => ({ ...prev, subject: undefined }));
              }}
              placeholder="Concise summary of the technical issue..."
              className={`w-full px-3 py-2 border rounded-md text-xs bg-white dark:bg-[#202C3B] text-[#202B3C] dark:text-[#F1F5F9] placeholder-[#8B95A5] dark:placeholder-[#6B7B92] focus-role-ring ${
                fieldErrors.subject
                  ? 'border-red-500 dark:border-red-500'
                  : 'border-[#E1E6EE] dark:border-[#344153]'
              }`}
            />
            {fieldErrors.subject && (
              <p className="text-[11px] text-red-600 dark:text-red-400 mt-1">
                {fieldErrors.subject}
              </p>
            )}
          </div>

          {/* Category & Priority */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#202B3C] dark:text-[#F1F5F9] mb-1.5">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 border border-[#E1E6EE] dark:border-[#344153] rounded-md text-xs bg-white dark:bg-[#202C3B] text-[#202B3C] dark:text-[#F1F5F9] focus-role-ring"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#202B3C] dark:text-[#F1F5F9] mb-1.5">
                Urgency / Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full px-3 py-2 border border-[#E1E6EE] dark:border-[#344153] rounded-md text-xs bg-white dark:bg-[#202C3B] text-[#202B3C] dark:text-[#F1F5F9] focus-role-ring"
              >
                <option value="LOW">Low — Minor inconvenience or inquiry</option>
                <option value="MEDIUM">Medium — Standard operational issue</option>
                <option value="HIGH">High — Severe impact on work</option>
                <option value="URGENT">Urgent — System outage or blocking deadline</option>
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-[#202B3C] dark:text-[#F1F5F9] mb-1.5">
              Problem Description <span className="text-red-500">*</span>
            </label>
            <textarea
              required
              rows={5}
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                if (fieldErrors.description) setFieldErrors((prev) => ({ ...prev, description: undefined }));
              }}
              placeholder="Describe the problem, symptoms, and exact reproduction steps..."
              className={`w-full px-3 py-2 border rounded-md text-xs bg-white dark:bg-[#202C3B] text-[#202B3C] dark:text-[#F1F5F9] placeholder-[#8B95A5] dark:placeholder-[#6B7B92] focus-role-ring ${
                fieldErrors.description
                  ? 'border-red-500 dark:border-red-500'
                  : 'border-[#E1E6EE] dark:border-[#344153]'
              }`}
            />
            {fieldErrors.description && (
              <p className="text-[11px] text-red-600 dark:text-red-400 mt-1">
                {fieldErrors.description}
              </p>
            )}
          </div>
        </div>

        {/* Diagnostic Accordion */}
        <div className="bg-white dark:bg-[#192330] rounded-lg border border-[#E1E6EE] dark:border-[#344153] overflow-hidden shadow-xs">
          <button
            type="button"
            onClick={() => setShowDiagnosticDetails((prev) => !prev)}
            className="w-full flex items-center justify-between p-4 text-left hover:bg-[#F0F3F7] dark:hover:bg-[#202C3B] transition-colors"
          >
            <div>
              <div className="text-xs font-semibold text-[#202B3C] dark:text-[#F1F5F9] flex items-center gap-1.5">
                {showDiagnosticDetails ? (
                  <ChevronDown className="w-4 h-4 text-[#8B95A5] dark:text-[#6B7B92]" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-[#8B95A5] dark:text-[#6B7B92]" />
                )}
                <span>Technical Diagnostic Details</span>
              </div>
              <p className="text-[11px] text-[#8B95A5] dark:text-[#6B7B92] mt-0.5 ml-5.5">
                Optional structured context: expected vs actual results, error messages, and attempted fixes.
              </p>
            </div>
            <span className="text-[11px] font-medium text-role-primary hidden sm:inline">
              {showDiagnosticDetails ? 'Hide' : 'Expand'}
            </span>
          </button>

          {showDiagnosticDetails && (
            <div className="p-6 pt-2 border-t border-[#E1E6EE] dark:border-[#344153] space-y-4 animate-fade-in">
              <div>
                <label className="block text-xs font-medium text-[#202B3C] dark:text-[#F1F5F9] mb-1">
                  What were you trying to accomplish?
                </label>
                <input
                  type="text"
                  value={tryingToDo}
                  onChange={(e) => setTryingToDo(e.target.value)}
                  placeholder="e.g. Export monthly invoice summary from data warehouse"
                  className="w-full px-3 py-2 border border-[#E1E6EE] dark:border-[#344153] rounded-md text-xs bg-white dark:bg-[#202C3B] text-[#202B3C] dark:text-[#F1F5F9] focus-role-ring"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#202B3C] dark:text-[#F1F5F9] mb-1">
                    Expected Result
                  </label>
                  <textarea
                    rows={3}
                    value={expectedResult}
                    onChange={(e) => setExpectedResult(e.target.value)}
                    placeholder="e.g. Export generates CSV within 10 seconds"
                    className="w-full px-3 py-2 border border-[#E1E6EE] dark:border-[#344153] rounded-md text-xs bg-white dark:bg-[#202C3B] text-[#202B3C] dark:text-[#F1F5F9] focus-role-ring"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#202B3C] dark:text-[#F1F5F9] mb-1">
                    Actual Result
                  </label>
                  <textarea
                    rows={3}
                    value={actualResult}
                    onChange={(e) => setActualResult(e.target.value)}
                    placeholder="e.g. Stalled indefinitely at 90% without error code"
                    className="w-full px-3 py-2 border border-[#E1E6EE] dark:border-[#344153] rounded-md text-xs bg-white dark:bg-[#202C3B] text-[#202B3C] dark:text-[#F1F5F9] focus-role-ring"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#202B3C] dark:text-[#F1F5F9] mb-1">
                  Exact Error Message or Code (if shown)
                </label>
                <input
                  type="text"
                  value={errorMessage}
                  onChange={(e) => setErrorMessage(e.target.value)}
                  placeholder="e.g. ConnectionPoolTimeoutException: 504 Gateway Timeout"
                  className="w-full px-3 py-2 border border-[#E1E6EE] dark:border-[#344153] rounded-md text-xs bg-white dark:bg-[#202C3B] text-[#202B3C] dark:text-[#F1F5F9] font-mono focus-role-ring"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#202B3C] dark:text-[#F1F5F9] mb-1">
                  What have you already tried?
                </label>
                <input
                  type="text"
                  value={attemptedSolution}
                  onChange={(e) => setAttemptedSolution(e.target.value)}
                  placeholder="e.g. Cleared browser cache, re-authenticated token, tried incognito window"
                  className="w-full px-3 py-2 border border-[#E1E6EE] dark:border-[#344153] rounded-md text-xs bg-white dark:bg-[#202C3B] text-[#202B3C] dark:text-[#F1F5F9] focus-role-ring"
                />
              </div>
            </div>
          )}
        </div>

        {/* Evidence & Attachments */}
        <div className="bg-white dark:bg-[#192330] p-6 rounded-lg border border-[#E1E6EE] dark:border-[#344153] space-y-4 shadow-xs">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#667085] dark:text-[#A5B1C2]">
              Evidence & Attachments
            </h2>
            <span className="text-[11px] text-[#8B95A5] dark:text-[#6B7B92] font-mono">
              {selectedFiles.length}/5 files
            </span>
          </div>

          {fileError && (
            <div className="p-3 bg-red-50 dark:bg-[#381E24] border border-red-200 dark:border-[#5C2A34] rounded-md text-xs text-red-700 dark:text-[#F87171] flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
              <span>{fileError}</span>
            </div>
          )}

          {/* Drag & Drop File Upload Box */}
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
              isDragging
                ? 'border-role-primary bg-role-subtle/50'
                : 'border-[#E1E6EE] dark:border-[#344153] hover:border-role-primary hover:bg-[#F5F7FA] dark:hover:bg-[#202C3B]'
            }`}
          >
            <UploadCloud className="w-8 h-8 text-[#8B95A5] dark:text-[#6B7B92] mx-auto mb-2" />
            <div className="text-xs font-semibold text-[#202B3C] dark:text-[#F1F5F9]">
              Click to browse or drag and drop evidence files
            </div>
            <div className="text-[11px] text-[#8B95A5] dark:text-[#6B7B92] mt-0.5">
              Screenshots (PNG, JPG, WEBP $\le$ 5MB) or screen recordings (MP4, WEBM, MOV $\le$ 25MB)
            </div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              multiple
              className="hidden"
            />
          </div>

          {/* Selected File Previews */}
          {selectedFiles.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
              {selectedFiles.map((sf, idx) => (
                <div
                  key={idx}
                  className="relative border border-[#E1E6EE] dark:border-[#344153] rounded-md p-2 bg-[#F0F3F7] dark:bg-[#202C3B] text-xs"
                >
                  <button
                    type="button"
                    onClick={() => removeFile(idx)}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-600 text-white rounded-full flex items-center justify-center hover:bg-red-700 shadow-xs transition-colors"
                    aria-label="Remove attachment"
                  >
                    <X className="w-3 h-3" />
                  </button>

                  <div className="aspect-video w-full rounded bg-[#E1E6EE] dark:bg-[#192330] overflow-hidden flex items-center justify-center mb-1.5">
                    {sf.isImage ? (
                      <img
                        src={sf.previewUrl}
                        alt="preview"
                        className="w-full h-full object-cover"
                      />
                    ) : sf.isVideo ? (
                      <FileVideo className="w-6 h-6 text-[#8B95A5] dark:text-[#6B7B92]" />
                    ) : (
                      <FileImage className="w-6 h-6 text-[#8B95A5] dark:text-[#6B7B92]" />
                    )}
                  </div>

                  <div className="truncate text-[#202B3C] dark:text-[#F1F5F9] font-medium text-[11px]" title={sf.file.name}>
                    {sf.file.name}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Submission Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Link
            to="/tickets"
            className="px-4 py-2 border border-[#E1E6EE] dark:border-[#344153] rounded-md text-xs font-medium text-[#202B3C] dark:text-[#F1F5F9] hover:bg-[#F0F3F7] dark:hover:bg-[#202C3B] transition-colors"
          >
            Cancel
          </Link>

          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center gap-1.5 px-4 py-2 btn-role-primary rounded-md text-xs font-semibold shadow-xs disabled:opacity-50 transition-colors"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{isSubmitting ? 'Submitting Ticket...' : 'Submit Support Ticket'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
