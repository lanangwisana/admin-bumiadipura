/**
 * Permission System for Bumi Adipura Admin
 * 
 * Roles:
 * - RW: Super Admin (Pengurus RW) - Full access to all RT data
 * - RT: Area Admin (Ketua RT) - Access limited to their RT only
 */

// Feature Access Control
export const FEATURE_ACCESS = {
  dashboard: ['RW', 'RT'],
  content: ['RW', 'RT'],
  finance: ['RW', 'RT'],
  residents: ['RW', 'RT'],
  iot: ['RW', 'RT'],
  reports: ['RW', 'RT'],
  forum: ['RW', 'RT'],
  users: ['RW'], // RW ONLY
};

// Granular Permissions
export const PERMISSIONS = {
  // Content (News & Events)
  CONTENT_VIEW_ALL: ['RW'],
  CONTENT_VIEW_OWN: ['RT', 'RW'],
  CONTENT_CREATE_ALL: ['RW'],
  CONTENT_CREATE_OWN: ['RT', 'RW'],
  CONTENT_EDIT_ALL: ['RW'],
  CONTENT_EDIT_OWN: ['RT', 'RW'],
  CONTENT_DELETE_ALL: ['RW'],
  CONTENT_DELETE_OWN: ['RT', 'RW'],
  
  // Finance
  FINANCE_VIEW_ALL: ['RW'], // RW can view all RT finances
  FINANCE_VIEW_OWN: ['RT', 'RW'],
  FINANCE_CREATE: ['RT', 'RW'], // RT can create for own RT
  FINANCE_EDIT: ['RT', 'RW'], // RT can edit own RT
  FINANCE_DELETE: ['RT', 'RW'], // RT can delete own RT
  FINANCE_APPROVE: ['RW'], // Only RW can approve (if needed)
  
  // Residents
  RESIDENTS_VIEW_ALL: ['RW', 'RT'], // Both can view
  RESIDENTS_CREATE: ['RT'], // Only RT can create
  RESIDENTS_EDIT: ['RT'], // Only RT can edit
  RESIDENTS_DELETE: ['RT'], // Only RT can delete
  RESIDENTS_EXPORT_ALL: ['RW'],
  RESIDENTS_EXPORT_OWN: ['RT', 'RW'],
  
  // IoT Control
  IOT_VIEW_ALL: ['RW'],
  IOT_VIEW_OWN: ['RT', 'RW'],
  IOT_CONTROL_ALL: ['RW'],
  IOT_CONTROL_OWN: ['RT', 'RW'],
  
  // Reports/Permits
  REPORTS_VIEW_ALL: ['RW'],
  REPORTS_VIEW_OWN: ['RT', 'RW'],
  REPORTS_APPROVE_ALL: ['RW'],
  REPORTS_APPROVE_OWN: ['RT', 'RW'],
  
  // Forum
  FORUM_VIEW_ALL: ['RW'],
  FORUM_VIEW_OWN: ['RT', 'RW'],
  FORUM_MODERATE_ALL: ['RW'],
  FORUM_MODERATE_OWN: ['RT', 'RW'],
  
  // Users Management
  USERS_VIEW: ['RW'],
  USERS_CREATE: ['RW'],
  USERS_EDIT: ['RW'],
  USERS_DELETE: ['RW'],
  
  // Dashboard
  DASHBOARD_VIEW_ALL: ['RW'],
  DASHBOARD_VIEW_OWN: ['RT', 'RW'],
};

/**
 * Check if user has specific permission
 * @param {string} userRole - User's role (RW or RT)
 * @param {string} permission - Permission to check
 * @returns {boolean}
 */
export const hasPermission = (userRole, permission) => {
  if (!userRole || !permission) return false;
  return PERMISSIONS[permission]?.includes(userRole) || false;
};

/**
 * Check if user can access a feature
 * @param {string} userRole - User's role (RW or RT)
 * @param {string} feature - Feature name
 * @returns {boolean}
 */
export const canAccessFeature = (userRole, feature) => {
  if (!userRole || !feature) return false;
  return FEATURE_ACCESS[feature]?.includes(userRole) || false;
};

/**
 * Check if data belongs to user's scope
 * @param {object} data - Data object with rtNumber field
 * @param {string} userRole - User's role
 * @param {string} userRtNumber - User's RT number
 * @returns {boolean}
 */
export const isInUserScope = (data, userRole, userRtNumber) => {
  if (userRole === 'RW') {
    // RW can access all data
    return true;
  }
  
  if (userRole === 'RT') {
    // RT can only access their own RT data
    return data.rtNumber === userRtNumber;
  }
  
  return false;
};

/**
 * Filter array of data by user scope
 * @param {array} dataArray - Array of data objects
 * @param {string} userRole - User's role
 * @param {string} userRtNumber - User's RT number
 * @returns {array}
 */
export const filterByScope = (dataArray, userRole, userRtNumber) => {
  if (!Array.isArray(dataArray)) return [];
  
  if (userRole === 'RW') {
    // RW sees all data
    return dataArray;
  }
  
  if (userRole === 'RT') {
    // RT only sees their own RT data
    return dataArray.filter(item => item.rtNumber === userRtNumber);
  }
  
  return [];
};

/**
 * Get permission mode for a feature based on role
 * @param {string} userRole - User's role
 * @param {string} feature - Feature name
 * @returns {object} { canView, canCreate, canEdit, canDelete, scope }
 */
export const getFeaturePermissions = (userRole, feature) => {
  const permissions = {
    content: {
      RW: { canView: true, canCreate: true, canEdit: true, canDelete: true, scope: 'all' },
      RT: { canView: true, canCreate: true, canEdit: true, canDelete: true, scope: 'own' }
    },
    finance: {
      RW: { canView: true, canCreate: false, canEdit: false, canDelete: false, scope: 'all' },
      RT: { canView: true, canCreate: true, canEdit: true, canDelete: true, scope: 'own' }
    },
    residents: {
      RW: { canView: true, canCreate: false, canEdit: false, canDelete: false, scope: 'all' },
      RT: { canView: true, canCreate: true, canEdit: true, canDelete: true, scope: 'own' }
    },
    users: {
      RW: { canView: true, canCreate: true, canEdit: true, canDelete: true, scope: 'all' },
      RT: { canView: false, canCreate: false, canEdit: false, canDelete: false, scope: 'none' }
    },
    iot: {
      RW: { canView: true, canCreate: true, canEdit: true, canDelete: true, scope: 'all' },
      RT: { canView: true, canCreate: true, canEdit: true, canDelete: true, scope: 'own' }
    },
    reports: {
      RW: { canView: true, canCreate: true, canEdit: true, canDelete: true, scope: 'all' },
      RT: { canView: true, canCreate: true, canEdit: true, canDelete: true, scope: 'own' }
    },
    forum: {
      RW: { canView: true, canCreate: true, canEdit: true, canDelete: true, scope: 'all' },
      RT: { canView: true, canCreate: true, canEdit: true, canDelete: true, scope: 'own' }
    }
  };
  
  return permissions[feature]?.[userRole] || {
    canView: false,
    canCreate: false,
    canEdit: false,
    canDelete: false,
    scope: 'none'
  };
};

export default {
  FEATURE_ACCESS,
  PERMISSIONS,
  hasPermission,
  canAccessFeature,
  isInUserScope,
  filterByScope,
  getFeaturePermissions
};
