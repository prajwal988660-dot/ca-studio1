import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-gray-200 mb-4">404</h1>
        <h2 className="text-xl font-medium text-gray-700 mb-2">Page Not Found</h2>
        <p className="text-sm text-gray-500 mb-6">The page you are looking for does not exist or has been moved.</p>
        <Link to="/companies" className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
          Go to Companies
        </Link>
      </div>
    </div>
  );
}
