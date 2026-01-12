
export interface MenuItem {
  id: string;
  name: string;
  costPercent: number;
}

export interface PlatformConfig {
  id: string;
  name: string;
  feePercent: number;
  adjustmentPercent: number;
}

export interface SaleRecord {
  id: string;
  date: string;
  platformId: string;
  menuId: string;
  quantity: number;
  totalPrice: number;
  settlementAmount: number;
  netProfit: number;
}

export interface ExpenseItem {
  id: string;
  name: string;
  type: 'fixed' | 'percent';
  value: number;
}

export interface DailyMemo {
  date: string; // YYYY-MM-DD
  content: string;
}
