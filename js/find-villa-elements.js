/**
 * ADVANCED DIAGNOSTIC - Search for Villa Properties
 * This searches through the model to FIND elements that have Block/Plot/NBH/Villa_Type
 * Run this in browser console after model loads
 * Usage: await findVillaElements()
 */

export async function findVillaElements() {
  console.log('\n=== SEARCHING FOR VILLA ELEMENTS ===\n');
  
  const viewerManager = window.viewerManager;
  if (!viewerManager) {
    console.error('❌ viewerManager not found');
    return;
  }
  
  const allDbIds = await viewerManager.getAllDbIds();
  console.log(`📊 Total elements: ${allDbIds.length}`);
  console.log('🔍 Searching for elements with Block, Plot, NBH, or Villa_Type properties...\n');
  
  let foundCount = 0;
  const maxSamples = 50; // Find up to 50 villa elements
  
  for (let i = 0; i < allDbIds.length && foundCount < maxSamples; i++) {
    const dbId = allDbIds[i];
    
    // Progress indicator (every 1000 elements)
    if (i % 1000 === 0) {
      console.log(`⏳ Checked ${i}/${allDbIds.length}...`);
    }
    
    try {
      const props = await viewerManager.getProperties(dbId, null);
      
      if (!props || !props.properties) continue;
      
      // Look for villa-related property names
      const villaProps = props.properties.filter(p => {
        const name = (p.displayName || '').toLowerCase();
        return (
          name.includes('block') ||
          name.includes('plot') ||
          name.includes('nbh') ||
          name.includes('villa') ||
          name.includes('neighborhood') ||
          name.includes('dp2') ||
          name.includes('dp3') ||
          name.includes('th1') ||
          name.includes('th2')
        ) && p.displayValue && p.displayValue !== '';
      });
      
      if (villaProps.length > 0) {
        foundCount++;
        console.log(`\n✅ FOUND VILLA ELEMENT! DbId: ${dbId}`);
        console.log('─'.repeat(60));
        
        // Show ALL properties for this element so we can see the structure
        console.log('ALL PROPERTIES:');
        props.properties.forEach(p => {
          if (p.displayValue && p.displayValue !== '') {
            const isStar = villaProps.some(vp => vp.displayName === p.displayName) ? '⭐' : '  ';
            console.log(`${isStar} "${p.displayName}" = "${p.displayValue}"`);
          }
        });
      }
    } catch (e) {
      // Silently skip elements that error
    }
  }
  
  if (foundCount === 0) {
    console.log('\n❌ NO VILLA ELEMENTS FOUND in first 200k elements');
    console.log('\n💡 This means villa elements might not have individual properties');
    console.log('💡 They might be referenced by Activity_ID or in a different structure\n');
    
    // Search for elements with Activity_ID containing villa information
    console.log('🔍 Searching for elements with villa information in Activity_ID...\n');
    
    let activityCount = 0;
    for (let i = 0; i < allDbIds.length && activityCount < 10; i++) {
      const dbId = allDbIds[i];
      
      try {
        const props = await viewerManager.getProperties(dbId, null);
        if (props && props.properties) {
          const activityId = props.properties.find(p => p.displayName === 'Activity_ID');
          if (activityId && activityId.displayValue) {
            const value = activityId.displayValue;
            // Look for SE (villa area) in Activity_ID like: 141CWARSSE4R002PW030
            if (value.includes('SE') || value.includes('VILLA') || value.includes('DP')) {
              activityCount++;
              console.log(`\n📋 Element DbId ${dbId}:`);
              console.log(`   Activity_ID: ${value}`);
              console.log('   Other properties:');
              props.properties
                .filter(p => p.displayValue && p.displayValue !== '' && !p.displayName.includes('Geometry:'))
                .slice(0, 20)
                .forEach(p => console.log(`     "${p.displayName}" = "${p.displayValue}"`));
            }
          }
        }
      } catch (e) {
        // Skip
      }
      
      if (i % 5000 === 0 && i > 0) {
        console.log(`⏳ Checked ${i}/${allDbIds.length}...`);
      }
    }
  } else {
    console.log(`\n✅ Found ${foundCount} villa elements with properties marked with ⭐`);
    console.log('\n💡 COPY THE EXACT PROPERTY NAMES (marked with ⭐) ABOVE');
  }
  
  console.log('\n' + '='.repeat(60) + '\n');
}

// Make globally accessible
window.findVillaElements = findVillaElements;
