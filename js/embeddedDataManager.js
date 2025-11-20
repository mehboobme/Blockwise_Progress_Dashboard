/**
 * Embedded Data Manager
 * Works with properties embedded in the Navisworks model
 * No Excel needed - all data comes from model properties
 */

import { viewerManager } from './viewer.js';
import { CONFIG } from './config.js';

class EmbeddedDataManager {
  constructor() {
    this.elementData = new Map(); // dbId -> { block, plot, villa, component, dates, ... }
    this.phaseGroups = new Map(); // phase -> [dbIds]
    this.neighborhoodGroups = new Map(); // neighborhood/sector -> [dbIds]
    this.blockGroups = new Map(); // block -> [dbIds]
    this.plotGroups = new Map(); // plot -> [dbIds]
    this.componentGroups = new Map(); // component -> [dbIds]
    this.excelData = new Map(); // plot -> { status, precaster, villaType, ... }
  }

  /**
   * Analyze all elements and extract embedded properties (CHUNKED for large models)
   * Also specifically extracts villa elements from node 3 in the federated model
   * @param {Function} progressCallback - Optional callback(progress, message)
   * @returns {Promise<object>} Analysis statistics
   */
  async analyzeModel(progressCallback = null) {
    console.log('🔄 Analyzing model properties...');

    this.elementData.clear();
    this.phaseGroups.clear();
    this.neighborhoodGroups.clear();
    this.blockGroups.clear();
    this.plotGroups.clear();
    this.componentGroups.clear();

    // Get all element IDs from the main tree
    const allDbIds = await viewerManager.getAllDbIds();
    const totalElements = allDbIds.length;
    console.log(`📊 Total elements in model: ${totalElements}`);

    // CRITICAL: In federated Navisworks models, villa elements are under node 3
    // We need to also extract directly from node 3 tree to get all villa DbIds
    console.log('🏗️  Extracting villa elements from node 3...');
    const villaDbIds = await this.getVillaDbIdsFromNode3();
    console.log(`✅ Found ${villaDbIds.length} villa elements under node 3`);

    // Combine both sets of DbIds (infrastructure from main tree, villas from node 3)
    const allDbIdsSet = new Set(allDbIds);
    villaDbIds.forEach(id => allDbIdsSet.add(id));
    const combinedDbIds = Array.from(allDbIdsSet);
    const totalToAnalyze = combinedDbIds.length;

    console.log(`📦 Total DbIds to analyze: ${totalToAnalyze} (${totalElements} from main tree + ${villaDbIds.length} from villa node)`);

    // Process in chunks to avoid memory crashes
    const CHUNK_SIZE = 5000;
    const totalChunks = Math.ceil(totalToAnalyze / CHUNK_SIZE);
    let analyzedCount = 0;

    console.log(`📦 Processing in ${totalChunks} chunks of ${CHUNK_SIZE} elements each...`);

    for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
      const startIdx = chunkIndex * CHUNK_SIZE;
      const endIdx = Math.min(startIdx + CHUNK_SIZE, totalToAnalyze);
      const chunkDbIds = combinedDbIds.slice(startIdx, endIdx);

      const progress = Math.round(((chunkIndex + 1) / totalChunks) * 100);
      const message = `Processing chunk ${chunkIndex + 1}/${totalChunks} (${chunkDbIds.length} elements)`;
      console.log(`🔄 ${message} - ${progress}%`);

      if (progressCallback) {
        progressCallback(progress, message);
      }

      // Get properties for this chunk only
      const bulkProperties = await viewerManager.getBulkProperties(chunkDbIds, null);

      // Process chunk
      let villaCount = 0;
      let infrastructureCount = 0;
      bulkProperties.forEach(prop => {
        const elementInfo = this.extractElementInfo(prop.properties);

        if (elementInfo) {
          villaCount++;
          this.elementData.set(prop.dbId, elementInfo);

          // Group by phase
          if (elementInfo.phase) {
            const phase = this.normalizeValue(elementInfo.phase);
            if (!this.phaseGroups.has(phase)) {
              this.phaseGroups.set(phase, []);
            }
            this.phaseGroups.get(phase).push(prop.dbId);
          }

          // Group by neighborhood (sector)
          if (elementInfo.sector) {
            const neighborhood = this.normalizeValue(elementInfo.sector);
            if (!this.neighborhoodGroups.has(neighborhood)) {
              this.neighborhoodGroups.set(neighborhood, []);
            }
            this.neighborhoodGroups.get(neighborhood).push(prop.dbId);
          }

          // Group by block
          if (elementInfo.block) {
            if (!this.blockGroups.has(elementInfo.block)) {
              this.blockGroups.set(elementInfo.block, []);
            }
            this.blockGroups.get(elementInfo.block).push(prop.dbId);
          }

          // Group by plot
          if (elementInfo.plot) {
            if (!this.plotGroups.has(elementInfo.plot)) {
              this.plotGroups.set(elementInfo.plot, []);
            }
            this.plotGroups.get(elementInfo.plot).push(prop.dbId);
          }

          // Group by component
          if (elementInfo.component) {
            if (!this.componentGroups.has(elementInfo.component)) {
              this.componentGroups.set(elementInfo.component, new Set());
            }
            this.componentGroups.get(elementInfo.component).add(prop.dbId);
          }

          analyzedCount++;
        } else {
          infrastructureCount++;
        }
      });

      // Log chunk analysis
      if (villaCount > 0 || infrastructureCount > 0) {
        console.log(`   🏘️ Villa: ${villaCount} | 🏗️ Infrastructure: ${infrastructureCount}`);
      }

      // Allow browser to breathe between chunks
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    const stats = {
      totalElements: totalElements,
      analyzed: analyzedCount,
      phases: this.phaseGroups.size,
      neighborhoods: this.neighborhoodGroups.size,
      blocks: this.blockGroups.size,
      plots: this.plotGroups.size,
      components: this.componentGroups.size,
      analysisRate: (analyzedCount / totalElements * 100).toFixed(1)
    };

    console.log(`✅ Analysis complete:`, stats);
    return stats;
  }

