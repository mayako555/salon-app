export type InventoryItem = {
  id: string;
  name: string;
  category: "material" | "product" | "consumable";
  subCategory?: string;
  currentStock: number;
  threshold: number;
  unit?: string;
  storeName: string;
  lastUpdated: any;
  vendor?: string;
  costPrice?: number;
  price?: number;
};

export type InventoryLog = {
  id: string;
  itemId: string;
  itemName: string;
  count: number;
  type: "sale" | "usage" | "restock" | "disposal" | "order_request";
  staffName: string;
  date: any;
  storeName: string;
};

export type InventoryOrder = {
  id: string;
  itemId: string;
  itemName: string;
  count: number;
  staffName: string;
  status: "pending" | "ordered" | "received" | "cancelled";
  createdAt: any;
  storeName: string;
};
