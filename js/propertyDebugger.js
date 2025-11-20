/**
 * Property Debugger Module
 * Helps diagnose property extraction issues
 */

import { viewerManager } from './viewer.js';

class PropertyDebugger {
  /**
   * Analyze properties of a single element
   */
  async analyzeElement(dbId) {
    try {
      const properties = await viewerManager.getProperties(dbId);
      
      if (!properties || !properties.properties) {
        return { error: 'No properties found' };
      }

      const analysis = {
        elementName: properties.name || 'Unknown',
        totalProperties: properties.properties.length,
        properties: []
      };

      const byCategory = {};
      
      properties.properties.forEach(prop => {
        const category = prop.category || 'Uncategorized';
        const displayName = prop.displayName || 'Unknown';
        const displayValue = prop.displayValue || '(empty)';

        analysis.properties.push({
          category,
          displayName,
          displayValue,
          fullPath: `${category}/${displayName}`
        });

        if (!byCategory[category]) {
          byCategory[category] = [];
        }
        byCategory[category].push({
          name: displayName,
          value: displayValue
        });
      });

      analysis.byCategory = byCategory;
      return analysis;
    } catch (error) {
      return { error: error.message };
    }
  }

  /**
   * Find all elements with specific property value
   */
  async findElementsByProperty(propertyName, propertyValue) {
    try {
      const allDbIds = await viewerManager.getAllDbIds();
      const matches = [];

      for (const dbId of allDbIds) {
        const properties = await viewerManager.getProperties(dbId);
        
        if (properties && properties.properties) {
          const foundProp = properties.properties.find(p => 
            p.displayName === propertyName && 
            String(p.displayValue).toLowerCase() === String(propertyValue).toLowerCase()
          );

          if (foundProp) {
            matches.push({
              dbId,
              elementName: properties.name || 'Unknown',
              category: foundProp.category,
              displayName: foundProp.displayName,
              value: foundProp.displayValue
            });
          }
        }
      }

      return matches;
    } catch (error) {
      console.error('Error finding elements:', error);
      return [];
    }
  }

  /**
   * Get all unique property categories and names
   */
  async getPropertyInventory(sampleSize = 50) {
    try {
      const allDbIds = await viewerManager.getAllDbIds();
      const sampled = allDbIds.slice(0, Math.min(sampleSize, allDbIds.length));
      
      const inventory = {};
      const exampleValues = {};

      for (const dbId of sampled) {
        const properties = await viewerManager.getProperties(dbId);
        
        if (properties && properties.properties) {
          properties.properties.forEach(prop => {
            const category = prop.category || 'Uncategorized';
            const displayName = prop.displayName || 'Unknown';
            const key = `${category}/${displayName}`;

            if (!inventory[key]) {
              inventory[key] = {
                category,
                displayName,
                occurrences: 0,
                exampleValues: []
              };
              exampleValues[key] = new Set();
            }

            inventory[key].occurrences++;
            
            if (exampleValues[key].size < 3 && prop.displayValue) {
              exampleValues[key].add(String(prop.displayValue));
              inventory[key].exampleValues = Array.from(exampleValues[key]);
            }
          });
        }
      }

      return inventory;
    } catch (error) {
      console.error('Error getting property inventory:', error);
      return {};
    }
  }

  /**
   * Print diagnostic report to console
   */
  async printReport(dbId) {
    const analysis = await this.analyzeElement(dbId);
    
    console.group('🔍 Property Debugger Report');
    console.log(`Element: ${analysis.elementName || 'Unknown'}`);
    console.log(`Total Properties: ${analysis.totalProperties}`);
    
    if (analysis.byCategory) {
      console.group('Properties by Category:');
      Object.entries(analysis.byCategory).forEach(([category, props]) => {
        console.group(`📁 ${category}`);
        props.forEach(prop => {
          console.log(`  • ${prop.name}: ${prop.value}`);
        });
        console.groupEnd();
      });
      console.groupEnd();
    }
    
    if (analysis.error) {
      console.error(`Error: ${analysis.error}`);
    }
    console.groupEnd();
  }

  /**
   * Export properties as JSON
   */
  async exportAsJSON(dbId) {
    const analysis = await this.analyzeElement(dbId);
    return JSON.stringify(analysis, null, 2);
  }
}

export const propertyDebugger = new PropertyDebugger();
export default PropertyDebugger;
