# Schedule Upload Security Implementation Plan

## Overview
Implement role-based access control to protect schedule data from unauthorized modifications.

## Current State
- ✅ Anyone can upload Excel schedule files
- ❌ No user authentication
- ❌ No access control
- ❌ No data protection

## Proposed Solution: Role-Based Access Control (RBAC)

### User Roles

#### 1. **Admin** (Upload Privileges)
- Can upload/update Excel schedule files
- Can view all data
- Can delete uploaded schedules
- Full dashboard access

#### 2. **Read-Only User** (View Only)
- Can view pre-uploaded schedules
- Can use filters, color schemes, Gantt chart
- Can export data (optional)
- **Cannot upload or modify schedules**

---

## Implementation Options

### **Option A: Simple Password-Based (Recommended for Quick Setup)**

**Pros:**
- Quick to implement (2-3 hours)
- No external dependencies
- Works offline
- Simple to manage

**Cons:**
- Single admin password (no multi-user)
- Password stored in environment variables
- Basic security level

**Implementation:**
1. Add admin password to `.env` file
2. Show upload button only after password entry
3. Store auth state in sessionStorage
4. Hide upload controls for read-only users

**Files to modify:**
- `server/.env` - Add `ADMIN_PASSWORD=your_secure_password`
- `dashboard.html` - Add login modal, conditional rendering
- `server/server.js` - Add password verification endpoint

**Estimated time:** 2-3 hours

---

### **Option B: Token-Based Authentication (Better Security)**

**Pros:**
- Multiple admin users supported
- Token expiration for security
- Better audit trail
- Industry-standard approach

**Cons:**
- More complex implementation (6-8 hours)
- Requires user management
- Need token storage/refresh logic

**Implementation:**
1. Create user accounts (admin vs read-only)
2. Generate JWT tokens on login
3. Validate tokens on server
4. Auto-logout after inactivity

**Files to modify:**
- `server/.env` - Add `JWT_SECRET` and user credentials
- `server/server.js` - Add `/login`, `/verify-token` endpoints
- `dashboard.html` - Add login page, token management
- `js/auth.js` - Already exists, extend for RBAC

**Estimated time:** 6-8 hours

---

### **Option C: Full Database + User Management (Enterprise)**

**Pros:**
- Scalable multi-user system
- Fine-grained permissions
- Activity logging
- User self-registration (optional)

**Cons:**
- Requires database (MongoDB/PostgreSQL)
- Complex setup (2-3 days)
- Infrastructure requirements

**Implementation:**
1. Set up database (MongoDB recommended)
2. Create user schema (username, password hash, role)
3. Implement registration/login system
4. Add session management
5. Create admin panel for user management

**Files needed:**
- Database connection module
- User model/schema
- Authentication middleware
- Admin dashboard
- Session store

**Estimated time:** 2-3 days

---

## Recommended Approach: **Option A + Option B Hybrid**

### Phase 1: Quick Security (1 day)
Implement Option A for immediate protection:
- Single admin password
- Show/hide upload button based on role
- Session-based authentication

### Phase 2: Enhanced Security (1 week)
Upgrade to Option B when needed:
- Add JWT-based auth
- Support multiple admins
- Add token expiration
- Keep read-only users anonymous (no login required)

---

## Implementation Details (Option A - Quick Start)

### 1. Environment Setup
```env
# server/.env
ADMIN_PASSWORD=YourSecurePassword123!
SESSION_SECRET=RandomSecretKey456
```

### 2. Server Changes (server/server.js)
```javascript
// Add password verification endpoint
app.post('/api/admin/verify', (req, res) => {
  const { password } = req.body;
  if (password === process.env.ADMIN_PASSWORD) {
    // Generate session token
    const token = jwt.sign({ role: 'admin' }, process.env.SESSION_SECRET, { expiresIn: '8h' });
    res.json({ success: true, token });
  } else {
    res.status(401).json({ success: false, message: 'Invalid password' });
  }
});

// Protect upload endpoint
app.post('/api/schedule/upload', verifyAdminToken, (req, res) => {
  // Existing upload logic
});
```

