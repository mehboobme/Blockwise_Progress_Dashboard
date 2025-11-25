/**
 * Viewer Module
 * Handles APS Viewer initialization and interaction
 */

import { CONFIG } from './config.js';
import { authManager } from './auth.js';

class ViewerManager {
  constructor() {
    this.viewer = null;
    this.model = null;
    this.instanceTree = null;
    this.selectedDbIds = [];
  }

  /**
   * Initialize the viewer in a container
   * @param {string} containerId - HTML container element ID
   * @returns {Promise<Autodesk.Viewing.GuiViewer3D>}
   */
  async initialize(containerId) {
    // Initialize authentication first
    await authManager.initializeViewer();

    const container = document.getElementById(containerId);
    if (!container) {
      throw new Error(`Container ${containerId} not found`);
    }

    // Create viewer
    const config = {
      extensions: CONFIG.VIEWER.extensions
    };

    this.viewer = new Autodesk.Viewing.GuiViewer3D(container, config);
    
    // Start viewer
    const startedCode = this.viewer.start();
    if (startedCode > 0) {
      console.error('❌ Failed to create viewer');
      throw new Error('Viewer initialization failed');
    }

    console.log('✅ Viewer created successfully');

    // Set up event listeners
    this.setupEventListeners();

    return this.viewer;
  }

  /**
   * Load a model by URN or ViewableGuid
   * @param {string} identifier - Model URN, base64 URN, or ViewableGuid
   * @returns {Promise<void>}
   */
  async loadModel(identifier) {
    if (!this.viewer) {
      throw new Error('Viewer not initialized');
    }

    return new Promise((resolve, reject) => {
      // Determine the document ID format based on identifier type
      let documentId;
      
      if (!identifier) {
        reject(new Error('No model identifier provided'));
        return;
      }
      
      // Check if it's a GUID (format: XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX)
      const guidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      
      if (guidPattern.test(identifier)) {
        // It's a ViewableGuid - construct viewer URN and encode to base64
        const viewerUrn = `urn:adsk.viewing:fs.file:vf.${identifier}?version=1`;
        const base64Urn = btoa(viewerUrn);
        documentId = `urn:${base64Urn}`;
        console.log('📂 Loading ACC model by ViewableGuid');
        console.log('   Constructed URN:', viewerUrn);
        console.log('   Base64 URN:', documentId);
      } else if (identifier.startsWith('urn:')) {
        // Already a complete URN - need to base64 encode it and prepend urn:
        const base64Urn = btoa(identifier);
        documentId = `urn:${base64Urn}`;
        console.log('📂 Loading model by URN (encoded to base64)');
      } else {
        // Assume it's already base64 encoded - prepend urn: if needed
        documentId = identifier.startsWith('urn:') ? identifier : `urn:${identifier}`;
        console.log('📂 Loading model by base64 URN');
      }
      
      console.log('Document ID:', documentId.substring(0, 60) + '...');
      
      Autodesk.Viewing.Document.load(
        documentId,
        (doc) => {
          const viewables = doc.getRoot().getDefaultGeometry();
          
          this.viewer.loadDocumentNode(doc, viewables).then((model) => {
            this.model = model;
            console.log('✅ Model loaded successfully');
            
            // Get instance tree
            this.model.getObjectTree((tree) => {
              this.instanceTree = tree;
              console.log('✅ Instance tree ready');
              resolve(model);
            });
          });
        },
        (errorCode, errorMsg) => {
          console.error('❌ Model load error:', errorCode, errorMsg);
          reject(new Error(`Failed to load model: ${errorMsg}`));
        }
      );
    });
  }

