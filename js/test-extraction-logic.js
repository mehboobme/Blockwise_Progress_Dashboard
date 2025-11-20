/**
 * TEST EXTRACTION WITH ACTUAL PROPERTIES
 * Simulates what should be extracted
 */
async function testExtraction() {
  console.log('=== TESTING EXTRACTION LOGIC ===\n');
  
  try {
    const { CONFIG } = await import('./js/config.js');
    const { modelDataMapper } = await import('./js/modelDataMapper.js');
    
    // Simulate the actual properties from the model (from diagnostic output)
    const simulatedProperties = [
      { category: 'Element', displayName: 'Block', displayValue: '38' },
      { category: 'Element', displayName: 'Plot', displayValue: '415' },
      { category: 'Element', displayName: 'Villa_Type', displayValue: 'DP2' },
      { category: 'Element', displayName: 'NBH', displayValue: 'SE03' },
      { category: 'Element', displayName: 'Name', displayValue: 'DP2 REPRESENTATION' },
    ];
    
    console.log('📋 Simulated properties from model:');
    simulatedProperties.forEach(p => {
      console.log(`   ${p.category}/${p.displayName} = ${p.displayValue}`);
    });
    
    console.log('\n🔍 CONFIG.MODEL_PROPERTIES:');
    console.log(JSON.stringify(CONFIG.MODEL_PROPERTIES, null, 2));
    
    console.log('\n🔄 Testing extraction:');
    
    const plotNum = modelDataMapper.extractPlotNumber(simulatedProperties);
    console.log(`\n✅ Extract Plot Number:`);
    console.log(`   Result: ${plotNum || '❌ NOT FOUND'}`);
    console.log(`   Expected: 415`);
    console.log(`   Match: ${plotNum === '415' ? '✅' : '❌'}`);
    
    const villaType = modelDataMapper.extractVillaType(simulatedProperties);
    console.log(`\n✅ Extract Villa Type:`);
    console.log(`   Result: ${villaType || '❌ NOT FOUND'}`);
    console.log(`   Expected: DP2`);
    console.log(`   Match: ${villaType === 'DP2' ? '✅' : '❌'}`);
    
    const block = modelDataMapper.extractBlock(simulatedProperties);
    console.log(`\n✅ Extract Block:`);
    console.log(`   Result: ${block || '❌ NOT FOUND'}`);
    console.log(`   Expected: 38`);
    console.log(`   Match: ${block === '38' ? '✅' : '❌'}`);
    
    // Test the findProperty method directly
    console.log('\n\n=== TESTING findProperty METHOD ===\n');
    
    const testCases = [
      'Element/Plot',
      'Plot',
      'Element/Block',
      'Block',
      'Element/Villa_Type',
      'Villa_Type'
    ];
    
    testCases.forEach(propName => {
      const found = modelDataMapper.findProperty(simulatedProperties, propName);
      console.log(`findProperty("${propName}"): ${found ? found.displayValue : '❌ NOT FOUND'}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
    console.error(error.stack);
  }
}

testExtraction();
