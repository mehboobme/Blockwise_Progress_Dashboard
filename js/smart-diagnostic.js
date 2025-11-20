/**
 * SMART DIAGNOSTIC - Finds actual villa elements, not file nodes
 */
async function smartDiagnose() {
  console.log('=== SMART PROPERTY SEARCH ===\n');
  
  try {
    const viewer = window.NOP_VIEWER;
    
    if (!viewer || !viewer.model) {
      console.error('❌ Viewer not initialized');
      return;
    }
    
    console.log('✅ Viewer found');
    console.log('🔍 Looking for actual villa elements (not file nodes)...\n');
    
    // Get all DBIds
    const allDbIds = await new Promise((resolve, reject) => {
      viewer.model.getExternalIdMapping((mapping) => {
        resolve(Object.values(mapping));
      });
    });
    
    console.log(`📊 Total elements in model: ${allDbIds.length}`);
    console.log('🔎 Searching for element with plot/block/villa properties...\n');
    
    // Search through elements to find one with actual properties
    let foundElement = null;
    let searchCount = 0;
    const maxSearch = 5000; // Search first 5000 elements
    
    for (let i = 0; i < Math.min(maxSearch, allDbIds.length); i++) {
      const dbId = allDbIds[i];
      searchCount++;
      
      // Show progress every 500 elements
      if (i % 500 === 0 && i > 0) {
        console.log(`  Searched ${i}/${Math.min(maxSearch, allDbIds.length)} elements...`);
      }
      
      // Get properties
      const propData = await new Promise((resolve, reject) => {
        viewer.model.getProperties(dbId, (data) => {
          resolve(data);
        }, (err) => {
          resolve(null); // Skip on error
        });
      });
      
      if (!propData) continue;
      
      let props = [];
      if (propData.properties) {
        props = propData.properties;
      } else if (Array.isArray(propData)) {
        props = propData;
      }
      
      if (props.length === 0) continue;
      
      // Look for villa-related properties
      const hasVillaProps = props.some(p => 
        p.displayName && (
          p.displayName.includes('Plot') ||
          p.displayName.includes('Block') ||
          p.displayName.includes('Villa') ||
          p.displayName.includes('NBH') ||
          p.displayName.includes('Phase')
        ) &&
        p.displayValue
      );
      
      if (hasVillaProps) {
        console.log(`✅ FOUND ELEMENT WITH VILLA PROPERTIES!`);
        console.log(`   DbId: ${dbId}`);
        console.log(`   Searched: ${searchCount} elements\n`);
        
        foundElement = { dbId, props };
        break;
      }
    }
    
    if (!foundElement) {
      console.log(`❌ No villa properties found in first ${searchCount} elements`);
      console.log('\n🔄 Trying different approach - checking elements around known Revit files...');
      
      // Try to find .rvt file nodes
      for (let i = 0; i < Math.min(1000, allDbIds.length); i++) {
        const dbId = allDbIds[i];
        
        const propData = await new Promise((resolve, reject) => {
          viewer.model.getProperties(dbId, (data) => {
            resolve(data);
          }, (err) => {
            resolve(null);
          });
        });
        
        if (!propData) continue;
        
        let props = [];
        if (propData.properties) {
          props = propData.properties;
        } else if (Array.isArray(propData)) {
          props = propData;
        }
        
        const nameProps = props.find(p => p.displayName === 'Name' && p.displayValue);
        if (nameProps && nameProps.displayValue.includes('.rvt')) {
          console.log(`✅ Found .rvt file at dbId ${dbId}: ${nameProps.displayValue}`);
          
          // Check children of this file
          console.log(`   Checking children for villa properties...`);
          
          for (let childOffset = 1; childOffset <= 100; childOffset++) {
            const childId = dbId + childOffset;
            
            const childProps = await new Promise((resolve, reject) => {
              viewer.model.getProperties(childId, (data) => {
                resolve(data);
              }, (err) => {
                resolve(null);
              });
            });
            
            if (!childProps) continue;
            
            let childPropArray = [];
            if (childProps.properties) {
              childPropArray = childProps.properties;
            } else if (Array.isArray(childProps)) {
              childPropArray = childProps;
            }
            
            const hasVilla = childPropArray.some(p => 
              p.displayName && (
                p.displayName.includes('Plot') ||
                p.displayName.includes('Block')
              )
            );
            
            if (hasVilla) {
              console.log(`   ✅ Found villa element at dbId ${childId}!\n`);
              foundElement = { dbId: childId, props: childPropArray };
              break;
            }
          }
          
          if (foundElement) break;
        }
      }
    }
    
    if (!foundElement) {
      console.log('❌ Could not find any villa elements in model');
      console.log('\nPossible reasons:');
      console.log('  1. Navisworks file does not contain villa geometry');
      console.log('  2. Properties not translated from Revit to Navisworks');
      console.log('  3. Need to search deeper in model structure');
      return;
    }
    
    // Display found properties
    console.log('📋 PROPERTIES FOUND:\n');
    
    const byCategory = {};
    foundElement.props.forEach(prop => {
      const cat = prop.category || 'General';
      if (!byCategory[cat]) byCategory[cat] = [];
      byCategory[cat].push(prop);
    });
    
    Object.keys(byCategory).sort().forEach(cat => {
      console.log(`🏷️  Category: "${cat}"`);
      byCategory[cat].forEach(prop => {
        console.log(`   "${prop.displayName}" = "${prop.displayValue}"`);
        console.log(`   → For config: "${prop.category}/${prop.displayName}"`);
      });
    });
    
    // Analyze what we found
    console.log('\n\n=== ANALYSIS ===\n');
    
    const plotProps = foundElement.props.filter(p => 
      p.displayName && p.displayName.toLowerCase().includes('plot') && p.displayValue
    );
    
    const blockProps = foundElement.props.filter(p =>
      p.displayName && p.displayName.toLowerCase().includes('block') && p.displayValue
    );
    
    const villaProps = foundElement.props.filter(p =>
      p.displayName && p.displayName.toLowerCase().includes('villa') && p.displayValue
    );
    
    console.log('Properties containing "Plot":');
    plotProps.forEach(p => {
      console.log(`  ✅ "${p.category}/${p.displayName}" = "${p.displayValue}"`);
      console.log(`     → Add to config: "${p.category}/${p.displayName}"`);
    });
    
    console.log('\nProperties containing "Block":');
    blockProps.forEach(p => {
      console.log(`  ✅ "${p.category}/${p.displayName}" = "${p.displayValue}"`);
    });
    
    console.log('\nProperties containing "Villa":');
    villaProps.forEach(p => {
      console.log(`  ✅ "${p.category}/${p.displayName}" = "${p.displayValue}"`);
    });
    
    // Recommendation
    console.log('\n\n=== RECOMMENDATION ===\n');
    
    if (plotProps.length > 0) {
      const plotPropName = plotProps[0].category + '/' + plotProps[0].displayName;
      console.log(`Add to config.js MODEL_PROPERTIES.PLOT_NUMBER:`);
      console.log(`  '${plotPropName}'`);
    }
    
    if (blockProps.length > 0) {
      const blockPropName = blockProps[0].category + '/' + blockProps[0].displayName;
      console.log(`\nAdd to config.js MODEL_PROPERTIES.BLOCK:`);
      console.log(`  '${blockPropName}'`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
    console.error(error.stack);
  }
}

// Run it
smartDiagnose();
