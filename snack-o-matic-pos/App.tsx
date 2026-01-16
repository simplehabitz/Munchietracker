import React, { useState, useEffect, useMemo } from 'react';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { INVENTORY_DEFAULTS, STORAGE_KEY } from './constants';
import { SnackItem, OrderItem, SaleRecord, PaymentMethod, OrderStatus, SnackOption } from './types';
import { SnackButton } from './SnackButton';
import { 
  Trash2, 
  History, 
  ShoppingCart, 
  DollarSign, 
  Wallet, 
  Smartphone, 
  Package,
  X,
  PlusSquare,
  Palette,
  Tag,
  Cloud,
  CloudOff,
  CloudCheck,
  TrendingUp,
  Lock,
  Delete,
  LogOut,
  Plus,
  Minus,
  Flame,
  CreditCard,
  Target,
  Trophy,
  Rocket,
  User,
  Phone,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  Store,
  CalendarDays
} from 'lucide-react';

const APP_PIN = "3309";

const COLOR_OPTIONS = [
  'bg-orange-500', 'bg-blue-500', 'bg-cyan-400', 'bg-rose-500', 
  'bg-emerald-500', 'bg-purple-500', 'bg-amber-500', 'bg-pink-500',
  'bg-indigo-500', 'bg-slate-600'
];

interface SaleGoal {
  name: string;
  target: number;
  icon: React.ReactNode;
  category: 'Daily' | 'Epic';
}

const MISSIONS: SaleGoal[] = [
  { name: "Daily Lunch Fund", target: 15, icon: <Flame className="text-orange-500" />, category: 'Daily' },
  { name: "Friday Night Out", target: 60, icon: <Rocket className="text-purple-500" />, category: 'Epic' },
  { name: "New Tech Upgrade", target: 250, icon: <Smartphone className="text-blue-500" />, category: 'Epic' },
  { name: "The Dream Car Fund", target: 2000, icon: <Trophy className="text-yellow-500" />, category: 'Epic' }
];

type ViewState = 'LANDING' | 'STOREFRONT' | 'LOGIN' | 'ADMIN';

// Helper to determine available school days (Mon-Fri)
const getAvailableSchoolDays = (count: number = 7) => {
  const days: Date[] = [];
  const d = new Date();
  
  // School typically ends at 3:30 PM (15:30)
  const schoolEndsHour = 15;
  const schoolEndsMinute = 30;
  const nowHour = d.getHours();
  const nowMinute = d.getMinutes();

  // If it's already past school hours today, start looking from tomorrow
  if (nowHour > schoolEndsHour || (nowHour === schoolEndsHour && nowMinute >= schoolEndsMinute)) {
    d.setDate(d.getDate() + 1);
  }

  while (days.length < count) {
    const dayOfWeek = d.getDay();
    // 1 (Mon) to 5 (Fri)
    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
      days.push(new Date(d));
    }
    d.setDate(d.getDate() + 1);
  }
  return days;
};

const formatDateForInput = (date: Date) => date.toISOString().split('T')[0];
const formatDateForDisplay = (dateStr: string) => {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
};

