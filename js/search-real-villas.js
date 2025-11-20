/**
 * SMART VILLA SEARCH - Look for actual villa geometry
 * Searches for elements with names like "DP2 REPRESENTATION", "TH1", etc.
 * or elements from the villa Revit file
 * Usage: await searchForRealVillas()
 */

export async function searchForRealVillas() {
  console.log('\n=== SEARCHING FOR REAL VILLA GEOMETRY ===\n');
  
  const viewerManager = window.viewerManager;
  if (!viewerManager) {
    console.error('❌ viewerManager not found');
    return;
  }
  
  const allDbIds = await viewerManager.getAllDbIds();
  console.log(`📊 Total elements: ${allDbIds.length}`);
  console.log('🔍 Looking for villa elements (DP2, DP3, TH1, TH2, VILLA, etc.)\n');
  
  let villaElements = [];
  let revitFileElements = [];
  
  // Search through all elements
  for (let i = 0; i < allDbIds.length; i++) {
    const dbId = allDbIds[i];
    
    if (i % 20000 === 0) {
      console.log(`⏳ Searched ${i}/${allDbIds.length}... Found ${villaElements.length} villas so far`);
    }
    
    try {
      const props = await viewerManager.getProperties(dbId, null);
      if (!props || !props.properties) continue;
      
      const nameProps = props.properties.filter(p => p.displayName === 'Name' && p.displayValue);
      const typeProps = props.properties.filter(p => p.displayName === 'Type' && p.displayValue);
      const categoryProps = props.properties.filter(p => p.displayName === 'Category' && p.displayValue);
      const sourceFileProps = props.properties.filter(p => p.displayName === 'Source File' && p.displayValue);
      
      // Check for villa names
      let isVilla = false;
      let villaInfo = '';
      
      if (nameProps.length > 0) {
        const name = nameProps[0].displayValue.toUpperCase();
        if (name.includes('DP2') || name.includes('DP3') || name.includes('DP4') ||
            name.includes('TH1') || name.includes('TH2') || name.includes('TH3') ||
            name.includes('VILLA') || name.includes('REPRESENTATION')) {
          isVilla = true;
          villaInfo = nameProps[0].displayValue;
        }
      }
      
      if (typeProps.length > 0) {
        const type = typeProps[0].displayValue.toUpperCase();
        if (type.includes('DP2') || type.includes('DP3') || type.includes('TH1') || type.includes('TH2') ||
            type.includes('VILLA')) {
          isVilla = true;
          villaInfo = `Type: ${typeProps[0].displayValue}`;
        }
      }
      
      // Check source file
      if (sourceFileProps.length > 0) {
        const sourceFile = sourceFileProps[0].displayValue;
        if (sourceFile.includes('power BI') || sourceFile.includes('Family') || sourceFile.includes('.rvt')) {
          // This might be a villa from Revit model
          if (isVilla) {
            revitFileElements.push({
              dbId,
              name: villaInfo,
              source: sourceFile,
              props
            });
          }
        }
      }
      
      if (isVilla) {
        villaElements.push({
          dbId,
          name: villaInfo,
          category: categoryProps.length > 0 ? categoryProps[0].displayValue : 'N/A',
          source: sourceFileProps.length > 0 ? sourceFileProps[0].displayValue : 'N/A',
          props
        });
      }
    } catch (e) {
      // Skip errors
    }
  }
  
  console.log(`\n✅ SEARCH COMPLETE`);
  console.log(`   Found ${villaElements.length} villa elements`);
  console.log(`   From Revit files: ${revitFileElements.length}\n`);
  
  if (villaElements.length > 0) {
    console.log('='.repeat(60));
    console.log('🏘️ VILLA ELEMENTS FOUND:\n');
    
    villaElements.slice(0, 5).forEach(villa => {
      console.log(`\n✅ DbId: ${villa.dbId}`);
      console.log(`   Name: ${villa.name}`);
      console.log(`   Category: ${villa.category}`);
      console.log(`   Source: ${villa.source}`);
      console.log('   Properties:');
      
      villa.props.properties
        .filter(p => p.displayValue && p.displayValue !== '' && !p.displayName.includes('Geometry:'))
        .slice(0, 30)
        .forEach(p => {
          console.log(`     "${p.displayName}" = "${p.displayValue}"`);
        });
    });
    
    console.log('\n' + '='.repeat(60));
    console.log(`\n💡 Showing first 5 of ${villaElements.length} villa elements`);
    console.log('💡 COPY THE PROPERTY NAMES TO UPDATE THE CODE\n');
  } else {
    console.log('❌ NO VILLA ELEMENTS FOUND');
    console.log('\n💡 This means villa elements might use different naming convention');
    console.log('💡 OR they are in a separate view/layer that needs different access\n');
    
    // Show sample of what we found instead
    console.log('Sample elements found:');
    for (let i = 0; i < allDbIds.length && i < 10; i++) {
      try {
        const props = await viewerManager.getProperties(allDbIds[i], null);
        if (props && props.properties) {
          const name = props.properties.find(p => p.displayName === 'Name');
          const type = props.properties.find(p => p.displayName === 'Type');
          const category = props.properties.find(p => p.displayName === 'Category');
          console.log(`  DbId ${allDbIds[i]}: ${name?.displayValue || 'N/A'} (Type: ${type?.displayValue || 'N/A'}, Category: ${category?.displayValue || 'N/A'})`);
        }
      } catch (e) {
        // Skip
      }
    }
  }
  
  console.log('\n');
}

// Make globally accessible
window.searchForRealVillas = searchForRealVillas;