  /**
   * Load Excel data for status and precaster mapping
   * @param {Object} dataParser - The dataParser instance with rawData
   */
  loadExcelData(dataParser) {
    console.log('📊 Loading Excel data for status/precaster mapping...');
    this.excelData.clear();
    
    if (!dataParser || !dataParser.rawData || dataParser.rawData.length === 0) {
      console.warn('⚠️ No Excel data available');
      return;
    }
    
    dataParser.rawData.forEach(row => {
      const plot = String(row.Plot || row.plot || '').trim();
      if (!plot) return;
      
      this.excelData.set(plot, {
        status: row.Status || row.status || '',
        precaster: row.PreCaster || row.Precaster || row.precaster || '',
        villaType: row.Villa || row.villa || '',
        block: row.Block || row.block || ''
      });
    });
    
    console.log(`✅ Loaded Excel data for ${this.excelData.size} plots`);
  }
  
  /**
   * Get Excel data for a specific plot
   * @param {string} plotNumber
   * @returns {Object|null}
   */
  getExcelDataForPlot(plotNumber) {
    const plot = String(plotNumber).trim();
    return this.excelData.get(plot) || null;
  }
  
  /**
   * Get all DbIds from villa node 3 in the federated model
   * Node 3 = "Al Arous Project - Familly Villas.nwc"
   * This ensures we capture all villa elements including non-leaf nodes with properties
   * @returns {Promise<Array<number>>} Array of all DbIds under villa node 3
   */
  async getVillaDbIdsFromNode3() {
    return new Promise((resolve) => {
      try {
        const viewer = viewerManager.viewer;
        if (!viewer || !viewer.model) {
          console.warn('⚠️ Viewer or model not available');
          resolve([]);
          return;
        }

        const tree = viewer.model.getInstanceTree();
        if (!tree) {
          console.warn('⚠️ Instance tree not available');
          resolve([]);
          return;
        }

        const VILLA_NODE_ID = 3; // "Al Arous Project - Familly Villas.nwc"
        const villaDbIds = [];

        // Recursively get all DbIds under villa node (including non-leaf nodes)
        const traverse = (dbId) => {
          villaDbIds.push(dbId);
          tree.enumNodeChildren(dbId, (childId) => {
            traverse(childId);
          });
        };

        traverse(VILLA_NODE_ID);
        resolve(villaDbIds);
      } catch (error) {
        console.error('❌ Error getting villa DbIds from node 3:', error);
        resolve([]);
      }
    });
  }

