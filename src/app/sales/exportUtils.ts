import * as XLSX from "xlsx";
import { format } from "date-fns";
import { SalesRecord } from "./actions";
import { StaffSalesData } from "./components/SalesRow";
import { SalesSummaryData } from "./components/SalesSummaryCards";

export function exportSalesToCsv(
  sales: SalesRecord[], 
  staffData: StaffSalesData[], 
  summaryData: SalesSummaryData[],
  yearMonth: string,
  availableStores: string[]
) {
  // CSV logic (Implementation could use papaparse or just join)
  // For simplicity, let's just do a basic CSV for the staff summary
  const storeHeaders = availableStores.map(store => `${store}店`).join(",");
  let csvContent = `スタッフ名,${storeHeaders},入客数,技術単価,総客単価,合計売上,技術売上,店販売上,値引,達成率\n`;
  
  staffData.forEach(staff => {
    const storeValues = availableStores.map(store => staff.storeSales[store]?.total || 0).join(",");
    const achievement = staff.goal ? Math.round((staff.totalSales / staff.goal) * 100) : "";
    
    csvContent += `"${staff.name}",${storeValues},${staff.visits || 0},${staff.techAvg || 0},${staff.totalAvg || 0},${staff.totalSales},${staff.totalTech},${staff.totalProduct},${staff.totalDiscount},${achievement}%\n`;
  });

  const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.setAttribute("download", `売上サマリー_${yearMonth}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function exportSalesToExcel(
  sales: SalesRecord[], 
  staffData: StaffSalesData[], 
  summaryData: SalesSummaryData[],
  yearMonth: string,
  availableStores: string[]
) {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Staff Summary
  const storeHeaders = availableStores.map(store => `${store}店`);
  const staffSheetData = [
    ["スタッフ名", ...storeHeaders, "入客数", "技術単価", "総客単価", "合計売上", "技術売上", "店販売上", "値引額", "達成率"],
    ...staffData.map(staff => [
      staff.name,
      ...availableStores.map(store => staff.storeSales[store]?.total || 0),
      staff.visits || 0,
      staff.techAvg || 0,
      staff.totalAvg || 0,
      staff.totalSales,
      staff.totalTech,
      staff.totalProduct,
      staff.totalDiscount,
      staff.goal ? staff.totalSales / staff.goal : null
    ])
  ];
  const ws1 = XLSX.utils.aoa_to_sheet(staffSheetData);
  XLSX.utils.book_append_sheet(wb, ws1, "スタッフ別売上");

  // Sheet 2: Store Summary
  const storeSheetData = summaryData.map(store => ({
    "店舗名": store.name,
    "総売上": store.total,
    "技術売上": store.tech,
    "店販売上": store.product,
    "値引額": store.discount
  }));
  const ws2 = XLSX.utils.json_to_sheet(storeSheetData);
  XLSX.utils.book_append_sheet(wb, ws2, "店舗別売上");

  // Sheet 3: Transactions
  const transactionData = sales.map(s => ({
    "日付": s.date,
    "店舗": s.store_name,
    "担当": s.staff_name,
    "お客様名": s.customer_name || "",
    "メニュー": s.menu_course || "",
    "技術売上": s.tech_sales,
    "店販売上": s.product_sales,
    "値引": s.discount,
    "合計": s.tech_sales + s.product_sales - (s.discount || 0) + (s.nomination_fee || 0),
    "支払方法": s.payment_method
  }));
  const ws3 = XLSX.utils.json_to_sheet(transactionData);
  XLSX.utils.book_append_sheet(wb, ws3, "売上明細");

  XLSX.writeFile(wb, `売上データ_${yearMonth}.xlsx`);
}
