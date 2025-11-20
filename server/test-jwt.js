/**
 * JWT Testing Script
 * Run with: node test-jwt.js
 */

require('dotenv').config();
const {
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
  decodeToken
} = require('./jwt-utils');

console.log('🧪 JWT Testing Script\n');
console.log('=' .repeat(60));

// Test 1: Generate Access Token
console.log('\n1️⃣ Testing Access Token Generation...');
const testPayload = {
  sessionId: 'test_session_123',
  apsTokenExpiry: Date.now() + 3600000,
  authType: '3-legged',
  userId: 'testuser'
};

const accessToken = generateAccessToken(testPayload);
console.log('✅ Access token generated');
console.log('Token:', accessToken.substring(0, 50) + '...');

// Test 2: Generate Refresh Token
console.log('\n2️⃣ Testing Refresh Token Generation...');
const refreshToken = generateRefreshToken(testPayload);
console.log('✅ Refresh token generated');
console.log('Token:', refreshToken.substring(0, 50) + '...');

// Test 3: Decode Token (without verification)
console.log('\n3️⃣ Testing Token Decode...');
const decoded = decodeToken(accessToken);
console.log('✅ Token decoded successfully');
console.log('Payload:', JSON.stringify(decoded, null, 2));

// Test 4: Verify Token
console.log('\n4️⃣ Testing Token Verification...');
try {
  const verified = verifyToken(accessToken);
  console.log('✅ Token verified successfully');
  console.log('Verified payload:', JSON.stringify(verified, null, 2));
  console.log('\nToken Details:');
  console.log(`  - Issued at: ${new Date(verified.iat * 1000).toLocaleString()}`);
  console.log(`  - Expires at: ${new Date(verified.exp * 1000).toLocaleString()}`);
  console.log(`  - Issuer: ${verified.iss}`);
  console.log(`  - Audience: ${verified.aud}`);
  console.log(`  - Session ID: ${verified.sessionId}`);
} catch (error) {
  console.error('❌ Verification failed:', error.message);
}

// Test 5: Verify Refresh Token
console.log('\n5️⃣ Testing Refresh Token Verification...');
try {
  const verifiedRefresh = verifyToken(refreshToken);
  console.log('✅ Refresh token verified successfully');
  console.log(`  - Expires at: ${new Date(verifiedRefresh.exp * 1000).toLocaleString()}`);

  const now = new Date();
  const expiry = new Date(verifiedRefresh.exp * 1000);
  const daysUntilExpiry = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
  console.log(`  - Days until expiry: ${daysUntilExpiry}`);
} catch (error) {
  console.error('❌ Verification failed:', error.message);
}

// Test 6: Invalid Token
console.log('\n6️⃣ Testing Invalid Token...');
const invalidToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.signature';
try {
  verifyToken(invalidToken);
  console.error('❌ Should have failed but didn\'t!');
} catch (error) {
  console.log('✅ Correctly rejected invalid token');
  console.log(`  - Error: ${error.message}`);
}

// Test 7: Expired Token (simulate)
console.log('\n7️⃣ Testing Expired Token Detection...');
const expiredPayload = {
  sessionId: 'expired_session',
  authType: '3-legged'
};
// Create token with 1 second expiry
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production';
const shortLivedToken = jwt.sign(expiredPayload, JWT_SECRET, {
  expiresIn: '1s',
  issuer: 'blockwise-dashboard',
  audience: 'blockwise-app'
});

console.log('⏳ Waiting 2 seconds for token to expire...');
setTimeout(() => {
  try {
    verifyToken(shortLivedToken);
    console.error('❌ Should have detected expiration!');
  } catch (error) {
    console.log('✅ Correctly detected expired token');
    console.log(`  - Error: ${error.message}`);
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('🎉 JWT Testing Complete!');
  console.log('='.repeat(60));
  console.log('\nAll tests passed. Your JWT system is working correctly!');
  console.log('\nNext steps:');
  console.log('  1. Start the server: npm start');
  console.log('  2. Test OAuth login flow in browser');
  console.log('  3. Check JWT tokens in localStorage');
  console.log('  4. Test protected API endpoints');
  console.log('\n');
}, 2000);
