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
   * Color elements by status from Excel data
   */
  async colorByStatus() {
    console.log('🎨 Coloring by status using Excel data...');
    
    // Status color mapping (matching Gantt chart colors)
    const statusColors = {
      'Raft Completed': { r: 0, g: 102, b: 255, a: 1.0 },           // Blue
      'Pre-Cast in Progress': { r: 102, g: 255, b: 255, a: 1.0 },   // Cyan
      'Pre-Cast Completed': { r: 204, g: 204, b: 0, a: 1.0 },       // Yellow
      'MEP & Finishes in Progress': { r: 255, g: 102, b: 204, a: 1.0 }, // Pink
      'MEP & Finishes Completed': { r: 102, g: 255, b: 51, a: 1.0 },    // Green
      'Villa Handover': { r: 51, g: 153, b: 102, a: 1.0 }           // Dark Green
    };
    
    const defaultColor = { r: 150, g: 150, b: 150, a: 0.5 }; // Gray
    
    let coloredCount = 0;
    const statusCounts = new Map();
    
    // Iterate through all elements with plot numbers
    for (const [dbId, elementInfo] of embeddedDataManager.elementData.entries()) {
      if (!elementInfo.plot) continue;
      
      // Get Excel data for this plot
      const excelData = embeddedDataManager.getExcelDataForPlot(elementInfo.plot);
      if (!excelData || !excelData.status) continue;
      
      const status = excelData.status;
      
      // Get color for this status (try exact match, then partial match)
      let color = statusColors[status];
      if (!color) {
        const statusLower = status.toLowerCase();
        if (statusLower.includes('raft')) color = statusColors['Raft Completed'];
        else if (statusLower.includes('pre-cast') && statusLower.includes('progress')) color = statusColors['Pre-Cast in Progress'];
        else if (statusLower.includes('pre-cast') && statusLower.includes('completed')) color = statusColors['Pre-Cast Completed'];
        else if (statusLower.includes('mep') && statusLower.includes('progress')) color = statusColors['MEP & Finishes in Progress'];
        else if (statusLower.includes('mep') && statusLower.includes('completed')) color = statusColors['MEP & Finishes Completed'];
        else if (statusLower.includes('handover')) color = statusColors['Villa Handover'];
        else color = defaultColor;
      }
      
      this.colorMap.set(dbId, color);
      coloredCount++;
      
      // Track counts
      statusCounts.set(status, (statusCounts.get(status) || 0) + 1);
    }
    
    // Apply all colors at once using viewerManager.setColor
    const viewer = viewerManager.viewer;
    const model = viewer.model;
    const tree = model.getInstanceTree();
    
    for (const [dbId, color] of this.colorMap.entries()) {
      // Get all child dbIds (fragments) for this element
      const allDbIds = [];
      
      if (tree) {
        // Recursively get all children
        const collectChildren = (nodeId) => {
          allDbIds.push(nodeId);
          tree.enumNodeChildren(nodeId, (childId) => {
            collectChildren(childId);
          });
        };
        collectChildren(dbId);
      } else {
        allDbIds.push(dbId);
      }
      
      // Apply color to all fragments
      viewerManager.setColor(allDbIds, color);
    }
    
    console.log(`🎨 Applied colors to ${this.colorMap.size} villas and their children`);
    
    console.log(`✅ Colored ${coloredCount} villas by status:`);
    statusCounts.forEach((count, status) => {
      console.log(`  ${status}: ${count} villas`);
    });
    
    // Force viewer refresh to show colors
    if (viewer) {
      viewer.impl.invalidate(true, true, true);
      console.log('🔄 Viewer refreshed to show colors');
    }
    
    // Create precaster labels
    this.createPrecasterLabels();
  }
  
  /**
   * Create floating labels with precaster letters on villas
   */
  createPrecasterLabels() {
    console.log('🏷️  Creating precaster labels...');
    
    // Clear existing labels
    this.clearPrecasterLabels();
    
    const viewer = viewerManager.viewer;
    if (!viewer || !viewer.container) return;
    
    const labelsContainer = document.createElement('div');
    labelsContainer.id = 'precasterLabels';
    labelsContainer.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 10;
    `;
    viewer.container.appendChild(labelsContainer);
    
    let labelCount = 0;
    
    // Create labels for each villa
    const model = viewer.model;
    const tree = model.getInstanceTree();
    const fragList = model.getFragmentList();
    
    for (const [dbId, elementInfo] of embeddedDataManager.elementData.entries()) {
      if (!elementInfo.plot) continue;
      
      const excelData = embeddedDataManager.getExcelDataForPlot(elementInfo.plot);
      if (!excelData || !excelData.precaster) continue;
      
      // Calculate bounding box from all fragments
      let bounds = new THREE.Box3();
      let hasFragments = false;
      
      if (tree && fragList) {
        tree.enumNodeFragments(dbId, (fragId) => {
          const fragBounds = new THREE.Box3();
          fragList.getWorldBounds(fragId, fragBounds);
          if (!fragBounds.isEmpty()) {
            bounds.union(fragBounds);
            hasFragments = true;
          }
        }, true); // true = recursive
      }
      
      if (!hasFragments || bounds.isEmpty()) {
        console.log(`⚠️ No bounds for plot ${elementInfo.plot}`);
        continue;
      }
      
      const center = bounds.getCenter(new THREE.Vector3());
      
      // Create label element
      const label = document.createElement('div');
      label.className = 'precaster-label';
      label.textContent = excelData.precaster;
      label.setAttribute('data-dbid', dbId);
      label.setAttribute('data-plot', elementInfo.plot);
      label.style.cssText = `
        position: absolute;
        color: white;
        font-size: 8px;
        font-weight: normal;
        transform: translate(-50%, -50%);
        white-space: nowrap;
        pointer-events: none;
        z-index: 1000;
        text-shadow: 1px 1px 2px black;
      `;
      
      labelsContainer.appendChild(label);
      labelCount++;
    }
    
    console.log(`✅ Created ${labelCount} precaster labels`);
    
    // Update label positions when camera moves
    this.updatePrecasterLabelPositions();
    viewer.addEventListener(Autodesk.Viewing.CAMERA_CHANGE_EVENT, () => {
      this.updatePrecasterLabelPositions();
    });
  }
  
  /**
   * Update screen positions of precaster labels
   */
  updatePrecasterLabelPositions() {
    const viewer = viewerManager.viewer;
    if (!viewer) return;
    
    const labelsContainer = document.getElementById('precasterLabels');
    if (!labelsContainer) return;
    
    const model = viewer.model;
    const tree = model.getInstanceTree();
    const fragList = model.getFragmentList();
    
    const labels = labelsContainer.querySelectorAll('.precaster-label');
    labels.forEach(label => {
      const dbId = parseInt(label.getAttribute('data-dbid'));
      
      // Calculate bounding box from fragments
      let bounds = new THREE.Box3();
      let hasFragments = false;
      
      if (tree && fragList) {
        tree.enumNodeFragments(dbId, (fragId) => {
          const fragBounds = new THREE.Box3();
          fragList.getWorldBounds(fragId, fragBounds);
          if (!fragBounds.isEmpty()) {
            bounds.union(fragBounds);
            hasFragments = true;
          }
        }, true);
      }
      
      if (!hasFragments || bounds.isEmpty()) {
        label.style.display = 'none';
        return;
      }
      
      const center = bounds.getCenter(new THREE.Vector3());
      const screenPos = viewer.worldToClient(center);
      
      label.style.left = screenPos.x + 'px';
      label.style.top = screenPos.y + 'px';
      label.style.display = 'block';
    });
  }
  
  /**
   * Filter precaster labels to show only for specific plots
   * @param {Array<string>} plotNumbers - Array of plot numbers to show labels for (or null for all)
   */
  filterPrecasterLabels(plotNumbers = null) {
    const labelsContainer = document.getElementById('precasterLabels');
    if (!labelsContainer) return;
    
    const labels = labelsContainer.querySelectorAll('.precaster-label');
    
    if (!plotNumbers || plotNumbers.length === 0) {
      // Show all labels
      labels.forEach(label => {
        label.style.opacity = '1';
      });
    } else {
      // Show only labels for specified plots
      const plotSet = new Set(plotNumbers.map(p => String(p).trim()));
      labels.forEach(label => {
        const plot = label.getAttribute('data-plot');
        if (plotSet.has(plot)) {
          label.style.opacity = '1';
        } else {
          label.style.opacity = '0';
        }
      });
    }
  }
  
  /**
   * Clear precaster labels
   */
  clearPrecasterLabels() {
    const existingLabels = document.getElementById('precasterLabels');
    if (existingLabels) {
      existingLabels.remove();
    }
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
