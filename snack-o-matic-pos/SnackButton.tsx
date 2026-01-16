import React from 'react';
import { SnackItem } from './types';
import { Plus, Minus, Layers, Settings2 } from 'lucide-react';

interface SnackButtonProps {
  item: SnackItem;
  onAdd?: (item: SnackItem) => void;
  isManagementMode: boolean;
  onAdjustStock?: (id: string, delta: number) => void;
  onManageOptions?: (item: SnackItem) => void;
  currentInCart: number;
}

export const SnackButton: React.FC<SnackButtonProps> = ({ 
  item, 
  onAdd, 
  isManagementMode, 
  onAdjustStock,
  onManageOptions,
  currentInCart
}) => {
  const hasOptions = item.options && item.options.length > 0;
  
  // Logic: if item has options, it's out of stock if all options have 0 stock.
  // currentInCart check is still useful for immediate visual feedback before re-fetching
  const isOutOfStock = hasOptions
    ? item.options.every(opt => opt.stock <= 0)
    : item.stock <= currentInCart;

  if (isManagementMode) {
    return (
      <div className={`${item.color} rounded-2xl p-4 flex flex-col items-center justify-between space-y-4 shadow-lg border-2 border-white/20`}>
        <div className="flex flex-col items-center relative w-full">
          <span className="text-3xl">{item.icon}</span>
          <span className="font-bold text-[10px] uppercase text-white/80 text-center leading-tight mt-1">{item.name}</span>
          
          <button 
            onClick={() => onManageOptions?.(item)}
            className="absolute -top-1 -right-1 p-2 bg-black/40 rounded-full text-white/70 active:scale-90 transition-transform"
            title="Manage Flavors & Individual Stock"
          >
            <Settings2 size={16} />
          </button>
        </div>
        
        <div className="flex items-center justify-between w-full bg-black/30 rounded-xl p-2">
          <button 
            onClick={(e) => { e.stopPropagation(); onAdjustStock?.(item.id, -1); }}
            className="w-8 h-8 rounded-lg bg-black/40 flex items-center justify-center active:scale-90 transition-transform"
          >
            <Minus size={16} />
          </button>
          <span className="text-lg font-black">{item.stock}</span>
          <button 
            onClick={(e) => { e.stopPropagation(); onAdjustStock?.(item.id, 1); }}
            className="w-8 h-8 rounded-lg bg-black/40 flex items-center justify-center active:scale-90 transition-transform"
          >
            <Plus size={16} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      disabled={isOutOfStock}
      onClick={() => onAdd?.(item)}
      className={`${item.color} ${isOutOfStock ? 'opacity-40 grayscale' : 'active:scale-95'} relative transition-all duration-75 rounded-2xl p-6 flex flex-col items-center justify-center space-y-2 shadow-lg shadow-black/20 border-b-4 border-black/20 overflow-hidden min-h-[160px]`}
    >
      <div className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-tighter ${item.stock < 5 ? 'bg-red-500 animate-pulse' : 'bg-black/40'}`}>
        {hasOptions 
          ? `${item.options.reduce((acc, o) => acc + o.stock, 0)} left`
          : `${item.stock} left`}
      </div>

      {hasOptions && (
        <div className="absolute top-2 left-2 p-1.5 bg-white/20 rounded-lg backdrop-blur-sm">
          <Layers size={14} className="text-white" />
        </div>
      )}

      <span className="text-5xl">{item.icon}</span>
      <span className="font-black text-lg uppercase tracking-tight text-white leading-tight">
        {item.name}
      </span>
      
      {isOutOfStock ? (
        <span className="bg-red-600 px-3 py-1 rounded-full text-xs font-black text-white">
          SOLD OUT
        </span>
      ) : (
        <span className="bg-black/20 px-3 py-1 rounded-full text-sm font-extrabold text-white">
          ${item.price}
        </span>
      )}

      {hasOptions && !isOutOfStock && (
        <span className="text-[8px] font-black uppercase text-white/50 tracking-widest mt-1">Tap for flavors</span>
      )}
    </button>
  );
};