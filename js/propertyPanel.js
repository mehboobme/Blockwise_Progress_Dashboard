/**
 * Property Panel Module
 * Custom panel to display Excel data attributes
 */

import { modelDataMapper } from './modelDataMapper.js';
import { viewerManager } from './viewer.js';

class PropertyPanel {
  constructor() {
    this.panel = null;
    this.isVisible = false;
  }

  /**
   * Initialize the property panel
   */
  initialize() {
    // Disabled - Villa Properties panel is not used
    console.log('ℹ️ Villa Properties panel is disabled');
    return;
    
    this.createPanel();
    this.attachStyles();
  }

  /**
   * Create the panel HTML structure
   */
  createPanel() {
    // Check if panel already exists
    if (document.getElementById('propertyPanel')) {
      this.panel = document.getElementById('propertyPanel');
      return;
    }

    // Create panel element
    this.panel = document.createElement('div');
    this.panel.id = 'propertyPanel';
    this.panel.className = 'property-panel';
    this.panel.innerHTML = `
      <div class="panel-header">
        <h3>Villa Properties</h3>
        <button class="close-btn" onclick="propertyPanel.hide()">×</button>
      </div>
      <div class="panel-content" id="panelContent">
        <p class="placeholder">Select an element to view properties</p>
      </div>
    `;

    document.body.appendChild(this.panel);
  }

  /**
   * Attach CSS styles for the panel
   */
  attachStyles() {
    if (document.getElementById('propertyPanelStyles')) {
      return;
    }

    const style = document.createElement('style');
    style.id = 'propertyPanelStyles';
    style.textContent = `
      .property-panel {
        position: fixed;
        right: 20px;
        top: 80px;
        width: 350px;
        max-height: 70vh;
        background: white;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        display: none;
        flex-direction: column;
        z-index: 1000;
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      }

      .property-panel.visible {
        display: flex;
      }

      .panel-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 15px 20px;
        border-bottom: 2px solid #e0e0e0;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        border-radius: 8px 8px 0 0;
      }

      .panel-header h3 {
        margin: 0;
        font-size: 18px;
        font-weight: 600;
      }

      .close-btn {
        background: none;
        border: none;
        color: white;
        font-size: 28px;
        cursor: pointer;
        padding: 0;
        width: 30px;
        height: 30px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        transition: background 0.2s;
      }

      .close-btn:hover {
        background: rgba(255,255,255,0.2);
      }

      .panel-content {
        padding: 20px;
        overflow-y: auto;
        flex: 1;
      }

      .property-group {
        margin-bottom: 20px;
      }

      .property-group h4 {
        margin: 0 0 10px 0;
        font-size: 14px;
        color: #667eea;
        text-transform: uppercase;
        font-weight: 600;
        border-bottom: 1px solid #e0e0e0;
        padding-bottom: 5px;
      }

      .property-row {
        display: flex;
        justify-content: space-between;
        padding: 8px 0;
        border-bottom: 1px solid #f0f0f0;
      }

      .property-row:last-child {
        border-bottom: none;
      }

      .property-label {
        font-weight: 600;
        color: #555;
        font-size: 13px;
      }

      .property-value {
        color: #333;
        font-size: 13px;
        text-align: right;
        max-width: 60%;
        word-wrap: break-word;
      }

      .status-badge {
        display: inline-block;
        padding: 4px 12px;
        border-radius: 12px;
        font-size: 11px;
        font-weight: 600;
        text-transform: uppercase;
      }

      .status-completed {
        background: #d4edda;
        color: #155724;
      }

      .status-inprogress {
        background: #fff3cd;
        color: #856404;
      }

      .status-notstarted {
        background: #e2e3e5;
        color: #383d41;
      }

      .status-delayed {
        background: #f8d7da;
        color: #721c24;
      }

      .placeholder {
        color: #999;
        font-style: italic;
        text-align: center;
        padding: 40px 20px;
      }

      .multiple-components {
        margin-top: 10px;
      }

      .component-item {
        background: #f8f9fa;
        padding: 10px;
        margin-bottom: 10px;
        border-radius: 6px;
        border-left: 3px solid #667eea;
      }

      .component-item h5 {
        margin: 0 0 8px 0;
        color: #667eea;
        font-size: 13px;
      }
    `;

    document.head.appendChild(style);
  }

  /**
   * Show panel with data for selected element
   * @param {number} dbId - Element database ID
   */
  async show(dbId) {
    if (!dbId) {
      this.hide();
      return;
    }

    // Get Excel data for this element
    const excelData = modelDataMapper.getDataForElement(dbId);
    
    if (!excelData || excelData.length === 0) {
      this.showNoData(dbId);
      return;
    }

    // Get model properties
    const modelProps = await viewerManager.getProperties(dbId);

    // Render the data
    this.renderProperties(excelData, modelProps);
    
    // Show panel
    this.panel.classList.add('visible');
    this.isVisible = true;
  }

