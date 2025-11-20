/**
 * QUICK FIX DIAGNOSTIC
 * Shows what properties are being extracted vs what should be extracted
 */

async function quickDiagnose() {
  console.log('=== QUICK PROPERTY CHECK ===\n');
  
  try {
    // Get sample element
    const viewer = window.NOP_VIEWER;
    const model = window.NOP_VIEWER.model;
    
    const rootId = viewer.getRootItem();
    let sampleId = null;
    
    function findFirst(dbId) {
      if (sampleId) return;
      sampleId = dbId;
      const childCount = viewer.getChildCount(dbId);
      for (let i = 0; i < childCount; i++) {
        const childId = viewer.getChild(dbId, i);
        if (childId !== undefined) {
          findFirst(childId);
        }
      }
    }
    
    findFirst(rootId);
    
    console.log(`📍 Sample Element ID: ${sampleId}\n`);
    
    // Get all properties for this element
    const props = await new Promise((resolve, reject) => {
      model.getProperties(sampleId, (res) => resolve(res), (err) => reject(err));
    });
    
    console.log('📋 ALL Properties on this element:\n');
    
    const groupedByCategory = {};
    props.forEach(prop => {
      const cat = prop.category || 'General';
      if (!groupedByCategory[cat]) {
        groupedByCategory[cat] = [];
      }
      groupedByCategory[cat].push(prop);
    });
    
    Object.keys(groupedByCategory).sort().forEach(cat => {
      console.log(`\n🏷️  Category: "${cat}"`);
      groupedByCategory[cat].forEach(prop => {
        const path = `${prop.category}/${prop.displayName}`;
        console.log(`   • "${prop.displayName}" = "${prop.displayValue}"`);
        console.log(`     → Full path: "${path}"`);
      });
    });
    
    // Check what CONFIG is looking for
    console.log('\n\n=== WHAT CONFIG IS LOOKING FOR ===\n');
    
    const { CONFIG } = await import('./config.js');
    
    console.log('🔍 PLOT_NUMBER properties to search:');
    CONFIG.MODEL_PROPERTIES.PLOT_NUMBER.forEach(name => {
      console.log(`   • "${name}"`);
    });
    
    console.log('\n🔍 VILLA_TYPE properties to search:');
    CONFIG.MODEL_PROPERTIES.VILLA_TYPE.forEach(name => {
      console.log(`   • "${name}"`);
    });
    
    console.log('\n🔍 BLOCK properties to search:');
    CONFIG.MODEL_PROPERTIES.BLOCK.forEach(name => {
      console.log(`   • "${name}"`);
    });
    
    // Try to match
    console.log('\n\n=== TRYING TO MATCH ===\n');
    
    const { modelDataMapper } = await import('./modelDataMapper.js');
    
    const plotNum = modelDataMapper.extractPlotNumber(props);
    const villaType = modelDataMapper.extractVillaType(props);
    const block = modelDataMapper.extractBlock(props);
    
    console.log('Extracted values:');
    console.log(`  • Plot Number: ${plotNum || '❌ NOT FOUND'}`);
    console.log(`  • Villa Type: ${villaType || '❌ NOT FOUND'}`);
    console.log(`  • Block: ${block || '❌ NOT FOUND'}`);
    
    if (!plotNum) {
      console.log('\n❌ PLOT NUMBER NOT FOUND!');
      console.log('\nLooking at the properties above, which one has the plot number?');
      console.log('Copy its exact displayName and add to CONFIG.MODEL_PROPERTIES.PLOT_NUMBER');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

quickDiagnose();
