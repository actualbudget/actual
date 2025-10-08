/**
 * Authentication and Authorization Checker
 *
 * This module provides utilities to extract user information from requests
 * and check if users have the required permissions for plugin routes.
 */

import { getSession, getUserInfo, isAdmin } from './account-db.js';

const TOKEN_EXPIRATION_NEVER = -1;
const MS_PER_SECOND = 1000;

/**
 * Extract user information from request headers
 *
 * This validates the session token (GUID) by:
 * 1. Looking up the session in the database
 * 2. Getting the user_id from the session
 * 3. Looking up the user to get their permissions
 * 4. Checking if user is admin
 *
 * @param {Object} headers - Request headers
 * @returns {Promise<Object|null>} User info object or null if not authenticated
 */
async function extractUserFromHeaders(headers) {
  // Get token from headers (case-insensitive)
  const token = headers['x-actual-token'] || headers['X-ACTUAL-TOKEN'];

  if (!token) {
    return null;
  }

  try {
    // Step 1: Look up the session by token (GUID)
    const session = getSession(token);

    if (!session) {
      return null;
    }

    // Step 2: Check if session is expired
    if (
      session.expires_at !== TOKEN_EXPIRATION_NEVER &&
      session.expires_at * MS_PER_SECOND <= Date.now()
    ) {
      return null;
    }

    // Step 3: Get user_id from session
    const userId = session.user_id;

    // Step 4: Look up user by user_id
    const user = getUserInfo(userId);

    if (!user) {
      return null;
    }

    // Step 5: Determine user role using the isAdmin function
    const role = isAdmin(userId) ? 'admin' : 'user';

    return {
      id: user.id,
      role,
      username: user.user_name,
      displayName: user.display_name,
    };
  } catch (error) {
    console.error('Authentication error:', error);
    return null;
  }
}

/**
 * Check if a user meets the authentication requirements for a route
 *
 * @param {Object|null} user - User information object
 * @param {string} authLevel - Required auth level: 'anonymous', 'authenticated', 'admin'
 * @returns {Object} Result with allowed flag and error details
 */
function checkAuth(user, authLevel = 'authenticated') {
  // Anonymous routes are always allowed
  if (authLevel === 'anonymous') {
    return { allowed: true };
  }

  // Authenticated routes require a user to be logged in
  if (authLevel === 'authenticated') {
    if (!user) {
      return {
        allowed: false,
        status: 401,
        error: 'unauthorized',
        message: 'Authentication required',
      };
    }
    return { allowed: true };
  }

  // Admin routes require user to be logged in AND have admin role
  if (authLevel === 'admin') {
    if (!user) {
      return {
        allowed: false,
        status: 401,
        error: 'unauthorized',
        message: 'Authentication required',
      };
    }

    if (user.role !== 'admin') {
      return {
        allowed: false,
        status: 403,
        error: 'forbidden',
        message: 'Admin privileges required',
      };
    }

    return { allowed: true };
  }

  // Unknown auth level - default to requiring authentication
  console.warn(
    `Unknown auth level: ${authLevel}, defaulting to 'authenticated'`,
  );
  return checkAuth(user, 'authenticated');
}

/**
 * Find the matching route configuration from manifest
 *
 * @param {Array} routes - Array of route configurations from manifest
 * @param {string} method - HTTP method (GET, POST, etc.)
 * @param {string} path - Request path
 * @returns {Object|null} Matching route config or null
 */
function findMatchingRoute(routes, method, path) {
  if (!routes || routes.length === 0) {
    return null;
  }

  // Try exact match first
  for (const route of routes) {
    if (route.methods.includes(method) && route.path === path) {
      return route;
    }
  }

  // Try pattern matching (for routes with parameters like /user/:id)
  for (const route of routes) {
    if (route.methods.includes(method)) {
      const pattern = route.path.replace(/:[^/]+/g, '[^/]+');
      const regex = new RegExp(`^${pattern}$`);
      if (regex.test(path)) {
        return route;
      }
    }
  }

  return null;
}

/**
 * Get the authentication level for a route
 *
 * @param {Object} manifest - Plugin manifest
 * @param {string} method - HTTP method
 * @param {string} path - Request path
 * @returns {string} Auth level: 'anonymous', 'authenticated', or 'admin'
 */
function getRouteAuthLevel(manifest, method, path) {
  if (!manifest.routes || manifest.routes.length === 0) {
    // No routes defined - default to 'authenticated'
    return 'authenticated';
  }

  const matchingRoute = findMatchingRoute(manifest.routes, method, path);

  if (matchingRoute) {
    // Use the route's auth level, or default to 'authenticated'
    return matchingRoute.auth || 'authenticated';
  }

  // Route not found in manifest - default to 'authenticated'
  return 'authenticated';
}

export {
  extractUserFromHeaders,
  checkAuth,
  getRouteAuthLevel,
  findMatchingRoute,
};
