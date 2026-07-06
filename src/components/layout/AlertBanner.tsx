'use client';

import { Info, AlertTriangle, XCircle, CheckCircle, X } from 'lucide-react';

interface AlertBannerProps {
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message?: string;
  dismissible?: boolean;
  onDismiss?: () => void;
}

const STYLES = {
  info:    { wrap: 'bg-blue-50 border-blue-200',   text: 'text-blue-700',  title: 'text-blue-800',  Icon: Info },
  warning: { wrap: 'bg-amber-50 border-amber-200', text: 'text-amber-700', title: 'text-amber-800', Icon: AlertTriangle },
  error:   { wrap: 'bg-red-50 border-red-200',     text: 'text-red-700',   title: 'text-red-800',   Icon: XCircle },
  success: { wrap: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700', title: 'text-emerald-800', Icon: CheckCircle },
};

export function AlertBanner({ type, title, message, dismissible, onDismiss }: AlertBannerProps) {
  const { wrap, text, title: titleCls, Icon } = STYLES[type];
  return (
    <div className={`${wrap} border rounded-xl px-4 py-3 mb-4 flex items-start gap-3`}>
      <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${text}`} />
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold ${titleCls}`}>{title}</p>
        {message && <p className={`text-xs mt-0.5 ${text} leading-relaxed`}>{message}</p>}
      </div>
      {dismissible && onDismiss && (
        <button onClick={onDismiss} className={`${text} p-0.5 rounded hover:opacity-70 transition-opacity shrink-0`}>
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
