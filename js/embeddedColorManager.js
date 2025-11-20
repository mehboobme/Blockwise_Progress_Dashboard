/**
 * Embedded Color Manager
 * Handles coloring based on embedded model properties
 */

import { CONFIG, getBlockColor, getComponentColor } from './config.js';
import { viewerManager } from './viewer.js';
import { embeddedDataManager } from './embeddedDataManager.js';

class EmbeddedColorManager {
  constructor() {
    this.currentScheme = null;
    this.colorMap = new Map();
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
    const blockGroups = embeddedDataManager.groupByBlock();

    blockGroups.forEach((dbIds, blockNumber) => {
      const color = getBlockColor(blockNumber);

      dbIds.forEach(dbId => {
        this.colorMap.set(dbId, color);
      });

      viewerManager.setColor(dbIds, color);
      console.log(`  Block ${blockNumber}: ${dbIds.length} elements`);
    });
  }

  /**
   * Color elements by component type
   */
  async colorByComponent() {
    const componentGroups = embeddedDataManager.groupByComponent();

    componentGroups.forEach((dbIds, component) => {
      const color = getComponentColor(component);

      dbIds.forEach(dbId => {
        this.colorMap.set(dbId, color);
      });

      viewerManager.setColor(dbIds, color);
      console.log(`  Component ${component}: ${dbIds.length} elements`);
    });
  }

  /**
   * Color elements by status
   */
  async colorByStatus() {
    const statusGroups = embeddedDataManager.groupByStatus();

    statusGroups.forEach((dbIds, status) => {
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
        const blocks = embeddedDataManager.groupByBlock();
        blocks.forEach((dbIds, block) => {
          legend.push({
            label: `Block ${block}`,
            color: getBlockColor(block),
            count: dbIds.length
          });
        });
        break;

      case 'Component':
        const components = embeddedDataManager.groupByComponent();
        components.forEach((dbIds, component) => {
          legend.push({
            label: component,
            color: getComponentColor(component),
            count: dbIds.length
          });
        });
        break;

      case 'Status':
        const statuses = embeddedDataManager.groupByStatus();
        statuses.forEach((dbIds, status) => {
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
export const embeddedColorManager = new EmbeddedColorManager();
export default embeddedColorManager;
