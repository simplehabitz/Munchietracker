
export enum PaymentMethod {
  CASH = 'CASH',
  VENMO = 'VENMO',
  CASHAPP = 'CASHAPP'
}

export interface SnackItem {
  id: string;
  name: string;
  price: number;
  color: string;
  icon: string;
  stock: number;
  options?: string[];
}

export interface OrderItem extends SnackItem {
  quantity: number;
  selectedOption?: string;
}

export interface SaleRecord {
  id: string;
  timestamp: number;
  items: OrderItem[];
  total: number;
  method: PaymentMethod;
}

export interface AppState {
  salesHistory: SaleRecord[];
  inventory: SnackItem[];
}
