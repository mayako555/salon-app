"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Plus, X, Search, Sparkles, Tag, MessageSquare, Calendar } from "lucide-react";
import { addCheckout, getStoreMasterData } from "./actions";
import { SalesMasterItem } from "./seeds";
import { getStaffList, StaffProfile } from "../staff/actions";
import { getAllCustomers, Customer } from "@/lib/customers";

export default function CheckoutDialog({ 
  defaultStaffName = "", 
  defaultStoreName = "六甲",
  staffList = []
}: { 
  defaultStaffName?: string, 
  defaultStoreName?: string,
  staffList?: string[]
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Customers state
  const [allCustomers, setAllCustomers] = useState<Customer[]>([]);
  const [customerSearch, setCustomerSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showCustomerResults, setShowCustomerResults] = useState(false);
  
  // States for live fee calculation
  const [techSales, setTechSales] = useState(0);
  const [productSales, setProductSales] = useState(0);
  const [route, setRoute] = useState("ホットペッパーネット");
  const [portalFee, setPortalFee] = useState(0);

  // Staff list state
  const [dbStaffList, setDbStaffList] = useState<StaffProfile[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<StaffProfile | null>(null);

  // Master Data state
  const [storeMasterData, setStoreMasterData] = useState<SalesMasterItem[]>([]);
  const [selectedStore, setSelectedStore] = useState(defaultStoreName);
  const [activeItemType, setActiveItemType] = useState<"menu" | "coupon" | "messageCoupon">("menu");

  useEffect(() => {
    if (isOpen) {
      getStoreMasterData(selectedStore).then(setStoreMasterData);
      getStaffList().then(list => {
        setDbStaffList(list);
        if (defaultStaffName) {
          const staff = list.find(s => s.name === defaultStaffName);
          if (staff) setSelectedStaff(staff);
        } else if (list.length > 0 && !selectedStaff) {
          setSelectedStaff(list[0]);
        }
      });
      getAllCustomers().then(setAllCustomers);
    }
  }, [isOpen, selectedStore, defaultStaffName, selectedStaff]); 
  
  // Menu and Option states to trigger price changes
  const [menuCourse, setMenuCourse] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  // Filtering items by type and search term
  const filteredItems = storeMasterData.filter(item => 
    item.itemType === activeItemType && 
    (item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
     item.category.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleItemSelect = (item: SalesMasterItem) => {
    setMenuCourse(item.name);
    setTechSales(item.price);
    handleFeeCalculation(route, item.price + productSales);
  };

  const handleFeeCalculation = (currentRoute: string, salesTotal: number) => {
    let fee = 0;
    if (currentRoute === "ミニモ" || currentRoute === "ミニモ次回予約") {
      if (salesTotal === 0) fee = 110;
      else if (salesTotal > 0 && salesTotal <= 2200) fee = 440;
      else if (salesTotal > 2200) fee = 660;
    }
    setPortalFee(fee);
  };

  const filteredCustomers = allCustomers.filter(c => 
    c.name.includes(customerSearch) || 
    c.name_kana.includes(customerSearch) || 
    c.phone.includes(customerSearch)
  ).slice(0, 5);

  const handleCustomerSelect = (customer: Customer) => {
    setSelectedCustomer(customer);
    setCustomerSearch(customer.name);
    setShowCustomerResults(false);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const formData = new FormData(e.currentTarget);
      const res = await addCheckout(formData);
      if (res.success) {
        setIsOpen(false);
        window.location.reload();
      } else {
        alert(res.error);
      }
    } catch (err) {
      alert("エラーが発生しました");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Button 
        className="gap-2 bg-slate-900 text-white hover:bg-slate-800"
        onClick={() => setIsOpen(true)}
      >
        <Plus size={16} />
        <span>会計（日計）を登録</span>
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-start justify-center p-4 sm:p-6 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl my-auto animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50 rounded-t-xl">
               <h3 className="font-bold text-lg text-slate-800">会計データの登録（日計表）</h3>
               <button 
                 onClick={() => setIsOpen(false)}
                 className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-md hover:bg-slate-200 bg-white shadow-sm"
               >
                 <X size={20} />
               </button>
            </div>
            
            <form onSubmit={handleSubmit} className="px-6 py-4 space-y-5">
              
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">対象日</label>
                  <input required type="date" name="date" defaultValue={new Date().toISOString().split('T')[0]} className="w-full h-9 px-3 border border-slate-300 rounded-md text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">時間</label>
                  <input required type="time" name="time" defaultValue="10:00" className="w-full h-9 px-3 border border-slate-300 rounded-md text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">対象店舗</label>
                  <select 
                    name="store_name" 
                    value={selectedStore} 
                    onChange={(e) => setSelectedStore(e.target.value)}
                    className="w-full h-9 px-3 border border-slate-300 rounded-md text-sm"
                  >
                    <option value="神戸">神戸</option>
                    <option value="六甲">六甲</option>
                    <option value="元町">元町</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">担当スタッフ</label>
                  <input type="hidden" name="staff_id" value={selectedStaff?.id || ""} />
                  <select 
                    required 
                    name="staff_name" 
                    value={selectedStaff?.name || ""} 
                    onChange={(e) => {
                      const staff = dbStaffList.find(s => s.name === e.target.value);
                      if (staff) setSelectedStaff(staff);
                    }}
                    className="w-full h-9 px-3 border border-slate-300 rounded-md text-sm bg-white"
                  >
                    <option value="" disabled>スタッフを選択</option>
                    {dbStaffList.map(staff => (
                      <option key={staff.id} value={staff.name}>{staff.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-slate-100 pt-4">
                <div className="relative">
                  <label className="block text-sm font-medium text-slate-700 mb-1">顧客名 (データベース検索)</label>
                  <div className="relative">
                    <input 
                      type="text" 
                      name="customer_name" 
                      autoComplete="off"
                      placeholder="山田 花子" 
                      value={customerSearch}
                      onChange={(e) => {
                        setCustomerSearch(e.target.value);
                        setShowCustomerResults(true);
                        if (selectedCustomer && e.target.value !== selectedCustomer.name) {
                          setSelectedCustomer(null);
                        }
                      }}
                      onFocus={() => setShowCustomerResults(true)}
                      className="w-full h-9 px-3 border border-slate-300 rounded-md text-sm" 
                    />
                    <input type="hidden" name="customer_id" value={selectedCustomer?.id || ""} />
                    {showCustomerResults && customerSearch.length > 0 && (
                      <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-slate-200 shadow-xl rounded-lg overflow-hidden max-h-[200px] overflow-y-auto">
                        {filteredCustomers.map(c => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => handleCustomerSelect(c)}
                            className="w-full text-left px-4 py-2 hover:bg-slate-50 border-b border-slate-50 last:border-none flex items-center justify-between"
                          >
                            <div className="flex flex-col">
                              <span className="text-sm font-bold text-slate-800">{c.name}</span>
                              <span className="text-[10px] text-slate-400">{c.name_kana} / {c.phone}</span>
                            </div>
                            {c.has_allergy && <span className="text-[8px] bg-rose-100 text-rose-600 px-1 rounded font-bold">アレルギー</span>}
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={() => setShowCustomerResults(false)}
                          className="w-full text-center py-2 text-[10px] text-slate-400 font-bold bg-slate-50"
                        >
                          閉じる
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">新規/リピート</label>
                  <select name="customer_type" defaultValue={selectedCustomer ? "リピ" : "新規"} className="w-full h-9 px-3 border border-slate-300 rounded-md text-sm bg-white">
                    <option value="リピ">リピート</option>
                    <option value="新規">新規</option>
                    <option value="不明">不明</option>
                  </select>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-slate-700">メニュー・クーポン選択</label>
                  <div className="flex bg-slate-100 p-1 rounded-lg gap-1">
                    <button type="button" onClick={() => setActiveItemType("menu")} className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${activeItemType === "menu" ? "bg-white text-emerald-700 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}><div className="flex items-center gap-1"><Sparkles size={12}/>通常</div></button>
                    <button type="button" onClick={() => setActiveItemType("coupon")} className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${activeItemType === "coupon" ? "bg-white text-orange-600 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}><div className="flex items-center gap-1"><Tag size={12}/>クーポン</div></button>
                    <button type="button" onClick={() => setActiveItemType("messageCoupon")} className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${activeItemType === "messageCoupon" ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}><div className="flex items-center gap-1"><MessageSquare size={12}/>メッセージ</div></button>
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-lg overflow-hidden flex flex-col h-[280px]">
                  <div className="p-2 bg-white border-b border-slate-200">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                      <input 
                        type="text" 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder={`${activeItemType === 'menu' ? 'メニュー名' : activeItemType === 'coupon' ? 'クーポン名' : 'メッセージ'}を検索...`}
                        className="w-full pl-9 pr-4 py-2 border-none bg-slate-50 rounded-md text-sm focus:ring-0"
                      />
                    </div>
                  </div>
                  <div className="overflow-y-auto p-2 space-y-1 bg-slate-50/50">
                    {filteredItems.map(item => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleItemSelect(item)}
                        className={`w-full text-left p-3 rounded-lg border transition-all flex justify-between items-center group ${
                          menuCourse === item.name ? 'bg-emerald-50 border-emerald-200 shadow-sm' : 'bg-white border-slate-100 hover:border-slate-200 hover:shadow-sm'
                        }`}
                      >
                        <div className="flex flex-col">
                          <span className="text-xs text-slate-400 font-medium mb-0.5">{item.category}</span>
                          <span className="text-sm font-semibold text-slate-700 group-hover:text-slate-900 line-clamp-1">{item.name}</span>
                        </div>
                        <span className={`text-sm font-bold ${menuCourse === item.name ? 'text-emerald-700' : 'text-slate-500'}`}>
                          ¥{item.price.toLocaleString()}
                        </span>
                      </button>
                    ))}
                    {filteredItems.length === 0 && (
                      <div className="text-center py-10 text-slate-400 text-sm italic">
                        登録データがありません（設定画面から追加してください）
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-slate-100 pt-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">選択中のメニュー名（編集可）</label>
                  <input 
                    required 
                    type="text" 
                    name="menu_course" 
                    value={menuCourse} 
                    onChange={(e) => setMenuCourse(e.target.value)}
                    className="w-full h-10 px-3 border border-slate-300 rounded-md text-sm font-semibold" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">毛質・オプション備考（自由入力）</label>
                  <input type="text" name="hair_material" placeholder="セーブル / カラー等" className="w-full h-10 px-3 border border-slate-300 rounded-md text-sm" />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 border-t border-slate-100 pt-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">技術売上 (円)</label>
                  <input required min="0" type="number" name="tech_sales" value={techSales} onChange={(e) => {
                    const v = parseInt(e.target.value) || 0;
                    setTechSales(v);
                    handleFeeCalculation(route, v + productSales);
                  }} className="w-full h-9 px-3 border border-slate-300 rounded-md text-sm font-bold text-slate-800" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">店販売上 (円)</label>
                  <input required min="0" type="number" name="product_sales" value={productSales} onChange={(e) => {
                    const v = parseInt(e.target.value) || 0;
                    setProductSales(v);
                    handleFeeCalculation(route, techSales + v);
                  }} className="w-full h-9 px-3 border border-slate-300 rounded-md text-sm font-bold text-slate-800" />
                </div>
                
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-medium text-slate-700 mb-1 text-slate-500">キャンセル料</label>
                  <input required min="0" type="number" name="cancel_fee" defaultValue="0" className="w-full h-9 px-3 border border-slate-300 rounded-md text-sm" />
                </div>
                
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-medium text-slate-700 mb-1 text-orange-500">HPBポイント</label>
                  <input required min="0" type="number" name="hpb_points" defaultValue="0" className="w-full h-9 px-3 border border-orange-200 rounded-md text-sm" />
                </div>

                <div className="col-span-2 sm:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">予約経路</label>
                  <input required type="text" name="reservation_route" list="reservation-routes" value={route} onChange={(e) => {
                    const r = e.target.value;
                    setRoute(r);
                    handleFeeCalculation(r, techSales + productSales);
                  }} className="w-full h-9 px-3 border border-slate-300 rounded-md text-sm bg-white" />
                  <datalist id="reservation-routes">
                    <option value="ホットペッパーネット" />
                    <option value="電話" />
                    <option value="次回予約" />
                    <option value="ミニモ" />
                    <option value="インスタ" />
                    <option value="楽天" />
                    <option value="ネイリー" />
                    <option value="ミニモ次回予約" />
                    <option value="LINE予約" />
                    <option value="その他" />
                  </datalist>
                </div>

                <div className="col-span-2 sm:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1 text-indigo-500">予約サイト手数料 (ミニモ等)</label>
                  <input required min="0" type="number" name="portal_fee" value={portalFee} onChange={(e) => setPortalFee(parseInt(e.target.value) || 0)} className="w-full h-9 px-3 border border-indigo-200 rounded-md text-sm" />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1 text-rose-600">店舗割引</label>
                  <input required min="0" type="number" name="discount" defaultValue="0" className="w-full h-9 px-3 border border-rose-200 rounded-md text-sm" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1 text-rose-600">割引理由</label>
                  <input type="text" name="discount_reason" list="discount-reasons" placeholder="なし" className="w-full h-9 px-3 border border-rose-200 rounded-md text-sm bg-white" />
                  <datalist id="discount-reasons">
                    <option value="JLポイント" />
                    <option value="毛質変更半額" />
                    <option value="次回予約付け替え" />
                    <option value="次回付け足し" />
                    <option value="次回パーマ" />
                    <option value="お詫び" />
                    <option value="紹介割" />
                    <option value="口コミ割" />
                    <option value="ウェルカムバック割" />
                  </datalist>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-slate-100 pt-4 bg-blue-50/30 -mx-6 px-6 py-4">
                <div className="flex items-center gap-2 col-span-2 mb-1">
                   <Calendar size={16} className="text-blue-600" />
                   <h4 className="text-sm font-bold text-blue-900">店頭次回予約</h4>
                   <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-black uppercase tracking-wider">Auto LINE</span>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">次回予約日</label>
                  <input type="date" name="next_booking_date" className="w-full h-9 px-3 border border-blue-200 rounded-md text-sm font-bold text-blue-800 bg-white" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">次回予約時間</label>
                  <input type="time" name="next_booking_time" defaultValue="10:00" className="w-full h-9 px-3 border border-blue-200 rounded-md text-sm font-bold text-blue-800 bg-white" />
                </div>
                <p className="col-span-2 text-[10px] text-blue-500 font-medium">※入力をするとお客様に自動でLINE予約確定メッセージが送信されます。</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-slate-100 pt-4 bg-slate-50/50 -mx-6 px-6 pb-2">
                <div className="flex flex-col gap-2 pt-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" name="is_nominated" value="true" className="w-4 h-4 rounded text-emerald-600 border-slate-300 focus:ring-emerald-500" />
                    <span className="text-sm font-medium text-slate-700">指名あり</span>
                  </label>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">指名料 (円)</label>
                    <input required min="0" type="number" name="nomination_fee" defaultValue="0" className="w-full h-8 px-3 border border-slate-300 rounded-md text-sm" />
                  </div>
                </div>
                <div className="pt-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">支払方法</label>
                  <select name="payment_method" className="w-full h-9 px-3 border border-slate-300 rounded-md text-sm font-bold text-emerald-800 bg-emerald-50">
                    <option value="現金">現金</option>
                    <option value="クレジットカード">クレジットカード</option>
                    <option value="PayPay">PayPay</option>
                    <option value="ミニモ事前決済">ミニモ事前決済</option>
                    <option value="楽天Pay">楽天Pay</option>
                    <option value="ネイリー事前決済">ネイリー事前決済</option>
                    <option value="その他キャッシュレス">その他キャッシュレス</option>
                  </select>
                </div>
                <div className="pt-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">オプション・備考</label>
                  <input type="text" name="options" placeholder="次回アイシャンなど" className="w-full h-9 px-3 border border-slate-300 rounded-md text-sm" />
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
                <Button type="button" variant="outline" onClick={() => setIsOpen(false)} disabled={isSubmitting}>
                  キャンセル
                </Button>
                <Button type="submit" disabled={isSubmitting} className="bg-emerald-600 hover:bg-emerald-700 text-white min-w-[120px]">
                  {isSubmitting ? "処理中..." : "日計に登録する"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
