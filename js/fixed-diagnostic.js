/**
 * FIXED DIAGNOSTIC - Works with actual viewer API
 */
async function diagnoseProperties() {
  console.log('=== PROPERTY DIAGNOSTIC ===\n');
  
  try {
    // Get viewer instance
    const viewer = window.NOP_VIEWER;
    
    if (!viewer || !viewer.model) {
      console.error('❌ Viewer not initialized');
      return;
    }
    
    console.log('✅ Viewer found\n');
    
    // Get all DBIds
    const allDbIds = await new Promise((resolve, reject) => {
      viewer.model.getExternalIdMapping((mapping) => {
        resolve(Object.values(mapping));
      });
    });
    
    console.log(`📊 Total elements: ${allDbIds.length}`);
    
    // Get first element
    const firstDbId = allDbIds[0];
    console.log(`📍 Checking element: ${firstDbId}\n`);
    
    // Get all properties
    const props = await new Promise((resolve, reject) => {
      viewer.model.getProperties(firstDbId, (p) => {
        resolve(p);
      });
    });
    
    if (!props || props.length === 0) {
      console.error('❌ No properties found on element');
      return;
    }
    
    console.log('📋 ALL Properties:\n');
    
    // Group by category
    const byCategory = {};
    props.forEach(prop => {
      const cat = prop.category || 'General';
      if (!byCategory[cat]) byCategory[cat] = [];
      byCategory[cat].push(prop);
    });
    
    // Display organized
    Object.keys(byCategory).sort().forEach(cat => {
      console.log(`🏷️  Category: "${cat}"`);
      byCategory[cat].forEach(prop => {
        console.log(`   "${prop.displayName}" = "${prop.displayValue}"`);
        console.log(`   → Path: "${prop.category}/${prop.displayName}"`);
      });
    });
    
    // Now try extraction with current config
    console.log('\n\n=== TESTING EXTRACTION ===\n');
    
    const { CONFIG } = await import('./config.js');
    const { modelDataMapper } = await import('./modelDataMapper.js');
    
    console.log('CONFIG.MODEL_PROPERTIES.PLOT_NUMBER:');
    CONFIG.MODEL_PROPERTIES.PLOT_NUMBER.forEach(p => console.log(`  • "${p}"`));
    
    const plotNum = modelDataMapper.extractPlotNumber(props);
    console.log(`\n✅ Extracted Plot Number: ${plotNum || '❌ NOT FOUND'}`);
    
    if (plotNum) {
      console.log(`\n✅ SUCCESS! Found plot number: ${plotNum}`);
      console.log('Mapping should work correctly now.');
    } else {
      console.log('\n❌ PLOT NUMBER NOT FOUND');
      console.log('\nLooking at properties above:');
      console.log('Which property has the PLOT NUMBER (like 425, 426, 427)?');
      console.log('Tell me its displayName and I\'ll update the config.');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
    console.error(error.stack);
  }
}

// Run it
diagnoseProperties();
