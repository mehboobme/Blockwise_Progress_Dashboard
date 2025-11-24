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
    this.currentFilter = null; // Store current precaster label filter
    this.cameraChangeHandler = null; // Store reference to camera change handler
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
    
    // Re-apply filter if one was active
    console.log(`🔍 Checking for stored filter: ${this.currentFilter ? this.currentFilter.length : 0} plots`);
    if (this.currentFilter && this.currentFilter.length > 0) {
      console.log(`🔄 Re-applying precaster filter after label creation (${this.currentFilter.length} plots)`);
      this.filterPrecasterLabels(this.currentFilter);
    } else {
      console.log('ℹ️ No stored filter to re-apply');
    }
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
        font-size: 14px;
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
    
    // Remove old camera change listener if exists
    if (this.cameraChangeHandler) {
      viewer.removeEventListener(Autodesk.Viewing.CAMERA_CHANGE_EVENT, this.cameraChangeHandler);
      console.log('🗑️ Removed old camera change listener');
    }
    
    // Create new handler and store reference
    this.cameraChangeHandler = () => this.updatePrecasterLabelPositions();
    
    // Update label positions initially
    this.updatePrecasterLabelPositions();
    
    // Add listener for camera changes
    viewer.addEventListener(Autodesk.Viewing.CAMERA_CHANGE_EVENT, this.cameraChangeHandler);
    console.log('➕ Added camera change listener for precaster labels');
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
    
    // Debug: Check filter state
    const filterActive = this.currentFilter && this.currentFilter.length > 0;
    let visibleCount = 0;
    let hiddenCount = 0;
    
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
      
      // Respect the filter: only show if no filter is active OR plot is in the filter
      if (this.currentFilter && this.currentFilter.length > 0) {
        const plot = label.getAttribute('data-plot');
        const plotTrimmed = String(plot).trim();
        const plotSet = new Set(this.currentFilter.map(p => String(p).trim()));
        
        if (plotSet.has(plotTrimmed)) {
          label.style.display = 'block';
          visibleCount++;
        } else {
          label.style.display = 'none';
          hiddenCount++;
        }
      } else {
        // No filter active, show all labels
        label.style.display = 'block';
        visibleCount++;
      }
    });
    
    // Log once every 100 updates to avoid spam
    if (!this._updateCounter) this._updateCounter = 0;
    this._updateCounter++;
    if (this._updateCounter % 100 === 0) {
      console.log(`📍 Position update #${this._updateCounter}: Filter=${filterActive ? this.currentFilter.length : 0}, Visible=${visibleCount}, Hidden=${hiddenCount}`);
    }
  }
  
  /**
   * Filter precaster labels to show only for specific plots
   * @param {Array<string>} plotNumbers - Array of plot numbers to show labels for (or null for all)
   */
  filterPrecasterLabels(plotNumbers = null) {
    // Store the current filter
    this.currentFilter = plotNumbers;
    
    const labelsContainer = document.getElementById('precasterLabels');
    if (!labelsContainer) {
      console.log('⚠️ No precaster labels container found');
      return;
    }
    
    const labels = labelsContainer.querySelectorAll('.precaster-label');
    console.log(`🔍 Found ${labels.length} total precaster labels`);
    
    if (!plotNumbers || plotNumbers.length === 0) {
      // Hide all labels when no plots specified
      labels.forEach(label => {
        label.style.display = 'none';
      });
      console.log('🏷️ Hiding all precaster labels (no filter active)');
    } else {
      // Show only labels for specified plots, hide others
      const plotSet = new Set(plotNumbers.map(p => String(p).trim()));
      console.log(`🏷️ Filter active for plots: ${Array.from(plotSet).slice(0, 5).join(', ')}... (${plotSet.size} total)`);
      
      let visibleCount = 0;
      let hiddenCount = 0;
      
      // Debug: Track which labels should be hidden
      const shouldBeHidden = [];
      const shouldBeVisible = [];
      
      labels.forEach(label => {
        const plot = label.getAttribute('data-plot');
        const plotTrimmed = String(plot).trim();
        
        if (plotSet.has(plotTrimmed)) {
          label.style.display = 'block';
          visibleCount++;
          if (shouldBeVisible.length < 3) shouldBeVisible.push(plotTrimmed);
        } else {
          label.style.display = 'none';
          hiddenCount++;
          if (shouldBeHidden.length < 10) shouldBeHidden.push(plotTrimmed);
        }
      });
      
      // Debug: Show which plots should be hidden
      if (shouldBeHidden.length > 0) {
        console.log(`   🚫 Hidden plots (not in filter): ${shouldBeHidden.join(', ')}`);
      } else {
        console.log(`   ⚠️ WARNING: No labels were hidden! All 303 labels match the filter?`);
        console.log(`   Filter has ${plotSet.size} plots, labels has ${labels.length} labels`);
        // Show first 3 label plots and first 3 filter plots
        const firstLabelPlots = [];
        labels.forEach((l, i) => {
          if (i < 3) firstLabelPlots.push(l.getAttribute('data-plot'));
        });
        console.log(`   First 3 label plots: ${firstLabelPlots.join(', ')}`);
        console.log(`   First 3 filter plots: ${Array.from(plotSet).slice(0, 3).join(', ')}`);
      }
      
      console.log(`🏷️ Precaster labels filtered: ${visibleCount} visible, ${hiddenCount} hidden`);
      
      // Debug: Show first few hidden and visible plots
      const visiblePlots = [];
      const hiddenPlots = [];
      labels.forEach(label => {
        const plot = label.getAttribute('data-plot');
        if (label.style.display === 'block' && visiblePlots.length < 5) {
          visiblePlots.push(plot);
        } else if (label.style.display === 'none' && hiddenPlots.length < 5) {
          hiddenPlots.push(plot);
        }
      });
      console.log(`   Visible plots: ${visiblePlots.join(', ')}`);
      console.log(`   Hidden plots: ${hiddenPlots.join(', ')}`);
    }
  }
  
  /**
   * Clear precaster labels
   */
  clearPrecasterLabels() {
    // Remove camera change listener
    if (this.cameraChangeHandler && viewerManager.viewer) {
      viewerManager.viewer.removeEventListener(Autodesk.Viewing.CAMERA_CHANGE_EVENT, this.cameraChangeHandler);
      this.cameraChangeHandler = null;
      console.log('🗑️ Removed camera change listener');
    }
    
    const existingLabels = document.getElementById('precasterLabels');
    if (existingLabels) {
      existingLabels.remove();
    }
    // Clear the stored filter
    this.currentFilter = null;
    console.log('🧹 Precaster labels and filter cleared');
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
        // Status legend with actual colors used
        const statusColors = {
          'Raft Completed': { r: 0, g: 102, b: 255, a: 1.0 },
          'Pre-Cast in Progress': { r: 102, g: 255, b: 255, a: 1.0 },
          'Pre-Cast Completed': { r: 204, g: 204, b: 0, a: 1.0 },
          'MEP & Finishes in Progress': { r: 255, g: 102, b: 204, a: 1.0 },
          'MEP & Finishes Completed': { r: 102, g: 255, b: 51, a: 1.0 },
          'Villa Handover': { r: 51, g: 153, b: 102, a: 1.0 }
        };

        // Count villas by status
        const statusCounts = new Map();
        for (const [dbId, elementInfo] of embeddedDataManager.elementData.entries()) {
          if (!elementInfo.plot) continue;
          const excelData = embeddedDataManager.getExcelDataForPlot(elementInfo.plot);
          if (excelData && excelData.status) {
            statusCounts.set(excelData.status, (statusCounts.get(excelData.status) || 0) + 1);
          }
        }

        // Add to legend
        for (const [status, color] of Object.entries(statusColors)) {
          const count = statusCounts.get(status) || 0;
          if (count > 0) {
            legend.push({
              label: status,
              color: color,
              count: count
            });
          }
        }
        break;
    }

    return legend;
  }

  /**
   * Get contractor legend (for block labels)
   * @returns {Array} Contractor legend items
   */
  getContractorLegend() {
    const legend = [
      {
        label: 'SPML',
        color: { r: 102, g: 179, b: 255, a: 1.0 }, // Light Blue
        symbol: 'circle'
      },
      {
        label: 'ABR',
        color: { r: 255, g: 215, b: 0, a: 1.0 }, // Golden
        symbol: 'circle'
      }
    ];
    return legend;
  }

  /**
   * Get precaster legend
   * @returns {Array} Precaster legend items
   */
  getPrecasterLegend() {
    const precasters = new Set();

    // Collect all unique precasters from Excel data
    for (const [plot, data] of embeddedDataManager.excelData.entries()) {
      if (data.precaster) {
        precasters.add(data.precaster);
      }
    }

    const legend = [];
    for (const precaster of Array.from(precasters).sort()) {
      legend.push({
        label: precaster,
        type: 'text' // Text labels, not color-coded
      });
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