### 3. Dashboard Changes (dashboard.html)
```html
<!-- Admin Login Modal -->
<div id="adminLoginModal" class="modal">
  <div class="modal-content">
    <h3>Admin Access Required</h3>
    <input type="password" id="adminPassword" placeholder="Enter admin password">
    <button onclick="verifyAdmin()">Login</button>
  </div>
</div>

<!-- Hide upload for non-admin -->
<div id="uploadSchedulePanel" style="display: none;">
  <button id="uploadScheduleBtn">Upload Schedule</button>
</div>
```

### 4. JavaScript Logic
```javascript
// Check admin status on load
const isAdmin = sessionStorage.getItem('adminToken');
if (isAdmin) {
  document.getElementById('uploadSchedulePanel').style.display = 'block';
}

// Verify admin password
async function verifyAdmin() {
  const password = document.getElementById('adminPassword').value;
  const response = await fetch('/api/admin/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password })
  });
  
  if (response.ok) {
    const { token } = await response.json();
    sessionStorage.setItem('adminToken', token);
    location.reload();
  } else {
    alert('Invalid password');
  }
}
```

---

## Pre-loaded Schedule Strategy

### Option 1: Server-Side Storage
- Admin uploads schedule → Saved to `server/data/schedule.xlsx`
- All users load from this file automatically on page load
- Only admin can replace/update the file

### Option 2: Database Storage
- Admin uploads → Parsed and stored in database
- API endpoint serves schedule data to all users
- Versioning: Keep history of uploads

### Option 3: Cloud Storage (Azure Blob/AWS S3)
- Admin uploads → Stored in cloud
- Public read URL for all users
- Signed URLs for admin uploads

---

## Security Best Practices

1. **Password Requirements:**
   - Minimum 12 characters
   - Mix of uppercase, lowercase, numbers, symbols
   - Store hashed (bcrypt) in production

2. **Token Management:**
   - Short expiration (8 hours recommended)
   - Refresh tokens for extended sessions
   - Revoke on logout

3. **HTTPS Only:**
   - Force HTTPS in production
   - Never send passwords over HTTP

4. **Audit Logging:**
   - Log all upload attempts
   - Track who uploaded what and when
   - Alert on failed login attempts

5. **Rate Limiting:**
   - Limit login attempts (5 tries per 15 minutes)
   - Prevent brute force attacks

---

## Deployment Checklist

- [ ] Set strong admin password in `.env`
- [ ] Enable HTTPS (Let's Encrypt for free SSL)
- [ ] Hide `.env` file from version control (add to `.gitignore`)
- [ ] Test login flow
- [ ] Test upload restrictions
- [ ] Test read-only user experience
- [ ] Document password recovery process
- [ ] Create backup admin account
- [ ] Set up monitoring/alerts

---

## Cost Analysis

| Option | Setup Time | Maintenance | Complexity | Security Level |
|--------|-----------|-------------|-----------|----------------|
| Option A | 2-3 hours | Low | Simple | Basic ⭐⭐ |
| Option B | 6-8 hours | Medium | Moderate | Good ⭐⭐⭐⭐ |
| Option C | 2-3 days | High | Complex | Enterprise ⭐⭐⭐⭐⭐ |

---

## Recommendation

**Start with Option A** for immediate protection, then upgrade to Option B within 1-2 months when you need:
- Multiple admin users
- Better audit trails
- Token-based security
- Auto-logout

**Read-only users should NOT need to login** - they access the app directly and see pre-loaded schedules automatically.

---

## Next Steps

1. **Decide on approach** (A, B, or C)
2. **Set admin password** in `.env`
3. **Test implementation** in development
4. **Deploy to production** with HTTPS
5. **Train admins** on upload process
6. **Monitor usage** and adjust security as needed

Would you like me to implement Option A (Quick Security) now?
