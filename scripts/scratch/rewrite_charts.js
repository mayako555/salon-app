const fs = require('fs');
const file = 'src/app/dashboard/AdvancedCharts.tsx';
let content = fs.readFileSync(file, 'utf-8');

// Add useMemo to imports
content = content.replace(
  'import { useEffect, useState } from "react";',
  'import { useEffect, useState, useMemo } from "react";'
);

// Define available stores dynamically
content = content.replace(
  'const maxVisitsAxis = Math.ceil(globalMaxVisits * 1.15 / 10) * 10; // add 15% buffer and round up to 10',
  `const maxVisitsAxis = Math.ceil(globalMaxVisits * 1.15 / 10) * 10; // add 15% buffer and round up to 10
  
  const availableStores = useMemo(() => {
    const storeSet = new Set<string>();
    chartData.forEach(d => {
      Object.keys(d.stores).forEach(s => storeSet.add(s));
    });
    return Array.from(storeSet).sort();
  }, [chartData]);
  
  const storeColors = [
    { regular: "#34d399", minimo: "#818cf8" },
    { regular: "#10b981", minimo: "#6366f1" },
    { regular: "#059669", minimo: "#4f46e5" },
    { regular: "#f43f5e", minimo: "#e11d48" },
    { regular: "#fbbf24", minimo: "#f59e0b" },
    { regular: "#38bdf8", minimo: "#0284c7" }
  ];`
);

// Fix Tooltip "stores" array
content = content.replace(
  'const stores = ["六甲", "神戸", "元町"];',
  'const stores = availableStores;'
);
content = content.replace(
  'const stores = ["六甲", "神戸", "元町"];',
  'const stores = availableStores;'
);

// Fix Sales Trend Chart bars
const oldBarsSalesTrend = `{/* 通常売上 */}
                <Bar name="元町:通常" dataKey="stores.元町.regular" stackId="total" fill="#059669" />
                <Bar name="神戸:通常" dataKey="stores.神戸.regular" stackId="total" fill="#10b981" />
                <Bar name="六甲:通常" dataKey="stores.六甲.regular" stackId="total" fill="#34d399" />
                
                {/* ミニモ売上 */}
                <Bar name="元町:ミニモ" dataKey="stores.元町.minimo" stackId="total" fill="#4f46e5" />
                <Bar name="神戸:ミニモ" dataKey="stores.神戸.minimo" stackId="total" fill="#6366f1" />
                <Bar name="六甲:ミニモ" dataKey="stores.六甲.minimo" stackId="total" fill="#818cf8" radius={[4, 4, 0, 0]}>
                  <LabelList 
                    dataKey="total" 
                    position="top" 
                    offset={10}
                    formatter={(val: any) => val ? \`¥\${(val / 10000).toFixed(1)}万\` : ""}
                    style={{ fontSize: '10px', fontWeight: 'bold', fill: '#475569' }}
                  />
                </Bar>`;

const newBarsSalesTrend = `{/* 動的店舗レンダリング */}
                {availableStores.map((store, idx) => (
                  <Bar key={\`\${store}-regular\`} name={\`\${store}:通常\`} dataKey={\`stores.\${store}.regular\`} stackId="total" fill={storeColors[idx % storeColors.length].regular} />
                ))}
                {availableStores.map((store, idx) => {
                  const isLast = idx === availableStores.length - 1;
                  return (
                    <Bar key={\`\${store}-minimo\`} name={\`\${store}:ミニモ\`} dataKey={\`stores.\${store}.minimo\`} stackId="total" fill={storeColors[idx % storeColors.length].minimo} radius={isLast ? [4, 4, 0, 0] : [0,0,0,0]}>
                      {isLast && (
                        <LabelList 
                          dataKey="total" 
                          position="top" 
                          offset={10}
                          formatter={(val: any) => val ? \`¥\${(val / 10000).toFixed(1)}万\` : ""}
                          style={{ fontSize: '10px', fontWeight: 'bold', fill: '#475569' }}
                        />
                      )}
                    </Bar>
                  );
                })}`;
