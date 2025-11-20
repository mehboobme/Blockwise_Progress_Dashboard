/**
 * Main Application
 * Orchestrates all modules and user interactions
 */

import { CONFIG } from './config.js';
import { viewerManager } from './viewer.js';
import { dataParser } from './dataParser.js';
import { modelDataMapper } from './modelDataMapper.js';
import { colorManager } from './colorManager.js';
import { propertyPanel } from './propertyPanel.js';
import { authManager } from './auth.js';

class Application {
  constructor() {
    this.initialized = false;
    this.dataLoaded = false;
    this.modelLoaded = false;
    this.isAuthenticated = false;
  }

  /**
   * Initialize the application
   */
  async init() {
    console.log('🚀 Initializing application...');

    try {
      // Initialize auth login listener
      authManager.initLoginListener();

      // Initialize property panel
      propertyPanel.initialize();

      // Set up UI event listeners
      this.setupUIListeners();

      // Set up viewer callbacks
      this.setupViewerCallbacks();

      // Check if user is already authenticated
      this.checkAuthStatus();

      console.log('✅ Application initialized');
      this.initialized = true;

      // Show instructions
      this.showInstructions();

    } catch (error) {
      console.error('❌ Initialization error:', error);
      this.showError('Failed to initialize application: ' + error.message);
    }
  }

  /**
   * Set up UI event listeners
   */
  setupUIListeners() {
    // Login button
    const loginBtn = document.getElementById('loginBtn');
    if (loginBtn) {
      loginBtn.addEventListener('click', () => this.handleLogin());
    }

    // Logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => this.handleLogout());
    }

    // Listen for auth success message from popup
    window.addEventListener('message', (event) => {
      if (event.data.type === 'auth_success') {
        console.log('✅ Received auth success message');
        this.checkAuthStatus();
      }
    });

    // Load model button
    const loadModelBtn = document.getElementById('loadModelBtn');
    if (loadModelBtn) {
      loadModelBtn.addEventListener('click', () => this.loadModel());
    }

    // Load Excel button
    const loadExcelBtn = document.getElementById('loadExcelBtn');
    const excelInput = document.getElementById('excelInput');
    if (loadExcelBtn && excelInput) {
      loadExcelBtn.addEventListener('click', () => excelInput.click());
      excelInput.addEventListener('change', (e) => this.handleExcelUpload(e));
    }

    // Color scheme selector
    const colorSchemeSelect = document.getElementById('colorScheme');
    if (colorSchemeSelect) {
      colorSchemeSelect.addEventListener('change', (e) => {
        this.applyColorScheme(e.target.value);
      });
    }