  /**
   * Extract element information from properties
   * @param {Array} properties - Element properties
   * @returns {object|null} Extracted information or null if infrastructure
   */
  extractElementInfo(properties) {
    const info = {};
    let hasVillaProperties = false;
    let debugLog = false; // Set to true for first element only

    properties.forEach(prop => {
      const name = prop.displayName;
      const nameLower = name.toLowerCase();
      const value = prop.displayValue;

      // Skip empty/null values
      if (!value || value === '' || value === 'N/A') return;

      // DEBUG: Log all property names for debugging (first element only)
      if (debugLog && name.includes('Element/')) {
        console.log(`🔍 Found property: "${name}" = "${value}"`);
      }

      // ========== PRIMARY REVIT PROPERTIES (from federated Navisworks model) ==========

      // Extract Block (Element/Block or just Block) - e.g., "39" (keep as plain number for villa blocks)
      if (name === 'Element/Block' || name === 'Block') {
        // Villa blocks are plain numbers, NOT formatted with R prefix
        // R prefix is only for infrastructure blocks (which will now be filtered out)
        info.block = String(value);
        hasVillaProperties = true;  // Mark as villa element
      }

      // Extract Neighborhood (Element/NBH or just NBH) - e.g., "SE03" (keep as-is)
      if (name === 'Element/NBH' || name === 'NBH') {
        info.neighborhood = String(value);
        info.sector = String(value);
        hasVillaProperties = true;  // Mark as villa element
      }

      // Extract Plot (Element/Plot or just Plot) - e.g., "425"
      if (name === 'Element/Plot' || name === 'Plot') {
        // Plot must be numeric (or numeric string)
        const plotValue = String(value).trim();
        if (plotValue && !isNaN(plotValue)) {
          info.plot = plotValue;
          hasVillaProperties = true;  // Mark as villa element
        }
      }

      // Extract Villa Type (Element/Villa_Type or just Villa_Type) - e.g., "DP2"
      if (name === 'Element/Villa_Type' || name === 'Villa_Type') {
        info.villaType = value;
        info.component = value; // Use villa type as primary component
        hasVillaProperties = true;  // Mark as villa element
      }

      // Extract Level (Level/Name) - e.g., "GR.F"
      if (name === 'Level/Name') {
        info.level = value;
      }

      // Extract Phase (Phase Created/Name) - e.g., "New Construction"
      // NOTE: Only extract for villa elements (not infrastructure)
      // Infrastructure phases are extracted later only if no villa properties found
      if (name === 'Phase Created/Name' && !info.phase) {
        info.phase = value;
      }

      // ========== ITEM-LEVEL PROPERTIES (Navisworks wrapper) ==========

      // Item/Name - e.g., "DP2 REPRESENTATION"
      if (name === 'Item/Name' && !info.name) {
        info.name = value;
      }

      // Item/Type - e.g., "Generic Models: DP2 REPRESENTATION: DP2 REPRESENTATION"
      if (name === 'Item/Type' && !info.type) {
        info.type = value;
      }

      // Item/Layer - e.g., "GR.F" (can be level fallback)
      if (name === 'Item/Layer' && !info.level) {
        info.level = value;
      }

      // Item/Source File - e.g., "Test power BI_Ali_ElraeiJZDC9.rvt"
      if (name === 'Item/Source File') {
        info.sourceFile = value;
      }

      // ========== ELEMENT PROPERTIES ==========

      // Element/Name - e.g., "DP2 REPRESENTATION"
      if (name === 'Element/Name' && !info.name) {
        info.name = value;
      }

      // Element/Type - e.g., "DP2 REPRESENTATION"
      if (name === 'Element/Type' && !info.type) {
        info.type = value;
      }

      // Element/Family - e.g., "DP2 REPRESENTATION"
      if (name === 'Element/Family') {
        info.family = value;
      }

      // Element/Category - e.g., "Generic Models"
      if (name === 'Element/Category') {
        info.category = value;
        // Use category as component fallback only if no villa type
        if (!info.component) {
          info.component = value;
        }
      }

      // Element/Substructure - "Yes"/"No"
      if (name === 'Element/Substructure') {
        info.substructure = value;
      }

      // Element/Volume - e.g., "1144.316 m³"
      if (name === 'Element/Volume') {
        info.volume = value;
      }

      // ========== CATEGORY PROPERTIES ==========

      // Category/Name - e.g., "Generic Models"
      if (name === 'Category/Name' && !info.category) {
        info.category = value;
      }

      // ========== DOCUMENT PROPERTIES ==========

      // Document/Title - e.g., "Test power BI_Ali_ElraeiJZDC9"
      if (name === 'Document/Title' && !info.documentTitle) {
        info.documentTitle = value;
      }

      // ========== REVIT TYPE PROPERTIES ==========

      // Revit Type/Name - e.g., "DP2 REPRESENTATION"
      if (name === 'Revit Type/Name' && !info.revitType) {
        info.revitType = value;
      }

      // Symbol/FamilyName - e.g., "DP2 REPRESENTATION"
      if (name === 'Symbol/FamilyName' && !info.family) {
        info.family = value;
      }

      // ========== LEGACY/DWG/NAVISWORKS FALLBACK PROPERTIES ==========
      // (Only used if Element/ properties are not found)

      // Extract Activity ID
      if (name === 'Activity_ID') {
        info.activityId = value;
        // Only use as fallback if no Element/Block found
        if (!info.block) {
          const blockInfo = this.extractBlockFromActivityId(value);
          if (blockInfo) info.block = blockInfo;
        }
        if (!info.phase) {
          const phaseInfo = this.extractPhaseFromActivityId(value);
          if (phaseInfo) info.phase = phaseInfo;
        }
      }

      // Extract Network/Zone
      // NOTE: Only for infrastructure (not villa elements)
      if (name === 'General:Network name') {
        info.network = value;
        // Only set as neighborhood if no villa NBH property found
        // Villa elements use Element/NBH which sets hasVillaProperties = true
        if (!info.neighborhood && !info.sector) {
          info.network = value;
        }
      }

      // Extract Layer (DWG)
      if ((name === 'Layer' || name === 'General:Layer name') && !info.layer) {
        info.layer = value;
      }

      // ========== DATE PROPERTIES ==========

      // Extract dates (if they exist)
      if (nameLower.includes('start') && nameLower.includes('date')) {
        info.plannedStart = value;
      }
      if (nameLower.includes('finish') && nameLower.includes('date')) {
        info.plannedFinish = value;
      }
      if (nameLower.includes('completion')) {
        info.completionDate = value;
      }
    });

    // ========== VILLA-ONLY FILTERING ==========
    // CRITICAL: Only return villa elements (those with Element/Block, Element/NBH, Element/Plot, or Element/Villa_Type)
    // This filters out all infrastructure elements (roads, MEP, structure)
    // 
    // Infrastructure elements have properties like:
    //   - Element/Category, Item/Name, Item/Type (no villa properties)
    //   - Block formatted as R001, R002 (infrastructure blocks)
    //   - Phase numbers like "141" (infrastructure phase)
    // 
    // Villa elements have properties like:
    //   - Element/Block = 38, 39, etc. (villa blocks)
    //   - Element/NBH = SE01, SE02, SE03 (villa neighborhoods)
    //   - Element/Plot = 415, 425, 430, etc. (villa plots)
    //   - Element/Villa_Type = DP2, DP3, etc. (villa types)
    //
    // Only return if hasVillaProperties flag was set
    if (!hasVillaProperties) {
      return null;  // Skip infrastructure elements entirely
    }

    // Villa element found - clean up any infrastructure-derived fields
    // Remove fields that came from infrastructure properties
    delete info.network;
    delete info.activityId;
    
    // Ensure neighborhood is ONLY from villa NBH property (Element/NBH or NBH)
    // Not from infrastructure Network/Zone
    // At this point, if info.neighborhood was set, it's from villa NBH property
    // If not set, leave it empty

    // Villa element found - ensure it has at least one key identifier for grouping
    const hasKeyIdentifier = info.block || info.plot || info.villaType || info.neighborhood;
    return hasKeyIdentifier ? info : null;
  }

