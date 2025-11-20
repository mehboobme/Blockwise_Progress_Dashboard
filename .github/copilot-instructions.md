# Copilot Instructions - Villa Project Viewer (APS + Excel)

## Project Overview

This is a **3D model viewer** combining Autodesk Platform Services (APS) Viewer with Excel data integration for villa construction project tracking. The system visualizes ACC models, maps Excel data to 3D elements, and applies dynamic color schemes by block/component/status.

### Core Architecture

```
Browser (ES6 Modules) ←→ Node.js Server ←→ APS APIs
         ↓
    3D Viewer + Excel Data Binding
```

**Key Division:**
- **Frontend** (`js/`): Client-side ES6 modules using Vanilla JavaScript
- **Backend** (`server/`): Node.js/Express for OAuth authentication and APS API proxying
- **Config** (`config.js`): Centralized model URN, colors, and property mappings

## Critical Workflows

### 1. Model Loading Flow

**Challenge:** ACC models require correct URN format and authentication.

**Process:**
1. User logs in via 3-legged OAuth → backend stores APS tokens
2. `js/config.js` contains **base64-encoded derivative URN** (NOT raw URN)
3. `viewer.js::loadModel()` detects URN format and constructs APS-compatible URI
4. ViewableGuid uses format: `urn:adsk.viewing:fs.file:vf.{GUID}?version=1` → base64

**Key Files:** `js/viewer.js` (lines 65-100), `server/server.js` (OAuth flow), `js/config.js`

### 2. Data Mapping Pipeline

**Excel → Plot Numbers → Model DBIds → Properties**

```javascript
// Step 1: Parse Excel (dataParser.js)
parseExcelFile(file) → Map<plotNumber, excelData>

// Step 2: Build mappings (modelDataMapper.js)
buildMappings() → Gets all DBids from model
                → Extracts plot numbers from model properties
                → Joins with Excel data via plot number

// Step 3: Apply colors (colorManager.js)
applyColorScheme(scheme) → Uses mappings to color DBids
```

**Critical:** Model properties must contain plot numbers in specific fields defined in `CONFIG.MODEL_PROPERTIES.PLOT_NUMBER` array. Search properties manually if mappings fail—use `check-properties.html` for debugging.

### 3. Authentication Strategy

**Two-track OAuth:**
- **2-legged** (`/api/auth/token`): Quick, for public models
- **3-legged** (`/api/auth/login`): Required for ACC models with permissions

**Token Flow:**
```
Browser → Login popup → OAuth redirect:8080/callback 
        → Backend exchanges code for APS token
        → Returns JWT (stored in localStorage)
        → JWT refreshes before 5-min expiry
```

**Important:** JWT and APS tokens are separate. See `jwt-utils.js` for JWT refresh logic; `auth.js` handles both token types.

## Project-Specific Patterns

### Pattern 1: Module Singletons

All modules export **singleton instances**—never instantiate directly:
```javascript
// ✅ CORRECT
import { viewerManager } from './viewer.js';
viewerManager.loadModel(urn);

// ❌ WRONG
import ViewerManager from './viewer.js';
new ViewerManager().loadModel(urn);
```

**Why:** Ensures single viewer instance and consistent state. See `main.js` for import pattern.

### Pattern 2: Color Scheme Architecture

Color schemes are **pluggable**—three predefined schemes + extensible:
- **By Block:** Extract block number from model properties → lookup `CONFIG.COLORS.BLOCK_*`
- **By Component:** Extract component type → lookup `CONFIG.COLORS.COMPONENT_*`
- **By Status:** Calculate from Excel dates → lookup `CONFIG.COLORS.STATUS_*`

To add new scheme:
1. Add method to `ColorManager::colorBy{SchemeName}()`
2. Add case in `applyColorScheme()` switch
3. Add UI option in `index.html` select

### Pattern 3: Plot Number Extraction

Plot numbers are **extracted from multiple model properties** (configurable via `CONFIG.MODEL_PROPERTIES.PLOT_NUMBER`). The system tries each property in order:

```javascript
// From config.js
PLOT_NUMBER: ['plot', 'Plot Number', 'PlotNumber', 'PLOT'],
```

If extraction fails, element goes to `unmappedDbIds`. Debug using `modelDataMapper.getUnmappedDbIds()`.

### Pattern 4: Excel Date Parsing

Dates arrive as **Excel serial numbers or strings** and must be converted:
```javascript
// In dataParser.js
parseExcelDate(value) {
  // Excel serial: 45000 → Date
  // String: "10/1/2025" → Date
}
```

Date parsing is **non-strict**—logs warnings instead of throwing. Check console for parsing issues.

