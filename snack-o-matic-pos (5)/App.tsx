import React, { useState, useEffect, useMemo } from 'react';
import ReactDOM from 'react-dom/client';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { 
  Trash2, History, ShoppingCart, DollarSign, Wallet, Smartphone, Package,
  X, PlusSquare, Palette, Tag, Cloud, CloudOff, CloudCheck, TrendingUp,
  Lock, Delete, LogOut, Database, ArrowUpCircle, Plus, Minus, Flame, CreditCard,
  Layers, Settings2
} from 'lucide-react';

// --- TYPES ---
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

// --- CONSTANTS ---
const APP_PIN = "1234";
const STORAGE_KEY = 'snack_pos_simple_v1';
const COLOR_OPTIONS = [
  'bg-orange-500', 'bg-blue-500', 'bg-cyan-400', 'bg-rose-500', 
  'bg-emerald-500', 'bg-purple-500', 'bg-amber-500', 'bg-pink-500',
  'bg-indigo-500', 'bg-slate-600'
];
const INVENTORY_DEFAULTS: SnackItem[] = [
  { id: 'munchie-bags', name: 'Munchie Bags', price: 5, color: 'bg-orange-500', icon: '🛍️', stock: 20 },
  { id: 'chips', name: 'Chips', price: 2, color: 'bg-blue-500', icon: '🍟', options: ['Hot Cheetos lime', 'Hot Cheetos', 'Hot Funyuns', 'Hot Doritos', 'Hot Fritos'], stock: 24 },
  { id: 'rice-krispies', name: 'Rice Krispies', price: 1, color: 'bg-cyan-400', icon: '🥣', stock: 30 },
  { id: 'fruit-foot', name: 'Fruit by Foot', price: 1, color: 'bg-rose-500', icon: '🍬', stock: 30 }
];

// --- COMPONENTS ---
interface SnackButtonProps {
  item: SnackItem;
  onAdd?: (item: SnackItem) => void;
  isManagementMode: boolean;
  onAdjustStock?: (id: string, delta: number) => void;
  onManageOptions?: (item: SnackItem) => void;
  currentInCart: number;
}