  /**
   * Extract block info from Activity ID
   * Example: 141CWARSSE4R002PW030 -> "R002"
   */
  extractBlockFromActivityId(activityId) {
    if (!activityId) return null;

    // Look for pattern like R002, R001, B034, etc.
    const blockMatch = activityId.match(/[RB](\d{3})/);
    if (blockMatch) {
      return blockMatch[0]; // Returns "R002", "B034", etc.
    }

    // Alternative: look for 3-4 digit numbers
    const numMatch = activityId.match(/\d{3,4}/);
    if (numMatch) {
      return numMatch[0];
    }

    return null;
  }

  /**
   * Extract phase from Activity ID
   * Example: 141CWARSSE4R002PW030 -> "141"
   */
  extractPhaseFromActivityId(activityId) {
    if (!activityId) return null;

    // First 2-3 digits might be phase
    const phaseMatch = activityId.match(/^(\d{2,3})/);
    if (phaseMatch) {
      return phaseMatch[1];
    }

    return null;
  }

  /**
   * Extract zone from network name
   * Example: "Zone A Potable-Fire Network" -> "Zone A"
   */
  extractZoneFromNetwork(networkName) {
    if (!networkName) return null;

    const zoneMatch = networkName.match(/Zone\s+[A-Z]/i);
    if (zoneMatch) {
      return zoneMatch[0]; // Returns "Zone A"
    }

    return networkName;
  }

