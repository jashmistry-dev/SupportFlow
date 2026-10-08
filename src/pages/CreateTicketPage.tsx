import React, { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../lib/api.ts';
import {
  X,
  Paperclip,
  ChevronDown,
  ChevronRight,
  ArrowLeft,
  AlertCircle,
  UploadCloud,
  FileQuestion,
  Send,
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

  // Submit states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileError(null);
    const files = Array.from(e.target.files || []);
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
        setFileError(`Image "${file.name}" exceeds 5 MB.`);
        continue;
      }

      if (isVid && file.size > 25 * 1024 * 1024) {
        setFileError(`Video "${file.name}" exceeds 25 MB.`);
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

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => {
      const target = prev[index];
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!subject.trim()) {
      setError('Please enter a problem title.');
      return;
    }
    if (!description.trim()) {
      setError('Please describe what happened.');
      return;
    }

    try {
      setIsSubmitting(true);

      // 1. Create ticket
      const ticketRes = await api.post('/tickets', {
        subject: subject.trim(),
        description: description.trim(),
        category,
        priority,
        tryingToDo: tryingToDo.trim() || undefined,
        expectedResult: expectedResult.trim() || undefined,
        actualResult: actualResult.trim() || undefined,
        errorMessage: errorMessage.trim() || undefined,
        attemptedSolution: attemptedSolution.trim() || undefined,
      });

      const createdTicket = ticketRes.data.ticket;

      // 2. Upload attachments if provided
      if (selectedFiles.length > 0) {
        const formData = new FormData();
        selectedFiles.forEach((sf) => formData.append('files', sf.file));
        await api.post(`/tickets/${createdTicket.id}/attachments`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      navigate(`/tickets/${createdTicket.id}`);
    } catch (err: any) {
      console.error('Failed to create ticket:', err);
      setError(err.response?.data?.error || 'Failed to submit ticket. Please check your connection and try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div>
        <Link
          to="/tickets"
          className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-800 transition-colors mb-2"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to tickets</span>
        </Link>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
          Raise Technical Support Ticket
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Describe the problem clearly. Attach error logs, screenshots, or short video clips to help support engineers resolve it quickly.
        </p>
      </div>

      {error && (
        <div className="p-3.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg border border-slate-200 shadow-xs space-y-5 text-xs">
        {/* Subject */}
        <div>
          <label className="block text-xs font-bold text-slate-800 mb-1.5">
            Problem Title / Summary <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="e.g. Cannot generate quarterly invoice report in billing module"
            className="w-full px-3 py-2 border border-slate-300 rounded-md text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Category & Priority Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1.5">
              Category <span className="text-red-500">*</span>
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-md text-xs bg-white text-slate-800 focus:ring-1 focus:ring-blue-500"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1.5">
              Initial Urgency / Priority
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-md text-xs bg-white text-slate-800 focus:ring-1 focus:ring-blue-500"
            >
              <option value="LOW">Low (Minor inconvenience / question)</option>
              <option value="MEDIUM">Medium (Normal daily workflow issue)</option>
              <option value="HIGH">High (Major blockage / critical feature down)</option>
              <option value="URGENT">Urgent (System outage / critical business stoppage)</option>
            </select>
          </div>
        </div>

        {/* Problem Description */}
        <div>
          <label className="block text-xs font-bold text-slate-800 mb-1.5">
            Problem Description <span className="text-red-500">*</span>
          </label>
          <textarea
            rows={4}
            required
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Detail exactly what happened, when it started, and any steps to reproduce..."
            className="w-full p-3 border border-slate-300 rounded-md text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Collapsible Diagnostic Details */}
        <div className="border border-slate-200 rounded-lg overflow-hidden">
          <button
            type="button"
            onClick={() => setShowDiagnosticDetails(!showDiagnosticDetails)}
            className="w-full px-4 py-3 bg-slate-50 flex items-center justify-between text-left hover:bg-slate-100 transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-800 text-xs">Diagnostic Context (Optional)</span>
              <span className="text-[11px] text-slate-500">Helps agents troubleshoot faster</span>
            </div>
            {showDiagnosticDetails ? (
              <ChevronDown className="w-4 h-4 text-slate-500" />
            ) : (
              <ChevronRight className="w-4 h-4 text-slate-500" />
            )}
          </button>

          {showDiagnosticDetails && (
            <div className="p-4 space-y-4 bg-white border-t border-slate-200">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    What were you trying to accomplish?
                  </label>
                  <input
                    type="text"
                    value={tryingToDo}
                    onChange={(e) => setTryingToDo(e.target.value)}
                    placeholder="e.g. Exporting monthly CSV data for finance audit"
                    className="w-full px-3 py-1.5 border border-slate-300 rounded text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    What did you expect to happen?
                  </label>
                  <input
                    type="text"
                    value={expectedResult}
                    onChange={(e) => setExpectedResult(e.target.value)}
                    placeholder="e.g. Download starts within 5 seconds"
                    className="w-full px-3 py-1.5 border border-slate-300 rounded text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    What actually happened?
                  </label>
                  <input
                    type="text"
                    value={actualResult}
                    onChange={(e) => setActualResult(e.target.value)}
                    placeholder="e.g. Browser timed out with error 504 Gateway Timeout"
                    className="w-full px-3 py-1.5 border border-slate-300 rounded text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    What have you already tried?
                  </label>
                  <input
                    type="text"
                    value={attemptedSolution}
                    onChange={(e) => setAttemptedSolution(e.target.value)}
                    placeholder="e.g. Cleared cache, tried Incognito mode, tried smaller date range"
                    className="w-full px-3 py-1.5 border border-slate-300 rounded text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Error Message or Stack Trace (if any)
                </label>
                <textarea
                  rows={2}
                  value={errorMessage}
                  onChange={(e) => setErrorMessage(e.target.value)}
                  placeholder="Paste error logs or terminal output here..."
                  className="w-full p-2.5 font-mono text-[11px] border border-slate-300 rounded"
                />
              </div>
            </div>
          )}
        </div>

        {/* Evidence Attachments Upload Area */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-slate-800">
            Evidence (Screenshots or Screen Recordings)
          </label>

          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-300 hover:border-blue-400 rounded-lg p-5 text-center cursor-pointer bg-slate-50/50 hover:bg-slate-50 transition-colors"
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              multiple
              accept="image/*,video/*"
              className="hidden"
            />
            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-500 mb-2">
              <UploadCloud className="w-4 h-4" />
            </div>
            <div className="text-xs font-medium text-slate-700">
              Click to select evidence files or drag & drop
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              Supports JPG, PNG, WEBP (up to 5 MB) and MP4, WEBM, MOV (up to 25 MB). Max 5 files.
            </div>
          </div>

          {fileError && (
            <div className="text-[11px] text-red-600 font-medium">
              {fileError}
            </div>
          )}

          {/* Selected File Previews */}
          {selectedFiles.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-2">
              {selectedFiles.map((sf, idx) => (
                <div
                  key={idx}
                  className="relative border border-slate-200 rounded-md p-2 bg-slate-50 group"
                >
                  <button
                    type="button"
                    onClick={() => removeFile(idx)}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center hover:bg-red-600 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>

                  <div className="aspect-video w-full rounded bg-slate-200 overflow-hidden flex items-center justify-center mb-1">
                    {sf.isImage ? (
                      <img
                        src={sf.previewUrl}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <video
                        src={sf.previewUrl}
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>
                  <div className="text-[10px] text-slate-600 truncate font-medium">
                    {sf.file.name}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Submit Actions */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
          <Link
            to="/tickets"
            className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900"
          >
            Cancel
          </Link>

          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors disabled:opacity-50 shadow-xs"
          >
            <Send className="w-3.5 h-3.5" />
            {isSubmitting ? 'Submitting ticket...' : 'Submit Support Ticket'}
          </button>
        </div>
      </form>
    </div>
  );
};
