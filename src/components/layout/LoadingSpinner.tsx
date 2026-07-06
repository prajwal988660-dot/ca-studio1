'use client';

interface LoadingSpinnerProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function LoadingSpinner({ message = 'Loading...', size = 'md' }: LoadingSpinnerProps) {
  const sizeClass = size === 'sm' ? 'h-5 w-5' : size === 'lg' ? 'h-12 w-12' : 'h-8 w-8';
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <div className={`animate-spin rounded-full ${sizeClass} border-b-2 border-blue-600`} />
      {message && <p className="text-sm text-gray-400 mt-3">{message}</p>}
    </div>
  );
}