  /**
   * Extract info from source filename
   * Example: "00901-SPC-IAA-IUG-PIM-CP-000001.dwg" -> { block: "00901" }
   */
  extractInfoFromFilename(filename) {
    const info = {};

    if (!filename) return info;

    // Look for patterns in filename
    const parts = filename.split('-');
    if (parts.length > 0) {
      const firstPart = parts[0];
      // First part might be block/zone if it's 5 digits
      if (/^\d{5}$/.test(firstPart)) {
        info.block = firstPart;
      }
    }

    return info;
  }

  /**
   * Normalize value for consistent matching
   * @param {string|number} value - Raw value
   * @returns {string} Normalized value
   */
  normalizeValue(value) {
    if (!value) return '';
    return String(value).trim().toLowerCase();
  }

  /**
   * Get element data by dbId
   * @param {number} dbId - Element database ID
   * @returns {object|null} Element information
   */
  getElementData(dbId) {
    return this.elementData.get(dbId);
  }

  /**
   * Get elements by block number
   * @param {string|number} block - Block number (e.g., "38", "39", or 38)
   * @returns {Array<number>} Database IDs
   */
  getElementsByBlock(block) {
    let blockValue = String(block).trim();
    
    // For villa blocks, just use the plain number (no R prefix)
    // R prefix was only used for infrastructure blocks, which are now filtered out
    
    return this.blockGroups.get(blockValue) || [];
  }

  /**
   * Get elements by plot number
   * @param {string|number} plot - Plot number
   * @returns {Array<number>} Database IDs
   */
  getElementsByPlot(plot) {
    const normalized = this.normalizeValue(plot);
    return this.plotGroups.get(normalized) || [];
  }

  /**
   * Get all phases
   * @returns {Array<string>} Phase names
   */
  getAllPhases() {
    return Array.from(this.phaseGroups.keys()).sort();
  }

  /**
   * Get all neighborhoods
   * @returns {Array<string>} Neighborhood codes
   */
  getAllNeighborhoods() {
    return Array.from(this.neighborhoodGroups.keys()).sort((a, b) => {
      // Try to sort numerically if they contain numbers
      const numA = parseInt(a.replace(/\D/g, '')) || 0;
      const numB = parseInt(b.replace(/\D/g, '')) || 0;
      if (numA !== numB) return numA - numB;
      // Otherwise sort alphabetically
      return String(a).localeCompare(String(b));
    });
  }

  /**
   * Get all blocks
   * @returns {Array<string>} Block numbers (e.g., "38", "39", "40")
   */
  getAllBlocks() {
    return Array.from(this.blockGroups.keys()).sort((a, b) => {
      // Extract numbers and sort numerically (works with or without R prefix)
      const numA = parseInt(a.replace(/\D/g, '')) || 0;
      const numB = parseInt(b.replace(/\D/g, '')) || 0;
      return numA - numB;
    });
  }

  /**
   * Get all plots
   * @returns {Array<string>} Plot numbers
   */
  getAllPlots() {
    return Array.from(this.plotGroups.keys()).sort((a, b) => {
      // Sort numerically
      const numA = parseInt(a) || 0;
      const numB = parseInt(b) || 0;
      return numA - numB;
    });
  }

  /**
   * Get elements by phase
   * @param {string} phase - Phase name
   * @returns {Array<number>} Database IDs
   */
  getElementsByPhase(phase) {
    const normalized = this.normalizeValue(phase);
    return this.phaseGroups.get(normalized) || [];
  }

  /**
   * Get elements by neighborhood
   * @param {string} neighborhood - Neighborhood/sector name
   * @returns {Array<number>} Database IDs
   */
  getElementsByNeighborhood(neighborhood) {
    const normalized = this.normalizeValue(neighborhood);
    return this.neighborhoodGroups.get(normalized) || [];
  }

