
import React, { useState, useEffect, useMemo } from 'react';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { INVENTORY_DEFAULTS, STORAGE_KEY } from './constants';
import { SnackItem, OrderItem, SaleRecord, PaymentMethod } from './types';
import { SnackButton } from './components/SnackButton';
import { 
  Trash2, 
  History, 
  ShoppingCart, 
  DollarSign, 
  Wallet, 
  Smartphone, 
  RotateCcw,
  Plus,
  Minus,
  Package,
  X,
  RefreshCw,
  PlusCircle,
  TrendingUp,
  Lock,
  Delete,
  LogOut,
  PlusSquare,
  Palette,
  Tag,
  Cloud,
  CloudOff,
  CloudCheck,
  BarChart3,
  Flame,
  CreditCard,
  Settings,
  Database,
  ArrowUpCircle
} from 'lucide-react';

const APP_PIN = "1234";
const CLOUD_CONFIG_KEY = 'munchie_supabase_config';

const COLOR_OPTIONS = [
  'bg-orange-500', 'bg-blue-500', 'bg-cyan-400', 'bg-rose-500', 
  'bg-emerald-500', 'bg-purple-500', 'bg-amber-500', 'bg-pink-500',
  'bg-indigo-500', 'bg-slate-600'
];

const App: React.FC = () => {
  const [inventory, setInventory] = useState<SnackItem[]>(INVENTORY_DEFAULTS);
  const [currentOrder, setCurrentOrder] = useState<OrderItem[]>([]);
  const [salesHistory, setSalesHistory] = useState<SaleRecord[]>([]);
  const [isEditMode, setIsEditMode] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showCloudConfig, setShowCloudConfig] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'error' | 'success'>('idle');
  
  // Supabase State
  const [sbClient, setSbClient] = useState<SupabaseClient | null>(null);
  const [sbConfig, setSbConfig] = useState({ url: '', key: '' });

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [enteredPin, setEnteredPin] = useState("");
  const [loginError, setLoginError] = useState(false);

  const [activeItemWithOptions, setActiveItemWithOptions] = useState<SnackItem | null>(null);
  const [editingOptionsItem, setEditingOptionsItem] = useState<SnackItem | null>(null);
  const [newOptionText, setNewOptionText] = useState("");

  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [newItem, setNewItem] = useState({
    name: '',
    price: 0,
    icon: '📦',
    color: COLOR_OPTIONS[0],
    stock: 0
  });

  // 1. Initialize Supabase and Load Local Data
  useEffect(() => {
    const savedLocal = localStorage.getItem(STORAGE_KEY);
    if (savedLocal) {
      try {
        const parsed = JSON.parse(savedLocal);
        if (parsed.inventory) setInventory(parsed.inventory);
        if (parsed.salesHistory) setSalesHistory(parsed.salesHistory);
      } catch (e) { console.error(e); }
    }

    const savedConfig = localStorage.getItem(CLOUD_CONFIG_KEY);
    if (savedConfig) {
      const config = JSON.parse(savedConfig);
      setSbConfig(config);
      if (config.url && config.key) {
        const client = createClient(config.url, config.key);
        setSbClient(client);
      }
    }
  }, []);

  // 2. Fetch from Supabase when client is ready
  useEffect(() => {
    if (!sbClient) return;

    const syncWithCloud = async () => {
      setSyncStatus('syncing');
      try {
        const { data: invData, error: invError } = await sbClient.from('inventory').select('*');
        const { data: salesData, error: salesError } = await sbClient.from('sales').select('*').order('timestamp', { ascending: false });

        if (invError || salesError) throw invError || salesError;

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

    const invSubscription = sbClient
      .channel('realtime-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory' }, (payload) => {
         setInventory(prev => {
           const updated = payload.new as SnackItem;
           if (payload.eventType === 'INSERT') return [...prev, updated];
           if (payload.eventType === 'UPDATE') return prev.map(i => i.id === updated.id ? updated : i);
           if (payload.eventType === 'DELETE') return prev.filter(i => i.id !== (payload.old as any).id);
           return prev;
         });
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'sales' }, (payload) => {
         const newSale = { ...payload.new, timestamp: new Date(payload.new.timestamp).getTime() } as SaleRecord;
         setSalesHistory(prev => (prev.find(s => s.id === newSale.id) ? prev : [newSale, ...prev]));
      })
      .subscribe();

    return () => { sbClient.removeChannel(invSubscription); };
  }, [sbClient]);

  // Save to LocalStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ salesHistory, inventory }));
  }, [salesHistory, inventory]);

  const saveCloudConfig = () => {
    if (!sbConfig.url || !sbConfig.key) return;
    localStorage.setItem(CLOUD_CONFIG_KEY, JSON.stringify(sbConfig));
    const client = createClient(sbConfig.url, sbConfig.key);
    setSbClient(client);
    setShowCloudConfig(false);
  };

  const pushLocalToCloud = async () => {
    if (!sbClient) return;
    setSyncStatus('syncing');
    try {
      // Push Inventory
      for (const item of inventory) {
        await sbClient.from('inventory').upsert(item);
      }
      setSyncStatus('success');
      alert("Inventory synced to cloud successfully!");
    } catch (err) {
      setSyncStatus('error');
    }
  };

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
    if (sbClient) {
      setSyncStatus('syncing');
      const { error } = await sbClient.from('inventory').update({ stock: newStock }).eq('id', id);
      setSyncStatus(error ? 'error' : 'success');
    }
  };

  const handleCheckout = async (method: PaymentMethod) => {
    if (currentOrder.length === 0) return;
    const tempId = Math.random().toString(36).substr(2, 9);
    const newSale: SaleRecord = { id: tempId, timestamp: Date.now(), items: [...currentOrder], total: orderTotal, method };

    setSalesHistory(prev => [newSale, ...prev]);
    setCurrentOrder([]);

    if (sbClient) {
      setSyncStatus('syncing');
      try {
        await sbClient.from('sales').insert([{ items: newSale.items, total: newSale.total, method: newSale.method }]);
        for (const item of currentOrder) {
          const invItem = inventory.find(i => i.id === item.id);
          if (invItem) await sbClient.from('inventory').update({ stock: Math.max(0, invItem.stock - item.quantity) }).eq('id', item.id);
        }
        setSyncStatus('success');
      } catch (err) { setSyncStatus('error'); }
    }
  };

  // Fix: Implemented handleAddNewItem to add new items to both local and cloud inventory.
  const handleAddNewItem = async () => {
    if (!newItem.name) return;
    
    const itemToAdd: SnackItem = {
      id: Math.random().toString(36).substr(2, 9),
      name: newItem.name,
      price: newItem.price,
      icon: newItem.icon,
      color: newItem.color,
      stock: newItem.stock,
      options: []
    };

    setInventory(prev => [...prev, itemToAdd]);
    setShowAddItemModal(false);
    setNewItem({
      name: '',
      price: 0,
      icon: '📦',
      color: COLOR_OPTIONS[0],
      stock: 0
    });

    if (sbClient) {
      setSyncStatus('syncing');
      const { error } = await sbClient.from('inventory').insert([itemToAdd]);
      setSyncStatus(error ? 'error' : 'success');
    }
  };

  const orderTotal = useMemo(() => currentOrder.reduce((acc, item) => acc + (item.price * item.quantity), 0), [currentOrder]);
  const totalEarnedToday = useMemo(() => salesHistory.reduce((acc, sale) => acc + sale.total, 0), [salesHistory]);

  const stats = useMemo(() => {
    const itemCounts: Record<string, {name: string, count: number, icon: string}> = {};
    const methodSplit: Record<string, number> = { [PaymentMethod.CASH]: 0, [PaymentMethod.VENMO]: 0, [PaymentMethod.CASHAPP]: 0 };
    salesHistory.forEach(sale => {
      methodSplit[sale.method] += sale.total;
      sale.items.forEach(item => {
        if (!itemCounts[item.id]) itemCounts[item.id] = { name: item.name, count: 0, icon: item.icon };
        itemCounts[item.id].count += item.quantity;
      });
    });
    const topItem = Object.values(itemCounts).sort((a, b) => b.count - a.count)[0];
    return { topItem, methodSplit };
  }, [salesHistory]);

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col h-screen bg-slate-950 items-center justify-center p-6 overflow-hidden">
        <div className="w-full max-w-xs space-y-12">
          <div className="text-center space-y-4">
            <div className="inline-flex p-5 bg-slate-900 rounded-[32px] border border-slate-800 shadow-2xl">
              <Lock className="text-blue-500" size={48} />
            </div>
            <div className="space-y-1">
              <h1 className="text-3xl font-black tracking-tighter text-white">Munchie POS</h1>
              <p className="text-slate-500 font-bold uppercase text-[10px] tracking-[0.3em]">Identity Verification</p>
            </div>
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
               <span className="text-[6px] font-bold uppercase text-slate-600">Cloud</span>
             </div>
             <div>
                <h1 className="text-slate-500 text-[10px] font-black uppercase tracking-widest">{isEditMode ? "Inventory" : "Earnings"}</h1>
                <p className={`text-3xl font-black tracking-tighter ${isEditMode ? 'text-cyan-400' : 'text-green-400'}`}>
                  {isEditMode ? "Manage" : `$${totalEarnedToday.toFixed(2)}`}
                </p>
             </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setIsEditMode(!isEditMode)} className={`p-3 rounded-2xl transition-all ${isEditMode ? 'bg-cyan-500 text-white' : 'bg-slate-800 text-slate-400'}`}><Package size={24} /></button>
            <button onClick={() => setShowHistory(!showHistory)} className={`p-3 rounded-2xl transition-all ${showHistory ? 'bg-slate-700 text-white' : 'bg-slate-800 text-slate-400'}`}><History size={24} /></button>
            {isEditMode && <button onClick={() => setShowCloudConfig(true)} className="p-3 rounded-2xl bg-slate-800 text-blue-400"><Database size={24} /></button>}
            <button onClick={() => setIsAuthenticated(false)} className="p-3 rounded-2xl bg-slate-800 text-slate-400"><LogOut size={24} /></button>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto no-scrollbar pb-48">
        <div className="max-w-lg mx-auto p-4 space-y-6">
          
          {/* Inventory Grid */}
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

          {isEditMode && (
            <div className="bg-slate-900 rounded-3xl p-6 border border-slate-800 space-y-4">
              {!sbClient ? (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-center">
                  <p className="text-red-400 text-xs font-bold mb-2">Cloud not configured!</p>
                  <button onClick={() => setShowCloudConfig(true)} className="text-white bg-red-600 px-4 py-2 rounded-xl text-[10px] font-black uppercase">Setup Supabase</button>
                </div>
              ) : (
                <button onClick={pushLocalToCloud} className="w-full py-4 bg-blue-600 rounded-2xl text-white font-black uppercase flex items-center justify-center gap-2 active:scale-95 transition-all">
                  <ArrowUpCircle size={20} /> Push Inventory to Cloud
                </button>
              )}
            </div>
          )}

          {!isEditMode && currentOrder.length > 0 && (
            <section className="bg-slate-900/50 rounded-3xl p-6 border border-slate-800 animate-in fade-in zoom-in-95">
              <h2 className="text-xl font-black flex items-center gap-2 mb-4"><ShoppingCart size={20} className="text-slate-500" /> Basket</h2>
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
            </section>
          )}

          {showHistory && (
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
                    {salesHistory.map(sale => (
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

      {/* Cloud Config Modal */}
      {showCloudConfig && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-md p-6">
          <div className="w-full max-w-sm bg-slate-900 rounded-[40px] p-8 border border-slate-800 shadow-2xl animate-in zoom-in-95">
             <div className="flex justify-between items-center mb-8">
                <h3 className="text-2xl font-black text-white uppercase tracking-tighter flex items-center gap-2"><Database size={24} className="text-blue-500" /> Cloud Setup</h3>
                <button onClick={() => setShowCloudConfig(false)} className="text-slate-500"><X size={24} /></button>
             </div>
             <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Supabase URL</label>
                  <input type="text" value={sbConfig.url} onChange={(e) => setSbConfig({...sbConfig, url: e.target.value})} placeholder="https://xyz.supabase.co" className="w-full bg-slate-800 border border-slate-700 rounded-2xl py-4 px-4 text-white font-mono text-xs outline-none focus:border-blue-500" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Anon / Public Key</label>
                  <textarea value={sbConfig.key} onChange={(e) => setSbConfig({...sbConfig, key: e.target.value})} placeholder="Paste long key here..." className="w-full bg-slate-800 border border-slate-700 rounded-2xl py-4 px-4 text-white font-mono text-xs h-24 resize-none outline-none focus:border-blue-500" />
                </div>
                <button onClick={saveCloudConfig} className="w-full py-5 bg-blue-600 text-white font-black rounded-3xl text-xl uppercase tracking-widest active:scale-95 transition-all">Save & Connect</button>
             </div>
          </div>
        </div>
      )}

      {/* Footer Checkout */}
      {!isEditMode && currentOrder.length > 0 && (
        <footer className="fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-800 p-4 z-30 pb-10">
          <div className="max-w-lg mx-auto grid grid-cols-3 gap-3">
            <button onClick={() => handleCheckout(PaymentMethod.CASH)} className="flex flex-col items-center justify-center p-5 bg-emerald-600 rounded-[32px] active:scale-90 shadow-xl transition-all">
              <DollarSign size={28} className="text-white" />
              <span className="text-[10px] font-black uppercase text-white tracking-widest">Cash</span>
            </button>
            <button onClick={() => handleCheckout(PaymentMethod.VENMO)} className="flex flex-col items-center justify-center p-5 bg-blue-600 rounded-[32px] active:scale-90 shadow-xl transition-all">
              <Wallet size={28} className="text-white" />
              <span className="text-[10px] font-black uppercase text-white tracking-widest">Venmo</span>
            </button>
            <button onClick={() => handleCheckout(PaymentMethod.CASHAPP)} className="flex flex-col items-center justify-center p-5 bg-purple-600 rounded-[32px] active:scale-90 shadow-xl transition-all">
              <Smartphone size={28} className="text-white" />
              <span className="text-[10px] font-black uppercase text-white tracking-widest">App</span>
            </button>
          </div>
        </footer>
      )}

      {/* Item Options Selection Modal */}
      {activeItemWithOptions && (
        <div className="fixed inset-0 z-[65] flex items-center justify-center bg-black/95 backdrop-blur-md p-6">
          <div className="w-full max-w-sm bg-slate-900 rounded-[40px] p-8 shadow-2xl border border-slate-800 animate-in zoom-in-95">
            <h3 className="text-2xl font-black text-center mb-6 uppercase tracking-tighter">Which {activeItemWithOptions.name}?</h3>
            <div className="grid grid-cols-1 gap-3 max-h-[50vh] overflow-y-auto no-scrollbar">
              {activeItemWithOptions.options?.map(opt => (
                <button key={opt} onClick={() => addToOrder(activeItemWithOptions, opt)} className="py-5 bg-slate-800 rounded-2xl text-xl font-bold uppercase active:scale-95 border-2 border-transparent hover:border-blue-500 transition-all">{opt}</button>
              ))}
            </div>
            <button onClick={() => setActiveItemWithOptions(null)} className="mt-6 w-full text-slate-500 font-black uppercase text-xs tracking-[0.2em]">Cancel</button>
          </div>
        </div>
      )}

      {/* Add Item Modal */}
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
                <div className="relative">
                  <Tag className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                  <input type="text" value={newItem.name} onChange={(e) => setNewItem({...newItem, name: e.target.value})} placeholder="e.g. Takis" className="w-full bg-slate-800 border border-slate-700 rounded-2xl py-4 pl-12 pr-4 text-white font-bold outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Price ($)</label>
                  <input type="number" value={newItem.price} onChange={(e) => setNewItem({...newItem, price: parseFloat(e.target.value) || 0})} className="w-full bg-slate-800 border border-slate-700 rounded-2xl py-4 px-4 text-white font-black text-xl" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Stock</label>
                  <input type="number" value={newItem.stock} onChange={(e) => setNewItem({...newItem, stock: parseInt(e.target.value) || 0})} className="w-full bg-slate-800 border border-slate-700 rounded-2xl py-4 px-4 text-white font-black text-xl" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2"><Palette size={14} /> Color</label>
                <div className="grid grid-cols-5 gap-2">
                  {COLOR_OPTIONS.map(color => (
                    <button key={color} onClick={() => setNewItem({...newItem, color})} className={`h-10 rounded-xl transition-all ${color} ${newItem.color === color ? 'ring-4 ring-white scale-110' : 'opacity-60'}`} />
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Icon</label>
                <input type="text" value={newItem.icon} onChange={(e) => setNewItem({...newItem, icon: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded-2xl py-4 px-4 text-white text-3xl text-center" />
              </div>
              <button onClick={handleAddNewItem} disabled={!newItem.name} className="w-full py-5 bg-emerald-500 disabled:opacity-20 text-white font-black rounded-3xl text-xl uppercase tracking-widest shadow-xl shadow-emerald-500/20 active:scale-95 transition-all">Create</button>
            </div>
          </div>
        </div>
      )}

      {/* Flavor Edit Modal */}
      {editingOptionsItem && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/90 backdrop-blur-md p-6">
          <div className="w-full max-w-sm bg-slate-900 rounded-[40px] p-8 border border-slate-800 shadow-2xl animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-black text-white uppercase tracking-tighter">Edit Flavors</h3>
              <button onClick={() => setEditingOptionsItem(null)} className="text-slate-500"><X size={24} /></button>
            </div>
            <div className="space-y-4">
              <div className="flex gap-2">
                <input type="text" value={newOptionText} placeholder="New flavor..." onChange={(e) => setNewOptionText(e.target.value)} onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                        const it = editingOptionsItem;
                        const opt = newOptionText.trim();
                        if (opt) {
                          const updatedOptions = [...(it.options || []), opt];
                          setInventory(prev => prev.map(i => i.id === it.id ? { ...i, options: updatedOptions } : i));
                          if (sbClient) sbClient.from('inventory').update({ options: updatedOptions }).eq('id', it.id);
                          setNewOptionText("");
                        }
                    }
                }} className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-white font-bold outline-none" />
                <button onClick={() => {
                    const it = editingOptionsItem;
                    const opt = newOptionText.trim();
                    if (opt) {
                      const updatedOptions = [...(it.options || []), opt];
                      setInventory(prev => prev.map(i => i.id === it.id ? { ...i, options: updatedOptions } : i));
                      if (sbClient) sbClient.from('inventory').update({ options: updatedOptions }).eq('id', it.id);
                      setNewOptionText("");
                    }
                }} className="p-3 bg-cyan-600 rounded-xl text-white active:scale-90 transition-transform"><Plus size={20}/></button>
              </div>
              <div className="max-h-48 overflow-y-auto space-y-2 no-scrollbar">
                {inventory.find(i => i.id === editingOptionsItem.id)?.options?.map(opt => (
                  <div key={opt} className="flex justify-between bg-slate-800 p-4 rounded-xl border border-slate-700/50">
                    <span className="font-bold text-slate-200">{opt}</span>
                    <button onClick={() => {
                      const it = editingOptionsItem;
                      const updatedOptions = it.options?.filter(o => o !== opt) || [];
                      setInventory(prev => prev.map(i => i.id === it.id ? { ...i, options: updatedOptions } : i));
                      if (sbClient) sbClient.from('inventory').update({ options: updatedOptions }).eq('id', it.id);
                    }} className="text-red-500 active:scale-90 transition-transform"><Trash2 size={16}/></button>
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
