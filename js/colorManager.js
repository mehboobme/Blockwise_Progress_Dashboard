/**
 * Color Manager Module
 * Handles coloring schemes for the 3D model
 */

import { CONFIG, getBlockColor, getComponentColor, calculateStatus } from './config.js';
import { viewerManager } from './viewer.js';
import { modelDataMapper } from './modelDataMapper.js';

class ColorManager {
  constructor() {
    this.currentScheme = null;
    this.colorMap = new Map(); // dbId -> color
  }

  /**
   * Apply color scheme to the model
   * @param {string} scheme - 'Block', 'Component', 'Status', or 'None'
   * @returns {Promise<void>}
   */
  async applyColorScheme(scheme) {
    console.log(`🎨 Applying color scheme: ${scheme}`);
    
    // Clear existing colors
    viewerManager.clearColors();
    this.colorMap.clear();

    if (scheme === 'None') {
      this.currentScheme = null;
      return;
    }

    this.currentScheme = scheme;

    switch (scheme) {
      case 'Block':
        await this.colorByBlock();
        break;
      case 'Component':
        await this.colorByComponent();
        break;
      case 'Status':
        await this.colorByStatus();
        break;
      default:
        console.warn(`Unknown color scheme: ${scheme}`);
    }

    console.log(`✅ Color scheme applied: ${this.colorMap.size} elements colored`);
  }

  /**
   * Color elements by block number
   */
  async colorByBlock() {
    const blockGroups = modelDataMapper.groupByBlock();

    blockGroups.forEach((dbIds, blockNumber) => {
      const color = getBlockColor(blockNumber);
      
      dbIds.forEach(dbId => {
        this.colorMap.set(dbId, color);
      });
      
      viewerManager.setColor(dbIds, color);
    });
  }

  /**
   * Color elements by component type
   */
  async colorByComponent() {
    const componentGroups = modelDataMapper.groupByComponent();

    componentGroups.forEach((dbIds, component) => {
      const color = getComponentColor(component);
      
      dbIds.forEach(dbId => {
        this.colorMap.set(dbId, color);
      });
      
      viewerManager.setColor(dbIds, color);
    });
  }

  /**
   * Color elements by status (completed, in progress, not started, delayed)
   */
  async colorByStatus() {
    const statusGroups = {
      COMPLETED: [],
      IN_PROGRESS: [],
      NOT_STARTED: [],
      DELAYED: []
    };

    // Group elements by status
    modelDataMapper.mappings.forEach((mapping, dbId) => {
      // Get the first data row (or aggregate if multiple)
      const data = mapping.excelData[0];
      
      const status = calculateStatus(
        data.plannedStart,
        data.plannedFinish,
        data.actualStart,
        data.actualFinish
      );

      statusGroups[status].push(dbId);
    });

    // Apply colors for each status
    Object.entries(statusGroups).forEach(([status, dbIds]) => {
      if (dbIds.length > 0) {
        const color = CONFIG.COLORS[status];
        
        dbIds.forEach(dbId => {
          this.colorMap.set(dbId, color);
        });
        
        viewerManager.setColor(dbIds, color);
        console.log(`  ${status}: ${dbIds.length} elements`);
      }
    });
  }

  /**
   * Highlight specific elements
   * @param {Array<number>} dbIds - Elements to highlight
   * @param {object} color - Optional custom color
   */
  highlight(dbIds, color = null) {
    const highlightColor = color || CONFIG.COLORS.SELECTED;
    viewerManager.setColor(dbIds, highlightColor);
  }

  /**
   * Remove highlight from elements
   * @param {Array<number>} dbIds - Elements to unhighlight
   */
  unhighlight(dbIds) {
    // Restore original colors
    dbIds.forEach(dbId => {
      const originalColor = this.colorMap.get(dbId);
      if (originalColor) {
        viewerManager.setColor([dbId], originalColor);
      }
    });
  }

  /**
   * Get color for a specific element
   * @param {number} dbId - Element database ID
   * @returns {object|null} Color object
   */
  getColorForElement(dbId) {
    return this.colorMap.get(dbId);
  }

  /**
   * Filter elements by color criteria
   * @param {string} criteria - 'Block', 'Component', 'Status'
   * @param {string} value - Specific value to filter by
   */
  filterByCriteria(criteria, value) {
    const matchingDbIds = [];

    modelDataMapper.mappings.forEach((mapping, dbId) => {
      const data = mapping.excelData[0];
      
      let matches = false;
      
      switch (criteria) {
        case 'Block':
          matches = String(data.block) === String(value);
          break;
        case 'Component':
          matches = data.component === value;
          break;
        case 'Status':
          const status = calculateStatus(
            data.plannedStart,
            data.plannedFinish,
            data.actualStart,
            data.actualFinish
          );
          matches = status === value;
          break;
      }

      if (matches) {
        matchingDbIds.push(dbId);
      }
    });

    return matchingDbIds;
  }

  /**
   * Create a legend for the current color scheme
   * @returns {Array} Legend items
   */
  getLegend() {
    if (!this.currentScheme) {
      return [];
    }

    const legend = [];

    switch (this.currentScheme) {
      case 'Block':
        const blocks = modelDataMapper.groupByBlock();
        blocks.forEach((dbIds, block) => {
          legend.push({
            label: `Block ${block}`,
            color: getBlockColor(block),
            count: dbIds.length
          });
        });
        break;

      case 'Component':
        const components = modelDataMapper.groupByComponent();
        components.forEach((dbIds, component) => {
          legend.push({
            label: component,
            color: getComponentColor(component),
            count: dbIds.length
          });
        });
        break;

      case 'Status':
        const statuses = ['COMPLETED', 'IN_PROGRESS', 'NOT_STARTED', 'DELAYED'];
        statuses.forEach(status => {
          const dbIds = this.filterByCriteria('Status', status);
          if (dbIds.length > 0) {
            legend.push({
              label: status.replace('_', ' '),
              color: CONFIG.COLORS[status],
              count: dbIds.length
            });
          }
        });
        break;
    }

    return legend;
  }

  /**
   * Export color map for debugging
   * @returns {object} Color map data
   */
  exportColorMap() {
    const map = {};
    this.colorMap.forEach((color, dbId) => {
      map[dbId] = color;
    });
    return {
      scheme: this.currentScheme,
      totalColored: this.colorMap.size,
      colors: map
    };
  }

  /**
   * Clear all colors
   */
  clear() {
    viewerManager.clearColors();
    this.colorMap.clear();
    this.currentScheme = null;
    console.log('🧹 Colors cleared');
  }
}

// Export singleton instance
export const colorManager = new ColorManager();
export default colorManager;
