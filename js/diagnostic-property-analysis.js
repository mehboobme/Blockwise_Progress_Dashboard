/**
 * Diagnostic Script - Analyze Property Structure
 * This script helps identify what properties exist and where
 * Run in browser console after model is loaded
 */

export async function diagnosticAnalysis() {
  console.log('\n=== COMPREHENSIVE PROPERTY STRUCTURE ANALYSIS ===\n');

  const viewerManager = window.dashboard.dashboard.viewerManager;
  const allDbIds = await viewerManager.getAllDbIds();
  
  console.log(`📊 Total elements in model: ${allDbIds.length}\n`);
  
  // Sample different parts of model
  const samples = [
    { range: [0, 100], label: 'Start (0-100)' },
    { range: [1000, 1100], label: 'Early (1000-1100)' },
    { range: [allDbIds.length/2 - 50, allDbIds.length/2 + 50], label: 'Middle' },
    { range: [allDbIds.length - 100, allDbIds.length], label: 'End' }
  ];

  for (const sample of samples) {
    console.log(`\n🔎 Analyzing ${sample.label}...`);
    console.log('─'.repeat(60));
    
    const [start, end] = sample.range;
    const sampleDbIds = allDbIds.slice(start, end);
    const bulkProps = await viewerManager.getBulkProperties(sampleDbIds, null);

    // Categorize elements
    let villaElements = [];
    let infrastructureElements = [];
    let otherElements = [];

    bulkProps.forEach(item => {
      if (!item.properties) return;

      const hasVillaProps = item.properties.some(p => 
        (p.displayName === 'Element/Villa_Type' || 
         p.displayName === 'Element/Plot' || 
         p.displayName === 'Element/Block' ||
         p.displayName === 'Element/NBH') && 
        p.displayValue
      );

      const hasInfraProps = item.properties.some(p =>
        (p.displayName === 'Element/Category' &&
         (p.displayValue === 'Structural Framing' ||
          p.displayValue === 'Mechanical Equipment' ||
          p.displayValue === 'Electrical Equipment' ||
          p.displayValue.includes('Roads') ||
          p.displayValue.includes('Pipe') ||
          p.displayValue.includes('Duct') ||
          p.displayValue.includes('Wire'))) ||
        (p.displayName === 'Item/Name' && 
         (p.displayValue.includes('Road') ||
          p.displayValue.includes('MEP') ||
          p.displayValue.includes('Structure')))
      );

      if (hasVillaProps) {
        villaElements.push(item);
      } else if (hasInfraProps) {
        infrastructureElements.push(item);
      } else {
        otherElements.push(item);
      }
    });

    console.log(`\n📈 Element Classification in ${sample.label}:`);
    console.log(`   🏘️  Villa elements: ${villaElements.length}`);
    console.log(`   🏗️  Infrastructure: ${infrastructureElements.length}`);
    console.log(`   ❓ Other: ${otherElements.length}`);

    // Analyze villa elements
    if (villaElements.length > 0) {
      console.log(`\n🏘️  VILLA ELEMENTS (showing first):`);
      const villa = villaElements[0];
      
      console.log(`   DbId: ${villa.dbId}`);
      const relevantProps = villa.properties.filter(p =>
        p.displayName.includes('Element/') || 
        p.displayName.includes('Villa') ||
        p.displayName === 'Element/Block' ||
        p.displayName === 'Element/Plot' ||
        p.displayName === 'Element/NBH'
      );
      
      relevantProps.forEach(p => {
        if (p.displayValue) {
          console.log(`     • ${p.displayName}: "${p.displayValue}"`);
        }
      });
    }

    // Analyze infrastructure elements
    if (infrastructureElements.length > 0) {
      console.log(`\n🏗️  INFRASTRUCTURE ELEMENTS (showing first):`);
      const infra = infrastructureElements[0];
      
      console.log(`   DbId: ${infra.dbId}`);
      const relevantProps = infra.properties.filter(p =>
        p.displayName.includes('Element/') ||
        p.displayName.includes('Item/') ||
        p.displayName === 'Level/Name'
      ).slice(0, 10);
      
      relevantProps.forEach(p => {
        if (p.displayValue) {
          console.log(`     • ${p.displayName}: "${p.displayValue}"`);
        }
      });
    }

    // Analyze other elements
    if (otherElements.length > 0) {
      console.log(`\n❓ OTHER ELEMENTS (showing first):`);
      const other = otherElements[0];
      
      console.log(`   DbId: ${other.dbId}`);
      const relevantProps = other.properties.filter(p =>
        p.displayValue && p.displayValue.length < 50
      ).slice(0, 10);
      
      relevantProps.forEach(p => {
        console.log(`     • ${p.displayName}: "${p.displayValue}"`);
      });
    }
  }

  // Summary
  console.log('\n\n=== SUMMARY & RECOMMENDATIONS ===\n');
  
  console.log('📋 Property Structure Found:');
  console.log('   ✓ Villa elements use: Element/Block, Element/NBH, Element/Plot, Element/Villa_Type');
  console.log('   ✓ Infrastructure uses: Element/Category, Item/Name, Item/Type');
  console.log('   ? Need to verify which block numbers are villas vs infrastructure');

  console.log('\n🎯 NEXT STEPS:');
  console.log('   1. Check if R-prefixed blocks are infrastructure');
  console.log('   2. Check if plain number blocks (38, 39) are villas');
  console.log('   3. Verify Element/Block property on villa elements');
  console.log('   4. Check if plots are only on specific element types');
}

// Make available globally
window.diagnosticAnalysis = diagnosticAnalysis;