content = content.replace(oldBarsSalesTrend, newBarsSalesTrend);

// Fix Visit Breakdown Charts iteration
content = content.replace(
  '{["六甲", "神戸", "元町"].map((store) => (',
  '{availableStores.map((store) => ('
);

// Fix Next Booking Analytics bars
const oldBarsNextBooking = `{/* 積み上げ棒グラフ：総来店数（サロンのトラフィック） */}
                <Bar yAxisId="left" name="元町:来店数" dataKey="stores.元町.totalVisits" stackId="visit" fill="#6366f1" />
                <Bar yAxisId="left" name="神戸:来店数" dataKey="stores.神戸.totalVisits" stackId="visit" fill="#f43f5e" />
                <Bar yAxisId="left" name="六甲:来店数" dataKey="stores.六甲.totalVisits" stackId="visit" fill="#10b981" radius={[4, 4, 0, 0]} />`;

const newBarsNextBooking = `{/* 積み上げ棒グラフ：総来店数（サロンのトラフィック） */}
                {availableStores.map((store, idx) => {
                  const isLast = idx === availableStores.length - 1;
                  return (
                    <Bar key={\`\${store}-visits\`} yAxisId="left" name={\`\${store}:来店数\`} dataKey={\`stores.\${store}.totalVisits\`} stackId="visit" fill={storeColors[idx % storeColors.length].regular} radius={isLast ? [4, 4, 0, 0] : [0,0,0,0]} />
                  );
                })}`;
content = content.replace(oldBarsNextBooking, newBarsNextBooking);

// Fix Store Sales Chart bars
const oldBarsStoreSales = `<Bar name="六甲:通常" dataKey="stores.六甲.regular" stackId="rokko" fill="#10b981" />
                <Bar name="六甲:ミニモ" dataKey="stores.六甲.minimo" stackId="rokko" fill="#059669" radius={[4, 4, 0, 0]} />
                <Bar name="神戸:通常" dataKey="stores.神戸.regular" stackId="kobe" fill="#f43f5e" />
                <Bar name="神戸:ミニモ" dataKey="stores.神戸.minimo" stackId="kobe" fill="#e11d48" radius={[4, 4, 0, 0]} />
                <Bar name="元町:通常" dataKey="stores.元町.regular" stackId="moto" fill="#6366f1" />
                <Bar name="元町:ミニモ" dataKey="stores.元町.minimo" stackId="moto" fill="#4f46e5" radius={[4, 4, 0, 0]} />`;

const newBarsStoreSales = `{availableStores.map((store, idx) => (
                  <React.Fragment key={store}>
                    <Bar name={\`\${store}:通常\`} dataKey={\`stores.\${store}.regular\`} stackId={store} fill={storeColors[idx % storeColors.length].regular} />
                    <Bar name={\`\${store}:ミニモ\`} dataKey={\`stores.\${store}.minimo\`} stackId={store} fill={storeColors[idx % storeColors.length].minimo} radius={[4, 4, 0, 0]} />
                  </React.Fragment>
                ))}`;

content = content.replace(oldBarsStoreSales, newBarsStoreSales);

// Add React fragment import if needed
if (!content.includes('import React')) {
  content = content.replace(
    'import { useEffect, useState, useMemo } from "react";',
    'import React, { useEffect, useState, useMemo } from "react";'
  );
}

// Global max visits fix
content = content.replace(
  `const globalMaxVisits = chartData.reduce((max, d) => {
    const storeMax = Math.max(
      d.stores["六甲"]?.totalVisits || 0,
      d.stores["神戸"]?.totalVisits || 0,
      d.stores["元町"]?.totalVisits || 0
    );
    return Math.max(max, storeMax);
  }, 0);`,
  `const globalMaxVisits = chartData.reduce((max, d) => {
    const storeVals = Object.values(d.stores).map((s: any) => s.totalVisits || 0);
    const storeMax = storeVals.length > 0 ? Math.max(...storeVals) : 0;
    return Math.max(max, storeMax);
  }, 0);`
);

fs.writeFileSync(file, content);
