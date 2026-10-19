import React from 'react';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'rectangular' | 'circular';
  width?: string | number;
  height?: string | number;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className = '',
  variant = 'text',
  width,
  height,
}) => {
  const baseClasses =
    'bg-[#E9EDF3] dark:bg-[#202C3B] animate-shimmer relative overflow-hidden';

  const variantClasses =
    variant === 'circular'
      ? 'rounded-full'
      : variant === 'rectangular'
      ? 'rounded-md'
      : 'rounded';

  return (
    <div
      className={`${baseClasses} ${variantClasses} ${className}`}
      style={{
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height,
      }}
      aria-hidden="true"
    />
  );
};

export const MetricCardSkeleton: React.FC<{ count?: number }> = ({ count = 4 }) => {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="bg-white dark:bg-[#192330] p-4 rounded-lg border border-[#E1E6EE] dark:border-[#344153] space-y-3"
        >
          <div className="flex items-center justify-between">
            <Skeleton className="h-3.5 w-20" />
            <Skeleton variant="circular" className="w-4 h-4" />
          </div>
          <Skeleton className="h-7 w-12" />
          <Skeleton className="h-3 w-28" />
        </div>
      ))}
    </div>
  );
};

export const TableSkeleton: React.FC<{ rows?: number; columns?: number; showMobileCards?: boolean }> = ({
  rows = 5,
  columns = 7,
  showMobileCards = true,
}) => {
  return (
    <div className="bg-white dark:bg-[#192330] rounded-lg border border-[#E1E6EE] dark:border-[#344153] overflow-hidden">
      {/* Mobile Card Skeletons */}
      {showMobileCards && (
        <div className="divide-y divide-[#E1E6EE] dark:divide-[#344153] sm:hidden">
          {Array.from({ length: Math.min(rows, 4) }).map((_, i) => (
            <div key={i} className="p-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <Skeleton className="h-3.5 w-20" />
                <div className="flex gap-2">
                  <Skeleton className="h-4 w-14 rounded-full" />
                  <Skeleton className="h-4 w-16 rounded-full" />
                </div>
              </div>
              <Skeleton className="h-4 w-3/4" />
              <div className="flex items-center justify-between pt-1">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Desktop Table Skeletons */}
      <div className={showMobileCards ? 'hidden sm:block overflow-x-auto' : 'overflow-x-auto'}>
        <table className="min-w-full divide-y divide-[#E1E6EE] dark:divide-[#344153] text-left text-xs">
          <thead className="bg-[#F0F3F7] dark:bg-[#202C3B]">
            <tr>
              {Array.from({ length: columns }).map((_, i) => (
                <th key={i} className="px-4 py-2.5">
                  <Skeleton className="h-3 w-16" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E1E6EE] dark:divide-[#344153] bg-white dark:bg-[#192330]">
            {Array.from({ length: rows }).map((_, rowIndex) => (
              <tr key={rowIndex}>
                <td className="px-4 py-3">
                  <Skeleton className="h-3.5 w-18 font-mono" />
                </td>
                <td className="px-4 py-3">
                  <Skeleton className="h-3.5 w-52" />
                </td>
                <td className="px-4 py-3">
                  <Skeleton className="h-3.5 w-24" />
                </td>
                <td className="px-4 py-3">
                  <Skeleton className="h-4 w-16 rounded-full" />
                </td>
                <td className="px-4 py-3">
                  <Skeleton className="h-4 w-20 rounded-full" />
                </td>
                <td className="px-4 py-3">
                  <Skeleton className="h-3.5 w-24" />
                </td>
                {columns > 6 && (
                  <td className="px-4 py-3 text-right">
                    <Skeleton className="h-3.5 w-16 ml-auto" />
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export const TicketDetailSkeleton: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Header Breadcrumbs & Action Bar */}
      <div className="pb-4 border-b border-[#E1E6EE] dark:border-[#344153] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-3.5 w-36" />
          <Skeleton className="h-6 w-72 sm:w-96" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-24 rounded-md" />
          <Skeleton className="h-8 w-28 rounded-md" />
        </div>
      </div>

      {/* Main 2-Column Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Description, Attachments, Comments */}
        <div className="lg:col-span-2 space-y-6">
          {/* Diagnostic Context Card */}
          <div className="bg-white dark:bg-[#192330] rounded-lg border border-[#E1E6EE] dark:border-[#344153] p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E1E6EE] dark:border-[#344153]">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-20" />
            </div>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-3/4" />
          </div>

          {/* AI Summary Skeleton Card */}
          <div className="bg-white dark:bg-[#192330] rounded-lg border border-[#E1E6EE] dark:border-[#344153] p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Skeleton variant="circular" className="w-5 h-5" />
              <Skeleton className="h-4 w-40" />
            </div>
            <Skeleton className="h-3.5 w-full" />
            <Skeleton className="h-3.5 w-4/5" />
          </div>

          {/* Activity / Comments Skeleton */}
          <div className="bg-white dark:bg-[#192330] rounded-lg border border-[#E1E6EE] dark:border-[#344153] p-5 space-y-4">
            <Skeleton className="h-4 w-28" />
            <div className="space-y-3 pt-2">
              <div className="flex gap-3">
                <Skeleton variant="circular" className="w-8 h-8 shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3.5 w-32" />
                  <Skeleton className="h-12 w-full rounded-md" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right 1 Column: Metadata & Assignment Properties */}
        <div className="space-y-5">
          <div className="bg-white dark:bg-[#192330] rounded-lg border border-[#E1E6EE] dark:border-[#344153] p-5 space-y-4">
            <Skeleton className="h-4 w-28 pb-2" />
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-4 w-20 rounded-full" />
              </div>
              <div className="flex justify-between items-center">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-4 w-24 rounded-full" />
              </div>
              <div className="flex justify-between items-center">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-3.5 w-24" />
              </div>
              <div className="flex justify-between items-center">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-3.5 w-28" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const ProfileSkeleton: React.FC = () => {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="pb-4 border-b border-[#E1E6EE] dark:border-[#344153] space-y-2">
        <Skeleton className="h-6 w-44" />
        <Skeleton className="h-3 w-72" />
      </div>

      <div className="bg-white dark:bg-[#192330] p-6 rounded-lg border border-[#E1E6EE] dark:border-[#344153] space-y-5">
        <div className="flex items-center gap-4 pb-4 border-b border-[#E1E6EE] dark:border-[#344153]">
          <Skeleton variant="circular" className="w-12 h-12 shrink-0" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-52" />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-3 bg-[#F5F7FA] dark:bg-[#202C3B] rounded-md space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-4 w-32" />
          </div>
          <div className="p-3 bg-[#F5F7FA] dark:bg-[#202C3B] rounded-md space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>

        <div className="pt-2">
          <Skeleton className="h-3.5 w-36 mb-3" />
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 border border-[#E1E6EE] dark:border-[#344153] rounded-md space-y-2">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-6 w-8 font-mono" />
            </div>
            <div className="p-3 border border-[#E1E6EE] dark:border-[#344153] rounded-md space-y-2">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-6 w-8 font-mono" />
            </div>
            <div className="p-3 border border-[#E1E6EE] dark:border-[#344153] rounded-md space-y-2">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-6 w-8 font-mono" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
