'use client';

import React from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
  children?: React.ReactNode;
}

export function PageHeader({ title, description, children }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-3 gap-4">
      <div>
        <h1 className="text-xl font-extrabold tracking-tight text-gray-900 leading-tight">{title}</h1>
        {description && (
          <p className="text-xs text-gray-400 mt-0.5">{description}</p>
        )}
      </div>
      {children && (
        <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
          {children}
        </div>
      )}
    </div>
  );
}
