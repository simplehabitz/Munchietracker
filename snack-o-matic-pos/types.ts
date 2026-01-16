
export interface SnackItem {
  id: string;
  name: string;
  price: number;
  color: string;
}

export interface Sale {
  id?: string;
  created_at?: string;
  items: string; // JSON stringified array of item names
  total: number;
  payment_method: 'Cash' | 'Venmo' | 'CashApp';
}

export type PaymentMethod = 'Cash' | 'Venmo' | 'CashApp';
