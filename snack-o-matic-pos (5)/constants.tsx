
import { SnackItem } from './types';

export const INVENTORY_DEFAULTS: SnackItem[] = [
  {
    id: 'munchie-bags',
    name: 'Munchie Bags',
    price: 5,
    color: 'bg-orange-500',
    icon: '🛍️',
    stock: 20
  },
  {
    id: 'chips',
    name: 'Chips',
    price: 2,
    color: 'bg-blue-500',
    icon: '🍟',
    options: ['Hot Cheetos lime', 'Hot Cheetos', 'Hot Funyuns', 'Hot Doritos', 'Hot Fritos'],
    stock: 24
  },
  {
    id: 'rice-krispies',
    name: 'Rice Krispies',
    price: 1,
    color: 'bg-cyan-400',
    icon: '🥣',
    stock: 30
  },
  {
    id: 'fruit-foot',
    name: 'Fruit by Foot',
    price: 1,
    color: 'bg-rose-500',
    icon: '🍬',
    stock: 30
  }
];

export const STORAGE_KEY = 'snack_pos_simple_v1';
