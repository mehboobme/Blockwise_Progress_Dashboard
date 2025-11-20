/**
 * CORRECTED DIAGNOSTIC - Handles actual property structure
 */
async function diagnoseProperties() {
  console.log('=== PROPERTY DIAGNOSTIC (CORRECTED) ===\n');
  
  try {
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
    
    // Get properties - returns a callback with structure { dbId, externalId, properties: [] }
    const propData = await new Promise((resolve, reject) => {
      viewer.model.getProperties(firstDbId, (data) => {
        resolve(data);
      });
    });
    
    console.log('📊 Property data structure:', propData);
    
    // The properties are in propData.properties
    let props = [];
    if (propData && propData.properties) {
      props = propData.properties;
    } else if (Array.isArray(propData)) {
      props = propData;
    }
    
    if (!props || props.length === 0) {
      console.error('❌ No properties found on element');
      return;
    }
    
    console.log(`✅ Found ${props.length} properties\n`);
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
    
    const villaType = modelDataMapper.extractVillaType(props);
    console.log(`✅ Extracted Villa Type: ${villaType || '❌ NOT FOUND'}`);
    
    const block = modelDataMapper.extractBlock(props);
    console.log(`✅ Extracted Block: ${block || '❌ NOT FOUND'}`);
    
    if (!plotNum && !villaType && !block) {
      console.log('\n❌ NO PROPERTIES EXTRACTED');
      console.log('\nLooking at the properties listed above:');
      console.log('What is the displayName of the property containing the PLOT NUMBER?');
      console.log('(Example: if you see "425" as a value, what is its displayName?)');
    } else if (plotNum) {
      console.log(`\n✅ SUCCESS! Plot extracted: ${plotNum}`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
    console.error(error.stack);
  }
}

// Run it
diagnoseProperties();
