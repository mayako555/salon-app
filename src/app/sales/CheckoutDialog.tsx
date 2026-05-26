"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Plus, X, Search, Sparkles, Tag, MessageSquare, Calendar, Scissors, Gift } from "lucide-react";
import { addCheckout, updateCheckout, getStoreMasterData, SalesRecord } from "./actions";
import { format } from "date-fns";
import { SalesMasterItem } from "./seeds";
import { getStaffList, StaffProfile } from "../staff/actions";
import { getAllCustomers, Customer } from "@/lib/customers";
import { generateBookingConfirmationText, sendAndLogLineMessage } from "@/lib/line";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ひらがなをカタカナに自動変換するヘルパー関数
const toKatakana = (str: string) => {
  return str.replace(/[\u3041-\u3096]/g, match => String.fromCharCode(match.charCodeAt(0) + 0x60));
};

export default function CheckoutDialog({ 
  defaultStaffName = "", 
  defaultStoreName = "六甲",
  staffList = [],
  initialData,
  trigger,
  isOpenControlled,
  onOpenChangeControlled,
  initialTime = "",
  onSuccess
}: { 
  defaultStaffName?: string, 
  defaultStoreName?: string,
  staffList?: string[],
  initialData?: SalesRecord,
  trigger?: React.ReactNode,
  isOpenControlled?: boolean,
  onOpenChangeControlled?: (open: boolean) => void,
  initialTime?: string,
  onSuccess?: () => void
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = isOpenControlled !== undefined ? isOpenControlled : internalOpen;
  const setIsOpen = onOpenChangeControlled !== undefined ? onOpenChangeControlled : setInternalOpen;
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Selection state
  const [majorTab, setMajorTab] = useState<string>('メニュー');
  const [tab, setTab] = useState<string>('アイブロウメニュー');
  const [menuSearch, setMenuSearch] = useState("");

  // Customers state
  const [allCustomers, setAllCustomers] = useState<Customer[]>([]);
  const [lastName, setLastName] = useState(initialData?.last_name || "");
  const [firstName, setFirstName] = useState(initialData?.first_name || "");
  const [lastNameKana, setLastNameKana] = useState(initialData?.last_name_kana || "");
  const [firstNameKana, setFirstNameKana] = useState(initialData?.first_name_kana || "");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showCustomerResults, setShowCustomerResults] = useState(false);
  
  // States for live fee calculation
  const [techSales, setTechSales] = useState(initialData?.tech_sales || 0);
  const [productSales, setProductSales] = useState(initialData?.product_sales || 0);
  const [discount, setDiscount] = useState(initialData?.discount || 0);
  const [route, setRoute] = useState(initialData?.reservation_route || "電話（HOT PEPPER Beauty）");
  const [portalFee, setPortalFee] = useState(initialData?.portal_fee || 0);

  // Staff list state
  const [dbStaffList, setDbStaffList] = useState<StaffProfile[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<StaffProfile | null>(null);

  // Master Data state
  const [storeMasterData, setStoreMasterData] = useState<SalesMasterItem[]>([]);
  const [selectedStore, setSelectedStore] = useState(initialData?.store_name || defaultStoreName);

  // Menu and Option states to trigger price changes
  const [menuCourse, setMenuCourse] = useState(initialData?.menu_course || "");
  const [customPrices, setCustomPrices] = useState<Record<string, number>>({});
  const [noNextBooking, setNoNextBooking] = useState(!initialData?.next_booking_date);
  const [customerType, setCustomerType] = useState<string>(initialData?.customer_type || "新規");
  
  // LINE and Reminder States
  const [remind2Days, setRemind2Days] = useState(initialData?.next_booking_line_reminder ?? true);
  const [sendLine, setSendLine] = useState(false);
  const [showLinePreview, setShowLinePreview] = useState(false);
  const [previewLineText, setPreviewLineText] = useState("");
  const [pendingFormData, setPendingFormData] = useState<FormData | null>(null);

  useEffect(() => {
    if (isOpen) {
      setCustomerType(initialData?.customer_type || "新規");
      getStoreMasterData(selectedStore).then(setStoreMasterData);
      getStaffList().then(list => {
        setDbStaffList(list);
        if (initialData?.staff_name) {
          const staff = list.find(s => s.name === initialData.staff_name);
          if (staff) setSelectedStaff(staff);
        } else if (defaultStaffName) {
          const staff = list.find(s => s.name === defaultStaffName);
          if (staff) setSelectedStaff(staff);
        } else if (list.length > 0 && !selectedStaff) {
          setSelectedStaff(list[0]);
        }
      });
      getAllCustomers().then(customers => {
        setAllCustomers(customers);
        if (initialData?.customer_id) {
          const customer = customers.find(c => c.id === initialData.customer_id);
          if (customer) setSelectedCustomer(customer);
        }
      });
    }
  }, [isOpen, selectedStore, defaultStaffName, initialData]);

  const handleItemSelect = (item: SalesMasterItem) => {
    const currentMenus = menuCourse ? menuCourse.split(' + ') : [];
    const newMenus = [...currentMenus, item.name];
    setMenuCourse(newMenus.join(' + '));
    
    // Calculate new totals from all items
    let newTechPrice = 0;
    let newProductPrice = 0;
    let newDiscount = 0;
    
    newMenus.forEach(n => {
      const masterItem = storeMasterData.find(m => m.name === n);
      const isProduct = masterItem?.category === '店販' || masterItem?.itemType === 'product';
      const isDiscount = masterItem?.itemType === 'discount' || masterItem?.category === '割引';
      
      const p = n === item.name && customPrices[n] === undefined ? item.price : (customPrices[n] !== undefined ? customPrices[n] : (masterItem?.price || 0));
      
      if (isProduct) newProductPrice += p;
      else if (isDiscount) newDiscount += p;
      else newTechPrice += p;
    });
    
    setTechSales(newTechPrice);
    setProductSales(newProductPrice);
    setDiscount(newDiscount);
    handleFeeCalculation(route, newTechPrice + newProductPrice - newDiscount);
  };

  const handleRemoveItem = (index: number) => {
    const currentMenus = menuCourse ? menuCourse.split(' + ') : [];
    const removedName = currentMenus[index];
    const newMenus = [...currentMenus];
    newMenus.splice(index, 1);
    
    if (!newMenus.includes(removedName)) {
      setCustomPrices(prev => {
        const next = { ...prev };
        delete next[removedName];
        return next;
      });
    }

    let newTechPrice = 0;
    let newProductPrice = 0;
    
    newMenus.forEach(n => {
      const masterItem = storeMasterData.find(m => m.name === n);
      const isProduct = masterItem?.category === '店販' || masterItem?.itemType === 'product';
      const defaultPrice = masterItem?.price || 0;
      const p = customPrices[n] !== undefined ? customPrices[n] : defaultPrice;

      if (isProduct) newProductPrice += p;
      else newTechPrice += p;
    });
    
    setMenuCourse(newMenus.join(' + '));
    setTechSales(newTechPrice);
    setProductSales(newProductPrice);
    handleFeeCalculation(route, newTechPrice + newProductPrice);
  };

  const handlePriceChange = (name: string, newPrice: number) => {
    setCustomPrices(prev => ({ ...prev, [name]: newPrice }));
    const currentMenus = menuCourse ? menuCourse.split(' + ') : [];
    let newTechPrice = 0;
    let newProductPrice = 0;
    let newDiscount = 0;
    currentMenus.forEach(n => {
      const masterItem = storeMasterData.find(m => m.name === n);
      const isProduct = masterItem?.category === '店販' || masterItem?.itemType === 'product';
      const isDiscount = masterItem?.itemType === 'discount' || masterItem?.category === '割引';
      const defaultPrice = masterItem?.price || 0;
      const p = n === name ? newPrice : (customPrices[n] !== undefined ? customPrices[n] : defaultPrice);
      
      if (isProduct) newProductPrice += p;
      else if (isDiscount) newDiscount += p;
      else newTechPrice += p;
    });
    setTechSales(newTechPrice);
    setProductSales(newProductPrice);
    setDiscount(newDiscount);
    handleFeeCalculation(route, newTechPrice + newProductPrice - newDiscount);
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

  const combinedSearch = (lastName + firstName + lastNameKana + firstNameKana).replace(/\s/g, "");

  const filteredCustomers = allCustomers.filter(c => {
    if (!combinedSearch) return false;
    const fullName = (c.name || "").replace(/\s/g, "");
    const fullKana = (c.name_kana || "").replace(/\s/g, "");
    const searchVal = combinedSearch.toLowerCase();
    return fullName.includes(searchVal) || 
           fullKana.includes(searchVal) || 
           c.phone?.includes(searchVal);
  }).slice(0, 5);

  const handleCustomerSelect = (customer: Customer) => {
    setSelectedCustomer(customer);
    setLastName(customer.last_name || customer.name.split(" ")[0] || "");
    setFirstName(customer.first_name || customer.name.split(" ")[1] || "");
    setLastNameKana(customer.last_name_kana || customer.name_kana?.split(" ")[0] || "");
    setFirstNameKana(customer.first_name_kana || customer.name_kana?.split(" ")[1] || "");
    setShowCustomerResults(false);
    
    // 自動判定: 初来店日がない、または今日と同じ場合は「新規」、それ以外は「リピート」
    const todayStr = format(new Date(), "yyyy-MM-dd");
    const checkoutDate = initialData?.date || todayStr;
    const isNew = !customer.first_visit_date || customer.first_visit_date === checkoutDate;
    setCustomerType(isNew ? "新規" : "リピ");
    
    if (customer.is_minimo) {
      setRoute("ミニモ");
      handleFeeCalculation("ミニモ", techSales + productSales);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.append("next_booking_line_reminder", remind2Days ? "true" : "false");

    // Intercept for LINE Preview if conditions are met
    if (!initialData?.id && sendLine && selectedCustomer?.line_user_id && !noNextBooking) {
      const nextDate = formData.get("next_booking_date") as string;
      const nextTime = formData.get("next_booking_time") as string;
      if (nextDate && nextTime) {
        const text = await generateBookingConfirmationText(nextDate, nextTime, selectedStore);
        setPreviewLineText(text);
        setPendingFormData(formData);
        setShowLinePreview(true);
        return;
      }
    }
    
    await executeSubmit(formData);
  };

  const executeSubmit = async (formData: FormData) => {
    setIsSubmitting(true);
    try {
      const res = initialData?.id 
        ? await updateCheckout(initialData.id, formData)
        : await addCheckout(formData);
        
      if (res.success) {
        // Send LINE if preview was confirmed
        if (showLinePreview && sendLine && selectedCustomer?.line_user_id && (res as any).id) {
           await sendAndLogLineMessage({
             customerId: selectedCustomer.id,
             accountingId: (res as any).id,
             lineUserId: selectedCustomer.line_user_id,
             messageType: "next_reservation_confirm",
             messageBody: previewLineText
           });
        }
        setIsOpen(false);
        if(onSuccess) onSuccess(); else window.location.reload();
      } else {
        alert(res.error);
      }
    } catch (err) {
      alert("エラーが発生しました");
    } finally {
      setIsSubmitting(false);
      setShowLinePreview(false);
    }
  };

  const filteredMaster = storeMasterData.filter(item => {
    if (item.isActive === false) return false;
    if (tab === 'アイブロウメニュー') if (item.category !== 'アイブロウメニュー') return false;
    if (tab === 'マツエクメニュー') if (item.category !== 'マツエクメニュー') return false;
    if (tab === 'まつ毛パーマメニュー') if (item.category !== 'まつ毛パーマメニュー') return false;
    if (tab === '毛質変更') if (item.category !== '毛質変更') return false;
    if (tab === 'オプション・その他') if (item.category !== 'その他オプション' && item.category !== 'その他') return false;
    if (tab === '付け替えオフ') if (item.category !== '付け替えオフ') return false;
    if (tab === 'クーポン') if (item.itemType !== 'coupon') return false;
    if (tab === 'メッセージクーポン') if (item.itemType !== 'messageCoupon') return false;
    if (tab === '割引') if (item.itemType !== 'discount' && item.category !== '割引') return false;
    if (tab === '店販') if (item.itemType !== 'product' && item.category !== '店販') return false;
    if (menuSearch) return item.name.includes(menuSearch) || item.category.includes(menuSearch);
    return true;
  }).sort((a, b) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999));

  const allTabs = (selectedStore === '六甲' || selectedStore === '神戸') 
    ? ['マツエクメニュー', 'まつ毛パーマメニュー', 'アイブロウメニュー', '毛質変更', 'オプション・その他', '付け替えオフ', 'クーポン', 'メッセージクーポン', '割引', '店販']
    : ['アイブロウメニュー', 'マツエクメニュー', 'まつ毛パーマメニュー', '毛質変更', 'オプション・その他', '付け替えオフ', 'クーポン', 'メッセージクーポン', '割引', '店販'];

  const majorTabs = ['メニュー', 'オプション', '店販', '割引・クーポン'];
  const majorTabMapping: Record<string, string[]> = {
    'メニュー': ['マツエクメニュー', 'まつ毛パーマメニュー', 'アイブロウメニュー', '付け替えオフ'],
    'オプション': ['毛質変更', 'オプション・その他'],
    '店販': ['店販'],
    '割引・クーポン': ['クーポン', 'メッセージクーポン', '割引']
  };

  const tabs = allTabs.filter(t => majorTabMapping[majorTab]?.includes(t));

  // 大分類が切り替わった際に、小分類の初期値を設定する
  useEffect(() => {
    const availableTabs = majorTabMapping[majorTab] || [];
    if (availableTabs.length > 0 && !availableTabs.includes(tab)) {
      setTab(availableTabs[0]);
    }
  }, [majorTab]);

  // 選択済みのメニュー情報を取得
  const currentMenus = menuCourse ? menuCourse.split(' + ') : [];
  const selectedItemsData = currentMenus.map(name => {
    const master = storeMasterData.find(item => item.name === name) || { id: name, name, category: '手入力', price: 0, itemType: 'menu' };
    const price = customPrices[name] !== undefined ? customPrices[name] : master.price;
    return { ...master, price };
  });

  // 予約経路マスタの取得（マスタ未登録の場合は初期リストを使用）
  const routeMaster = storeMasterData.filter(m => m.itemType === 'reservationRoute');
  const defaultRoutes = ['電話（自社）', '電話（HOT PEPPER Beauty）', '直接来店', 'ミニモ', '次回予約', 'スレッズ', '公式LINE', '自社サイト', 'Instagram'];
  const routes = routeMaster.length > 0 ? routeMaster.map(m => m.name) : defaultRoutes;
  const allRoutes = [...new Set([route, ...routes].filter(Boolean))];

  return (
    <>
      {trigger ? (
        <div onClick={() => setIsOpen(true)}>{trigger}</div>
      ) : (
        <Button 
          className="gap-2 bg-slate-900 text-white hover:bg-slate-800"
          onClick={() => setIsOpen(true)}
        >
          <Plus size={16} />
          <span>会計（日計）を登録</span>
        </Button>
      )}

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-start justify-center p-4 sm:p-6 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl my-auto animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50 rounded-t-xl">
               <h3 className="font-bold text-lg text-slate-800">会計データの登録（日計表）</h3>
               <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-md hover:bg-slate-200 bg-white shadow-sm">
                 <X size={20} />
               </button>
            </div>
            
            <form onSubmit={handleSubmit} className="px-6 py-4 space-y-5">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">対象日</label>
                  <input required type="date" name="date" defaultValue={initialData?.date || format(new Date(), "yyyy-MM-dd")} className="w-full h-9 px-3 border border-slate-300 rounded-md text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">時間</label>
                  <input required type="time" name="time" defaultValue={initialData?.time || initialTime || "10:00"} className="w-full h-9 px-3 border border-slate-300 rounded-md text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">対象店舗</label>
                  <select name="store_name" value={selectedStore} onChange={(e) => setSelectedStore(e.target.value)} className="w-full h-9 px-3 border border-slate-300 rounded-md text-sm">
                    <option value="神戸">神戸</option>
                    <option value="六甲">六甲</option>
                    <option value="元町">元町</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">担当スタッフ</label>
                  <input type="hidden" name="staff_id" value={selectedStaff?.id || ""} />
                  <select required name="staff_name" value={selectedStaff?.name || ""} onChange={(e) => {
                    const staff = dbStaffList.find(s => s.name === e.target.value);
                    if (staff) setSelectedStaff(staff);
                  }} className="w-full h-9 px-3 border border-slate-300 rounded-md text-sm bg-white">
                    <option value="" disabled>スタッフを選択</option>
                    {dbStaffList.map(staff => <option key={staff.id} value={staff.name}>{staff.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 border-t border-slate-100 pt-4">
                <div className="relative">
                  <label className="block text-sm font-medium text-slate-700 mb-1">顧客名（姓名・カタカナ）</label>
                  <div className="space-y-2 relative">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="relative">
                        <span className="absolute left-2 top-2.5 text-[10px] text-slate-400 font-bold pointer-events-none">姓</span>
                        <input type="text" name="last_name" autoComplete="off" placeholder="山田" value={lastName} onChange={(e) => { setLastName(e.target.value); setShowCustomerResults(true); if (selectedCustomer) setSelectedCustomer(null); }} onFocus={() => setShowCustomerResults(true)} className="w-full h-9 pl-6 pr-3 border border-slate-300 rounded-md text-sm font-bold" />
                      </div>
                      <div className="relative">
                        <span className="absolute left-2 top-2.5 text-[10px] text-slate-400 font-bold pointer-events-none">名</span>
                        <input type="text" name="first_name" autoComplete="off" placeholder="花子" value={firstName} onChange={(e) => { setFirstName(e.target.value); setShowCustomerResults(true); if (selectedCustomer) setSelectedCustomer(null); }} onFocus={() => setShowCustomerResults(true)} className="w-full h-9 pl-6 pr-3 border border-slate-300 rounded-md text-sm font-bold" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="relative">
                        <span className="absolute left-2 top-2.5 text-[10px] text-slate-400 font-bold pointer-events-none">姓カナ</span>
                        <input type="text" name="last_name_kana" autoComplete="off" placeholder="ヤマダ" value={lastNameKana} onChange={(e) => { setLastNameKana(toKatakana(e.target.value)); setShowCustomerResults(true); if (selectedCustomer) setSelectedCustomer(null); }} onFocus={() => setShowCustomerResults(true)} className="w-full h-9 pl-10 pr-3 border border-slate-300 rounded-md text-[11px] font-bold bg-slate-50" />
                      </div>
                      <div className="relative">
                        <span className="absolute left-2 top-2.5 text-[10px] text-slate-400 font-bold pointer-events-none">名カナ</span>
                        <input type="text" name="first_name_kana" autoComplete="off" placeholder="ハナコ" value={firstNameKana} onChange={(e) => { setFirstNameKana(toKatakana(e.target.value)); setShowCustomerResults(true); if (selectedCustomer) setSelectedCustomer(null); }} onFocus={() => setShowCustomerResults(true)} className="w-full h-9 pl-10 pr-3 border border-slate-300 rounded-md text-[11px] font-bold bg-slate-50" />
                      </div>
                    </div>
                    <input type="hidden" name="customer_id" value={selectedCustomer?.id || ""} />
                    {showCustomerResults && combinedSearch.length > 0 && (
                      <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-slate-200 shadow-xl rounded-lg overflow-hidden max-h-[200px] overflow-y-auto">
                        {filteredCustomers.map(c => (
                          <button key={c.id} type="button" onClick={() => handleCustomerSelect(c)} className="w-full text-left px-4 py-2 hover:bg-slate-50 border-b border-slate-50 flex items-center justify-between">
                            <div className="flex flex-col">
                              <span className="text-sm font-bold text-slate-800">{c.name}</span>
                              <span className="text-[10px] text-slate-400">{c.name_kana} / {c.phone}</span>
                            </div>
                            {c.has_allergy && <span className="text-[8px] bg-rose-100 text-rose-600 px-1 rounded font-bold">アレルギー</span>}
                          </button>
                        ))}
                        {filteredCustomers.length === 0 && <div className="px-4 py-3 text-[10px] text-slate-400 font-bold bg-slate-50">未登録の顧客です</div>}
                        <button type="button" onClick={() => setShowCustomerResults(false)} className="w-full text-center py-2 text-[10px] text-slate-400 font-bold border-t border-slate-100">閉じる</button>
                      </div>
                    )}
                  </div>
                </div>
                {/* 自動判定された値を裏側で送信 */}
                <input type="hidden" name="customer_type" value={customerType} />
              </div>

              <div className="border-t border-slate-100 pt-4">
                <label className="block text-sm font-medium text-slate-700 mb-2">選択済みメニュー・クーポン</label>
                <div className="bg-slate-50 border border-slate-200 rounded-lg mb-4 overflow-hidden">
                  {selectedItemsData.length === 0 ? (
                    <div className="p-4 text-center text-slate-400 text-xs font-bold">メニューが選択されていません</div>
                  ) : (
                    <table className="w-full text-left text-[10px] sm:text-xs">
                      <thead className="bg-slate-100 text-slate-500 font-bold border-b border-slate-200">
                        <tr>
                          <th className="py-2 px-3 whitespace-nowrap">カテゴリ</th>
                          <th className="py-2 px-3">メニュー・割引・オプション</th>
                          <th className="py-2 px-3 text-right whitespace-nowrap">金額</th>
                          <th className="py-2 px-2 text-center w-10"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {selectedItemsData.map((item, idx) => (
                          <tr key={idx} className="bg-white hover:bg-slate-50">
                            <td className="py-2 px-3 text-slate-500 truncate max-w-[80px] sm:max-w-[120px]">{item.category}</td>
                            <td className="py-2 px-3 font-bold text-slate-800">{item.name}</td>
                            <td className="py-2 px-3 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-1 text-emerald-600 font-bold">
                                <span>{item.itemType === 'discount' || item.category === '割引' ? '-¥' : '¥'}</span>
                                <input 
                                  type="number" 
                                  value={item.price}
                                  onChange={(e) => handlePriceChange(item.name, parseInt(e.target.value) || 0)}
                                  className="w-[72px] sm:w-20 h-7 text-right px-1 border border-slate-200 rounded text-sm font-bold bg-white focus:ring-1 focus:ring-emerald-500"
                                />
                              </div>
                            </td>
                            <td className="py-2 px-2 text-center">
                              <button 
                                type="button"
                                onClick={() => handleRemoveItem(idx)}
                                className="text-slate-300 hover:text-rose-500 transition-colors p-1"
                              >
                                <X size={14} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                  <div className="bg-slate-100 px-4 py-2 flex justify-between items-center border-t border-slate-200">
                    <span className="text-xs font-bold text-slate-600">合算 小計（技術・店販）</span>
                    <span className="text-sm font-black text-slate-800">¥{(techSales + productSales - discount).toLocaleString()}</span>
                  </div>
                </div>

                <div className="space-y-3 mb-4">
                  <div className="flex bg-slate-200/50 p-1 rounded-xl gap-1">
                    {majorTabs.map(m => (
                      <button 
                        key={m} 
                        type="button" 
                        onClick={() => setMajorTab(m)}
                        className={cn(
                          "flex-1 py-2 text-xs font-black rounded-lg transition-all",
                          majorTab === m 
                            ? "bg-white text-blue-600 shadow-sm" 
                            : "text-slate-500 hover:text-slate-700 hover:bg-white/50"
                        )}
                      >
                        {m}
                      </button>
                    ))}
                  </div>

                  {majorTab !== '店販' && tabs.length > 1 && (
                    <div className="flex bg-slate-100 p-1 rounded-lg gap-1 overflow-x-auto no-scrollbar">
                      {tabs.map(cat => (
                        <button key={cat} type="button" onClick={() => setTab(cat)} className={cn("px-3 py-1.5 rounded-md text-[10px] font-black transition-all whitespace-nowrap", tab === cat ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700")}>
                          {cat.replace('メニュー', '')}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-lg overflow-hidden flex flex-col h-[280px]">
                  <div className="p-2 bg-white border-b border-slate-200">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                      <input type="text" value={menuSearch} onChange={(e) => setMenuSearch(e.target.value)} placeholder="メニュー名を検索..." className="w-full pl-9 pr-4 py-2 border-none bg-slate-50 rounded-md text-sm focus:ring-0" />
                    </div>
                  </div>
                  <div className="overflow-y-auto p-2 space-y-1">
                    {filteredMaster.map(item => (
                      <button key={item.id} type="button" onClick={() => handleItemSelect(item)} className="w-full text-left p-3 rounded-lg border bg-white border-slate-200 hover:border-blue-200 hover:shadow-sm transition-all flex justify-between items-center">
                        <div className="flex flex-col">
                          <span className="text-xs text-slate-400 font-medium mb-0.5">{item.category}</span>
                          <span className="text-sm font-semibold text-slate-700">{item.name}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-bold text-slate-600">
                            {item.itemType === 'discount' ? '-¥' : '¥'}{item.price.toLocaleString()}
                          </span>
                          <div className="w-6 h-6 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center">
                            <Plus size={14} />
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <input type="hidden" name="menu_course" value={menuCourse} />
              <input type="hidden" name="hair_material" value="" />

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 border-t border-slate-100 pt-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">技術売上 (円)</label>
                  <input required min="0" type="number" name="tech_sales" value={techSales} onChange={(e) => { const v = parseInt(e.target.value) || 0; setTechSales(v); handleFeeCalculation(route, v + productSales); }} className="w-full h-9 px-3 border border-slate-300 rounded-md text-sm font-bold text-slate-800" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">店販売上 (円)</label>
                  <input required min="0" type="number" name="product_sales" value={productSales} onChange={(e) => { const v = parseInt(e.target.value) || 0; setProductSales(v); handleFeeCalculation(route, techSales + v); }} className="w-full h-9 px-3 border border-slate-300 rounded-md text-sm font-bold text-slate-800" />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-medium text-slate-700 mb-1 text-orange-500">HPBポイント</label>
                  <input required min="0" type="number" name="hpb_points" defaultValue={initialData?.hpb_points || 0} className="w-full h-9 px-3 border border-orange-200 rounded-md text-sm" />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-medium text-slate-700 mb-1 text-rose-600">店舗割引</label>
                  <input required min="0" type="number" name="discount" value={discount} onChange={(e) => {
                    const v = parseInt(e.target.value) || 0;
                    setDiscount(v);
                    handleFeeCalculation(route, techSales + productSales - v);
                  }} className="w-full h-9 px-3 border border-rose-200 rounded-md text-sm font-bold text-rose-700" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">予約経路</label>
                  <select 
                    required 
                    name="reservation_route" 
                    value={route} 
                    onChange={(e) => { const r = e.target.value; setRoute(r); handleFeeCalculation(r, techSales + productSales); }} 
                    className="w-full h-9 px-3 border border-slate-300 rounded-md text-sm bg-white"
                  >
                    {allRoutes.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">支払方法</label>
                  <select name="payment_method" defaultValue={initialData?.payment_method || "現金"} className="w-full h-9 px-3 border border-slate-300 rounded-md text-sm font-bold bg-emerald-50 text-emerald-800">
                    {['現金', 'クレジットカード', 'PayPay', '楽天Pay', 'ミニモ事前決済', 'その他'].map(pm => <option key={pm} value={pm}>{pm}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-slate-100 pt-4 bg-blue-50/30 -mx-6 px-6 py-4">
                <div className="flex items-center justify-between col-span-2">
                  <div className="flex items-center gap-2">
                    <Calendar size={16} className="text-blue-600" />
                    <h4 className="text-sm font-bold text-blue-900">店頭次回予約</h4>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={noNextBooking} onChange={(e) => setNoNextBooking(e.target.checked)} className="w-4 h-4 rounded" />
                    <span className="text-sm font-bold text-slate-700">次回予約なし</span>
                  </label>
                </div>
                {!noNextBooking && (
                  <>
                    <input type="date" name="next_booking_date" defaultValue={initialData?.next_booking_date || ""} className="w-full h-9 px-3 border border-blue-200 rounded-md text-sm font-bold text-blue-800" />
                    <input type="time" name="next_booking_time" defaultValue={initialData?.next_booking_time || "10:00"} className="w-full h-9 px-3 border border-blue-200 rounded-md text-sm font-bold text-blue-800" />
                    <div className="col-span-2 space-y-2 mt-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={remind2Days} onChange={(e) => setRemind2Days(e.target.checked)} className="w-4 h-4 rounded text-emerald-600" />
                        <span className="text-xs font-bold text-slate-700">2日前のLINEリマインド対象にする</span>
                      </label>
                      <label className={cn("flex items-center gap-2 cursor-pointer", !selectedCustomer?.line_user_id && "opacity-50")}>
                        <input type="checkbox" checked={sendLine} onChange={(e) => setSendLine(e.target.checked)} disabled={!selectedCustomer?.line_user_id} className="w-4 h-4 rounded text-emerald-600" />
                        <span className="text-xs font-bold text-slate-700">会計完了後にLINEで予約確定メッセージを送信する</span>
                      </label>
                      {!selectedCustomer?.line_user_id && (
                        <p className="text-[10px] text-rose-500 font-bold ml-6">※LINE未連携のため送信できません</p>
                      )}
                    </div>
                  </>
                )}
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
                <Button type="button" variant="outline" onClick={() => setIsOpen(false)} disabled={isSubmitting}>キャンセル</Button>
                <Button type="submit" disabled={isSubmitting} className="bg-emerald-600 hover:bg-emerald-700 text-white min-w-[120px]">
                  {isSubmitting ? "処理中..." : "保存する"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* LINE Preview Modal */}
      {showLinePreview && (
        <div className="fixed inset-0 z-[60] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in-95 duration-200 overflow-hidden flex flex-col">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-emerald-50">
               <h3 className="font-bold text-lg text-emerald-800 flex items-center gap-2">
                 <MessageSquare size={20} />
                 LINE送信プレビュー
               </h3>
               <button onClick={() => setShowLinePreview(false)} className="text-emerald-400 hover:text-emerald-600 transition-colors p-1 rounded-md hover:bg-emerald-100 bg-white shadow-sm">
                 <X size={20} />
               </button>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[60vh] bg-slate-100">
              <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 relative whitespace-pre-wrap text-sm text-slate-700 font-medium">
                {/* Speech bubble tail */}
                <div className="absolute -left-2 top-4 w-4 h-4 bg-white border-l border-b border-slate-200 transform rotate-45"></div>
                {previewLineText}
              </div>
            </div>
            
            <div className="p-4 bg-white flex justify-end gap-3 border-t border-slate-100">
              <Button type="button" variant="outline" onClick={() => setShowLinePreview(false)} disabled={isSubmitting}>
                戻る
              </Button>
              <Button 
                onClick={() => {
                  if (pendingFormData) executeSubmit(pendingFormData);
                }} 
                disabled={isSubmitting} 
                className="bg-[#06C755] hover:bg-[#05b34c] text-white"
              >
                {isSubmitting ? "処理中..." : "確認して送信＆保存"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
