/**
 * Model Data Mapper Module
 * Maps Excel data to 3D model elements
 */

import { CONFIG } from './config.js';
import { viewerManager } from './viewer.js';
import { dataParser } from './dataParser.js';

class ModelDataMapper {
  constructor() {
    this.mappings = new Map(); // dbId -> excelData
    this.reverseMappings = new Map(); // plotNumber -> [dbIds]
    this.unmappedDbIds = [];
    this.unmappedPlots = [];
  }

  /**
   * Build mappings between model elements and Excel data
   * @returns {Promise<object>} Mapping statistics
   */
  async buildMappings() {
    console.log('🔄 Building mappings...');
    
    this.mappings.clear();
    this.reverseMappings.clear();
    this.unmappedDbIds = [];
    this.unmappedPlots = [];

    // Get all element IDs
    const allDbIds = await viewerManager.getAllDbIds();
    console.log(`📊 Total elements in model: ${allDbIds.length}`);

    // Get properties for all elements
    const propertyNames = CONFIG.MODEL_PROPERTIES.PLOT_NUMBER
      .concat(CONFIG.MODEL_PROPERTIES.VILLA_TYPE)
      .concat(CONFIG.MODEL_PROPERTIES.BLOCK);

    console.log('🔍 Searching for properties:', propertyNames);

    const bulkProperties = await viewerManager.getBulkProperties(
      allDbIds,
      propertyNames
    );

    console.log(`📊 Got ${bulkProperties.length} elements with properties`);
    
    // Check first element to debug
    if (bulkProperties.length > 0) {
      const first = bulkProperties[0];
      console.log(`   First element (dbId ${first.dbId}) has ${first.properties.length} properties`);
      if (first.properties.length > 0) {
        console.log(`   Sample: ${first.properties[0].category}/${first.properties[0].displayName} = ${first.properties[0].displayValue}`);
      }
    }

    // Map each element
    let mappedCount = 0;
    let sampleLogged = false;
    
    bulkProperties.forEach(prop => {
      const plotNumber = this.extractPlotNumber(prop.properties);
      
      // Log first successful extraction for debugging
      if (plotNumber && !sampleLogged) {
        console.log(`\n✅ First Plot Number Extracted: ${plotNumber}`);
        console.log(`   From element dbId: ${prop.dbId}`);
        console.log(`   Properties on this element:`);
        prop.properties.slice(0, 5).forEach(p => {
          console.log(`     • ${p.category}/${p.displayName} = ${p.displayValue}`);
        });
        sampleLogged = true;
      }
      
      if (plotNumber) {
        // Get Excel data for this plot
        const excelData = dataParser.getDataByPlot(plotNumber);
        
        if (excelData && excelData.length > 0) {
          // Store mapping
          this.mappings.set(prop.dbId, {
            plotNumber,
            excelData,
            modelProperties: prop.properties
          });

          // Store reverse mapping
          if (!this.reverseMappings.has(plotNumber)) {
            this.reverseMappings.set(plotNumber, []);
          }
          this.reverseMappings.get(plotNumber).push(prop.dbId);

          mappedCount++;
        } else {
          this.unmappedPlots.push(plotNumber);
        }
      } else {
        this.unmappedDbIds.push(prop.dbId);
      }
    });

    const stats = {
      totalElements: allDbIds.length,
      mapped: mappedCount,
      unmappedElements: this.unmappedDbIds.length,
      unmappedPlots: new Set(this.unmappedPlots).size,
      mappingRate: (mappedCount / allDbIds.length * 100).toFixed(1)
    };

    console.log(`✅ Mapping complete:`, stats);
    return stats;
  }

  /**
   * Extract plot number from element properties
   * @param {Array} properties - Element properties
   * @returns {string|null} Plot number
   */
  extractPlotNumber(properties) {
    // Try different property names in priority order
    for (const propName of CONFIG.MODEL_PROPERTIES.PLOT_NUMBER) {
      const prop = this.findProperty(properties, propName);
      
      if (prop && prop.displayValue) {
        return this.normalizePlotNumber(prop.displayValue);
      }
    }
    
    return null;
  }

  /**
   * Extract villa type from element properties
   * @param {Array} properties - Element properties
   * @returns {string|null} Villa type
   */
  extractVillaType(properties) {
    for (const propName of CONFIG.MODEL_PROPERTIES.VILLA_TYPE) {
      const prop = this.findProperty(properties, propName);
      
      if (prop && prop.displayValue) {
        return String(prop.displayValue).trim();
      }
    }
    
    return null;
  }

  /**
   * Extract block number from element properties
   * @param {Array} properties - Element properties
   * @returns {string|null} Block number
   */
  extractBlock(properties) {
    for (const propName of CONFIG.MODEL_PROPERTIES.BLOCK) {
      const prop = this.findProperty(properties, propName);
      
      if (prop && prop.displayValue) {
        return String(prop.displayValue).trim();
      }
    }
    
    return null;
  }

