
import React, { useState, useEffect, useMemo } from 'react';
import { ShoppingCart, Trash2, History, CreditCard, DollarSign, Wallet, RefreshCw, X } from 'lucide-react';
import { INVENTORY } from './constants';
import { SnackItem, Sale, PaymentMethod } from './types';
import { supabase } from './supabaseClient';

const App: React.FC = () => {
  const [currentOrder, setCurrentOrder] = useState<SnackItem[]>([]);
  const [salesHistory, setSalesHistory] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  // Load history from Supabase on mount
  useEffect(() => {
    fetchSales();
  }, []);

  const fetchSales = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('snack_sales')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching sales:', error);
      } else {
        setSalesHistory(data || []);
      }
    } catch (err) {
      console.error('Failed to fetch sales:', err);
    } finally {
      setLoading(false);
    }
  };

  const addItem = (item: SnackItem) => {
    setCurrentOrder(prev => [...prev, item]);
  };

  const removeItem = (index: number) => {
    setCurrentOrder(prev => prev.filter((_, i) => i !== index));
  };

  const clearOrder = () => {
    setCurrentOrder([]);
  };

  const orderTotal = useMemo(() => {
    return currentOrder.reduce((sum, item) => sum + item.price, 0);
  }, [currentOrder]);

  const totalEarnedToday = useMemo(() => {
    // Basic filter for "today" - could be more precise with date comparison
    return salesHistory.reduce((sum, sale) => sum + sale.total, 0);
  }, [salesHistory]);

  const handleCheckout = async (method: PaymentMethod) => {
    if (currentOrder.length === 0) return;

    setProcessing(true);
    const sale: Sale = {
      items: JSON.stringify(currentOrder.map(i => i.name)),
      total: orderTotal,
      payment_method: method
    };

    try {
      const { error } = await supabase.from('snack_sales').insert([sale]);
      if (error) throw error;

      // Update UI
      clearOrder();
      await fetchSales();
    } catch (err) {
      alert('Failed to save sale. Check your connection.');
      console.error(err);
    } finally {
      setProcessing(false);
    }
  };

  const handleResetHistory = async () => {
    const confirmReset = window.confirm('Are you sure you want to CLEAR ALL daily history? This cannot be undone.');
    if (!confirmReset) return;

    try {
      setProcessing(true);
      // Note: In a production app, we would use a more targeted delete or soft delete.
      // For this simple POS, we delete all records to "reset" the day.
      const { error } = await supabase.from('snack_sales').delete().neq('total', -1);
      if (error) throw error;
      
      setSalesHistory([]);
    } catch (err) {
      alert('Failed to reset history.');
      console.error(err);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col max-w-md mx-auto shadow-2xl bg-slate-900 border-x border-slate-800">
      
      {/* Header */}
      <header className="p-4 bg-slate-800 border-b border-slate-700 flex justify-between items-center sticky top-0 z-10">
        <div>
          <h1 className="text-xl font-extrabold text-blue-400 tracking-tight">SNACK-O-MATIC</h1>
          <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">POS v1.0</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-400 uppercase font-bold">Today's Earnings</p>
          <p className="text-2xl font-black text-green-400 leading-none">${totalEarnedToday}</p>
        </div>
      </header>

      {/* Main Grid Area */}
      <main className="flex-1 overflow-y-auto p-4 space-y-6 pb-40">
        
        {/* Inventory Grid */}
        <section>
          <h2 className="text-sm font-bold text-slate-500 uppercase mb-3 flex items-center gap-2">
            <ShoppingCart size={16} /> Quick Add Items
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {INVENTORY.map(item => (
              <button
                key={item.id}
                onClick={() => addItem(item)}
                className={`${item.color} active:scale-95 transition-transform rounded-2xl p-4 flex flex-col items-center justify-center text-center shadow-lg h-32 border-b-4 border-black/20`}
              >
                <span className="text-sm font-bold opacity-90 uppercase tracking-tight">{item.name}</span>
                <span className="text-2xl font-black mt-1">${item.price}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Current Order */}
        <section className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-sm font-bold text-slate-400 uppercase flex items-center gap-2">
              <ShoppingCart size={16} /> Current Order
            </h2>
            {currentOrder.length > 0 && (
              <button 
                onClick={clearOrder}
                className="text-xs text-red-400 font-bold hover:underline"
              >
                Clear All
              </button>
            )}
          </div>
          
          <div className="space-y-2">
            {currentOrder.length === 0 ? (
              <p className="text-slate-600 italic text-center py-4">Order is empty...</p>
            ) : (
              currentOrder.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center bg-slate-800 p-3 rounded-xl border border-slate-700">
                  <div className="flex flex-col">
                    <span className="font-bold text-slate-200">{item.name}</span>
                    <span className="text-xs text-slate-500 font-mono">${item.price.toFixed(2)}</span>
                  </div>
                  <button 
                    onClick={() => removeItem(idx)}
                    className="p-2 text-slate-500 hover:text-red-400 active:scale-90 transition-all"
                  >
                    <X size={20} />
                  </button>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Daily Log */}
        <section>
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-sm font-bold text-slate-500 uppercase flex items-center gap-2">
              <History size={16} /> Daily Log
            </h2>
            <button 
              onClick={handleResetHistory}
              disabled={processing || loading}
              className="p-1 text-slate-600 hover:text-red-500 transition-colors"
              title="Reset History"
            >
              <RefreshCw size={16} className={processing ? 'animate-spin' : ''} />
            </button>
          </div>
          
          <div className="space-y-2">
            {loading ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
              </div>
            ) : salesHistory.length === 0 ? (
              <div className="bg-slate-800/30 border border-dashed border-slate-700 rounded-xl p-8 text-center">
                <p className="text-slate-600">No sales logged yet today</p>
              </div>
            ) : (
              salesHistory.map((sale) => (
                <div key={sale.id} className="bg-slate-800 p-3 rounded-xl flex justify-between items-center border-l-4 border-l-slate-600 hover:border-l-blue-500 transition-all">
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                       <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">
                        {sale.created_at ? new Date(sale.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                      </span>
                      <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                        sale.payment_method === 'Cash' ? 'bg-green-900/40 text-green-400' :
                        sale.payment_method === 'Venmo' ? 'bg-blue-900/40 text-blue-400' :
                        'bg-purple-900/40 text-purple-400'
                      }`}>
                        {sale.payment_method}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 line-clamp-1 mt-1 font-medium">
                      {JSON.parse(sale.items).join(', ')}
                    </p>
                  </div>
                  <div className="ml-4 text-right">
                    <p className="text-lg font-black text-slate-200">${sale.total}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </main>

      {/* Persistent Checkout Footer */}
      <footer className="fixed bottom-0 left-0 right-0 max-w-md mx-auto p-4 bg-slate-900/90 backdrop-blur-md border-t border-slate-700 flex flex-col gap-3">
        <div className="flex justify-between items-end px-2 mb-1">
          <span className="text-sm font-bold text-slate-400 uppercase">Grand Total</span>
          <span className="text-5xl font-black text-white leading-none">${orderTotal}</span>
        </div>

        <div className="grid grid-cols-3 gap-3 h-20">
          <button
            onClick={() => handleCheckout('Cash')}
            disabled={currentOrder.length === 0 || processing}
            className="bg-green-500 hover:bg-green-400 active:scale-95 disabled:opacity-30 disabled:grayscale transition-all rounded-2xl flex flex-col items-center justify-center text-black font-black uppercase text-xs gap-1 border-b-4 border-green-700"
          >
            <DollarSign size={24} strokeWidth={3} />
            Cash
          </button>
          
          <button
            onClick={() => handleCheckout('Venmo')}
            disabled={currentOrder.length === 0 || processing}
            className="bg-blue-500 hover:bg-blue-400 active:scale-95 disabled:opacity-30 disabled:grayscale transition-all rounded-2xl flex flex-col items-center justify-center text-white font-black uppercase text-xs gap-1 border-b-4 border-blue-700"
          >
            <Wallet size={24} strokeWidth={3} />
            Venmo
          </button>

          <button
            onClick={() => handleCheckout('CashApp')}
            disabled={currentOrder.length === 0 || processing}
            className="bg-purple-600 hover:bg-purple-500 active:scale-95 disabled:opacity-30 disabled:grayscale transition-all rounded-2xl flex flex-col items-center justify-center text-white font-black uppercase text-xs gap-1 border-b-4 border-purple-800"
          >
            <CreditCard size={24} strokeWidth={3} />
            CashApp
          </button>
        </div>
      </footer>
    </div>
  );
};

export default App;