    // Search input
    const searchInput = document.getElementById('searchInput');
    const searchBtn = document.getElementById('searchBtn');
    if (searchInput && searchBtn) {
      searchBtn.addEventListener('click', () => this.search(searchInput.value));
      searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          this.search(searchInput.value);
        }
      });
    }

    // Show all button
    const showAllBtn = document.getElementById('showAllBtn');
    if (showAllBtn) {
      showAllBtn.addEventListener('click', () => this.showAll());
    }

    // Fit to view button
    const fitViewBtn = document.getElementById('fitViewBtn');
    if (fitViewBtn) {
      fitViewBtn.addEventListener('click', () => viewerManager.fitToView());
    }

    // Export stats button
    const exportStatsBtn = document.getElementById('exportStatsBtn');
    if (exportStatsBtn) {
      exportStatsBtn.addEventListener('click', () => this.exportStats());
    }
  }

  /**
   * Set up viewer event callbacks
   */
  setupViewerCallbacks() {
    // Selection changed
    viewerManager.onSelectionChanged = async (dbIds) => {
      if (dbIds.length > 0) {
        // Show properties for first selected element
        await propertyPanel.show(dbIds[0]);
      } else {
        propertyPanel.hide();
      }
    };

    // Geometry loaded
    viewerManager.onGeometryLoaded = async () => {
      console.log('📐 Geometry loaded');
      
      // If Excel data is already loaded, build mappings
      if (this.dataLoaded) {
        await this.buildMappingsAndColor();
      }
    };
  }

  /**
   * Load the 3D model
   */
  async loadModel() {
    try {
      this.updateStatus('Loading model...', 'info');

      // Initialize viewer
      await viewerManager.initialize(CONFIG.VIEWER.container);

      // Use VIEWABLE_GUID (preferred for ACC), MODEL_URN, or ITEM_URN
      const identifier = CONFIG.VIEWABLE_GUID || CONFIG.MODEL_URN || CONFIG.ITEM_URN;
      
      if (!identifier) {
        throw new Error('No model identifier found in config. Set VIEWABLE_GUID, MODEL_URN, or ITEM_URN.');
      }
      
      console.log('Loading model with identifier:', identifier.substring(0, 40) + '...');
      
      // Load model
      await viewerManager.loadModel(identifier);

      this.modelLoaded = true;
      this.updateStatus('Model loaded successfully', 'success');

      // Enable controls
      this.enableControls();

      // If Excel data is already loaded, build mappings
      if (this.dataLoaded) {
        await this.buildMappingsAndColor();
      }

    } catch (error) {
      console.error('❌ Model load error:', error);
      this.updateStatus('Failed to load model: ' + error.message, 'error');
    }
  }

  /**
   * Handle Excel file upload
   * @param {Event} event - File input change event
   */
  async handleExcelUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    try {
      this.updateStatus('Parsing Excel file...', 'info');

      // Parse Excel file
      await dataParser.parseExcelFile(file);

      this.dataLoaded = true;
      this.updateStatus(`Excel loaded: ${dataParser.parsedData.length} rows`, 'success');

      // Show data stats
      this.displayDataStats();

      // If model is already loaded, build mappings
      if (this.modelLoaded) {
        await this.buildMappingsAndColor();
      }

    } catch (error) {
      console.error('❌ Excel parse error:', error);
      this.updateStatus('Failed to parse Excel: ' + error.message, 'error');
    }
  }

  /**
   * Build mappings between model and data, then apply colors
   */
  async buildMappingsAndColor() {
    try {
      this.updateStatus('Mapping data to model...', 'info');

      // Build mappings
      const stats = await modelDataMapper.buildMappings();

      this.updateStatus(
        `Mapped ${stats.mapped} elements (${stats.mappingRate}%)`,
        'success'
      );

      // Display mapping stats
      this.displayMappingStats(stats);

      // Auto-apply color scheme if configured
      if (CONFIG.UI.AUTO_COLOR_BY) {
        await this.applyColorScheme(CONFIG.UI.AUTO_COLOR_BY);
      }

    } catch (error) {
      console.error('❌ Mapping error:', error);
      this.updateStatus('Failed to map data: ' + error.message, 'error');
    }
  }

  /**
   * Apply color scheme to model
   * @param {string} scheme - Color scheme name
   */
  async applyColorScheme(scheme) {
    if (!this.modelLoaded || !this.dataLoaded) {
      this.updateStatus('Load model and data first', 'warning');
      return;
    }

    try {
      this.updateStatus(`Applying ${scheme} color scheme...`, 'info');

      await colorManager.applyColorScheme(scheme);

      this.updateStatus(`${scheme} colors applied`, 'success');

      // Update legend
      this.updateLegend();

    } catch (error) {
      console.error('❌ Color scheme error:', error);
      this.updateStatus('Failed to apply colors: ' + error.message, 'error');
    }
  }

  /**
   * Search for elements
   * @param {string} query - Search query
   */
  async search(query) {
    if (!query || !this.modelLoaded) return;

    try {
      const plotNumber = query.trim();
      const dbIds = modelDataMapper.getElementsForPlot(plotNumber);

      if (dbIds.length > 0) {
        // Isolate and fit to view
        viewerManager.isolate(dbIds);
        viewerManager.fitToView(dbIds);
        viewerManager.select(dbIds);

        this.updateStatus(`Found ${dbIds.length} elements for plot ${plotNumber}`, 'success');
      } else {
        this.updateStatus(`No elements found for plot ${plotNumber}`, 'warning');
      }

    } catch (error) {
      console.error('❌ Search error:', error);
      this.updateStatus('Search failed: ' + error.message, 'error');
    }
  }

  /**
   * Show all elements
   */
  showAll() {
    viewerManager.showAll();
    viewerManager.clearSelection();
    this.updateStatus('Showing all elements', 'info');
  }

  /**
   * Display data statistics
   */
  displayDataStats() {
    const stats = dataParser.getOverallStats();
    const statsDiv = document.getElementById('dataStats');
    
    if (statsDiv) {
      statsDiv.innerHTML = `
        <div class="stats-card">
          <h4>Excel Data Summary</h4>
          <p>Total Rows: ${stats.total}</p>
          <p>Unique Blocks: ${stats.blocks}</p>
          <p>Unique Plots: ${stats.plots}</p>
          <p>Completed: ${stats.completed} (${stats.completionRate}%)</p>
          <p>In Progress: ${stats.inProgress}</p>
          <p>Not Started: ${stats.notStarted}</p>
        </div>
      `;
    }
  }

  /**
   * Display mapping statistics
   * @param {object} stats - Mapping statistics
   */
  displayMappingStats(stats) {
    const statsDiv = document.getElementById('mappingStats');
    
    if (statsDiv) {
      statsDiv.innerHTML = `
        <div class="stats-card">
          <h4>Mapping Results</h4>
          <p>Total Elements: ${stats.totalElements}</p>
          <p>Mapped: ${stats.mapped} (${stats.mappingRate}%)</p>
          <p>Unmapped Elements: ${stats.unmappedElements}</p>
          <p>Unmapped Plots: ${stats.unmappedPlots}</p>
        </div>
      `;
    }
  }

  /**
   * Update color legend
   */
  updateLegend() {
    const legendDiv = document.getElementById('legend');
    if (!legendDiv) return;

    const legendItems = colorManager.getLegend();
    
    if (legendItems.length === 0) {
      legendDiv.innerHTML = '';
      return;
    }

    let html = '<div class="legend-container"><h4>Legend</h4>';
    
    legendItems.forEach(item => {
      const rgbColor = `rgb(${item.color.r}, ${item.color.g}, ${item.color.b})`;
      html += `
        <div class="legend-item">
          <div class="legend-color" style="background: ${rgbColor};"></div>
          <span class="legend-label">${item.label}</span>
          <span class="legend-count">(${item.count})</span>
        </div>
      `;
    });
    
    html += '</div>';
    legendDiv.innerHTML = html;
  }

  /**
   * Export statistics and unmapped data
   */
  exportStats() {
    const data = {
      timestamp: new Date().toISOString(),
      dataStats: dataParser.getOverallStats(),
      mappingStats: modelDataMapper.getStats(),
      unmapped: modelDataMapper.exportUnmapped(),
      colorScheme: colorManager.currentScheme
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'villa-viewer-stats.json';
    a.click();
    URL.revokeObjectURL(url);

    this.updateStatus('Statistics exported', 'success');
  }

  /**
   * Update status message
   * @param {string} message - Status message
   * @param {string} type - Message type ('info', 'success', 'warning', 'error')
   */
  updateStatus(message, type = 'info') {
    const statusDiv = document.getElementById('status');
    if (statusDiv) {
      statusDiv.textContent = message;
      statusDiv.className = `status status-${type}`;
      
      console.log(`[${type.toUpperCase()}] ${message}`);
    }
  }

  /**
   * Show error message
   * @param {string} message - Error message
   */
  showError(message) {
    alert('Error: ' + message);
    this.updateStatus(message, 'error');
  }

  /**
   * Show instructions
   */
  showInstructions() {
    const instructions = `
      Welcome to Villa Viewer!
      
      Steps:
      1. Click "Load Model" to load your 3D model
      2. Click "Load Excel" to upload your data file
      3. Wait for automatic mapping
      4. Use color scheme dropdown to visualize data
      5. Click on elements to see details
      6. Use search to find specific plots
    `;

    console.log(instructions);
  }

  /**
   * Enable UI controls
   */
  enableControls() {
    const controls = [
      'colorScheme',
      'searchInput',
      'searchBtn',
      'showAllBtn',
      'fitViewBtn',
      'exportStatsBtn'
    ];

    controls.forEach(id => {
      const element = document.getElementById(id);
      if (element) {
        element.disabled = false;
      }
    });
  }

  /**
   * Check authentication status and update UI
   */
  checkAuthStatus() {
    this.isAuthenticated = authManager.isAuthenticated();

    const loginBtn = document.getElementById('loginBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const loadModelBtn = document.getElementById('loadModelBtn');
    const authStatusText = document.getElementById('authStatusText');

    if (this.isAuthenticated) {
      // User is logged in
      if (loginBtn) loginBtn.style.display = 'none';
      if (logoutBtn) logoutBtn.style.display = 'inline-block';
      if (loadModelBtn) loadModelBtn.disabled = false;
      if (authStatusText) authStatusText.textContent = '✅ Logged in to Autodesk';

      console.log('✅ User is authenticated');
      this.updateStatus('Logged in successfully - you can now load ACC models', 'success');
    } else {
      // User is not logged in
      if (loginBtn) loginBtn.style.display = 'inline-block';
      if (logoutBtn) logoutBtn.style.display = 'none';
      if (loadModelBtn) loadModelBtn.disabled = true;
      if (authStatusText) authStatusText.textContent = '⚠️ Not logged in';

      console.log('⚠️ User is not authenticated');
    }
  }

  /**
   * Handle login button click
   */
  handleLogin() {
    console.log('🔐 Opening login popup...');
    const popup = authManager.openLoginPopup();

    if (popup) {
      this.updateStatus('Please complete login in the popup window...', 'info');
    }
  }

  /**
   * Handle logout button click
   */
  handleLogout() {
    authManager.logout();
    this.checkAuthStatus();
    this.updateStatus('Logged out successfully', 'info');

    // Reset model loaded state
    if (this.modelLoaded) {
      this.modelLoaded = false;
      viewerManager.destroy();
    }
  }
}

// Initialize application when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
  window.app = new Application();
  window.dataParser = dataParser; // Expose dataParser globally for schedule panel
  await window.app.init();
});

export default Application;
