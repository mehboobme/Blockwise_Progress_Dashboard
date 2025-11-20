/**
 * APS Authentication Module
 * Handles OAuth token management and refresh
 */

import { CONFIG } from './config.js';

class AuthManager {
  constructor() {
    this.accessToken = null;
    this.expiresAt = null;
    this.jwtAccessToken = null;
    this.jwtRefreshToken = null;

    // Load JWT tokens from localStorage on init
    this.loadJWTTokens();
  }

  /**
   * Load JWT tokens from localStorage
   */
  loadJWTTokens() {
    this.jwtAccessToken = localStorage.getItem('jwt_access_token');
    this.jwtRefreshToken = localStorage.getItem('jwt_refresh_token');

    if (this.jwtAccessToken) {
      console.log('🎫 JWT token loaded from localStorage');
    }
  }

  /**
   * Store JWT tokens in localStorage
   */
  storeJWTTokens(accessToken, refreshToken) {
    this.jwtAccessToken = accessToken;
    this.jwtRefreshToken = refreshToken;
    localStorage.setItem('jwt_access_token', accessToken);
    localStorage.setItem('jwt_refresh_token', refreshToken);
    console.log('💾 JWT tokens stored');
  }

  /**
   * Get JWT access token (refresh if expired)
   * @returns {Promise<string>} JWT access token
   */
  async getJWTToken() {
    if (!this.jwtAccessToken) {
      throw new Error('No JWT token available. Please login first.');
    }

    // Try to decode and check expiry
    try {
      const payload = JSON.parse(atob(this.jwtAccessToken.split('.')[1]));
      const expiresAt = payload.exp * 1000;

      // If token expires in less than 5 minutes, refresh it
      if (Date.now() >= expiresAt - (5 * 60 * 1000)) {
        console.log('🔄 JWT token expiring soon, refreshing...');
        await this.refreshJWTToken();
      }

      return this.jwtAccessToken;
    } catch (error) {
      console.error('❌ Error checking JWT expiry:', error);
      // Try to refresh anyway
      try {
        await this.refreshJWTToken();
        return this.jwtAccessToken;
      } catch (refreshError) {
        throw new Error('JWT token invalid and refresh failed. Please login again.');
      }
    }
  }

