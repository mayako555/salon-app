const fs = require('fs');

let pageContent = fs.readFileSync('src/app/admin/expenses/page.tsx', 'utf-8');

const replacementUi = `                {/* Column Selection UI */}
                {requireColumnMapping && (
                  <div className="flex flex-col gap-4 border border-rose-200 rounded-xl p-6 bg-rose-50/50">
                    <div>
                      <h4 className="text-rose-800 font-bold text-sm">列の自動判定に失敗しました</h4>
                      <p className="text-xs text-rose-600 mt-1">
                        特殊なCSVフォーマットのため、どの列が日付・金額・摘要か判断できませんでした。以下から列を選択してください。
                      </p>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500">日付の列</label>
                        <select 
                          value={colMapping.date} 
                          onChange={e => setColMapping({...colMapping, date: e.target.value})}
                          className="w-full text-xs p-2 border border-slate-200 rounded-lg"
                        >
                          <option value="">選択してください</option>
                          {csvHeaders.map((h, i) => <option key={i} value={i}>{h || \`列 \${i+1}\`}</option>)}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500">金額（出金）の列</label>
                        <select 
                          value={colMapping.amount} 
                          onChange={e => setColMapping({...colMapping, amount: e.target.value})}
                          className="w-full text-xs p-2 border border-slate-200 rounded-lg"
                        >
                          <option value="">選択してください</option>
                          {csvHeaders.map((h, i) => <option key={i} value={i}>{h || \`列 \${i+1}\`}</option>)}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500">摘要の列</label>
                        <select 
                          value={colMapping.desc} 
                          onChange={e => setColMapping({...colMapping, desc: e.target.value})}
                          className="w-full text-xs p-2 border border-slate-200 rounded-lg"
                        >
                          <option value="">選択してください</option>
                          {csvHeaders.map((h, i) => <option key={i} value={i}>{h || \`列 \${i+1}\`}</option>)}
                        </select>
                      </div>
                    </div>
                    
                    <Button
                      onClick={() => handlePasteTextUpload(colMapping)}
                      disabled={colMapping.date === "" || colMapping.amount === "" || colMapping.desc === ""}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-10 mt-2"
                    >
                      この列設定で解析を実行
                    </Button>
                  </div>
                )}

                {/* Parsing Status */}`;

const targetRegex = /\{\/\* Parsing Status \*\/\}/;
pageContent = pageContent.replace(targetRegex, replacementUi);


const replacementStats = `                {/* Parsed Transactions List */}
                {parsedTransactions.length > 0 && (
                  <div className="space-y-4">
                    
                    {importStats && (
                      <div className="bg-slate-800 text-slate-200 p-4 rounded-xl text-xs font-mono mb-4">
                        <h4 className="text-emerald-400 font-bold mb-2 pb-2 border-b border-slate-700">🚀 ハイブリッド解析レポート</h4>
                        <div className="grid grid-cols-2 gap-y-2 gap-x-4">
                          <div><span className="text-slate-400">総読み込み行数:</span> {importStats.total}件</div>
                          <div><span className="text-slate-400">ルール処理・キャッシュ:</span> <span className="text-emerald-300 font-bold">{importStats.rule}件</span></div>
                          <div><span className="text-slate-400">AIが推測した未知の行:</span> <span className="text-amber-300 font-bold">{importStats.ai}件</span></div>
                          <div><span className="text-slate-400">重複・対象外の除外:</span> {importStats.excluded}件</div>
                          <div><span className="text-slate-400">経費として反映可能:</span> {importStats.expense}件</div>
                          <div><span className="text-slate-400">処理時間:</span> {importStats.timeMs}ms</div>
                        </div>
                      </div>
                    )}

                    <div className="flex justify-between items-center bg-emerald-50 border border-emerald-100 p-3 rounded-xl">`;

const targetRegexStats = /\{\/\* Parsed Transactions List \*\/\}\s*\{parsedTransactions\.length > 0 && \(\s*<div className="space-y-4">\s*<div className="flex justify-between items-center bg-emerald-50 border border-emerald-100 p-3 rounded-xl">/g;
pageContent = pageContent.replace(targetRegexStats, replacementStats);

fs.writeFileSync('src/app/admin/expenses/page.tsx', pageContent);
console.log("UI patches applied!");
