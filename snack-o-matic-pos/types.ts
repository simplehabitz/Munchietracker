export enum PaymentMethod {
  CASH = 'CASH',
  VENMO = 'VENMO',
  CASHAPP = 'CASHAPP'
}

export enum OrderStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  CANCELED = 'CANCELED'
}

export interface SnackOption {
  name: string;
  stock: number;
}

export interface SnackItem {
  id: string;
  name: string;
  price: number;
  color: string;
  icon: string;
  stock: number;
  options?: SnackOption[];
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
  status: OrderStatus;
  customerName?: string;
  customerPhone?: string;
  pickupDate?: string;
}

export interface AppState {
  salesHistory: SaleRecord[];
  inventory: SnackItem[];
}