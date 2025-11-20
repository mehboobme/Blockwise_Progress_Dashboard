/**
 * Plot Number Analysis Script
 * Analyzes how many elements have plot numbers and where they are
 * Run in browser console: dashboard.analyzePlotDistribution()
 */

import { viewerManager } from './viewer.js';
import { CONFIG } from './config.js';

export async function analyzePlotDistribution() {
  console.log('\n=== PLOT NUMBER DISTRIBUTION ANALYSIS ===\n');

  // Get all element IDs
  const allDbIds = await viewerManager.getAllDbIds();
  const totalElements = allDbIds.length;
  console.log(`📊 Total elements in model: ${totalElements}`);
  console.log(`\n🔍 Sampling elements to find plot distribution...\n`);

  // Create sample groups across the model
  const samples = [
    { name: 'First 500 (0-500)', start: 0, count: 500 },
    { name: 'Second batch (500-1000)', start: 500, count: 500 },
    { name: 'Middle batch (25%)', start: Math.floor(totalElements * 0.25), count: 500 },
    { name: 'Three-quarter (75%)', start: Math.floor(totalElements * 0.75), count: 500 },
    { name: 'Last 500 (end)', start: Math.max(0, totalElements - 500), count: 500 }
  ];

  const results = {};
  let globalPlotCount = 0;
  let globalElementsChecked = 0;

  for (const sample of samples) {
    console.log(`\n📋 Analyzing ${sample.name}...`);
    
    const startIdx = Math.min(sample.start, totalElements - 1);
    const endIdx = Math.min(startIdx + sample.count, totalElements);
    const sampleDbIds = allDbIds.slice(startIdx, endIdx);

    let samplePlotCount = 0;
    let withElementPlot = 0;
    let withSimplePlot = 0;
    let foundPlotNames = new Set();

    // Get properties for this sample
    const bulkProps = await viewerManager.getBulkProperties(sampleDbIds, null);

    bulkProps.forEach(item => {
      globalElementsChecked++;
      
      // Look for any property that might contain a plot number
      const plotProp = item.properties.find(p => {
        const name = p.displayName.toLowerCase();
        const cat = p.category.toLowerCase();
        return name.includes('plot') || cat.includes('plot');
      });

      if (plotProp) {
        samplePlotCount++;
        globalPlotCount++;
        foundPlotNames.add(`${plotProp.category}/${plotProp.displayName}`);

        // Track specific types
        if (plotProp.displayName === 'Plot') {
          withSimplePlot++;
        } else if (plotProp.category === 'Element' && plotProp.displayName === 'Plot') {
          withElementPlot++;
        }
      }
    });

    const percentage = ((samplePlotCount / sampleDbIds.length) * 100).toFixed(1);
    console.log(`  ✅ Found plot numbers: ${samplePlotCount}/${sampleDbIds.length} (${percentage}%)`);
    console.log(`     - Element/Plot: ${withElementPlot}`);
    console.log(`     - Simple "Plot": ${withSimplePlot}`);
    console.log(`     - Other: ${samplePlotCount - withElementPlot - withSimplePlot}`);
    
    if (foundPlotNames.size > 0) {
      console.log(`  Property names with "plot":`);
      foundPlotNames.forEach(name => console.log(`     • ${name}`));
    }

    results[sample.name] = {
      checked: sampleDbIds.length,
      found: samplePlotCount,
      percentage: parseFloat(percentage)
    };
  }

  // Summary
  console.log('\n\n=== SUMMARY ===');
  console.log(`Total checked: ${globalElementsChecked} elements`);
  console.log(`Found plots: ${globalPlotCount} elements (${((globalPlotCount/globalElementsChecked)*100).toFixed(1)}%)`);
  
  console.log('\n📊 Distribution across model:');
  Object.entries(results).forEach(([name, data]) => {
    const bar = '█'.repeat(Math.round(data.percentage / 5)) + '░'.repeat(20 - Math.round(data.percentage / 5));
    console.log(`  ${name.padEnd(25)} ${bar} ${data.percentage}% (${data.found}/${data.checked})`);
  });

  // Estimate total plots in model
  const avgPercentage = Object.values(results).reduce((sum, r) => sum + r.percentage, 0) / Object.keys(results).length;
  const estimatedTotalPlots = Math.round((avgPercentage / 100) * totalElements);

  console.log(`\n🎯 ESTIMATED TOTAL PLOTS IN MODEL: ~${estimatedTotalPlots} / ${totalElements}`);
  console.log(`   Confidence: ${avgPercentage.toFixed(1)}% average across samples`);

  // Recommendations
  console.log('\n💡 RECOMMENDATIONS:');
  
  if (avgPercentage < 10) {
    console.log('  ⚠️  Very few elements have plot numbers (<10%)');
    console.log('     - This is NORMAL if many elements are infrastructure (structure, MEP, etc.)');
    console.log('     - Plot numbers likely only on villa geometry (walls, doors, windows)');
    console.log('     - Your current count of 5/500 (1%) is consistent with this');
  } else if (avgPercentage < 30) {
    console.log('  ✓ Low-moderate plot extraction (10-30%)');
    console.log('    - Expect to map 10-30% of elements to plots');
  } else {
    console.log('  ✓ Good plot extraction (>30%)');
    console.log('    - Most elements should be mappable to plots');
  }

  // Check if ALL elements have other properties
  console.log('\n📋 Checking property coverage on first 100 elements...');
  const first100 = allDbIds.slice(0, 100);
  const bulkProps = await viewerManager.getBulkProperties(first100, null);
  
  const propertyStats = {};
  bulkProps.forEach(item => {
    item.properties.forEach(prop => {
      const key = `${prop.category}/${prop.displayName}`;
      propertyStats[key] = (propertyStats[key] || 0) + 1;
    });
  });

  // Sort by frequency
  const sortedProps = Object.entries(propertyStats)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15);

  console.log(`  Top 15 most common properties (in 100 elements):`);
  sortedProps.forEach(([name, count]) => {
    const percentage = ((count / 100) * 100).toFixed(0);
    console.log(`    • ${name.padEnd(40)} ${count}/100 (${percentage}%)`);
  });

  console.log('\n✅ Analysis complete');
  console.log('📌 Next steps:');
  console.log('   1. If plot % is low (1-5%): This is NORMAL - proceed with current config');
  console.log('   2. If plot % is high (>20%): Check if config.MODEL_PROPERTIES.PLOT_NUMBER is correct');
  console.log('   3. Check visualization: Filter by block to see if colors are applied correctly');
}

// Make available globally
window.analyzePlotDistribution = analyzePlotDistribution;