  /**
   * Find property by name, supporting category paths and wildcards
   * Handles three formats:
   *   - 'Element/Plot' (exact category path)
   *   - 'Plot' (simple displayName)
   *   - 'Element/*Plot*' (wildcard matching)
   * @param {Array} properties - Element properties
   * @param {string} propName - Property name to find
   * @returns {object|null} Property object or null
   */
  findProperty(properties, propName) {
    if (!properties || !Array.isArray(properties)) {
      return null;
    }

    // Try exact match first (category/displayName)
    let prop = properties.find(p => {
      if (propName.includes('/')) {
        // Category path format: 'Element/Plot'
        const fullName = `${p.category}/${p.displayName}`;
        return fullName === propName;
      } else if (propName.includes('*')) {
        // Wildcard format: 'Element/*Plot*'
        const pattern = new RegExp(
          `^${propName.replace(/\*/g, '.*')}$`,
          'i'
        );
        return pattern.test(`${p.category}/${p.displayName}`);
      } else {
        // Simple displayName match
        return p.displayName === propName;
      }
    });

    if (prop) {
      return prop;
    }

    // Fallback: case-insensitive displayName match
    prop = properties.find(p => 
      p.displayName.toLowerCase() === propName.toLowerCase()
    );

    return prop || null;
  }

  /**
   * Normalize plot number for consistent matching
   * @param {string|number} plotNumber - Raw plot number
   * @returns {string} Normalized plot number
   */
  normalizePlotNumber(plotNumber) {
    if (!plotNumber) return '';
    
    // Convert to string and trim
    let normalized = String(plotNumber).trim();
    
    // Remove common prefixes
    normalized = normalized.replace(/^(plot|villa|unit)\s*/i, '');
    
    // Return lowercase for case-insensitive matching
    return normalized.toLowerCase();
  }

  /**
   * Get Excel data for a model element
   * @param {number} dbId - Element database ID
   * @returns {Array|null} Excel data rows
   */
  getDataForElement(dbId) {
    const mapping = this.mappings.get(dbId);
    return mapping ? mapping.excelData : null;
  }

  /**
   * Get model elements for a plot number
   * @param {string} plotNumber - Plot number
   * @returns {Array<number>} Database IDs
   */
  getElementsForPlot(plotNumber) {
    const normalized = this.normalizePlotNumber(plotNumber);
    return this.reverseMappings.get(normalized) || [];
  }

  /**
   * Get all mapped plot numbers
   * @returns {Array<string>} Plot numbers
   */
  getMappedPlots() {
    return Array.from(this.reverseMappings.keys());
  }

  /**
   * Get mapping for a specific element
   * @param {number} dbId - Element database ID
   * @returns {object|null} Mapping object
   */
  getMapping(dbId) {
    return this.mappings.get(dbId);
  }

  /**
   * Check if element is mapped
   * @param {number} dbId - Element database ID
   * @returns {boolean}
   */
  isMapped(dbId) {
    return this.mappings.has(dbId);
  }

  /**
   * Get statistics about mappings
   * @returns {object} Mapping statistics
   */
  getStats() {
    return {
      totalMappings: this.mappings.size,
      uniquePlots: this.reverseMappings.size,
      unmappedElements: this.unmappedDbIds.length,
      unmappedPlots: new Set(this.unmappedPlots).size
    };
  }

  /**
   * Find elements by Excel criteria
   * @param {object} criteria - Search criteria
   * @returns {Array<number>} Matching database IDs
   */
  findElements(criteria) {
    const matchingDbIds = [];

    this.mappings.forEach((mapping, dbId) => {
      const data = mapping.excelData[0]; // Take first row for each plot
      
      let matches = true;
      for (const [key, value] of Object.entries(criteria)) {
        if (data[key] !== value) {
          matches = false;
          break;
        }
      }

      if (matches) {
        matchingDbIds.push(dbId);
      }
    });

    return matchingDbIds;
  }

  /**
   * Group elements by block
   * @returns {Map<string, Array<number>>} Block -> dbIds map
   */
  groupByBlock() {
    const blockGroups = new Map();

    this.mappings.forEach((mapping, dbId) => {
      const block = mapping.excelData[0].block;
      
      if (!blockGroups.has(block)) {
        blockGroups.set(block, []);
      }
      
      blockGroups.get(block).push(dbId);
    });

    return blockGroups;
  }

  /**
   * Group elements by component type
   * @returns {Map<string, Array<number>>} Component -> dbIds map
   */
  groupByComponent() {
    const componentGroups = new Map();

    this.mappings.forEach((mapping, dbId) => {
      mapping.excelData.forEach(data => {
        const component = data.component;
        
        if (!componentGroups.has(component)) {
          componentGroups.set(component, new Set());
        }
        
        componentGroups.get(component).add(dbId);
      });
    });

    // Convert Sets to Arrays
    const result = new Map();
    componentGroups.forEach((dbIds, component) => {
      result.set(component, Array.from(dbIds));
    });

    return result;
  }

  /**
   * Export unmapped elements for debugging
   * @returns {object} Unmapped data
   */
  exportUnmapped() {
    return {
      unmappedDbIds: this.unmappedDbIds,
      unmappedPlots: Array.from(new Set(this.unmappedPlots)),
      count: {
        elements: this.unmappedDbIds.length,
        plots: new Set(this.unmappedPlots).size
      }
    };
  }

  /**
   * Clear all mappings
   */
  clear() {
    this.mappings.clear();
    this.reverseMappings.clear();
    this.unmappedDbIds = [];
    this.unmappedPlots = [];
    console.log('🧹 Mappings cleared');
  }
}

// Export singleton instance
export const modelDataMapper = new ModelDataMapper();
export default modelDataMapper;
