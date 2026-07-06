'use client';

import React from 'react';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: { label: string; onClick: () => void };
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
      {icon && <div className="text-gray-300 mb-4 flex justify-center">{icon}</div>}
      <h3 className="text-lg font-medium text-gray-600 mb-2">{title}</h3>
      <p className="text-sm text-gray-400 max-w-md mx-auto">{description}</p>
      {action && (
        <button onClick={action.onClick} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
          {action.label}
        </button>
      )}
    </div>
  );
}
