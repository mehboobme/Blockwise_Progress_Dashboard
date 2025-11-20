/**
 * QUICK TEST - Run this in browser console to test property extraction
 */

async function testPropertyExtraction() {
  console.log('=== TESTING PROPERTY EXTRACTION ===\n');
  
  try {
    // Import modules
    const { modelDataMapper } = await import('./modelDataMapper.js');
    const { CONFIG } = await import('./config.js');
    
    console.log('📋 Current CONFIG.MODEL_PROPERTIES:');
    console.log(JSON.stringify(CONFIG.MODEL_PROPERTIES, null, 2));
    
    console.log('\n🔄 Building mappings...');
    const stats = await modelDataMapper.buildMappings();
    
    console.log('\n✅ Mapping Results:');
    console.log(JSON.stringify(stats, null, 2));
    
    if (stats.mapped > 0) {
      console.log('\n✅ SUCCESS! Properties extracted correctly!');
      console.log(`📊 ${stats.mapped}/${stats.totalElements} elements mapped (${stats.mappingRate}%)`);
    } else {
      console.log('\n❌ ISSUE: No elements were mapped');
      console.log('📌 Check the diagnostic output above for property names');
    }
    
    // Show some examples
    if (stats.mapped > 0) {
      console.log('\n📍 Sample mappings:');
      const mappings = Array.from(modelDataMapper.mappings.entries()).slice(0, 3);
      mappings.forEach(([dbId, data]) => {
        console.log(`  dbId: ${dbId}, plot: ${data.plotNumber}, villa: ${data.villaType}, block: ${data.block}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
    console.error(error.stack);
  }
}

// Run test
testPropertyExtraction();