  /**
   * Set up viewer event listeners
   */
  setupEventListeners() {
    // Selection event
    this.viewer.addEventListener(
      Autodesk.Viewing.SELECTION_CHANGED_EVENT,
      (event) => {
        this.selectedDbIds = event.dbIdArray;
        this.onSelectionChanged(event.dbIdArray);
      }
    );

    // Model loaded event
    this.viewer.addEventListener(
      Autodesk.Viewing.GEOMETRY_LOADED_EVENT,
      () => {
        console.log('✅ Geometry loaded');
        this.onGeometryLoaded();
      }
    );

    // Camera changed event
    this.viewer.addEventListener(
      Autodesk.Viewing.CAMERA_CHANGE_EVENT,
      () => {
        this.onCameraChanged();
      }
    );
  }

  /**
   * Callback when selection changes (override this)
   * @param {Array<number>} dbIds - Selected element IDs
   */
  onSelectionChanged(dbIds) {
    // Override in main app
    console.log('Selected dbIds:', dbIds);
  }

  /**
   * Callback when geometry is loaded (override this)
   */
  onGeometryLoaded() {
    // Override in main app
    console.log('Geometry loaded callback');
  }

  /**
   * Callback when camera changes (override this)
   */
  onCameraChanged() {
    // Override in main app if needed
  }

  /**
   * Get all leaf node dbIds in the model
   * @returns {Promise<Array<number>>}
   */
  async getAllDbIds() {
    return new Promise((resolve) => {
      if (!this.instanceTree) {
        resolve([]);
        return;
      }

      const dbIds = [];
      const rootId = this.instanceTree.getRootId();

      const traverse = (dbId) => {
        if (this.instanceTree.getChildCount(dbId) === 0) {
          dbIds.push(dbId);
        } else {
          this.instanceTree.enumNodeChildren(dbId, (childId) => {
            traverse(childId);
          });
        }
      };

      traverse(rootId);
      resolve(dbIds);
    });
  }

  /**
   * Get properties of an element
   * @param {number} dbId - Element database ID
   * @returns {Promise<object>}
   */
  async getProperties(dbId) {
    return new Promise((resolve, reject) => {
      if (!this.model) {
        reject(new Error('Model not loaded'));
        return;
      }

      this.model.getProperties(dbId, (result) => {
        resolve(result);
      }, (error) => {
        reject(error);
      });
    });
  }

  /**
   * Get bulk properties for multiple elements
   * @param {Array<number>} dbIds - Array of database IDs
   * @param {Array<string>} propNames - Property names to retrieve (can include category paths)
   * @returns {Promise<Array>}
   */
  async getBulkProperties(dbIds, propNames = null) {
    return new Promise((resolve, reject) => {
      if (!this.model) {
        reject(new Error('Model not loaded'));
        return;
      }

      // IMPORTANT: Don't use propFilter - it doesn't include Element/* properties
      // Instead, fetch ALL properties and filter in JavaScript
      const options = {
        // Leave empty - no propFilter to get all properties
      };

      this.model.getBulkProperties(dbIds, options, (results) => {
        console.log(`📦 getBulkProperties returned ${results.length} items`);
        if (results.length > 0) {
          console.log(`   First item has ${results[0].properties.length} properties`);
        }
        
        // Filter properties in JavaScript if names specified
        if (propNames && propNames.length > 0) {
          console.log(`🔍 Filtering to ${propNames.length} requested property names`);
          const filtered = results.map(item => ({
            dbId: item.dbId,
            externalId: item.externalId,
            properties: item.properties.filter(prop => {
              for (const propName of propNames) {
                if (propName.includes('/')) {
                  // Category path: 'Element/Plot'
                  const fullName = `${prop.category}/${prop.displayName}`;
                  if (fullName === propName) return true;
                } else if (propName.includes('*')) {
                  // Wildcard: 'Element/*Plot*'
                  const pattern = new RegExp(`^${propName.replace(/\*/g, '.*')}$`, 'i');
                  const fullName = `${prop.category}/${prop.displayName}`;
                  if (pattern.test(fullName)) return true;
                } else {
                  // Simple name: 'Plot'
                  if (prop.displayName === propName) return true;
                }
              }
              return false;
            })
          }));
          console.log(`✅ Filtered to ${filtered.reduce((sum, item) => sum + item.properties.length, 0)} properties total`);
          resolve(filtered);
        } else {
          resolve(results);
        }
      }, (error) => {
        console.error('❌ getBulkProperties error:', error);
        reject(error);
      });
    });
  }