## Integration Points & Dependencies

### External APIs

| Service | Use | File | Auth |
|---------|-----|------|------|
| **APS Viewer** | 3D rendering | `viewer.js`, `index.html` | 2-legged OAuth token |
| **APS Data Mgmt** | Get derivative URN | `server/server.js` | 3-legged user token |
| **APS Auth** | OAuth flow | `server/server.js` | Client ID/Secret in `.env` |
| **SheetJS** | Excel parsing | `dataParser.js` | CDN-loaded, no auth |

### Critical Files for Common Tasks

| Task | Primary File | Secondary |
|------|--------------|-----------|
| Add new color scheme | `colorManager.js`, `config.js` | `index.html` |
| Fix mapping issues | `modelDataMapper.js` | `config.js` (property names) |
| Debug model loading | `viewer.js` | `server/server.js` (tokens) |
| Add Excel columns | `dataParser.js` | `config.js` |
| Fix Auth | `auth.js`, `server/server.js` | `jwt-utils.js` |

## Common Issues & Solutions

### ❌ "atob() is not a function"
**Cause:** Raw URN used instead of base64-encoded derivative URN
**Fix:** Ensure `MODEL_URN` in config.js starts with `dXJu...` (base64), not `urn:adsk...`
**Check:** Use `GET_DERIVATIVE_URN.js` script or `/api/acc/derivative-urn` endpoint

### ❌ "Element properties not found" or unmapped villa elements
**Cause:** Model properties use category paths (e.g., `Element/Plot`) but code was looking for simple names
**Solution Implemented:**
1. Updated `CONFIG.MODEL_PROPERTIES` to support three formats:
   - Category paths: `'Element/Plot'` (matches full hierarchy)
   - Simple names: `'Plot'` (matches displayName)
   - Wildcards: `'Element/*Plot*'` (partial matching)
2. Added `findProperty()` method in `modelDataMapper.js` to handle all three formats
3. Added helper methods: `extractVillaType()`, `extractBlock()` alongside `extractPlotNumber()`

**How to Fix Your Model:**
1. Open `property-inspector.html` in browser at `http://localhost:3000/property-inspector.html`
2. Enter your plot number (e.g., 425)
3. Click "Search Element" to see actual property paths
4. Update `CONFIG.MODEL_PROPERTIES` in `js/config.js` with correct paths
5. Example from Revit model: Use `'Element/Plot'`, `'Element/Villa_Type'`, `'Element/Block'`

**Available Tools:**
- `property-inspector.html` — Interactive property debugger
- `propertyDebugger.js` — Diagnostic module with inventory scanning
- `modelDataMapper.findProperty()` — Universal property finder supporting all formats

### ❌ "Permission denied" (403) on model load
**Cause:** 2-legged token insufficient for ACC model
**Fix:** Trigger 3-legged OAuth: `authManager.loginFor3Leg()` or redirect to `/api/auth/login`

### ❌ Excel data not found after load
**Cause:** Plot number mismatch (Excel "34" vs model "034")
**Fix:** Normalize in Excel or in `dataParser.js::extractPlotNumber()`

## Key Files Reference

- **`js/config.js`** — Model URN, color palettes, property names (UPDATE FIRST for new models)
- **`js/main.js`** — App orchestration, event flow (understand execution order here)
- **`js/viewer.js`** — APS Viewer init, model loading, interaction
- **`js/dataParser.js`** — Excel → data structures, date parsing
- **`js/modelDataMapper.js`** — Excel ↔ DBid bindings, statistics
- **`js/colorManager.js`** — Color scheme logic, material application
- **`js/auth.js`** — JWT token management, OAuth listener
- **`server/server.js`** — Express endpoints, OAuth callback, token generation
- **`server/jwt-utils.js`** — JWT creation/refresh/verification

## Development Conventions

1. **Console logs:** Use emoji prefixes (`✅`, `❌`, `🔄`, `📊`, `🎨`) for scanning
2. **Errors:** Always logged with context; check browser console + server console
3. **State:** Stored in module singletons; No global variables outside modules
4. **Async/await:** Preferred over promises; always try/catch in event handlers
5. **Comments:** JSDoc above functions; inline only for non-obvious logic

## Startup Checklist

1. Copy `.env.example` → `.env` in `/server`, add APS credentials
2. `cd server && npm install`
3. `npm start` → server runs on port 3000
4. Open `http://localhost:3000` in browser
5. Update `js/config.js` with your model URN
6. Login → Load Model → Load Excel → Apply color scheme

---

**Last Updated:** November 2025 | For questions, see START_HERE.md or TROUBLESHOOTING.md