const SnackButton: React.FC<SnackButtonProps> = ({ 
  item, onAdd, isManagementMode, onAdjustStock, onManageOptions, currentInCart 
}) => {
  const isOutOfStock = item.stock <= currentInCart;

  if (isManagementMode) {
    return (
      <div className={`${item.color} rounded-2xl p-4 flex flex-col items-center justify-between space-y-4 shadow-lg border-2 border-white/20`}>
        <div className="flex flex-col items-center relative w-full">
          <span className="text-3xl">{item.icon}</span>
          <span className="font-bold text-[10px] uppercase text-white/80 text-center leading-tight mt-1">{item.name}</span>
          <button onClick={() => onManageOptions?.(item)} className="absolute -top-1 -right-1 p-2 bg-black/40 rounded-full text-white/70 active:scale-90 transition-transform"><Settings2 size={16} /></button>
        </div>
        <div className="flex items-center justify-between w-full bg-black/30 rounded-xl p-2">
          <button onClick={(e) => { e.stopPropagation(); onAdjustStock?.(item.id, -1); }} className="w-8 h-8 rounded-lg bg-black/40 flex items-center justify-center active:scale-90 transition-transform"><Minus size={16} /></button>
          <span className="text-lg font-black">{item.stock}</span>
          <button onClick={(e) => { e.stopPropagation(); onAdjustStock?.(item.id, 1); }} className="w-8 h-8 rounded-lg bg-black/40 flex items-center justify-center active:scale-90 transition-transform"><Plus size={16} /></button>
        </div>
      </div>
    );
  }

  return (
    <button disabled={isOutOfStock} onClick={() => onAdd?.(item)} className={`${item.color} ${isOutOfStock ? 'opacity-40 grayscale' : 'active:scale-95'} relative transition-all duration-75 rounded-2xl p-6 flex flex-col items-center justify-center space-y-2 shadow-lg shadow-black/20 border-b-4 border-black/20 overflow-hidden min-h-[160px]`}>
      <div className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-tighter ${item.stock < 5 ? 'bg-red-500 animate-pulse' : 'bg-black/40'}`}>{item.stock} left</div>
      {item.options && item.options.length > 0 && (<div className="absolute top-2 left-2 p-1.5 bg-white/20 rounded-lg backdrop-blur-sm"><Layers size={14} className="text-white" /></div>)}
      <span className="text-5xl">{item.icon}</span>
      <span className="font-black text-lg uppercase tracking-tight text-white leading-tight">{item.name}</span>
      {isOutOfStock ? <span className="bg-red-600 px-3 py-1 rounded-full text-xs font-black text-white">SOLD OUT</span> : <span className="bg-black/20 px-3 py-1 rounded-full text-sm font-extrabold text-white">${item.price}</span>}
      {item.options && item.options.length > 0 && !isOutOfStock && (<span className="text-[8px] font-black uppercase text-white/50 tracking-widest mt-1">Tap for flavors</span>)}
    </button>
  );
};

// --- MAIN APP ---
const App: React.FC = () => {
  const [inventory, setInventory] = useState<SnackItem[]>(INVENTORY_DEFAULTS);
  const [currentOrder, setCurrentOrder] = useState<OrderItem[]>([]);
  const [salesHistory, setSalesHistory] = useState<SaleRecord[]>([]);
  const [isEditMode, setIsEditMode] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showCloudConfig, setShowCloudConfig] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'error' | 'success'>('idle');
  const [sbClient, setSbClient] = useState<SupabaseClient | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [enteredPin, setEnteredPin] = useState("");
  const [loginError, setLoginError] = useState(false);
  const [activeItemWithOptions, setActiveItemWithOptions] = useState<SnackItem | null>(null);
  const [editingOptionsItem, setEditingOptionsItem] = useState<SnackItem | null>(null);
  const [newOptionText, setNewOptionText] = useState("");
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [newItem, setNewItem] = useState({ name: '', price: 0, icon: '📦', color: COLOR_OPTIONS[0], stock: 0 });

  useEffect(() => {
    const env = (import.meta as any).env;
    const supabaseUrl = env?.VITE_SUPABASE_URL;
    const supabaseKey = env?.VITE_SUPABASE_ANON_KEY;

    if (supabaseUrl && supabaseKey) {
      try {
        const client = createClient(supabaseUrl, supabaseKey);
        setSbClient(client);
      } catch (err) { console.error(err); }
    }

    const savedLocal = localStorage.getItem(STORAGE_KEY);
    if (savedLocal) {
      try {
        const parsed = JSON.parse(savedLocal);
        if (parsed.inventory) setInventory(parsed.inventory);
        if (parsed.salesHistory) setSalesHistory(parsed.salesHistory);
      } catch (e) { console.error(e); }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ salesHistory, inventory }));
  }, [salesHistory, inventory]);

  const handlePinInput = (num: string) => {
    const newPin = enteredPin + num;
    if (newPin.length > 4) return;
    setEnteredPin(newPin);
    setLoginError(false);
    if (newPin.length === 4) {
      if (newPin === APP_PIN) { setIsAuthenticated(true); setEnteredPin(""); }
      else { setLoginError(true); setTimeout(() => setEnteredPin(""), 500); }
    }
  };

  const addToOrder = (item: SnackItem, option?: string) => {
    if (item.options && item.options.length > 0 && !option && !isEditMode) {
      setActiveItemWithOptions(item);
      return;
    }
    const currentQtyInCart = currentOrder.filter(i => i.id === item.id).reduce((acc, i) => acc + i.quantity, 0);
    const stockAvailable = inventory.find(i => i.id === item.id)?.stock || 0;
    if (currentQtyInCart >= stockAvailable) return;

    setCurrentOrder(prev => {
      const existing = prev.find(i => i.id === item.id && i.selectedOption === option);
      if (existing) return prev.map(i => (i.id === item.id && i.selectedOption === option) ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { ...item, quantity: 1, selectedOption: option }];
    });
    setActiveItemWithOptions(null);
  };

  const removeFromOrder = (id: string, option?: string) => {
    setCurrentOrder(prev => {
      const existing = prev.find(i => i.id === id && i.selectedOption === option);
      if (existing && existing.quantity > 1) return prev.map(i => (i.id === id && i.selectedOption === option) ? { ...i, quantity: i.quantity - 1 } : i);
      return prev.filter(i => !(i.id === id && i.selectedOption === option));
    });
  };

  const adjustStock = async (id: string, delta: number) => {
    const item = inventory.find(i => i.id === id);
    if (!item) return;
    const newStock = Math.max(0, item.stock + delta);
    setInventory(prev => prev.map(i => i.id === id ? { ...i, stock: newStock } : i));
  };

  const handleCheckout = async (method: PaymentMethod) => {
    if (currentOrder.length === 0) return;
    const orderTotal = currentOrder.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    const tempId = Math.random().toString(36).substr(2, 9);
    const newSale: SaleRecord = { id: tempId, timestamp: Date.now(), items: [...currentOrder], total: orderTotal, method };
    
    setSalesHistory(prev => [newSale, ...prev]);
    const itemsSnapshot = [...currentOrder];
    setCurrentOrder([]);

    // Update local stock immediately
    for (const item of itemsSnapshot) {
      setInventory(prev => prev.map(inv => inv.id === item.id ? { ...inv, stock: Math.max(0, inv.stock - item.quantity) } : inv));
    }
    
    // Cloud sync would go here
    if (sbClient) {
       // Silent sync logic
       sbClient.from('sales').insert([{ items: newSale.items, total: newSale.total, method: newSale.method }]).then();
       itemsSnapshot.forEach(item => {
         const invItem = inventory.find(i => i.id === item.id);
         if(invItem) sbClient.from('inventory').update({ stock: Math.max(0, invItem.stock - item.quantity) }).eq('id', item.id).then();
       });
    }
  };

  const totalEarnedToday = useMemo(() => salesHistory.reduce((acc, sale) => acc + sale.total, 0), [salesHistory]);
  const orderTotal = useMemo(() => currentOrder.reduce((acc, item) => acc + (item.price * item.quantity), 0), [currentOrder]);

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col h-screen bg-slate-950 items-center justify-center p-6">
        <div className="text-center space-y-4 mb-8">
           <div className="inline-flex p-5 bg-slate-900 rounded-[32px] border border-slate-800"><Lock className="text-blue-500" size={48} /></div>
           <h1 className="text-3xl font-black text-white">Munchie POS</h1>
        </div>
        <div className="grid grid-cols-3 gap-4 w-full max-w-xs">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '<'].map(key => (
            <button key={key} onClick={() => key === 'C' ? setEnteredPin("") : key === '<' ? setEnteredPin(p => p.slice(0, -1)) : handlePinInput(key)} className="h-20 rounded-3xl text-2xl font-black bg-slate-900 text-white shadow-xl border border-slate-800/50 active:bg-slate-800">{key === '<' ? <Delete className="mx-auto" size={28} /> : key}</button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen max-h-screen bg-slate-950 overflow-hidden">
      <header className="bg-slate-900 border-b border-slate-800 p-4 sticky top-0 z-20">
        <div className="max-w-lg mx-auto flex justify-between items-center w-full">
           <div><h1 className="text-slate-500 text-[10px] font-black uppercase">Earnings</h1><p className="text-3xl font-black text-green-400">${totalEarnedToday.toFixed(2)}</p></div>
           <div className="flex gap-2">
             <button onClick={() => setIsEditMode(!isEditMode)} className={`p-3 rounded-2xl ${isEditMode ? 'bg-cyan-500 text-white' : 'bg-slate-800 text-slate-400'}`}><Package size={24} /></button>
             <button onClick={() => setIsAuthenticated(false)} className="p-3 rounded-2xl bg-slate-800 text-slate-400"><LogOut size={24} /></button>
           </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto no-scrollbar pb-48 p-4">
         <div className="max-w-lg mx-auto grid grid-cols-2 gap-4">
            {inventory.map(item => (
              <SnackButton key={item.id} item={item} onAdd={(it) => addToOrder(it)} isManagementMode={isEditMode} onAdjustStock={adjustStock} onManageOptions={(it) => setEditingOptionsItem(it)} currentInCart={currentOrder.filter(i => i.id === item.id).reduce((acc, i) => acc + i.quantity, 0)} />
            ))}
         </div>
         {/* Cart Section */}
         {!isEditMode && currentOrder.length > 0 && (
            <section className="bg-slate-900/50 rounded-3xl p-6 border border-slate-800 mt-6 max-w-lg mx-auto">
              <h2 className="text-xl font-black flex items-center gap-2 mb-4 text-white"><ShoppingCart size={20} /> Basket</h2>
              <ul className="space-y-3">
                {currentOrder.map((item, idx) => (
                  <li key={`${item.id}-${idx}`} className="flex items-center justify-between bg-slate-800/50 p-3 rounded-2xl text-white">
                    <div className="flex items-center gap-3"><span>{item.icon}</span><p className="font-bold text-sm">{item.name}</p></div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => removeFromOrder(item.id, item.selectedOption)} className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center"><Minus size={14}/></button>
                      <span className="font-black w-6 text-center">{item.quantity}</span>
                      <button onClick={() => addToOrder(item, item.selectedOption)} className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center"><Plus size={14}/></button>
                    </div>
                  </li>
                ))}
              </ul>
              <div className="mt-6 pt-6 border-t border-slate-800 text-center"><span className="text-4xl font-black text-white">${orderTotal.toFixed(2)}</span></div>
            </section>
         )}
      </main>

      {!isEditMode && currentOrder.length > 0 && (
        <footer className="fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-800 p-4 z-30 pb-10">
          <div className="max-w-lg mx-auto grid grid-cols-3 gap-3">
            <button onClick={() => handleCheckout(PaymentMethod.CASH)} className="flex flex-col items-center justify-center p-5 bg-emerald-600 rounded-[32px] shadow-xl"><DollarSign size={28} className="text-white" /><span className="text-[10px] font-black uppercase text-white mt-1">Cash</span></button>
            <button onClick={() => handleCheckout(PaymentMethod.VENMO)} className="flex flex-col items-center justify-center p-5 bg-blue-600 rounded-[32px] shadow-xl"><Wallet size={28} className="text-white" /><span className="text-[10px] font-black uppercase text-white mt-1">Venmo</span></button>
            <button onClick={() => handleCheckout(PaymentMethod.CASHAPP)} className="flex flex-col items-center justify-center p-5 bg-purple-600 rounded-[32px] shadow-xl"><Smartphone size={28} className="text-white" /><span className="text-[10px] font-black uppercase text-white mt-1">App</span></button>
          </div>
        </footer>
      )}
    </div>
  );
};

export default App;
