"use server";

import { db } from "@/lib/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import { getCurrentUserContext } from "@/lib/auth-server";

export interface AreaStats {
  areaName: string;
  customersCount: number;
  totalSales: number;
  totalVisits: number;
  avgSpend: number;
  repeatRate: number; // percentage
  repeaterCount: number;
  channels: Record<string, number>;
}

// Simple parser to extract area name (e.g., "神戸市中央区") from a full address
function extractAreaName(address: string | undefined): string {
  if (!address) return "住所未登録";
  
  // Remove spaces
  const cleanAddr = address.replace(/\s/g, "");
  
  // Very simplified extraction for Phase 1:
  // Match Prefecture (optional) + City/Ward
  // Example matches: "兵庫県神戸市中央区", "東京都渋谷区", "大阪府大阪市北区", "横浜市西区"
  const match = cleanAddr.match(/^(?:.+?[都道府県])?(.+?[市区町村])/);
  
  if (match && match[1]) {
    // If it's a designated city with a ward, try to get the ward too
    const cityMatch = cleanAddr.match(/^(?:.+?[都道府県])?(.+?市.+?区)/);
    if (cityMatch && cityMatch[1]) {
      return cityMatch[1];
    }
    return match[1];
  }
  
  return "その他エリア";
}

// Map various referral sources into standard buckets
function standardizeChannel(source: string): string {
  const s = source.toLowerCase();
  if (s.includes("hotpepper") || s.includes("ホットペッパー") || s.includes("hpb")) return "ホットペッパー";
  if (s.includes("instagram") || s.includes("インスタ")) return "Instagram";
  if (s.includes("tiktok")) return "TikTok";
  if (s.includes("google") || s.includes("マップ")) return "Google";
  if (s.includes("紹介") || s.includes("referral")) return "紹介";
  if (s.includes("通りがかり") || s.includes("看板") || s.includes("walk-in")) return "通りがかり";
  return "その他";
}

export async function getTradeAreaStats() {
  try {
    const ctx = await getCurrentUserContext();
    const isInHouse = !ctx.companyId || ctx.companyId === "company_default" || ctx.role === "systemOwner";
    
    // Fetch Customers
    const customersCol = collection(db, "customers");
    const customersSnap = await getDocs(customersCol);
    
    // Fetch Sales
    const salesCol = collection(db, "sales");
    // Ideally we should filter by companyId/store, but using memory filter for now to avoid missing index errors
    const salesSnap = await getDocs(salesCol);
    
    const customerSales: Record<string, { sales: number; visits: number }> = {};
    
    salesSnap.forEach(doc => {
      const data = doc.data();
      const store = data.store_name || (data as any).main_store;
      
      // Filter permissions
      if (!isInHouse) {
        if (!ctx.salonIds?.includes(store) && store !== ctx.salonIds?.[0]) {
          return;
        }
      }

      const cid = data.customerId;
      if (!cid) return;
      
      const amount = (data.tech_sales || 0) + (data.product_sales || 0) - (data.discount || 0);
      
      if (!customerSales[cid]) {
        customerSales[cid] = { sales: 0, visits: 0 };
      }
      customerSales[cid].sales += amount;
      if (data.tech_sales > 0) {
        customerSales[cid].visits++; // Only count actual technical visits
      }
    });

    const areaMap: Record<string, AreaStats> = {};

    customersSnap.forEach(doc => {
      const data = doc.data();
      const store = data.store_name || (data as any).main_store;
      
      if (!isInHouse) {
        if (!ctx.salonIds?.includes(store) && store !== ctx.salonIds?.[0]) {
          return;
        }
      }

      const cid = doc.id;
      const areaName = extractAreaName(data.address);
      
      if (!areaMap[areaName]) {
        areaMap[areaName] = {
          areaName,
          customersCount: 0,
          totalSales: 0,
          totalVisits: 0,
          avgSpend: 0,
          repeatRate: 0,
          repeaterCount: 0,
          channels: {}
        };
      }
      
      const stats = areaMap[areaName];
      stats.customersCount++;
      
      // Map channels
      const sources: string[] = data.referral_source || [];
      if (sources.length === 0) {
        stats.channels["その他"] = (stats.channels["その他"] || 0) + 1;
      } else {
        sources.forEach(src => {
          const standard = standardizeChannel(src);
          stats.channels[standard] = (stats.channels[standard] || 0) + 1;
        });
      }
      
      // Add sales data if available
      const sData = customerSales[cid];
      if (sData) {
        stats.totalSales += sData.sales;
        stats.totalVisits += sData.visits;
        if (sData.visits > 1) {
          stats.repeaterCount++;
        }
      }
    });

    // Calculate final metrics
    const result = Object.values(areaMap).map(stats => {
      stats.avgSpend = stats.totalVisits > 0 ? Math.round(stats.totalSales / stats.totalVisits) : 0;
      stats.repeatRate = stats.customersCount > 0 ? Math.round((stats.repeaterCount / stats.customersCount) * 100) : 0;
      return stats;
    });

    // Sort by number of customers descending
    result.sort((a, b) => b.customersCount - a.customersCount);

    return { success: true, data: result };

  } catch (error: any) {
    console.error("Trade Area Stats Error:", error);
    return { success: false, error: error.message };
  }
}
