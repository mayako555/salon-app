import { useMemo } from "react";
import { SalesRecord } from "../actions";
import { StaffProfile } from "@/app/staff/actions";
import { StaffSalesData, StoreSalesData } from "../components/SalesRow";
import { SalesSummaryData } from "../components/SalesSummaryCards";

type UseSalesDataProps = {
  sales: SalesRecord[];
  prevMonthSales: SalesRecord[];
  staffProfiles: StaffProfile[];
  goals: any[];
  availableStores: string[];
  searchQuery: string;
  hideZeroSales: boolean;
  selectedStore: string;
};

export const normalizeName = (name: string | null) => {
  if (!name) return "";
  return name.replace(/\s+/g, "").replace(/[凛凜]/g, "凛");
};

export function useSalesData({
  sales,
  prevMonthSales,
  staffProfiles,
  goals,
  availableStores,
  searchQuery,
  hideZeroSales,
  selectedStore,
}: UseSalesDataProps) {
  return useMemo(() => {
    const stores = availableStores && availableStores.length > 0 ? availableStores : ["メイン店舗"];

    // 1. Sort staff profiles and extract unique names
    const sortedProfiles = [...staffProfiles].sort((a, b) => {
      const orderA = a.sort_order ?? 999;
      const orderB = b.sort_order ?? 999;
      if (orderA !== orderB) return orderA - orderB;
      return a.name.localeCompare(b.name, "ja");
    });

    const staffNames = sortedProfiles.map((p) => p.name);
    const salesStaffNames = Array.from(new Set(sales.map((s) => s.staff_name)));
    salesStaffNames.forEach((name) => {
      if (!name) return;
      const normalizedName = normalizeName(name);
      const alreadyExists = staffNames.some(
        (existingName) => normalizeName(existingName) === normalizedName
      );
      if (!alreadyExists) {
        staffNames.push(name);
      }
    });

    // 2. Generate unified totals to ensure no discrepancies
    let companyTotal = 0;
    let companyTech = 0;
    let companyProduct = 0;
    let companyDiscount = 0;

    const storeMetrics: Record<string, { total: number; tech: number; product: number; discount: number }> = {};
    stores.forEach(store => {
      storeMetrics[store] = { total: 0, tech: 0, product: 0, discount: 0 };
    });

    // We calculate StaffSalesDataList while aggregating global totals
    const staffSalesDataList: StaffSalesData[] = staffNames.map((staffName) => {
      const staffSales = sales.filter((s) => normalizeName(s.staff_name) === normalizeName(staffName));
      const storeSales: Record<string, StoreSalesData> = {};
      
      let staffTotalTech = 0;
      let staffTotalProduct = 0;
      let staffTotalDiscount = 0;
      let staffTotalSales = 0;

      // Group by reservation to calculate visits
      const getVisitId = (s: SalesRecord) => s.source_reservation_id || `${s.customer_name}_${s.date}_${s.time}`;
      
      const staffVisitIds = new Set(staffSales.map(getVisitId));
      const staffVisits = staffVisitIds.size;

      stores.forEach((store) => {
        const storeNameToIdMap: Record<string, string> = {
          "Jasmine Lash 六甲店": "MXynEaKUTyUvERaaLEFJ",
          "Jasmine Lash 六甲道": "MXynEaKUTyUvERaaLEFJ",
          "Jasmine Lash 神戸店": "3HeFmaWpi3knEpIDX8o3",
          "Jasmine Lash 神戸": "3HeFmaWpi3knEpIDX8o3",
          "BROW GYM 元町店": "x2ebzlDkPYdbLXaNSwsD",
          "BROW GYM 元町": "x2ebzlDkPYdbLXaNSwsD",
          "Lefite 岡本": "YwGWhymuR3fwRXiSJmh1",
          "Salon表参道店": "demo-store-1",
          "Salon渋谷店": "demo-store-2",
          "Salon難波店": "demo-store-3",
          "Salon梅田店": "demo-store-4",
          "Lefite": "jH2BKR5pNo8df7U4KfDA"
        };
        const targetStoreId = storeNameToIdMap[store] || store;
        const storeRecords = staffSales.filter((s) => {
          if (s.store_id) return s.store_id === targetStoreId;
          const { getNormalizedStoreName } = require("@/lib/store-utils");
          return getNormalizedStoreName(s.store_name || "") === getNormalizedStoreName(store);
        });
        const storeVisitIds = new Set(storeRecords.map(getVisitId));
        
        const sTech = storeRecords.reduce((sum, s) => sum + (s.tech_sales || 0), 0);
        const sProduct = storeRecords.reduce((sum, s) => sum + (s.product_sales || 0), 0);
        const sDiscount = storeRecords.reduce((sum, s) => sum + (s.discount || 0), 0);
        const sNomination = storeRecords.reduce((sum, s) => sum + (s.nomination_fee || 0), 0);
        const sTotal = sTech + sProduct + sNomination - sDiscount;

        storeSales[store] = { 
          total: sTotal, 
          tech: sTech, 
          product: sProduct, 
          discount: sDiscount,
          visits: storeVisitIds.size
        };
        
        // Add to global store metrics
        if (storeMetrics[store]) {
          storeMetrics[store].total += sTotal;
          storeMetrics[store].tech += sTech;
          storeMetrics[store].product += sProduct;
          storeMetrics[store].discount += sDiscount;
        }
      });

      // Calculate staff totals based on the same records to avoid mismatch
      staffTotalTech = staffSales.reduce((sum, s) => sum + (s.tech_sales || 0), 0);
      staffTotalProduct = staffSales.reduce((sum, s) => sum + (s.product_sales || 0), 0);
      staffTotalDiscount = staffSales.reduce((sum, s) => sum + (s.discount || 0), 0);
      const staffNomination = staffSales.reduce((sum, s) => sum + (s.nomination_fee || 0), 0);
      staffTotalSales = staffTotalTech + staffTotalProduct + staffNomination - staffTotalDiscount;

      // Add to global company metrics
      companyTotal += staffTotalSales;
      companyTech += staffTotalTech;
      companyProduct += staffTotalProduct;
      companyDiscount += staffTotalDiscount;

      // Find staffId
      const staffProfile = staffProfiles.find((p) => normalizeName(p.name) === normalizeName(staffName));
      const staffId = staffProfile ? staffProfile.id : staffName;

      // Find goal
      const staffGoals = goals.filter((g) => g.staffId === staffId || normalizeName(g.staffName) === normalizeName(staffName));
      const goal = staffGoals.reduce((sum, g) => sum + (g.revenue || 0), 0) || undefined;

      return {
        id: staffId,
        name: staffName,
        storeSales,
        totalSales: staffTotalSales,
        totalTech: staffTotalTech,
        totalProduct: staffTotalProduct,
        totalDiscount: staffTotalDiscount,
        goal,
        visits: staffVisits,
        techAvg: staffVisits > 0 ? Math.round(staffTotalTech / staffVisits) : 0,
        totalAvg: staffVisits > 0 ? Math.round(staffTotalSales / staffVisits) : 0,
      };
    });

    // 3. Apply view filters to Staff Data
    let displayStaffData = staffSalesDataList;
    if (hideZeroSales) {
      displayStaffData = displayStaffData.filter((d) => d.totalSales > 0);
    }
    if (selectedStore !== "all") {
      displayStaffData = displayStaffData.filter((d) => (d.storeSales[selectedStore]?.total || 0) > 0);
    }
    if (searchQuery) {
      const keywords = searchQuery.toLowerCase().split(/\s+/).filter((k) => k.length > 0);
      displayStaffData = displayStaffData.filter((d) => {
        return keywords.every(
          (keyword) =>
            d.name.toLowerCase().includes(keyword) ||
            (selectedStore !== "all" ? selectedStore.toLowerCase().includes(keyword) : false)
        );
      });
    }

    // 4. Generate Summary Data for Cards & Bottom Bar
    // 前月比を正しく出すため、今月の「最新の日付」と同じ日付までで前月データも絞り込む
    const maxDateStr = sales.reduce((max, s) => s.date > max ? s.date : max, "");
    const maxDay = maxDateStr ? parseInt(maxDateStr.split("-")[2], 10) : 31;
    
    const comparablePrevMonthSales = prevMonthSales.filter(s => {
      const day = parseInt(s.date.split("-")[2] || "31", 10);
      return day <= maxDay;
    });

    const prevMonthTotal = comparablePrevMonthSales.reduce(
      (sum, s) => sum + s.tech_sales + s.product_sales + (s.nomination_fee || 0) - (s.discount || 0),
      0
    );

    const summaryData: SalesSummaryData[] = [
      {
        name: "全店舗",
        total: companyTotal,
        tech: companyTech,
        product: companyProduct,
        discount: companyDiscount,
        prevMonthTotal,
      },
      ...stores.map((store) => {
        const storeNameToIdMap: Record<string, string> = {
          "Jasmine Lash 六甲店": "MXynEaKUTyUvERaaLEFJ",
          "Jasmine Lash 六甲道": "MXynEaKUTyUvERaaLEFJ",
          "Jasmine Lash 神戸店": "3HeFmaWpi3knEpIDX8o3",
          "Jasmine Lash 神戸": "3HeFmaWpi3knEpIDX8o3",
          "BROW GYM 元町店": "x2ebzlDkPYdbLXaNSwsD",
          "BROW GYM 元町": "x2ebzlDkPYdbLXaNSwsD",
          "Lefite 岡本": "YwGWhymuR3fwRXiSJmh1",
          "Salon表参道店": "demo-store-1",
          "Salon渋谷店": "demo-store-2",
          "Salon難波店": "demo-store-3",
          "Salon梅田店": "demo-store-4",
          "Lefite": "jH2BKR5pNo8df7U4KfDA"
        };
        const targetStoreId = storeNameToIdMap[store] || store;
        const prevStoreSales = comparablePrevMonthSales.filter((s) => {
          if (s.store_id) return s.store_id === targetStoreId;
          const { getNormalizedStoreName } = require("@/lib/store-utils");
          return getNormalizedStoreName(s.store_name || "") === getNormalizedStoreName(store);
        });
        const prevStoreTotal = prevStoreSales.reduce(
          (sum, s) => sum + s.tech_sales + s.product_sales + (s.nomination_fee || 0) - (s.discount || 0),
          0
        );
        return {
          name: `${store}店`,
          total: storeMetrics[store].total,
          tech: storeMetrics[store].tech,
          product: storeMetrics[store].product,
          discount: storeMetrics[store].discount,
          prevMonthTotal: prevStoreTotal,
        };
      }),
    ];

    const displaySummaryData = selectedStore === "all"
      ? summaryData
      : summaryData.filter((d) => d.name === `${selectedStore}店`);

    return {
      stores,
      staffNames,
      displayStaffData,
      summaryData,
      displaySummaryData,
      companyTotal,
      companyTech,
      companyProduct,
      companyDiscount
    };
  }, [sales, prevMonthSales, staffProfiles, goals, availableStores, searchQuery, hideZeroSales, selectedStore]);
}
