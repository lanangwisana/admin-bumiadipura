import { useMemo } from 'react';
import {
  hasPermission,
  canAccessFeature,
  isInUserScope,
  filterByScope,
  getFeaturePermissions
} from '../utils/permissions';

/**
 * Custom hook for checking permissions
 * 
 * @param {object} user - Current user object { role, rtNumber, ... }
 * @returns {object} Permission helper functions
 */
export const usePermissions = (user) => {
  const userRole = user?.role;
  const userRtNumber = user?.rtNumber;
  
  return useMemo(() => ({
    // Check if user has specific permission
    can: (permission) => hasPermission(userRole, permission),
    
    // Check if user can access feature
    canAccess: (feature) => canAccessFeature(userRole, feature),
    
    // Check if data is in user's scope
    isInScope: (data) => isInUserScope(data, userRole, userRtNumber),
    
    // Filter data array by scope
    filterData: (dataArray) => filterByScope(dataArray, userRole, userRtNumber),
    
    // Get all permissions for a feature
    getFeaturePerms: (feature) => getFeaturePermissions(userRole, feature),
    
    // Helper flags
    isRW: userRole === 'RW',
    isRT: userRole === 'RT',
    rtNumber: userRtNumber,
    role: userRole,
  }), [userRole, userRtNumber]);
};

/**
 * HOC for permission-based rendering
 * 
 * Usage:
 * <PermissionGuard permission="CONTENT_CREATE">
 *   <CreateButton />
 * </PermissionGuard>
 */
export const PermissionGuard = ({ children, permission, user, fallback = null }) => {
  const { can } = usePermissions(user);
  
  if (!can(permission)) {
    return fallback;
  }
  
  return children;
};

export default usePermissions;
