
export interface MenuItem {
  id: string;
  name: string;
  costPercent: number; // 메뉴 개별 원가율 (%) - 현재는 전체 적용 위주
}

export interface PlatformConfig {
  id: string;
  name: string;
  feePercent: number; // 중개 수수료 (%)
  adjustmentPercent: number; // 조정 수수료 (%)
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
  type: 'fixed' | 'percent'; // 고정비(fixed) 또는 매출대비%(percent)
  value: number; // 금액(원) 또는 비율(%)
}