const App: React.FC = () => {
  const schoolDaysList = useMemo(() => getAvailableSchoolDays(), []);
  
  const [view, setView] = useState<ViewState>('LANDING');
  const [inventory, setInventory] = useState<SnackItem[]>(INVENTORY_DEFAULTS);
  const [currentOrder, setCurrentOrder] = useState<OrderItem[]>([]);
  const [salesHistory, setSalesHistory] = useState<SaleRecord[]>([]);
  const [isEditMode, setIsEditMode] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showMissions, setShowMissions] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'error' | 'success'>('idle');
  
  const [sbClient, setSbClient] = useState<SupabaseClient | null>(null);
  const [enteredPin, setEnteredPin] = useState("");
  const [loginError, setLoginError] = useState(false);

  const [activeItemWithOptions, setActiveItemWithOptions] = useState<SnackItem | null>(null);
  const [editingOptionsItem, setEditingOptionsItem] = useState<SnackItem | null>(null);
  const [newOptionText, setNewOptionText] = useState("");
  const [newOptionStock, setNewOptionStock] = useState(10);

  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [customerInfo, setCustomerInfo] = useState({ 
    name: '', 
    phone: '', 
    method: PaymentMethod.CASH,
    pickupDate: formatDateForInput(schoolDaysList[0]) 
  });

  const [newItem, setNewItem] = useState({
    name: '',
    price: 0,
    icon: '📦',
    color: COLOR_OPTIONS[0],
    stock: 0
  });

  // Initialize Supabase
  useEffect(() => {
    try {
      const env = (import.meta as any).env;
      const supabaseUrl = env?.VITE_SUPABASE_URL || 'https://kklwhdaabjgzkktrqopc.supabase.co';
      const supabaseKey = env?.VITE_SUPABASE_ANON_KEY || 'sb_publishable__dUkU2yRj8V5pLuldn2qxA_cTsRAw0L';

      if (supabaseUrl && supabaseKey) {
        const client = createClient(supabaseUrl, supabaseKey);
        setSbClient(client);
      }
    } catch (err) {
      console.error("Supabase init error:", err);
    }

    const savedLocal = localStorage.getItem(STORAGE_KEY);
    if (savedLocal) {
      try {
        const parsed = JSON.parse(savedLocal);
        if (parsed.inventory) setInventory(parsed.inventory);
        if (parsed.salesHistory) setSalesHistory(parsed.salesHistory);
      } catch (e) { console.error("Local parse error:", e); }
    }
  }, []);

  // Sync Logic
  useEffect(() => {
    if (!sbClient) return;

    const syncWithCloud = async () => {
      setSyncStatus('syncing');
      try {
        const { data: invData } = await sbClient.from('inventory').select('*');
        const { data: salesData } = await sbClient.from('sales').select('*').order('timestamp', { ascending: false });

        if (invData && invData.length > 0) setInventory(invData);
        if (salesData) setSalesHistory(salesData.map(s => ({
            ...s,
            timestamp: new Date(s.timestamp).getTime()
        })));
        
        setSyncStatus('success');
      } catch (err) {
        setSyncStatus('error');
      }
    };

    syncWithCloud();

    const channel = sbClient
      .channel('realtime-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory' }, (payload) => {
         setInventory(prev => {
           const updated = payload.new as SnackItem;
           if (payload.eventType === 'INSERT') return [...prev, updated];
           if (payload.eventType === 'UPDATE') return prev.map(i => i.id === updated.id ? updated : i);
           if (payload.eventType === 'DELETE') return prev.filter(i => i.id !== (payload.old as any).id);
           return prev;
         });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sales' }, (payload) => {
         const sale = { ...payload.new, timestamp: new Date(payload.new?.timestamp || Date.now()).getTime() } as SaleRecord;
         setSalesHistory(prev => {
           if (payload.eventType === 'INSERT') return [sale, ...prev];
           if (payload.eventType === 'UPDATE') return prev.map(s => s.id === sale.id ? sale : s);
           if (payload.eventType === 'DELETE') return prev.filter(s => s.id !== (payload.old as any).id);
           return prev;
         });
      })
      .subscribe();

    return () => { sbClient.removeChannel(channel); };
  }, [sbClient]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ salesHistory, inventory }));
  }, [salesHistory, inventory]);

  const handlePinInput = (num: string) => {
    const newPin = enteredPin + num;
    if (newPin.length > 4) return;
    setEnteredPin(newPin);
    setLoginError(false);
    if (newPin.length === 4) {
      if (newPin === APP_PIN) { setView('ADMIN'); setEnteredPin(""); }
      else { setLoginError(true); setTimeout(() => setEnteredPin(""), 500); }
    }
  };

  const addToOrder = (item: SnackItem, optionName?: string) => {
    if (item.options && item.options.length > 0 && !optionName && !isEditMode) {
      setActiveItemWithOptions(item);
      return;
    }

    const currentQtyInCart = currentOrder
      .filter(i => i.id === item.id && (optionName ? i.selectedOption === optionName : true))
      .reduce((acc, i) => acc + i.quantity, 0);

    let stockAvailable = 0;
    if (optionName && item.options) {
      stockAvailable = item.options.find(o => o.name === optionName)?.stock || 0;
    } else {
      stockAvailable = item.stock;
    }

    if (currentQtyInCart >= stockAvailable) return;

    setCurrentOrder(prev => {
      const existing = prev.find(i => i.id === item.id && i.selectedOption === optionName);
      if (existing) return prev.map(i => (i.id === item.id && i.selectedOption === optionName) ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { ...item, quantity: 1, selectedOption: optionName }];
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

  const updateOrderStatus = async (saleId: string, newStatus: OrderStatus) => {
    const sale = salesHistory.find(s => s.id === saleId);
    if (!sale) return;

    setSalesHistory(prev => prev.map(s => s.id === saleId ? { ...s, status: newStatus } : s));

    if (sbClient) {
      await sbClient.from('sales').update({ status: newStatus }).eq('id', saleId);
      
      if (newStatus === OrderStatus.CANCELED) {
        for (const item of sale.items) {
          const invItem = inventory.find(i => i.id === item.id);
          if (invItem) {
            if (item.selectedOption && invItem.options) {
              const updatedOptions = invItem.options.map(opt => 
                opt.name === item.selectedOption ? { ...opt, stock: opt.stock + item.quantity } : opt
              );
              const newTotalStock = updatedOptions.reduce((sum, o) => sum + o.stock, 0);
              setInventory(prev => prev.map(i => i.id === item.id ? { ...i, options: updatedOptions, stock: newTotalStock } : i));
              await sbClient.from('inventory').update({ options: updatedOptions, stock: newTotalStock }).eq('id', item.id);
            } else {
              const newStock = invItem.stock + item.quantity;
              setInventory(prev => prev.map(i => i.id === item.id ? { ...i, stock: newStock } : i));
              await sbClient.from('inventory').update({ stock: newStock }).eq('id', item.id);
            }
          }
        }
      }
    }
  };

  const handleCheckout = async (method: PaymentMethod, isStorefront: boolean) => {
    if (currentOrder.length === 0) return;
    const tempId = Math.random().toString(36).substr(2, 9);
    const newSale: SaleRecord = { 
      id: tempId, 
      timestamp: Date.now(), 
      items: [...currentOrder], 
      total: orderTotal, 
      method,
      status: isStorefront ? OrderStatus.PENDING : OrderStatus.COMPLETED,
      customerName: isStorefront ? customerInfo.name : 'Walk-in',
      customerPhone: isStorefront ? customerInfo.phone : '',
      pickupDate: isStorefront ? customerInfo.pickupDate : formatDateForInput(new Date())
    };

    setSalesHistory(prev => [newSale, ...prev]);
    const itemsSnapshot = [...currentOrder];
    setCurrentOrder([]);
    setShowCheckoutModal(false);
    setCustomerInfo({ 
      name: '', 
      phone: '', 
      method: PaymentMethod.CASH,
      pickupDate: formatDateForInput(schoolDaysList[0])
    });

    if (sbClient) {
      try {
        await sbClient.from('sales').insert([newSale]);
        for (const item of itemsSnapshot) {
          const invItem = inventory.find(i => i.id === item.id);
          if (invItem) {
            if (item.selectedOption && invItem.options) {
               const updatedOptions = invItem.options.map(opt => 
                 opt.name === item.selectedOption ? { ...opt, stock: Math.max(0, opt.stock - item.quantity) } : opt
               );
               const newTotalStock = updatedOptions.reduce((sum, o) => sum + o.stock, 0);
               await sbClient.from('inventory').update({ options: updatedOptions, stock: newTotalStock }).eq('id', item.id);
               setInventory(prev => prev.map(i => i.id === invItem.id ? { ...i, options: updatedOptions, stock: newTotalStock } : i));
            } else {
               const newStock = Math.max(0, invItem.stock - item.quantity);
               await sbClient.from('inventory').update({ stock: newStock }).eq('id', item.id);
               setInventory(prev => prev.map(i => i.id === invItem.id ? { ...i, stock: newStock } : i));
            }
          }
        }
      } catch (err) { console.error("Checkout error:", err); }
    }

    if (isStorefront) {
      alert("Order Placed! Please wait for the host to call you.");
      setView('LANDING');
    }
  };

  const adjustStock = async (id: string, delta: number) => {
    const item = inventory.find(i => i.id === id);
    if (!item) return;
    
    // If item has options, direct adjustment might be disabled or handled differently
    // For now, we allow it for simple items, but if it has options, we should update the modal logic
    const newStock = Math.max(0, item.stock + delta);
    setInventory(prev => prev.map(i => i.id === id ? { ...i, stock: newStock } : i));
    if (sbClient) {
      await sbClient.from('inventory').update({ stock: newStock }).eq('id', id);
    }
  };

  const adjustOptionStock = async (snackId: string, optionName: string, delta: number) => {
    const item = inventory.find(i => i.id === snackId);
    if (!item || !item.options) return;

    const updatedOptions = item.options.map(opt => 
      opt.name === optionName ? { ...opt, stock: Math.max(0, opt.stock + delta) } : opt
    );
    
    // Recalculate aggregate stock
    const newTotalStock = updatedOptions.reduce((sum, o) => sum + o.stock, 0);

    setInventory(prev => prev.map(i => i.id === snackId ? { ...i, options: updatedOptions, stock: newTotalStock } : i));
    if (sbClient) {
      await sbClient.from('inventory').update({ options: updatedOptions, stock: newTotalStock }).eq('id', snackId);
    }
  };

  const handleAddNewItem = async () => {
    if (!newItem.name) return;
    const item: SnackItem = {
      ...newItem,
      id: Math.random().toString(36).substr(2, 9),
      options: []
    };
    
    setInventory(prev => [...prev, item]);
    
    if (sbClient) {
      await sbClient.from('inventory').insert([item]);
    }
    
    setNewItem({
      name: '',
      price: 0,
      icon: '📦',
      color: COLOR_OPTIONS[0],
      stock: 0
    });
  };

  const orderTotal = useMemo(() => currentOrder.reduce((acc, item) => acc + (item.price * item.quantity), 0), [currentOrder]);
  
  const totalEarnedToday = useMemo(() => {
    const startOfDay = new Date().setHours(0, 0, 0, 0);
    return salesHistory
      .filter(sale => sale.timestamp >= startOfDay && sale.status === OrderStatus.COMPLETED)
      .reduce((acc, sale) => acc + sale.total, 0);
  }, [salesHistory]);
  
  const lifetimeEarnings = useMemo(() => salesHistory.filter(s => s.status === OrderStatus.COMPLETED).reduce((acc, sale) => acc + sale.total, 0), [salesHistory]);

  const stats = useMemo(() => {
    const itemCounts: Record<string, {name: string, count: number, icon: string}> = {};
    const methodSplit: Record<string, number> = { [PaymentMethod.CASH]: 0, [PaymentMethod.VENMO]: 0, [PaymentMethod.CASHAPP]: 0 };
    salesHistory.filter(s => s.status === OrderStatus.COMPLETED).forEach(sale => {
      methodSplit[sale.method] += sale.total;
      sale.items.forEach(item => {
        if (!itemCounts[item.id]) itemCounts[item.id] = { name: item.name, count: 0, icon: item.icon };
        itemCounts[item.id].count += item.quantity;
      });
    });
    const topItem = Object.values(itemCounts).sort((a, b) => b.count - a.count)[0];
    return { topItem, methodSplit };
  }, [salesHistory]);

  if (view === 'LANDING') {
    return (
      <div className="flex flex-col h-screen bg-slate-950 items-center justify-center p-6 space-y-12 text-center">
        <div className="space-y-4">
          <div className="inline-flex p-6 bg-slate-900 rounded-[40px] border border-slate-800 shadow-2xl animate-pulse-sync">
            <Flame className="text-orange-500" size={64} />
          </div>
          <h1 className="text-5xl font-black tracking-tighter text-white">Munchie Stop</h1>
          <p className="text-slate-400 font-bold uppercase text-xs tracking-widest">School Snack Central</p>
        </div>
        
        <div className="w-full max-w-xs space-y-4">
          <button 
            onClick={() => setView('STOREFRONT')}
            className="w-full py-6 bg-blue-600 rounded-3xl text-xl font-black uppercase tracking-tight shadow-xl shadow-blue-500/20 active:scale-95 transition-all flex items-center justify-center gap-3"
          >
            <ShoppingCart size={24} /> Order Now
          </button>
          <button 
            onClick={() => setView('LOGIN')}
            className="w-full py-6 bg-slate-900 border border-slate-800 rounded-3xl text-xl font-black uppercase tracking-tight text-slate-400 active:scale-95 transition-all flex items-center justify-center gap-3"
          >
            <Lock size={20} /> Admin Login
          </button>
        </div>
      </div>
    );
  }

  if (view === 'LOGIN') {
    return (
      <div className="flex flex-col h-screen bg-slate-950 items-center justify-center p-6">
        <div className="w-full max-w-xs space-y-12">
          <div className="text-center space-y-4">
            <button onClick={() => setView('LANDING')} className="text-slate-500 text-xs font-black uppercase mb-4 flex items-center gap-2 mx-auto"><X size={14} /> Back</button>
            <div className="inline-flex p-5 bg-slate-900 rounded-[32px] border border-slate-800 shadow-2xl">
              <Lock className="text-blue-500" size={48} />
            </div>
            <h1 className="text-2xl font-black tracking-tighter text-white uppercase">Staff Access</h1>
          </div>
          <div className="flex justify-center gap-6 mb-12">
            {[0, 1, 2, 3].map(i => (
              <div key={i} className={`w-4 h-4 rounded-full border-2 transition-all duration-200 ${enteredPin.length > i ? 'bg-blue-500 border-blue-500 scale-125' : loginError ? 'border-red-500 animate-shake' : 'border-slate-800'}`} />
            ))}
          </div>
          <div className="grid grid-cols-3 gap-4">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '<'].map(key => (
              <button key={key} onClick={() => key === 'C' ? setEnteredPin("") : key === '<' ? setEnteredPin(p => p.slice(0, -1)) : handlePinInput(key)} className={`h-20 rounded-3xl text-2xl font-black transition-all active:scale-90 ${key === 'C' || key === '<' ? 'bg-slate-900/50 text-slate-500' : 'bg-slate-900 text-white shadow-xl border border-slate-800/50 active:bg-slate-800'}`}>
                {key === '<' ? <Delete className="mx-auto" size={28} /> : key}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen max-h-screen bg-slate-950">
      <header className="bg-slate-900 border-b border-slate-800 p-4 sticky top-0 z-20 shadow-2xl">
        <div className="max-w-lg mx-auto flex justify-between items-center w-full">
          <div className="flex items-center gap-3">
             <div className="flex flex-col items-center">
               {!sbClient ? <CloudOff className="text-red-500" size={16} /> : (
                 syncStatus === 'syncing' ? <Cloud className="text-yellow-500 animate-pulse-sync" size={16} /> :
                 syncStatus === 'error' ? <CloudOff className="text-red-500" size={16} /> :
                 <CloudCheck className="text-emerald-500" size={16} />
               )}
               <span className="text-[6px] font-bold uppercase text-slate-600">Sync</span>
             </div>
             <div>
                <h1 className="text-slate-500 text-[10px] font-black uppercase tracking-widest">{view === 'STOREFRONT' ? 'Guest Menu' : 'Staff Dashboard'}</h1>
                <p className={`text-2xl font-black tracking-tighter ${view === 'STOREFRONT' ? 'text-white' : 'text-green-400'}`}>
                  {view === 'STOREFRONT' ? 'Snack Store' : `$${totalEarnedToday.toFixed(2)}`}
                </p>
             </div>
          </div>
          <div className="flex gap-2">
            {view === 'ADMIN' && (
              <>
                <button onClick={() => setShowMissions(!showMissions)} className={`p-3 rounded-2xl transition-all ${showMissions ? 'bg-pink-600 text-white' : 'bg-slate-800 text-slate-400'}`}>
                  <Target size={24} />
                </button>
                <button onClick={() => setIsEditMode(!isEditMode)} className={`p-3 rounded-2xl transition-all ${isEditMode ? 'bg-cyan-500 text-white' : 'bg-slate-800 text-slate-400'}`}><Package size={24} /></button>
                <button onClick={() => setShowHistory(!showHistory)} className={`p-3 rounded-2xl transition-all ${showHistory ? 'bg-slate-700 text-white' : 'bg-slate-800 text-slate-400'}`}><History size={24} /></button>
                <button onClick={() => setView('LANDING')} className="p-3 rounded-2xl bg-slate-800 text-slate-400"><LogOut size={24} /></button>
              </>
            )}
            {view === 'STOREFRONT' && (
              <button onClick={() => setView('LANDING')} className="p-3 rounded-2xl bg-slate-800 text-slate-400"><X size={24} /></button>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto no-scrollbar pb-48">
        <div className="max-w-lg mx-auto p-4 space-y-6">
          
          {view === 'ADMIN' && !isEditMode && salesHistory.filter(s => s.status === OrderStatus.PENDING).length > 0 && (
            <section className="bg-orange-500/10 border border-orange-500/30 rounded-[32px] p-6 space-y-4 animate-in fade-in zoom-in-95">
              <div className="flex items-center gap-2">
                <Clock className="text-orange-500" size={20} />
                <h3 className="text-xs font-black uppercase tracking-widest text-orange-400">Incoming Orders</h3>
              </div>
              <div className="space-y-3">
                {salesHistory.filter(s => s.status === OrderStatus.PENDING).map(order => (
                  <div key={order.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-black text-white">{order.customerName}</p>
                        <p className="text-[10px] font-bold text-slate-500">{order.customerPhone} • {order.method}</p>
                        <div className="flex items-center gap-1 mt-1 text-orange-500">
                          <CalendarDays size={10} />
                          <p className="text-[10px] font-black uppercase">Pickup: {order.pickupDate ? formatDateForDisplay(order.pickupDate) : 'ASAP'}</p>
                        </div>
                      </div>
                      <span className="text-xl font-black text-white">${order.total.toFixed(2)}</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {order.items.map((it, idx) => (
                        <span key={idx} className="bg-slate-800 px-2 py-1 rounded-lg text-[10px] font-bold">
                          {it.quantity}x {it.name} {it.selectedOption && `(${it.selectedOption})`}
                        </span>
                      ))}
                    </div>
                    <div className="flex gap-2 pt-2">
                      <button 
                        onClick={() => updateOrderStatus(order.id, OrderStatus.COMPLETED)}
                        className="flex-1 py-3 bg-emerald-600 rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-2 active:scale-95 transition-all"
                      >
                        <CheckCircle2 size={14} /> Fulfill
                      </button>
                      <button 
                        onClick={() => updateOrderStatus(order.id, OrderStatus.CANCELED)}
                        className="flex-1 py-3 bg-red-600/20 text-red-400 border border-red-500/30 rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-2 active:scale-95 transition-all"
                      >
                        <XCircle size={14} /> Cancel
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {view === 'ADMIN' && !isEditMode && showMissions && (
            <section className="bg-slate-900/40 rounded-[32px] p-6 border border-slate-800 overflow-hidden relative animate-in fade-in slide-in-from-top-4 duration-300">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Target className="text-pink-500" size={20} />
                  <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Target Progress</h3>
                </div>
                <button onClick={() => setShowMissions(false)} className="text-slate-500 p-1 hover:text-slate-300 transition-colors">
                  <X size={16} />
                </button>
              </div>
              <div className="space-y-4">
                {MISSIONS.map(mission => {
                  const currentAmount = mission.category === 'Daily' ? totalEarnedToday : lifetimeEarnings;
                  const percent = Math.min(100, Math.floor((currentAmount / mission.target) * 100));
                  return (
                    <div key={mission.name} className="space-y-2">
                      <div className="flex justify-between items-end">
                        <div className="flex items-center gap-2">
                          {mission.icon}
                          <span className="font-bold text-sm">{mission.name}</span>
                        </div>
                        <span className="text-[10px] font-black text-slate-500">${currentAmount.toFixed(0)} / ${mission.target}</span>
                      </div>
                      <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 transition-all duration-1000 ease-out" style={{ width: `${percent}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          <div className="grid grid-cols-2 gap-4">
            {inventory.map(item => (
              <SnackButton key={item.id} item={item} onAdd={(it) => addToOrder(it)} isManagementMode={isEditMode} onAdjustStock={adjustStock} onManageOptions={(it) => setEditingOptionsItem(it)} currentInCart={currentOrder.filter(i => i.id === item.id).reduce((acc, i) => acc + i.quantity, 0)} />
            ))}
            {isEditMode && (
              <button onClick={() => setShowAddItemModal(true)} className="bg-slate-900 border-2 border-dashed border-slate-800 rounded-2xl p-6 flex flex-col items-center justify-center space-y-2 min-h-[160px] active:scale-95 transition-all">
                <PlusSquare size={48} className="text-slate-700" />
                <span className="font-black text-slate-700 uppercase tracking-tighter">Add New</span>
              </button>
            )}
          </div>

          {currentOrder.length > 0 && (
            <section className="bg-slate-900/50 rounded-3xl p-6 border border-slate-800 animate-in fade-in zoom-in-95">
              <h2 className="text-xl font-black flex items-center gap-2 mb-4"><ShoppingCart size={20} className="text-slate-500" /> Your Basket</h2>
              <ul className="space-y-3">
                {currentOrder.map((item, idx) => (
                  <li key={`${item.id}-${idx}`} className="flex items-center justify-between bg-slate-800/50 p-3 rounded-2xl">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{item.icon}</span>
                      <p className="font-bold text-sm">{item.name} {item.selectedOption && <span className="text-[10px] text-slate-400">({item.selectedOption})</span>}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => removeFromOrder(item.id, item.selectedOption)} className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center"><Minus size={14}/></button>
                      <span className="font-black w-6 text-center">{item.quantity}</span>
                      <button onClick={() => addToOrder(item, item.selectedOption)} className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center"><Plus size={14}/></button>
                    </div>
                  </li>
                ))}
              </ul>
              <div className="mt-6 pt-6 border-t border-slate-800 text-center">
                <span className="text-4xl font-black text-white">${orderTotal.toFixed(2)}</span>
              </div>
              <button 
                onClick={() => setShowCheckoutModal(true)}
                className="w-full mt-6 py-5 bg-blue-600 rounded-3xl text-xl font-black uppercase flex items-center justify-center gap-3 shadow-xl active:scale-95 transition-all"
              >
                {view === 'STOREFRONT' ? 'Reserve Now' : 'Checkout'} <ArrowRight size={20}/>
              </button>
            </section>
          )}

          {showHistory && view === 'ADMIN' && (
             <section className="space-y-4 animate-in slide-in-from-bottom duration-300">
               <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-900 p-5 rounded-3xl border border-slate-800 flex flex-col items-center">
                    <Flame className="text-orange-500 mb-1" size={24} />
                    <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Trending</p>
                    <p className="text-lg font-black">{stats.topItem?.icon} {stats.topItem?.name || '...'}</p>
                  </div>
                  <div className="bg-slate-900 p-5 rounded-3xl border border-slate-800 flex flex-col items-center">
                    <CreditCard className="text-blue-500 mb-1" size={24} />
                    <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Digital</p>
                    <p className="text-lg font-black">${(stats.methodSplit[PaymentMethod.VENMO] + stats.methodSplit[PaymentMethod.CASHAPP]).toFixed(0)}</p>
                  </div>
               </div>
               <div className="bg-slate-900 rounded-3xl p-6 border border-slate-800">
                  <h2 className="text-lg font-black mb-4 flex items-center gap-2"><TrendingUp size={18} className="text-green-500" /> Recent Sales</h2>
                  <div className="space-y-3">
                    {salesHistory.filter(s => s.status === OrderStatus.COMPLETED).slice(0, 10).map(sale => (
                      <div key={sale.id} className="flex justify-between items-center bg-slate-800/40 p-4 rounded-2xl border-l-4 border-green-500/30">
                        <div className="text-xs">
                          <p className="font-black text-slate-200 uppercase tracking-tight">{sale.items.length} snacks • {sale.method}</p>
                          <p className="text-slate-500 font-bold">{new Date(sale.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                        </div>
                        <span className="text-xl font-black text-green-400">${sale.total.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
               </div>
             </section>
          )}
        </div>
      </main>

      {/* Checkout Modal */}
      {showCheckoutModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-md p-6">
          <div className="w-full max-w-sm bg-slate-900 rounded-[40px] p-8 border border-slate-800 shadow-2xl animate-in zoom-in-95">
             <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-black text-white uppercase tracking-tighter">Confirm Order</h3>
                <button onClick={() => setShowCheckoutModal(false)} className="text-slate-500"><X size={24} /></button>
             </div>
             <div className="space-y-4 max-h-[70vh] overflow-y-auto no-scrollbar">
                {view === 'STOREFRONT' && (
                  <>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2"><User size={12}/> Your Name</label>
                      <input type="text" value={customerInfo.name} onChange={(e) => setCustomerInfo({...customerInfo, name: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded-2xl py-4 px-4 text-white font-bold" placeholder="First Name" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2"><Phone size={12}/> Phone Number</label>
                      <input type="tel" value={customerInfo.phone} onChange={(e) => setCustomerInfo({...customerInfo, phone: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded-2xl py-4 px-4 text-white font-bold" placeholder="(555) 555-5555" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2"><CalendarDays size={12}/> Pickup Day (Mon-Fri)</label>
                      <select 
                        value={customerInfo.pickupDate} 
                        onChange={(e) => setCustomerInfo({...customerInfo, pickupDate: e.target.value})} 
                        className="w-full bg-slate-800 border border-slate-700 rounded-2xl py-4 px-4 text-white font-bold outline-none appearance-none"
                      >
                        {schoolDaysList.map(date => (
                          <option key={formatDateForInput(date)} value={formatDateForInput(date)}>
                            {formatDateForDisplay(formatDateForInput(date))}
                          </option>
                        ))}
                      </select>
                    </div>
                  </>
                )}
                
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Payment Method</label>
                  <div className="grid grid-cols-3 gap-2">
                    <button onClick={() => setCustomerInfo({...customerInfo, method: PaymentMethod.CASH})} className={`p-4 rounded-2xl border flex flex-col items-center justify-center transition-all ${customerInfo.method === PaymentMethod.CASH ? 'bg-emerald-600 border-white' : 'bg-slate-800 border-transparent'}`}><DollarSign size={20}/><span className="text-[8px] mt-1 font-black">Cash</span></button>
                    <button onClick={() => setCustomerInfo({...customerInfo, method: PaymentMethod.VENMO})} className={`p-4 rounded-2xl border flex flex-col items-center justify-center transition-all ${customerInfo.method === PaymentMethod.VENMO ? 'bg-blue-600 border-white' : 'bg-slate-800 border-transparent'}`}><Wallet size={20}/><span className="text-[8px] mt-1 font-black">Venmo</span></button>
                    <button onClick={() => setCustomerInfo({...customerInfo, method: PaymentMethod.CASHAPP})} className={`p-4 rounded-2xl border flex flex-col items-center justify-center transition-all ${customerInfo.method === PaymentMethod.CASHAPP ? 'bg-purple-600 border-white' : 'bg-slate-800 border-transparent'}`}><Smartphone size={20}/><span className="text-[8px] mt-1 font-black">App</span></button>
                  </div>
                </div>

                <div className="bg-slate-800/50 p-6 rounded-3xl text-center border border-slate-800">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Total Due</p>
                  <p className="text-4xl font-black text-white">${orderTotal.toFixed(2)}</p>
                </div>

                <button 
                  onClick={() => handleCheckout(customerInfo.method, view === 'STOREFRONT')}
                  disabled={view === 'STOREFRONT' && (!customerInfo.name || !customerInfo.phone)}
                  className="w-full py-5 bg-blue-600 disabled:opacity-20 text-white font-black rounded-3xl text-xl uppercase tracking-widest active:scale-95 transition-all shadow-xl shadow-blue-500/20"
                >
                  {view === 'STOREFRONT' ? 'Place Order' : 'Complete Sale'}
                </button>
             </div>
          </div>
        </div>
      )}

      {/* Option Selection Modal (Customer View) */}
      {activeItemWithOptions && (
        <div className="fixed inset-0 z-[65] flex items-center justify-center bg-black/95 backdrop-blur-md p-6">
          <div className="w-full max-w-sm bg-slate-900 rounded-[40px] p-8 shadow-2xl border border-slate-800 animate-in zoom-in-95">
            <h3 className="text-2xl font-black text-center mb-6 uppercase tracking-tighter">Which {activeItemWithOptions.name}?</h3>
            <div className="grid grid-cols-1 gap-3 max-h-[50vh] overflow-y-auto no-scrollbar">
              {activeItemWithOptions.options?.map(opt => {
                const isOptOutOfStock = opt.stock <= 0;
                return (
                  <button 
                    key={opt.name} 
                    disabled={isOptOutOfStock}
                    onClick={() => addToOrder(activeItemWithOptions, opt.name)} 
                    className={`relative py-5 rounded-2xl text-xl font-bold uppercase active:scale-95 border-2 border-transparent hover:border-blue-500 transition-all ${isOptOutOfStock ? 'bg-slate-800/50 text-slate-600 cursor-not-allowed grayscale' : 'bg-slate-800 text-white'}`}
                  >
                    {opt.name}
                    {!isOptOutOfStock && <span className="absolute top-1 right-3 text-[8px] font-black opacity-40">{opt.stock} left</span>}
                    {isOptOutOfStock && <span className="absolute top-1 right-3 text-[8px] font-black text-red-500">OUT</span>}
                  </button>
                );
              })}
            </div>
            <button onClick={() => setActiveItemWithOptions(null)} className="mt-6 w-full text-slate-500 font-black uppercase text-xs tracking-[0.2em]">Cancel</button>
          </div>
        </div>
      )}

      {/* Add New Item Modal */}
      {showAddItemModal && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/95 backdrop-blur-md p-6">
          <div className="w-full max-w-sm bg-slate-900 rounded-[40px] p-8 border border-slate-800 shadow-2xl animate-in slide-in-from-bottom">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-2xl font-black text-white uppercase tracking-tighter">New Product</h3>
              <button onClick={() => setShowAddItemModal(false)} className="text-slate-500"><X size={24} /></button>
            </div>
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Product Name</label>
                <input type="text" value={newItem.name} onChange={(e) => setNewItem({...newItem, name: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded-2xl py-4 px-4 text-white font-bold" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Price ($)</label>
                  <input type="number" value={newItem.price} onChange={(e) => setNewItem({...newItem, price: parseFloat(e.target.value) || 0})} className="w-full bg-slate-800 border border-slate-700 rounded-2xl py-4 px-4 text-white font-black" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Stock</label>
                  <input type="number" value={newItem.stock} onChange={(e) => setNewItem({...newItem, stock: parseInt(e.target.value) || 0})} className="w-full bg-slate-800 border border-slate-700 rounded-2xl py-4 px-4 text-white font-black" />
                </div>
              </div>
              <button onClick={() => { handleAddNewItem(); setShowAddItemModal(false); }} className="w-full py-5 bg-emerald-500 text-white font-black rounded-3xl text-xl uppercase tracking-widest shadow-xl active:scale-95 transition-all">Create</button>
            </div>
          </div>
        </div>
      )}

      {/* Flavor & Stock Management Modal */}
      {editingOptionsItem && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/90 backdrop-blur-md p-6">
          <div className="w-full max-w-sm bg-slate-900 rounded-[40px] p-8 border border-slate-800 shadow-2xl animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-6">
              <div className="flex flex-col">
                <h3 className="font-black text-white uppercase tracking-tighter leading-none">Flavor Inventory</h3>
                <span className="text-[10px] font-bold text-slate-500 uppercase mt-1">{editingOptionsItem.name}</span>
              </div>
              <button onClick={() => setEditingOptionsItem(null)} className="text-slate-500"><X size={24} /></button>
            </div>
            <div className="space-y-6">
              <div className="bg-slate-800/50 p-4 rounded-2xl space-y-4">
                <div className="space-y-1">
                  <label className="text-[8px] font-black uppercase text-slate-500">New Flavor Name</label>
                  <input type="text" value={newOptionText} placeholder="e.g. Lime" onChange={(e) => setNewOptionText(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-white font-bold outline-none" />
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex-1 space-y-1">
                    <label className="text-[8px] font-black uppercase text-slate-500">Starting Stock</label>
                    <input type="number" value={newOptionStock} onChange={(e) => setNewOptionStock(parseInt(e.target.value) || 0)} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-white font-bold outline-none" />
                  </div>
                  <button onClick={() => {
                      const it = editingOptionsItem;
                      const optName = newOptionText.trim();
                      if (optName && it) {
                        const newOpt: SnackOption = { name: optName, stock: newOptionStock };
                        const updatedOptions = [...(it.options || []), newOpt];
                        const newTotalStock = updatedOptions.reduce((sum, o) => sum + o.stock, 0);
                        setInventory(prev => prev.map(i => i.id === it.id ? { ...i, options: updatedOptions, stock: newTotalStock } : i));
                        if (sbClient) sbClient.from('inventory').update({ options: updatedOptions, stock: newTotalStock }).eq('id', it.id);
                        setNewOptionText("");
                        setNewOptionStock(10);
                      }
                  }} className="h-10 px-6 bg-cyan-600 rounded-xl text-white font-black text-xs uppercase active:scale-90 transition-transform">Add</button>
                </div>
              </div>
              
              <div className="max-h-60 overflow-y-auto space-y-3 no-scrollbar">
                {inventory.find(i => i.id === editingOptionsItem.id)?.options?.map(opt => (
                  <div key={opt.name} className="bg-slate-800 p-4 rounded-xl border border-slate-700/50 flex flex-col gap-3">
                    <div className="flex justify-between items-center">
                      <span className="font-black text-slate-200 text-xs uppercase tracking-tight">{opt.name}</span>
                      <button onClick={() => {
                        const it = editingOptionsItem;
                        const updatedOptions = it.options?.filter(o => o.name !== opt.name) || [];
                        const newTotalStock = updatedOptions.reduce((sum, o) => sum + o.stock, 0);
                        setInventory(prev => prev.map(i => i.id === it.id ? { ...i, options: updatedOptions, stock: newTotalStock } : i));
                        if (sbClient) sbClient.from('inventory').update({ options: updatedOptions, stock: newTotalStock }).eq('id', it.id);
                      }} className="text-red-500 hover:text-red-400"><Trash2 size={16}/></button>
                    </div>
                    
                    <div className="flex items-center justify-between bg-black/20 rounded-lg p-2">
                       <button onClick={() => adjustOptionStock(editingOptionsItem.id, opt.name, -1)} className="w-10 h-10 rounded bg-slate-700 flex items-center justify-center active:scale-90"><Minus size={16}/></button>
                       <div className="flex flex-col items-center">
                         <span className="text-xl font-black">{opt.stock}</span>
                         <span className="text-[6px] font-black uppercase text-slate-500">In Stock</span>
                       </div>
                       <button onClick={() => adjustOptionStock(editingOptionsItem.id, opt.name, 1)} className="w-10 h-10 rounded bg-slate-700 flex items-center justify-center active:scale-90"><Plus size={16}/></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;