/**
 * DIAGNOSTIC SCRIPT - Run this in browser console
 * Checks what properties are actually in your model
 */

async function diagnoseProperties() {
  console.log('=== PROPERTY DIAGNOSIS ===\n');
  
  try {
    // Check if viewer is available
    if (!window.NOP_VIEWER || !window.NOP_VIEWER.model) {
      console.error('❌ Viewer not initialized');
      return;
    }
    
    const viewer = window.NOP_VIEWER;
    const model = window.NOP_VIEWER.model;
    
    console.log('✅ Viewer initialized');
    console.log('📊 Getting all element IDs...');
    
    // Get root node to access tree
    const rootId = viewer.getRootItem();
    console.log('📍 Root ID:', rootId);
    
    // Get first 5 elements
    let elementCount = 0;
    const samplesToCheck = [];
    
    // Function to traverse tree and get IDs
    function collectDbIds(dbId, limit = 20) {
      if (elementCount >= limit) return;
      
      samplesToCheck.push(dbId);
      elementCount++;
      
      // Get children
      const childCount = viewer.getChildCount(dbId);
      if (childCount > 0) {
        for (let i = 0; i < childCount && elementCount < limit; i++) {
          const childId = viewer.getChild(dbId, i);
          if (childId !== undefined) {
            collectDbIds(childId, limit);
          }
        }
      }
    }
    
    collectDbIds(rootId);
    
    console.log(`\n📌 Sampling ${samplesToCheck.length} elements for property inspection\n`);
    
    // Get properties WITHOUT filters first - to see all available properties
    console.log('🔍 Fetching raw properties (no filters)...\n');
    
    const rawResults = await new Promise((resolve, reject) => {
      model.getBulkProperties(
        samplesToCheck,
        {}, // NO FILTER - get all properties
        (results) => resolve(results),
        (error) => reject(error)
      );
    });
    
    if (!rawResults || rawResults.length === 0) {
      console.error('❌ No properties returned');
      return;
    }
    
    // Analyze the properties
    const propertyMap = {}; // Map property names to count
    const categoryPaths = {}; // Map category/displayName to count
    
    rawResults.forEach((item, idx) => {
      console.log(`\n📍 Element ${idx + 1} (dbId: ${item.dbId})`);
      console.log('-------------------------------------------');
      
      if (!item.properties || item.properties.length === 0) {
        console.log('  (no properties)');
        return;
      }
      
      item.properties.forEach(prop => {
        const displayName = prop.displayName || '(empty)';
        const category = prop.category || '(none)';
        const value = prop.displayValue || '';
        
        // Track simple names
        if (!propertyMap[displayName]) {
          propertyMap[displayName] = 0;
        }
        propertyMap[displayName]++;
        
        // Track category paths
        const fullPath = `${category}/${displayName}`;
        if (!categoryPaths[fullPath]) {
          categoryPaths[fullPath] = 0;
        }
        categoryPaths[fullPath]++;
        
        console.log(`  • ${category}/${displayName}: ${value}`);
      });
    });
    
    // Summary
    console.log('\n\n=== PROPERTY SUMMARY ===\n');
    
    console.log('📋 All available SIMPLE NAMES (displayName only):');
    Object.keys(propertyMap)
      .sort()
      .forEach(name => {
        console.log(`  • "${name}" (found in ${propertyMap[name]} elements)`);
      });
    
    console.log('\n📋 All available CATEGORY PATHS (category/displayName):');
    Object.keys(categoryPaths)
      .sort()
      .forEach(path => {
        console.log(`  • "${path}" (found in ${categoryPaths[path]} elements)`);
      });
    
    // Check for plot-related properties
    console.log('\n\n=== CHECKING FOR PLOT PROPERTIES ===\n');
    
    const plotMatches = Object.keys(propertyMap).filter(name => 
      name.toLowerCase().includes('plot')
    );
    
    if (plotMatches.length > 0) {
      console.log('✅ Found PLOT-related properties:');
      plotMatches.forEach(name => {
        console.log(`  • Use: "${name}"`);
      });
    } else {
      console.log('❌ No PLOT-related properties found');
    }
    
    const plotCategoryMatches = Object.keys(categoryPaths).filter(path =>
      path.toLowerCase().includes('plot')
    );
    
    if (plotCategoryMatches.length > 0) {
      console.log('\n✅ Found PLOT-related category paths:');
      plotCategoryMatches.forEach(path => {
        console.log(`  • Use: "${path}"`);
      });
    } else {
      console.log('\n❌ No PLOT-related category paths found');
    }
    
    // Recommendations
    console.log('\n\n=== RECOMMENDATIONS ===\n');
    console.log('Update js/config.js MODEL_PROPERTIES.PLOT_NUMBER with:');
    
    const allPlotOptions = [
      ...plotMatches,
      ...plotCategoryMatches.map(p => `"${p}"`)
    ];
    
    if (allPlotOptions.length > 0) {
      console.log('[' + allPlotOptions.map(p => `'${p}'`).join(', ') + ']');
    } else {
      console.log('(no plot properties found - check property names in your model)');
    }
    
  } catch (error) {
    console.error('❌ Error during diagnosis:', error);
    console.error(error.stack);
  }
}

// Run the diagnostic
diagnoseProperties();