  /**
   * Search for elements by property value
   * @param {string} propertyName - Property name
   * @param {string} propertyValue - Property value
   * @returns {Promise<Array<number>>}
   */
  async searchByProperty(propertyName, propertyValue) {
    const allDbIds = await this.getAllDbIds();
    const matchingDbIds = [];

    const properties = await this.getBulkProperties(allDbIds, [propertyName]);

    properties.forEach(prop => {
      const property = prop.properties.find(p => p.displayName === propertyName);
      if (property && String(property.displayValue).toLowerCase().includes(String(propertyValue).toLowerCase())) {
        matchingDbIds.push(prop.dbId);
      }
    });

    return matchingDbIds;
  }

  /**
   * Get property database (for advanced property queries)
   * @returns {Promise<object>} Property database
   */
  async getPropertyDb() {
    return new Promise((resolve, reject) => {
      if (!this.model) {
        reject(new Error('Model not loaded'));
        return;
      }

      this.model.getPropertyDb((pdb) => {
        resolve(pdb);
      });
    });
  }

  /**
   * Search properties using the property database (OPTIMIZED)
   * This can find properties that getBulkProperties() might miss
   * @param {string} propertyName - Property name to search for
   * @param {number} maxResults - Maximum results to return (default 100)
   * @returns {Promise<Array>} Array of {dbId, value} objects
   */
  async searchPropertiesInDb(propertyName, maxResults = 100) {
    const pdb = await this.getPropertyDb();
    const results = [];

    return new Promise((resolve, reject) => {
      try {
        pdb.executeUserFunction((pdb) => {
          let count = 0;
          const maxDbId = 400000; // Limit scan range for performance

          // Enumerate only up to maxDbId
          for (let dbId = 1; dbId < maxDbId && count < maxResults; dbId++) {
            try {
              pdb.enumObjectProperties(dbId, (attrId, valId) => {
                const attrName = pdb.getAttrName(attrId);

                if (attrName === propertyName || attrName.includes(propertyName)) {
                  const value = pdb.getAttrValue(attrId, valId);
                  results.push({
                    dbId,
                    propertyName: attrName,
                    value
                  });
                  count++;
                }
              });
            } catch (e) {
              // Element doesn't exist, skip
            }

            // Progress check every 10k elements
            if (dbId % 10000 === 0 && results.length === 0) {
              console.log(`  Scanned ${dbId} objects...`);
            }

            // Early exit if we found enough
            if (count >= maxResults) break;
          }

          resolve(results);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Get all unique property names in the model (sampling)
   * OPTIMIZED: Uses sparse sampling with timeout
   * @param {number} sampleSize - Number of elements to sample
   * @returns {Promise<Array<string>>} Array of property names
   */
  async getAllPropertyNames(sampleSize = 100) {
    const pdb = await this.getPropertyDb();
    const propertyNames = new Set();

    return new Promise((resolve, reject) => {
      // Set a 10-second timeout
      const timeoutId = setTimeout(() => {
        console.warn('⚠️ Property sampling timed out after 10 seconds');
        resolve(Array.from(propertyNames).sort());
      }, 10000);

      pdb.executeUserFunction((pdb) => {
        let scanned = 0;
        const maxDbId = 100000; // Reduce scan range
        const step = Math.floor(maxDbId / sampleSize); // Sparse sampling

        for (let dbId = 1; dbId < maxDbId && scanned < sampleSize; dbId += step) {
          try {
            pdb.enumObjectProperties(dbId, (attrId) => {
              const attrName = pdb.getAttrName(attrId);
              propertyNames.add(attrName);
            });
            scanned++;
          } catch (e) {
            // Skip - element doesn't exist
          }

          // Early progress check
          if (scanned % 20 === 0) {
            console.log(`  Sampled ${scanned}/${sampleSize} elements... Found ${propertyNames.size} unique properties`);
          }
        }

        clearTimeout(timeoutId);
        resolve(Array.from(propertyNames).sort());
      });
    });
  }

  /**
   * Set color for specific elements
   * @param {Array<number>} dbIds - Element IDs
   * @param {object} color - Color object {r, g, b, a}
   */
  setColor(dbIds, color) {
    if (!Array.isArray(dbIds)) {
      dbIds = [dbIds];
    }

    const colorVector = new THREE.Vector4(
      color.r / 255,
      color.g / 255,
      color.b / 255,
      color.a || 1.0
    );

    dbIds.forEach(dbId => {
      this.viewer.setThemingColor(dbId, colorVector);
    });
  }

  /**
   * Clear all colors
   */
  clearColors() {
    this.viewer.clearThemingColors();
  }

  /**
   * Isolate specific elements
   * @param {Array<number>} dbIds - Elements to show
   */
  isolate(dbIds) {
    this.viewer.isolate(dbIds);
    
    // Filter precaster labels to show only for isolated elements
    if (window.embeddedColorManager) {
      // Get plot numbers for isolated dbIds
      const plots = [];
      if (window.embeddedDataManager) {
        dbIds.forEach(dbId => {
          const elementInfo = window.embeddedDataManager.elementData.get(dbId);
          if (elementInfo && elementInfo.plot) {
            plots.push(elementInfo.plot);
          }
        });
      }
      window.embeddedColorManager.filterPrecasterLabels(plots);
    }
  }

  /**
   * Show all elements
   */
  showAll() {
    this.viewer.showAll();
    
    // Show all precaster labels
    if (window.embeddedColorManager) {
      window.embeddedColorManager.filterPrecasterLabels(null);
    }
  }

  /**
   * Fit to view
   * @param {Array<number>} dbIds - Optional elements to fit
   */
  fitToView(dbIds = null) {
    if (!this.viewer) {
      console.warn('⚠️ Viewer not initialized');
      return;
    }
    
    try {
      if (dbIds && dbIds.length > 0) {
        console.log(`🎯 Fitting view to ${dbIds.length} elements`);
        this.viewer.fitToView(dbIds);
      } else {
        console.log('🎯 Fitting view to all elements');
        this.viewer.navigation.fitBounds(true);
      }
    } catch (error) {
      console.error('❌ Error fitting view:', error);
    }
  }

  /**
   * Select elements
   * @param {Array<number>} dbIds - Elements to select
   */
  select(dbIds) {
    this.viewer.select(dbIds);
  }

  /**
   * Clear selection
   */
  clearSelection() {
    this.viewer.clearSelection();
  }

  /**
   * Get current selection
   * @returns {Array<number>}
   */
  getSelection() {
    return this.viewer.getSelection();
  }

  /**
   * Set viewer background color
   * @param {number} r - Red (0-255)
   * @param {number} g - Green (0-255)
   * @param {number} b - Blue (0-255)
   */
  setBackgroundColor(r, g, b) {
    this.viewer.setBackgroundColor(r, g, b, r, g, b);
  }

  /**
   * Take screenshot
   * @returns {string} Base64 image data
   */
  getScreenshot() {
    return this.viewer.getScreenShot(
      this.viewer.container.clientWidth,
      this.viewer.container.clientHeight
    );
  }

  /**
   * Destroy viewer
   */
  destroy() {
    if (this.viewer) {
      this.viewer.finish();
      this.viewer = null;
      this.model = null;
      this.instanceTree = null;
      console.log('🧹 Viewer destroyed');
    }
  }
}

// Export singleton instance
export const viewerManager = new ViewerManager();
export default viewerManager;
