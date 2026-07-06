'use client';

function friendlyMessage(msg: string): { title: string; body: string } {
  const m = msg.toLowerCase();
  if (m.includes('quota') || m.includes('rate') || m.includes('limit') || m.includes('429'))
    return { title: 'Hey CA, you\'re out of limit', body: 'You\'ve hit the usage limit for now. Please wait a minute and try again — no data has been lost.' };
  if (m.includes('auth') || m.includes('api key') || m.includes('401') || m.includes('403'))
    return { title: 'Connection issue', body: 'There\'s an issue connecting to the service. Please check your API key in Settings and try again.' };
  if (m.includes('network') || m.includes('fetch') || m.includes('offline') || m.includes('failed to fetch'))
    return { title: 'No connection', body: 'Looks like you\'re offline or there\'s a network issue. Check your connection and refresh.' };
  if (m.includes('not found') || m.includes('404'))
    return { title: 'Page not found', body: 'This page doesn\'t exist. Use the sidebar to navigate.' };
  return { title: 'Something went wrong', body: 'We hit a snag loading this page. Your data is safe — just try again.' };
}

export default function CompanyError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { title, body } = friendlyMessage(error.message || '');

  return (
    <div className="flex items-center justify-center min-h-[60vh] px-4">
      <div className="text-center max-w-sm">
        {/* Friendly icon */}
        <div className="mx-auto mb-5 h-16 w-16 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center">
          <svg className="h-8 w-8 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
        </div>

        <h2 className="text-base font-semibold text-gray-800 mb-2">{title}</h2>
        <p className="text-sm text-gray-500 mb-6 leading-relaxed">{body}</p>

        <button
          onClick={() => reset()}
          className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