  /**
   * Refresh JWT access token using refresh token
   */
  async refreshJWTToken() {
    if (!this.jwtRefreshToken) {
      throw new Error('No refresh token available');
    }

    try {
      const response = await fetch(`${CONFIG.SERVER_URL}/api/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          refreshToken: this.jwtRefreshToken
        })
      });

      if (!response.ok) {
        throw new Error('Token refresh failed');
      }

      const data = await response.json();
      this.jwtAccessToken = data.access_token;
      localStorage.setItem('jwt_access_token', data.access_token);
      console.log('✅ JWT token refreshed');
    } catch (error) {
      console.error('❌ JWT refresh failed:', error);
      this.clearJWTTokens();
      throw error;
    }
  }

  /**
   * Verify JWT token with server
   */
  async verifyJWTToken() {
    if (!this.jwtAccessToken) {
      return { valid: false, error: 'No token' };
    }

    try {
      const response = await fetch(`${CONFIG.SERVER_URL}/api/auth/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          token: this.jwtAccessToken
        })
      });

      return await response.json();
    } catch (error) {
      console.error('❌ Token verification failed:', error);
      return { valid: false, error: error.message };
    }
  }

  /**
   * Clear JWT tokens
   */
  clearJWTTokens() {
    this.jwtAccessToken = null;
    this.jwtRefreshToken = null;
    localStorage.removeItem('jwt_access_token');
    localStorage.removeItem('jwt_refresh_token');
    console.log('🧹 JWT tokens cleared');
  }

  /**
   * Get a valid access token (fetch new if expired)
   * @returns {Promise<string>} Access token
   */
  async getAccessToken() {
    // Return cached token if still valid
    if (this.accessToken && this.expiresAt && Date.now() < this.expiresAt) {
      console.log('✅ Using cached token');
      return this.accessToken;
    }

    // Fetch new token
    console.log('🔄 Fetching new access token...');
    try {
      const response = await fetch(`${CONFIG.SERVER_URL}/api/auth/token`);
      
      if (!response.ok) {
        throw new Error(`Token request failed: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Cache token with expiration (subtract 60 seconds for safety margin)
      this.accessToken = data.access_token;
      this.expiresAt = Date.now() + (data.expires_in - 60) * 1000;
      
      console.log('✅ Token obtained successfully');
      return this.accessToken;
      
    } catch (error) {
      console.error('❌ Failed to get access token:', error);
      throw error;
    }
  }

  /**
   * Initialize Autodesk Forge Viewer with authentication
   * @returns {Promise<void>}
   */
  async initializeViewer() {
    return new Promise((resolve) => {
      const options = {
        env: 'AutodeskProduction2',
        api: 'streamingV2',
        // IMPORTANT: For ACC models, specify the project context
        accessToken: null, // Will be provided by getAccessToken callback
        getAccessToken: async (callback) => {
          try {
            // Use 3-legged token if available (for ACC models), otherwise use 2-legged
            let token;
            if (this.isAuthenticated()) {
              // For ACC models - use session-based token from server
              const sessionId = localStorage.getItem('aps_session_id');
              console.log('🔑 Session ID:', sessionId);

              if (sessionId) {
                const tokenUrl = `${CONFIG.SERVER_URL}/api/auth/user-token?sessionId=${sessionId}`;
                console.log('🔄 Fetching user token from:', tokenUrl);

                try {
                  const response = await fetch(tokenUrl);
                  console.log('📥 Token response status:', response.status);

                  if (response.ok) {
                    const data = await response.json();
                    token = data.access_token;
                    console.log('✅ Using 3-legged OAuth token (length:', token?.length, ')');
                    callback(token, data.expires_in || 3600);
                    return;
                  } else {
                    const errorData = await response.json().catch(() => ({}));
                    const errorMsg = errorData.error || 'Unknown error';
                    const hint = errorData.hint || 'Please login again';
                    
                    console.error('❌ Failed to get user token:', response.status, errorMsg);
                    console.error('💡 Hint:', hint);
                    console.error('📊 Full error:', errorData);
                    
                    // Provide helpful error message
                    throw new Error(`Failed to get user token: ${response.status} - ${errorMsg}. ${hint}`);
                  }
                } catch (fetchError) {
                  console.error('❌ Token fetch error:', fetchError);
                  throw fetchError;
                }
              } else {
                console.error('❌ No session ID found in localStorage');
                throw new Error('No session ID found. Please login first.');
              }
            } else {
              // Fallback to 2-legged for non-ACC models
              console.log('ℹ️  Not authenticated, attempting 2-legged OAuth');
              token = await this.getAccessToken();
              console.log('✅ Using 2-legged OAuth token');
              callback(token, 3600);
            }
          } catch (error) {
            console.error('❌ Token callback error:', error);
            console.error('📋 Error details:', {
              message: error.message,
              stack: error.stack
            });
            
            // Don't just fail silently - help user understand what happened
            console.warn('⚠️  Could not get 3-legged token. Attempting 2-legged fallback...');
            try {
              const fallbackToken = await this.getAccessToken();
              console.log('✅ Fallback to 2-legged OAuth successful');
              callback(fallbackToken, 3600);
            } catch (fallbackError) {
              console.error('❌ Fallback also failed:', fallbackError);
              callback('', 0);
            }
          }
        }
      };

      Autodesk.Viewing.Initializer(options, () => {
        console.log('✅ Viewer initialized');
        resolve();
      });
    });
  }

  /**
   * Open login popup for 3-legged OAuth
   */
  openLoginPopup() {
    const width = 600;
    const height = 700;
    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;

    const loginUrl = `${CONFIG.SERVER_URL}/api/auth/login`;

    const popup = window.open(
      loginUrl,
      'Autodesk Login',
      `width=${width},height=${height},left=${left},top=${top}`
    );

    if (!popup) {
      alert('Please allow popups for this site to login');
      return null;
    }

    console.log('🔐 Login popup opened');
    return popup;
  }

  /**
   * Logout - clear all tokens and session
   */
  logout() {
    this.clearAllTokens();
    console.log('👋 Logged out');
  }

  /**
   * Get model metadata
   * @param {string} urn - Model URN
   * @returns {Promise<object>} Metadata
   */
  async getModelMetadata(urn) {
    try {
      const token = await this.getAccessToken();
      const response = await fetch(
        `${CONFIG.SERVER_URL}/api/models/${urn}/metadata`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (!response.ok) {
        throw new Error(`Metadata request failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('❌ Failed to get model metadata:', error);
      throw error;
    }
  }

  /**
   * Clear cached token (useful for debugging)
   */
  clearToken() {
    this.accessToken = null;
    this.expiresAt = null;
    console.log('🧹 Token cache cleared');
  }

  /**
   * Clear all tokens (APS and JWT)
   */
  clearAllTokens() {
    this.clearToken();
    this.clearJWTTokens();
    localStorage.removeItem('aps_session_id');
    console.log('🧹 All tokens cleared');
  }

  /**
   * Check if user is authenticated (has session ID or JWT token)
   */
  isAuthenticated() {
    const sessionId = localStorage.getItem('aps_session_id');
    return !!(sessionId || this.jwtAccessToken);
  }

  /**
   * Handle OAuth login message from popup
   */
  handleLoginMessage(event) {
    if (event.data.type === 'auth_success') {
      const { sessionId, jwtAccessToken, jwtRefreshToken } = event.data;

      // Store session ID
      localStorage.setItem('aps_session_id', sessionId);

      // Store JWT tokens
      this.storeJWTTokens(jwtAccessToken, jwtRefreshToken);

      console.log('✅ Login successful - tokens stored');
    }
  }

  /**
   * Initialize login listener (call on page load)
   */
  initLoginListener() {
    window.addEventListener('message', (event) => {
      this.handleLoginMessage(event);
    });
    console.log('👂 Login message listener initialized');
  }
}

// Export singleton instance
export const authManager = new AuthManager();
export default authManager;
