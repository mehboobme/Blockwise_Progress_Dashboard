/**
 * APS Authentication Server
 * Handles OAuth token generation for viewer access
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const {
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
  authenticateJWT,
  optionalJWT
} = require('./jwt-utils');

const app = express();
const oauthApp = express(); // Separate app for OAuth callbacks
const PORT = process.env.PORT || 3000;
const OAUTH_PORT = process.env.OAUTH_PORT || 8080;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('../')); // Serve static files from parent directory

// OAuth app middleware
oauthApp.use(cors());
oauthApp.use(express.json());

// Store user tokens in memory (use database in production)
const userTokens = new Map();

// APS Configuration
const APS_CLIENT_ID = process.env.APS_CLIENT_ID;
const APS_CLIENT_SECRET = process.env.APS_CLIENT_SECRET;
const APS_BASE_URL = 'https://developer.api.autodesk.com';
const CALLBACK_URL = process.env.CALLBACK_URL || 'http://localhost:8080/callback';

/**
 * Get 2-legged OAuth token for viewer (for non-ACC models)
 */
app.get('/api/auth/token', async (req, res) => {
  try {
    const response = await axios.post(
      `${APS_BASE_URL}/authentication/v2/token`,
      new URLSearchParams({
        client_id: APS_CLIENT_ID,
        client_secret: APS_CLIENT_SECRET,
        grant_type: 'client_credentials',
        scope: 'viewables:read data:read'
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    res.json({
      access_token: response.data.access_token,
      expires_in: response.data.expires_in
    });
  } catch (error) {
    console.error('Token error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to get token' });
  }
});

/**
 * 3-legged OAuth - Start login flow for ACC models
 */
app.get('/api/auth/login', (req, res) => {
  const authUrl = `${APS_BASE_URL}/authentication/v2/authorize` +
    `?response_type=code` +
    `&client_id=${APS_CLIENT_ID}` +
    `&redirect_uri=${CALLBACK_URL}` +
    `&scope=data:read data:write viewables:read account:read`;
  
  console.log('🔐 Redirecting to Autodesk login...');
  res.redirect(authUrl);
});

/**
 * 3-legged OAuth - Callback handler (on OAuth port 8080)
 */
oauthApp.get('/callback', async (req, res) => {
  const { code } = req.query;
  
  if (!code) {
    return res.status(400).send('No authorization code received');
  }

  try {
    console.log('🔄 Exchanging code for token...');
    
    const response = await axios.post(
      `${APS_BASE_URL}/authentication/v2/token`,
      new URLSearchParams({
        client_id: APS_CLIENT_ID,
        client_secret: APS_CLIENT_SECRET,
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: CALLBACK_URL
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );
    
    // Store APS tokens with simple session ID
    const sessionId = 'user_' + Date.now();
    userTokens.set(sessionId, {
      access_token: response.data.access_token,
      refresh_token: response.data.refresh_token,
      expires_at: Date.now() + (response.data.expires_in * 1000)
    });

    // Generate JWT tokens for app authentication
    const jwtPayload = {
      sessionId: sessionId,
      apsTokenExpiry: Date.now() + (response.data.expires_in * 1000),
      authType: '3-legged'
    };

    const jwtAccessToken = generateAccessToken(jwtPayload);
    const jwtRefreshToken = generateRefreshToken(jwtPayload);

    console.log('✅ User authenticated successfully');
    console.log('🎫 JWT tokens generated');

    // Return HTML that closes itself and notifies parent
    res.send(`
      <html>
        <body>
          <h2>✅ Authentication Successful!</h2>
          <p>You can close this window and return to the app.</p>
          <script>
            // Store session in parent window
            if (window.opener) {
              window.opener.postMessage({
                type: 'auth_success',
                sessionId: '${sessionId}',
                jwtAccessToken: '${jwtAccessToken}',
                jwtRefreshToken: '${jwtRefreshToken}'
              }, '*');
              setTimeout(() => window.close(), 2000);
            } else {
              // Store in localStorage and redirect
              localStorage.setItem('aps_session_id', '${sessionId}');
              localStorage.setItem('jwt_access_token', '${jwtAccessToken}');
              localStorage.setItem('jwt_refresh_token', '${jwtRefreshToken}');
              setTimeout(() => {
                window.location.href = '/';
              }, 2000);
            }
          </script>
        </body>
      </html>
    `);
  } catch (error) {
    console.error('❌ OAuth callback error:', error.response?.data || error.message);
    res.status(500).send('Authentication failed: ' + error.message);
  }
});

/**
 * Get user token (3-legged) - Legacy endpoint
 */
app.get('/api/auth/user-token', (req, res) => {
  const sessionId = req.query.sessionId;

  if (!sessionId) {
    console.log('❌ No session ID provided');
    return res.status(401).json({ 
      error: 'No session ID provided',
      hint: 'Make sure you logged in first'
    });
  }

  const tokenData = userTokens.get(sessionId);

  if (!tokenData) {
    const availableSessions = Array.from(userTokens.keys());
    console.log(`❌ Session not found: ${sessionId}`);
    console.log(`📊 Available sessions: ${availableSessions.join(', ')}`);
    console.log(`📊 Total sessions stored: ${userTokens.size}`);
    
    return res.status(401).json({ 
      error: 'Session not found or expired',
      hint: 'Please login again. If problem persists, check if token endpoint is accessible.',
      sessionId: sessionId,
      availableSessions: availableSessions.length > 0 ? availableSessions.slice(0, 3) : []
    });
  }

  // Check if token is expired
  if (Date.now() >= tokenData.expires_at) {
    console.log(`⏰ Token expired for session: ${sessionId}`);
    console.log(`   Expired ${Math.floor((Date.now() - tokenData.expires_at) / 1000)}s ago`);
    userTokens.delete(sessionId);
    return res.status(401).json({ 
      error: 'Token expired, please login again',
      hint: 'Your APS token has expired. Please login again.'
    });
  }

  const timeRemaining = Math.floor((tokenData.expires_at - Date.now()) / 1000);
  console.log(`✅ User token retrieved for session ${sessionId} (expires in ${timeRemaining}s)`);
  
  res.json({
    access_token: tokenData.access_token,
    expires_in: timeRemaining,
    session_id: sessionId
  });
});

/**
 * Session Debug endpoint - Check what sessions are stored
 */
app.get('/api/auth/session-info', (req, res) => {
  const sessions = Array.from(userTokens.entries()).map(([id, data]) => ({
    sessionId: id,
    expiresAt: new Date(data.expires_at).toISOString(),
    expiresIn: Math.floor((data.expires_at - Date.now()) / 1000),
    isExpired: Date.now() >= data.expires_at
  }));

  console.log(`📊 Session info requested. Current sessions: ${sessions.length}`);

  res.json({
    timestamp: new Date().toISOString(),
    totalSessions: sessions.length,
    sessions: sessions
  });
});

/**
 * JWT Refresh Token endpoint
 */
app.post('/api/auth/refresh', (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(401).json({ error: 'No refresh token provided' });
  }

  try {
    // Verify refresh token
    const decoded = verifyToken(refreshToken);

    // Generate new access token
    const newPayload = {
      sessionId: decoded.sessionId,
      apsTokenExpiry: decoded.apsTokenExpiry,
      authType: decoded.authType
    };

    const newAccessToken = generateAccessToken(newPayload);

    console.log('🔄 JWT token refreshed for session:', decoded.sessionId);

    res.json({
      access_token: newAccessToken,
      token_type: 'Bearer'
    });
  } catch (error) {
    console.error('❌ Token refresh error:', error.message);
    res.status(403).json({ error: error.message });
  }
});

/**
 * JWT Verify endpoint (for debugging)
 */
app.post('/api/auth/verify', (req, res) => {
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({ error: 'No token provided' });
  }

  try {
    const decoded = verifyToken(token);
    res.json({
      valid: true,
      payload: decoded
    });
  } catch (error) {
    res.status(403).json({
      valid: false,
      error: error.message
    });
  }
});

/**
 * Get derivative URN from ACC item (PROPER METHOD for ACC models)
 * Based on: https://aps.autodesk.com/blog/get-derivative-urn-accbim360-file-viewing-it-viewer
 */
app.get('/api/acc/derivative-urn', async (req, res) => {
  try {
    const { projectId, itemUrn } = req.query;
    const token = req.headers.authorization?.split(' ')[1];

    if (!projectId || !itemUrn) {
      return res.status(400).json({ error: 'Missing projectId or itemUrn' });
    }

    console.log('🔍 Getting derivative URN for ACC item...');

    // Decode the item URN if it's base64 encoded
    const decodedItemUrn = itemUrn.includes(':') ? itemUrn : Buffer.from(itemUrn, 'base64').toString('utf-8');
    
    // Step 1: Get item details to find the tip version
    const itemUrl = `https://developer.api.autodesk.com/data/v1/projects/b.${projectId}/items/${encodeURIComponent(decodedItemUrn)}`;
    
    const itemResponse = await axios.get(itemUrl, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const tipVersionId = itemResponse.data.data.relationships.tip.data.id;
    console.log('✅ Found tip version:', tipVersionId);

    // Step 2: Get version details to find derivatives
    const versionUrl = `https://developer.api.autodesk.com/data/v1/projects/b.${projectId}/versions/${encodeURIComponent(tipVersionId)}`;
    
    const versionResponse = await axios.get(versionUrl, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    // Step 3: Extract derivative URN
    const derivatives = versionResponse.data.data.relationships.derivatives?.data;
    
    if (!derivatives || derivatives.length === 0) {
      console.log('❌ No derivatives found');
      return res.json({
        success: false,
        message: 'No derivatives found. Model may need translation.',
        tipVersionId: tipVersionId
      });
    }

    const derivativeUrn = derivatives[0].id;
    console.log('✅ Found derivative URN:', derivativeUrn);

    // Base64 encode for viewer
    const base64Urn = Buffer.from(derivativeUrn).toString('base64');
    
    res.json({
      success: true,
      derivativeUrn: derivativeUrn,
      base64Urn: base64Urn,
      tipVersionId: tipVersionId
    });

  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
    res.status(500).json({ 
      error: 'Failed to get derivative URN',
      details: error.response?.data || error.message 
    });
  }
});

/**
 * Get model metadata from ACC
 */
app.get('/api/models/:urn/metadata', async (req, res) => {
  try {
    const { urn } = req.params;
    const token = req.headers.authorization?.split(' ')[1];

    const response = await axios.get(
      `${APS_BASE_URL}/modelderivative/v2/designdata/${urn}/metadata`,
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );

    res.json(response.data);
  } catch (error) {
    console.error('Metadata error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to get metadata' });
  }
});

/**
 * Get derivative URN from ACC item
 */
app.post('/api/acc/get-derivative-urn', async (req, res) => {
  try {
    const { projectId, itemUrn } = req.body;
    const token = req.headers.authorization?.split(' ')[1];

    // Step 1: Get item details from ACC
    const itemResponse = await axios.get(
      `https://developer.api.autodesk.com/data/v1/projects/${projectId}/items/${itemUrn}`,
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );

    const tipVersion = itemResponse.data.data.relationships.tip.data.id;
    
    // Step 2: Get version details
    const versionResponse = await axios.get(
      `https://developer.api.autodesk.com/data/v1/projects/${projectId}/versions/${tipVersion}`,
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );

    const derivatives = versionResponse.data.data.relationships.derivatives?.data;
    
    if (derivatives && derivatives.length > 0) {
      const derivativeUrn = derivatives[0].id;
      console.log('Found derivative URN:', derivativeUrn);
      
      res.json({
        success: true,
        itemUrn: itemUrn,
        derivativeUrn: derivativeUrn,
        versionId: tipVersion
      });
    } else {
      res.json({
        success: false,
        message: 'No derivatives found. Model may need translation.',
        itemUrn: itemUrn,
        versionId: tipVersion
      });
    }

  } catch (error) {
    console.error('ACC error:', error.response?.data || error.message);
    res.status(500).json({ 
      error: 'Failed to get derivative URN',
      details: error.response?.data || error.message 
    });
  }
});

/**
 * AUTO-VERSION DETECTION: Get latest version derivative URN from ACC lineage
 * This automatically gets the latest version without hardcoding URN
 */
app.get('/api/acc/latest-model', async (req, res) => {
  try {
    // Fixed identifiers from your ACC URL - these don't change
    const PROJECT_ID = 'd99b2475-9a5c-4752-abb1-b6b8c3e8c2a3';
    const LINEAGE_URN = 'urn:adsk.wipprod:dm.lineage:_mxP3Z5BRUqUT0T7xKPyxg';
    const VIEWABLE_GUID = 'ad763e05-577f-ccd1-4c87-ce502f12e069';
    
    // Get user token from session
    const sessionId = req.query.sessionId || req.headers['x-session-id'];
    let token = req.headers.authorization?.split(' ')[1];
    
    // If no token in header, try to get from session
    if (!token && sessionId) {
      const tokenData = userTokens.get(sessionId);
      if (tokenData && Date.now() < tokenData.expires_at) {
        token = tokenData.access_token;
      } else if (tokenData) {
        console.log('⏰ Session token expired for:', sessionId);
      } else {
        console.log('❌ Session not found (server may have restarted):', sessionId);
        console.log('   Available sessions:', Array.from(userTokens.keys()));
      }
    }
    
    if (!token) {
      return res.status(401).json({ 
        error: 'Authentication required',
        hint: 'Please click Login button again (session expired or server restarted)',
        sessionId: sessionId || 'none',
        availableSessions: userTokens.size
      });
    }

    console.log('🔄 Fetching latest model version from ACC...');
    console.log('   Project ID:', PROJECT_ID);
    console.log('   Lineage URN:', LINEAGE_URN);

    // Step 1: Get item details using lineage URN to find the tip (latest) version
    const itemUrl = `https://developer.api.autodesk.com/data/v1/projects/b.${PROJECT_ID}/items/${encodeURIComponent(LINEAGE_URN)}`;
    console.log('   Item URL:', itemUrl);
    
    let itemResponse;
    try {
      itemResponse = await axios.get(itemUrl, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      console.log('   Item response received');
    } catch (itemError) {
      console.error('❌ Failed to get item:', itemError.response?.data || itemError.message);
      return res.status(500).json({
        error: 'Failed to get item from ACC',
        details: itemError.response?.data || itemError.message
      });
    }

    // Debug: Log the response structure
    console.log('   Item data keys:', Object.keys(itemResponse.data?.data || {}));
    console.log('   Relationships:', Object.keys(itemResponse.data?.data?.relationships || {}));
    
    // Check if tip relationship exists
    if (!itemResponse.data?.data?.relationships?.tip?.data?.id) {
      console.error('❌ Tip version not found in response');
      console.log('   Full relationships:', JSON.stringify(itemResponse.data?.data?.relationships, null, 2));
      return res.status(500).json({
        error: 'Tip version not found',
        details: 'The item does not have a tip version relationship',
        relationships: Object.keys(itemResponse.data?.data?.relationships || {})
      });
    }

    const tipVersionId = itemResponse.data.data.relationships.tip.data.id;
    console.log('✅ Found tip (latest) version:', tipVersionId);

    // Step 2: Get version details to find derivatives
    const versionUrl = `https://developer.api.autodesk.com/data/v1/projects/b.${PROJECT_ID}/versions/${encodeURIComponent(tipVersionId)}`;
    
    let versionResponse;
    try {
      versionResponse = await axios.get(versionUrl, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
    } catch (versionError) {
      console.error('❌ Failed to get version:', versionError.response?.data || versionError.message);
      return res.status(500).json({
        error: 'Failed to get version details',
        details: versionError.response?.data || versionError.message
      });
    }

    // Extract version number from response
    const versionNumber = versionResponse.data.data.attributes?.versionNumber || 'unknown';
    const fileName = versionResponse.data.data.attributes?.displayName || 'unknown';
    console.log('📄 File:', fileName, '| Version:', versionNumber);

    // Debug: Log version relationships
    console.log('   Version relationships:', Object.keys(versionResponse.data.data.relationships || {}));
    
    // Step 3: Extract derivative URN - check multiple possible locations
    let derivativeUrn = null;
    
    // Option 1: Check derivatives relationship (array format)
    const derivatives = versionResponse.data.data.relationships?.derivatives?.data;
    if (derivatives) {
      console.log('   Derivatives data type:', typeof derivatives, Array.isArray(derivatives) ? `(array of ${derivatives.length})` : '');
      if (Array.isArray(derivatives) && derivatives.length > 0) {
        derivativeUrn = derivatives[0].id;
      } else if (derivatives.id) {
        // Single object format
        derivativeUrn = derivatives.id;
      }
    }
    
    // Option 2: For Navisworks/federated models, use the version URN directly
    if (!derivativeUrn) {
      // The tip version ID is already a viewable URN for NWC files
      // Format: urn:adsk.wipprod:fs.file:vf.{GUID}?version=N
      console.log('   No derivatives found, using version URN directly');
      derivativeUrn = tipVersionId;
    }
    
    if (!derivativeUrn) {
      console.log('⚠️ No derivative URN found');
      console.log('   Full version relationships:', JSON.stringify(versionResponse.data.data.relationships, null, 2));
      return res.json({
        success: false,
        message: 'No derivatives found. Model may need translation.',
        tipVersionId: tipVersionId,
        versionNumber: versionNumber,
        fileName: fileName
      });
    }

    console.log('✅ Found derivative URN:', derivativeUrn);

    // Determine if derivativeUrn is already base64 or raw URN
    // Raw URNs start with "urn:", base64 does not
    let base64Urn;
    if (derivativeUrn.startsWith('urn:')) {
      // Raw URN - needs encoding (URL-safe base64)
      base64Urn = Buffer.from(derivativeUrn).toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
      console.log('   Encoded raw URN to base64');
    } else {
      // Already base64 encoded
      base64Urn = derivativeUrn;
      console.log('   URN already base64 encoded');
    }
    
    console.log('✅ Base64 URN for viewer:', base64Urn);
    console.log('🎯 Viewable GUID:', VIEWABLE_GUID);

    res.json({
      success: true,
      derivativeUrn: derivativeUrn,
      base64Urn: base64Urn,
      viewableGuid: VIEWABLE_GUID,
      tipVersionId: tipVersionId,
      versionNumber: versionNumber,
      fileName: fileName,
      projectId: PROJECT_ID
    });

  } catch (error) {
    console.error('❌ Error fetching latest model:', error.response?.data || error.message);
    res.status(500).json({ 
      error: 'Failed to get latest model version',
      details: error.response?.data || error.message 
    });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start main app server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📁 Serving static files from parent directory`);
  console.log(`🔑 APS Client ID: ${APS_CLIENT_ID ? 'Configured' : 'Missing'}`);
});

// Start OAuth callback server on separate port
oauthApp.listen(OAUTH_PORT, () => {
  console.log(`🔐 OAuth callback server running on http://localhost:${OAUTH_PORT}`);
});
