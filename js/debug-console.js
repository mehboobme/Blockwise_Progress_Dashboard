/**
 * Console Debug Script for Property Debugging
 * 
 * Copy and paste this entire script into your browser console to debug properties
 * Make sure property-inspector.html is open with the model loaded
 */

(async function() {
  console.clear();
  console.log('%c=== VILLA PROPERTY DEBUG ===', 'font-size: 16px; font-weight: bold; color: #0078d4;');
  
  try {
    // Import modules
    const { propertyDebugger } = await import('./js/propertyDebugger.js');
    const { modelDataMapper } = await import('./js/modelDataMapper.js');
    const { CONFIG } = await import('./js/config.js');

    console.log('\n%c1️⃣  CURRENT CONFIG:', 'font-weight: bold; color: #0078d4;');
    console.log('MODEL_PROPERTIES:', CONFIG.MODEL_PROPERTIES);

    console.log('\n%c2️⃣  SCANNING PROPERTIES...', 'font-weight: bold; color: #0078d4;');
    const inventory = await propertyDebugger.getPropertyInventory(100);
    
    const relevantProps = Object.entries(inventory)
      .filter(([_, prop]) => {
        const name = prop.displayName.toLowerCase();
        return name.includes('plot') || name.includes('villa') || name.includes('block') || name.includes('nbh');
      })
      .sort((a, b) => b[1].occurrences - a[1].occurrences);

    if (relevantProps.length === 0) {
      console.warn('⚠️  No Plot/Villa/Block/NBH properties found in model');
      console.log('All properties in model:');
      Object.entries(inventory).slice(0, 20).forEach(([key, prop]) => {
        console.log(`  ${prop.category}/${prop.displayName} (${prop.occurrences} elements)`);
      });
    } else {
      console.log(`✅ Found ${relevantProps.length} relevant properties:\n`);
      
      relevantProps.forEach(([fullPath, prop]) => {
        console.group(`📍 ${fullPath}`);
        console.log(`  Category: ${prop.category}`);
        console.log(`  Found in: ${prop.occurrences} elements`);
        console.log(`  Examples:`, prop.exampleValues);
        console.log(`  → Copy this path: "${fullPath}"`);
        console.groupEnd();
      });
    }

    console.log('\n%c3️⃣  TESTING PROPERTY EXTRACTION...', 'font-weight: bold; color: #0078d4;');
    
    // Find first element with Plot property
    const matches = await propertyDebugger.findElementsByProperty('Plot', '425');
    
    if (matches.length === 0) {
      console.warn('⚠️  Could not find Plot = 425 with current config');
      console.log('\n💡 TRY THIS:');
      console.log('1. Look at the properties listed above');
      console.log('2. Copy the exact property path (e.g., "Element/Plot")');
      console.log('3. Update js/config.js MODEL_PROPERTIES');
      console.log('4. Reload page and run this script again');
    } else {
      console.log(`✅ Found ${matches.length} element(s) with Plot = 425`);
      matches.forEach((match, i) => {
        console.group(`Element #${i + 1}`);
        console.log('DBId:', match.dbId);
        console.log('Name:', match.elementName);
        console.log('Category:', match.category);
        console.log('Value:', match.value);
        console.groupEnd();
      });
    }

    console.log('\n%c4️⃣  TESTING FULL MAPPING...', 'font-weight: bold; color: #0078d4;');
    const stats = await modelDataMapper.buildMappings();
    console.log('Mapping Results:', stats);
    
    if (stats.mapped > 0) {
      console.log('%c✅ SUCCESS! Properties are being extracted correctly', 'color: green; font-weight: bold; font-size: 14px;');
    } else {
      console.log('%c❌ ISSUE: No properties were mapped', 'color: red; font-weight: bold; font-size: 14px;');
      console.log('\nNext steps:');
      console.log('1. Check CONFIG.MODEL_PROPERTIES');
      console.log('2. Use property paths from step 2️⃣ above');
      console.log('3. Update js/config.js with those paths');
      console.log('4. Reload and run this script again');
    }

    console.log('\n%c5️⃣  RECOMMENDED CONFIG UPDATE:', 'font-weight: bold; color: #0078d4;');
    const configUpdate = {};
    
    relevantProps.forEach(([fullPath, prop]) => {
      const pathParts = fullPath.split('/');
      const propName = pathParts[pathParts.length - 1];
      
      if (propName.toLowerCase().includes('plot')) {
        configUpdate.PLOT_NUMBER = [fullPath, ...CONFIG.MODEL_PROPERTIES.PLOT_NUMBER];
      } else if (propName.toLowerCase().includes('villa')) {
        configUpdate.VILLA_TYPE = [fullPath, ...CONFIG.MODEL_PROPERTIES.VILLA_TYPE];
      } else if (propName.toLowerCase().includes('block')) {
        configUpdate.BLOCK = [fullPath, ...CONFIG.MODEL_PROPERTIES.BLOCK];
      } else if (propName.toLowerCase().includes('nbh')) {
        configUpdate.NBH = [fullPath, ...CONFIG.MODEL_PROPERTIES.NBH];
      }
    });

    if (Object.keys(configUpdate).length > 0) {
      console.log('Add to js/config.js MODEL_PROPERTIES:');
      console.log(JSON.stringify(configUpdate, null, 2));
    }

    console.log('\n%c✅ DEBUG COMPLETE', 'font-size: 14px; font-weight: bold; color: green;');
    console.log('Check above for property paths and update js/config.js');

  } catch (error) {
    console.error('❌ Error:', error);
    console.log('\nTroubleshooting:');
    console.log('1. Make sure property-inspector.html is open');
    console.log('2. Wait for model to load');
    console.log('3. Try again');
  }
})();
