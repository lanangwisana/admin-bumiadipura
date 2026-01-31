import { Navigate } from 'react-router-dom';
import { canAccessFeature } from '../utils/permissions';

/**
 * Protected Route Component
 * Prevents unauthorized access to features based on user role
 * 
 * @param {ReactNode} children - Component to render if authorized
 * @param {string} feature - Feature name to check access
 * @param {object} user - Current user object with role
 */
const ProtectedRoute = ({ children, feature, user }) => {
  // Not logged in
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  // Check if user can access this feature
  if (feature && !canAccessFeature(user.role, feature)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-8 bg-white rounded-lg shadow-lg max-w-md">
          <div className="text-6xl mb-4">🚫</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            Akses Ditolak
          </h1>
          <p className="text-gray-600 mb-6">
            Anda tidak memiliki izin untuk mengakses fitur ini.
          </p>
          <button
            onClick={() => window.history.back()}
            className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
          >
            Kembali
          </button>
        </div>
      </div>
    );
  }
  
  return children;
};

export default ProtectedRoute;