  /**
   * Render properties in the panel
   * @param {Array} excelData - Excel data rows
   * @param {object} modelProps - Model properties
   */
  renderProperties(excelData, modelProps) {
    const content = document.getElementById('panelContent');
    const firstRow = excelData[0];

    // Calculate status
    const status = this.calculateStatus(
      firstRow.plannedStart,
      firstRow.plannedFinish,
      firstRow.actualStart,
      firstRow.actualFinish
    );

    let html = `
      <div class="property-group">
        <h4>Location</h4>
        ${this.propertyRow('Project', firstRow.project)}
        ${this.propertyRow('Phase', firstRow.phase)}
        ${this.propertyRow('Neighborhood', firstRow.neighborhood)}
        ${this.propertyRow('Sector', firstRow.sector)}
        ${this.propertyRow('Block', firstRow.block)}
        ${this.propertyRow('Plot', firstRow.plot)}
        ${this.propertyRow('Villa', firstRow.villa)}
      </div>

      <div class="property-group">
        <h4>Schedule</h4>
        ${this.propertyRow('Status', this.renderStatusBadge(status))}
        ${this.propertyRow('Planned Start', this.formatDate(firstRow.plannedStart))}
        ${this.propertyRow('Planned Finish', this.formatDate(firstRow.plannedFinish))}
        ${this.propertyRow('Actual Start', this.formatDate(firstRow.actualStart) || 'Not started')}
        ${this.propertyRow('Actual Finish', this.formatDate(firstRow.actualFinish) || 'Not completed')}
      </div>
    `;

    // Show components
    if (excelData.length > 1) {
      html += `
        <div class="property-group">
          <h4>Components (${excelData.length})</h4>
          <div class="multiple-components">
      `;

      excelData.forEach(comp => {
        const compStatus = this.calculateStatus(
          comp.plannedStart,
          comp.plannedFinish,
          comp.actualStart,
          comp.actualFinish
        );

        html += `
          <div class="component-item">
            <h5>${comp.component}</h5>
            ${this.propertyRow('Status', this.renderStatusBadge(compStatus))}
            ${this.propertyRow('Planned', this.formatDate(comp.plannedFinish))}
            ${this.propertyRow('Actual', this.formatDate(comp.actualFinish) || 'Pending')}
          </div>
        `;
      });

      html += `
          </div>
        </div>
      `;
    } else {
      html += `
        <div class="property-group">
          <h4>Component</h4>
          ${this.propertyRow('Type', firstRow.component)}
        </div>
      `;
    }

    content.innerHTML = html;
  }

  /**
   * Show message when no data is available
   * @param {number} dbId - Element database ID
   */
  async showNoData(dbId) {
    const content = document.getElementById('panelContent');
    if (!content || !this.panel) return;
    
    const modelProps = await viewerManager.getProperties(dbId);

    content.innerHTML = `
      <div class="property-group">
        <h4>Model Element</h4>
        ${this.propertyRow('Element ID', dbId)}
        ${this.propertyRow('Name', modelProps.name)}
      </div>
      <p class="placeholder">No Excel data available for this element</p>
    `;

    this.panel.classList.add('visible');
    this.isVisible = true;
  }

  /**
   * Create a property row HTML
   * @param {string} label - Property label
   * @param {string} value - Property value
   * @returns {string} HTML string
   */
  propertyRow(label, value) {
    if (!value) return '';
    
    return `
      <div class="property-row">
        <span class="property-label">${label}:</span>
        <span class="property-value">${value}</span>
      </div>
    `;
  }

  /**
   * Render status badge HTML
   * @param {string} status - Status value
   * @returns {string} HTML string
   */
  renderStatusBadge(status) {
    const className = `status-badge status-${status.toLowerCase().replace('_', '')}`;
    return `<span class="${className}">${status.replace('_', ' ')}</span>`;
  }

  /**
   * Format date for display
   * @param {Date} date - Date object
   * @returns {string} Formatted date
   */
  formatDate(date) {
    if (!date) return null;
    
    const d = new Date(date);
    if (isNaN(d.getTime())) return null;

    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  /**
   * Calculate status based on dates
   * @param {Date} plannedStart - Planned start date
   * @param {Date} plannedFinish - Planned finish date
   * @param {Date} actualStart - Actual start date
   * @param {Date} actualFinish - Actual finish date
   * @returns {string} Status
   */
  calculateStatus(plannedStart, plannedFinish, actualStart, actualFinish) {
    const now = new Date();
    const planned = plannedFinish ? new Date(plannedFinish) : null;
    
    if (actualFinish) return 'COMPLETED';
    if (actualStart) {
      return planned && now > planned ? 'DELAYED' : 'IN_PROGRESS';
    }
    return 'NOT_STARTED';
  }

  /**
   * Hide the panel
   */
  hide() {
    if (this.panel) {
      this.panel.classList.remove('visible');
      this.isVisible = false;
    }
  }

  /**
   * Toggle panel visibility
   */
  toggle() {
    if (this.isVisible) {
      this.hide();
    } else {
      // Show with last selected element if available
      const selection = viewerManager.getSelection();
      if (selection.length > 0) {
        this.show(selection[0]);
      }
    }
  }
}

// Export singleton instance and make it globally accessible
export const propertyPanel = new PropertyPanel();
window.propertyPanel = propertyPanel; // For inline onclick handlers
export default propertyPanel;
