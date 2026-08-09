const fs = require('fs');

let content = fs.readFileSync('src/app/dashboard/AdvancedCharts.tsx', 'utf-8');

const targetBlock = `                  {(() => {
                    // Find latest month with actual visits for this store
                    const latestData = [...chartData].reverse().find(d => d.stores[store]?.totalVisits > 0)?.stores[store];
                    return (
                      <>
                        <div className="p-2 bg-emerald-50 rounded-xl border border-emerald-100 text-center flex flex-col justify-center min-h-[58px]">
                          <p className="text-[9px] font-black text-emerald-600 uppercase mb-0.5 leading-tight">通常単価</p>
                          <p className="text-xs font-black text-emerald-700">
                            ¥{(latestData?.avgRegular || 0).toLocaleString()}
                          </p>
                        </div>
                        <div className="p-2 bg-indigo-50 rounded-xl border border-indigo-100 text-center flex flex-col justify-center min-h-[58px]">
                          <p className="text-[9px] font-black text-indigo-600 uppercase mb-0.5 leading-tight">ミニモ単価</p>
                          <p className="text-xs font-black text-indigo-700">
                            ¥{(latestData?.avgMinimo || 0).toLocaleString()}
                          </p>
                        </div>
                        <div className="p-2 bg-sky-50 rounded-xl border border-sky-100 text-center flex flex-col justify-center min-h-[58px]">
                          <p className="text-[9px] font-black text-sky-600 uppercase mb-0.5 leading-tight">通常新規</p>
                          <p className="text-xs font-black text-sky-700">
                            {(latestData?.regularNewVisits || 0)}人
                          </p>
                        </div>
                        <div className="p-2 bg-purple-50 rounded-xl border border-purple-100 text-center flex flex-col justify-center min-h-[58px]">
                          <p className="text-[9px] font-black text-purple-600 uppercase mb-0.5 leading-tight">ミニモ新規</p>
                          <p className="text-xs font-black text-purple-700">
                            {(latestData?.minimoNewVisits || 0)}人
                          </p>
                        </div>
                      </>
                    );
                  })()}`;

const newBlock = `                  {(() => {
                    // Calculate averages over the last 3 months with data
                    const recentMonthsData = [...chartData].reverse().filter(d => d.stores[store]?.totalVisits > 0).slice(0, 3).map(d => d.stores[store]);
                    
                    let avgRegular = 0;
                    let avgMinimo = 0;
                    let avgRegularNew = 0;
                    let avgMinimoNew = 0;
                    
                    if (recentMonthsData.length > 0) {
                      let totalRegularSales = 0;
                      let totalRegularCount = 0;
                      let totalMinimoSales = 0;
                      let totalMinimoCount = 0;
                      let totalRegularNew = 0;
                      let totalMinimoNew = 0;
                      
                      recentMonthsData.forEach(d => {
                        totalRegularSales += (d.regular || 0);
                        totalRegularCount += (d.regularVisits || 0);
                        totalMinimoSales += (d.minimo || 0);
                        totalMinimoCount += (d.minimoVisits || 0);
                        totalRegularNew += (d.regularNewVisits || 0);
                        totalMinimoNew += (d.minimoNewVisits || 0);
                      });
                      
                      avgRegular = totalRegularCount > 0 ? Math.round(totalRegularSales / totalRegularCount) : 0;
                      avgMinimo = totalMinimoCount > 0 ? Math.round(totalMinimoSales / totalMinimoCount) : 0;
                      avgRegularNew = Math.round(totalRegularNew / recentMonthsData.length);
                      avgMinimoNew = Math.round(totalMinimoNew / recentMonthsData.length);
                    }

                    return (
                      <>
                        <div className="p-2 bg-emerald-50 rounded-xl border border-emerald-100 text-center flex flex-col justify-center min-h-[58px]">
                          <p className="text-[9px] font-black text-emerald-600 uppercase mb-0.5 leading-tight" title="直近3ヶ月の平均">通常単価(平均)</p>
                          <p className="text-xs font-black text-emerald-700">
                            ¥{avgRegular.toLocaleString()}
                          </p>
                        </div>
                        <div className="p-2 bg-indigo-50 rounded-xl border border-indigo-100 text-center flex flex-col justify-center min-h-[58px]">
                          <p className="text-[9px] font-black text-indigo-600 uppercase mb-0.5 leading-tight" title="直近3ヶ月の平均">ミニモ単価(平均)</p>
                          <p className="text-xs font-black text-indigo-700">
                            ¥{avgMinimo.toLocaleString()}
                          </p>
                        </div>
                        <div className="p-2 bg-sky-50 rounded-xl border border-sky-100 text-center flex flex-col justify-center min-h-[58px]">
                          <p className="text-[9px] font-black text-sky-600 uppercase mb-0.5 leading-tight" title="直近3ヶ月の平均">通常新規(月平均)</p>
                          <p className="text-xs font-black text-sky-700">
                            {avgRegularNew}人
                          </p>
                        </div>
                        <div className="p-2 bg-purple-50 rounded-xl border border-purple-100 text-center flex flex-col justify-center min-h-[58px]">
                          <p className="text-[9px] font-black text-purple-600 uppercase mb-0.5 leading-tight" title="直近3ヶ月の平均">ミニモ新規(月平均)</p>
                          <p className="text-xs font-black text-purple-700">
                            {avgMinimoNew}人
                          </p>
                        </div>
                      </>
                    );
                  })()}`;

if (content.includes(targetBlock)) {
    content = content.replace(targetBlock, newBlock);
    fs.writeFileSync('src/app/dashboard/AdvancedCharts.tsx', content);
    console.log("Successfully updated AdvancedCharts.tsx");
} else {
    console.log("Could not find the target block in AdvancedCharts.tsx");
}
