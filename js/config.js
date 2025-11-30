/**
 * Application Configuration
 * Central configuration for the entire application
 */

export const CONFIG = {
  // Server endpoints
  SERVER_URL: 'http://localhost:3000',
  
  // APS Viewer configuration
  VIEWER: {
    version: '7.*',
    container: 'viewerContainer',
    extensions: ['Autodesk.DocumentBrowser']
  },

  // Model identifiers from ACC
  // Your ACC URL: https://acc.autodesk.com/docs/files/projects/d99b2475-9a5c-4752-abb1-b6b8c3e8c2a3/...
  
  // NEW PROJECT - Fixed identifiers (file/folder remain same, only version updates)
  ACC_PROJECT_ID: 'd99b2475-9a5c-4752-abb1-b6b8c3e8c2a3',
  
  // Lineage URN - this stays constant across all versions of the same file
  LINEAGE_URN: 'urn:adsk.wipprod:dm.lineage:_mxP3Z5BRUqUT0T7xKPyxg',
  
  // Viewable GUID - for selecting the correct view in federated model
  VIEWABLE_GUID: 'ad763e05-577f-ccd1-4c87-ce502f12e069',

  // AUTO-VERSION: Set to true to automatically fetch latest version on load
  // When true, MODEL_URN below is ignored and fetched dynamically from ACC
  AUTO_FETCH_LATEST_VERSION: true,

  // FALLBACK MODEL_URN - used only if AUTO_FETCH_LATEST_VERSION is false
  // or if auto-fetch fails
  MODEL_URN: 'dXJuOmFkc2sud2lwcHJvZDpmcy5maWxlOnZmLjN1cjVnSDVmVFZhVWN6OGR2bjV3TlE_dmVyc2lvbj0x',

  // Color scheme for different blocks/statuses
  COLORS: {
    // By Block
    BLOCK_34: { r: 0, g: 255, b: 255, a: 0.8 },      // Cyan
    BLOCK_39: { r: 255, g: 0, b: 255, a: 0.8 },      // Magenta
    BLOCK_46: { r: 0, g: 255, b: 0, a: 0.8 },        // Green
    
    // By Component Type
    PRECAST: { r: 100, g: 200, b: 255, a: 0.8 },     // Light blue
    
    // By Status (you can add more)
    COMPLETED: { r: 0, g: 255, b: 0, a: 0.8 },       // Green
    IN_PROGRESS: { r: 255, g: 255, b: 0, a: 0.8 },   // Yellow
    NOT_STARTED: { r: 200, g: 200, b: 200, a: 0.8 }, // Gray
    DELAYED: { r: 255, g: 0, b: 0, a: 0.8 },         // Red
    
    // Default
    DEFAULT: { r: 150, g: 150, b: 150, a: 0.5 },     // Gray
    SELECTED: { r: 255, g: 165, b: 0, a: 1.0 }       // Orange
  },

  // Excel data configuration
  EXCEL: {
    // Column mapping from your Excel file
    COLUMNS: {
      PROJECT: 'Project',
      PHASE: 'Phase',
      NEIGHBORHOOD: 'Neighborhood',
      SECTOR: 'Sector',
      BLOCK: 'Block',
      PLOT: 'Plot',
      VILLA: 'Villa',
      COMPONENT: 'Component',
      PLANNED_START: 'Planned Start',
      PLANNED_FINISH: 'Planned Finish',
      ACTUAL_START: 'Actual Start',
      ACTUAL_FINISH: 'Actual Finish',
      STATUS: 'Status',
      PRECASTER: 'PreCaster'
    },
    
    // Key field to match with model elements
    KEY_FIELD: 'Plot' // or 'Villa' depending on your model
  },

  // Property mapping for model elements
  // NOTE: Properties can be specified as:
  // 1. Simple names: 'Plot' (matches displayName)
  // 2. Category paths: 'Element/Plot' (matches full hierarchy)
  // 3. Wildcards: 'Element/*Plot*' (partial matching)
  MODEL_PROPERTIES: {
    // Properties to search for in the model - in priority order
    // IMPORTANT: Order matters! More specific names first, generic names last
    PLOT_NUMBER: ['Element/Plot', 'Plot', 'PlotNumber', 'Plot Number'],
    VILLA_TYPE: ['Element/Villa_Type', 'Villa_Type', 'Villa', 'VillaType', 'Villa Type'],
    BLOCK: ['Element/Block', 'Block', 'BlockNumber', 'Block Number'],
    NBH: ['Element/NBH', 'NBH', 'Neighborhood'],
    VILLA: ['Element/Villa', 'Villa']
  },

  // UI Configuration
  UI: {
    SHOW_SEARCH: true,
    SHOW_LEGEND: true,
    SHOW_STATS: true,
    AUTO_COLOR_BY: 'Block' // 'Block', 'Component', 'Status', or null
  }
};

// Helper function to convert color object to THREE.Vector4
export function colorToVector4(color) {
  return new THREE.Vector4(
    color.r / 255,
    color.g / 255,
    color.b / 255,
    color.a
  );
}

// Helper to get color by block number
export function getBlockColor(blockNumber) {
  const blockKey = `BLOCK_${blockNumber}`;
  return CONFIG.COLORS[blockKey] || CONFIG.COLORS.DEFAULT;
}

// Helper to get color by component
export function getComponentColor(component) {
  const componentKey = component?.toUpperCase();
  return CONFIG.COLORS[componentKey] || CONFIG.COLORS.DEFAULT;
}

// Helper to calculate status based on dates
export function calculateStatus(plannedStart, plannedFinish, actualStart, actualFinish) {
  const now = new Date();
  const planned = new Date(plannedFinish);
  
  if (actualFinish) return 'COMPLETED';
  if (actualStart) {
    return now > planned ? 'DELAYED' : 'IN_PROGRESS';
  }
  return 'NOT_STARTED';
}

export default CONFIG;