  /**
   * Group elements by block for coloring
   * @returns {Map<string, Array<number>>} Block -> dbIds map
   */
  groupByBlock() {
    return this.blockGroups;
  }

  /**
   * Group elements by component
   * @returns {Map<string, Array<number>>} Component -> dbIds map
   */
  groupByComponent() {
    const componentMap = new Map();
    this.componentGroups.forEach((dbIdSet, component) => {
      componentMap.set(component, Array.from(dbIdSet));
    });
    return componentMap;
  }

  /**
   * Calculate status based on dates in properties
   * @param {object} elementInfo - Element information
   * @returns {string} Status
   */
  calculateStatus(elementInfo) {
    const now = new Date();

    if (elementInfo.completionDate) {
      return 'COMPLETED';
    }

    if (elementInfo.plannedFinish) {
      const planned = new Date(elementInfo.plannedFinish);
      if (now > planned) {
        return 'DELAYED';
      }
      return 'IN_PROGRESS';
    }

    return 'NOT_STARTED';
  }

  /**
   * Group elements by status
   * @returns {Map<string, Array<number>>} Status -> dbIds map
   */
  groupByStatus() {
    const statusGroups = new Map([
      ['COMPLETED', []],
      ['IN_PROGRESS', []],
      ['DELAYED', []],
      ['NOT_STARTED', []]
    ]);

    this.elementData.forEach((info, dbId) => {
      const status = this.calculateStatus(info);
      statusGroups.get(status).push(dbId);
    });

    return statusGroups;
  }

  /**
   * Get statistics
   * @returns {object} Statistics
   */
  getStats() {
    const statusGroups = this.groupByStatus();
    const total = this.elementData.size;

    return {
      totalElements: total,
      blocks: this.blockGroups.size,
      plots: this.plotGroups.size,
      components: this.componentGroups.size,
      completed: statusGroups.get('COMPLETED').length,
      inProgress: statusGroups.get('IN_PROGRESS').length,
      delayed: statusGroups.get('DELAYED').length,
      notStarted: statusGroups.get('NOT_STARTED').length,
      completionRate: total > 0 ? (statusGroups.get('COMPLETED').length / total * 100).toFixed(1) : 0
    };
  }

  /**
   * Export data for debugging
   * @returns {object} Export data
   */
  exportData() {
    const data = {};
    this.elementData.forEach((info, dbId) => {
      data[dbId] = info;
    });

    return {
      totalElements: this.elementData.size,
      blocks: Array.from(this.blockGroups.keys()),
      plots: Array.from(this.plotGroups.keys()),
      components: Array.from(this.componentGroups.keys()),
      elementData: data
    };
  }

  /**
   * Inspect property names in the model (for debugging)
   * @param {number} sampleSize - Number of elements to sample
   * @returns {Promise<object>} Property name analysis
   */
  async inspectPropertyNames(sampleSize = 100) {
    console.log(`🔍 Inspecting property names from ${sampleSize} elements...`);

    const allDbIds = await viewerManager.getAllDbIds();
    const sampleDbIds = allDbIds.slice(0, Math.min(sampleSize, allDbIds.length));

    const propertyNames = new Map(); // propertyName -> count
    const propertyExamples = new Map(); // propertyName -> example value

    const bulkProperties = await viewerManager.getBulkProperties(sampleDbIds, null);

    bulkProperties.forEach(prop => {
      prop.properties.forEach(p => {
        const name = p.displayName;
        const value = p.displayValue;

        // Count occurrences
        propertyNames.set(name, (propertyNames.get(name) || 0) + 1);

        // Store example if has value
        if (value && !propertyExamples.has(name)) {
          propertyExamples.set(name, value);
        }
      });
    });

    // Sort by frequency
    const sorted = Array.from(propertyNames.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({
        name,
        count,
        frequency: (count / sampleSize * 100).toFixed(1) + '%',
        example: propertyExamples.get(name) || 'N/A'
      }));

    console.log('📊 Property Name Analysis:');
    console.table(sorted);

    return {
      sampleSize: sampleDbIds.length,
      totalPropertyNames: propertyNames.size,
      properties: sorted
    };
  }
}

// Export singleton instance
export const embeddedDataManager = new EmbeddedDataManager();
export default embeddedDataManager;
