import { MachineConfig, MachineId, RecipeConfig, RecipeId } from '@/types/game';

export const RECIPES: Record<RecipeId, RecipeConfig> = {
  bread: { id: 'bread', machine: 'machine_oven', inputs: { wheat: 1 }, output: { id: 'bread', count: 3 }, seconds: 30 },
  pumpkin_pie: {
    id: 'pumpkin_pie',
    machine: 'machine_oven',
    inputs: { pumpkin: 1, egg: 1, wheat: 1 },
    output: { id: 'pumpkin_pie', count: 1 },
    seconds: 180,
  },
  carrot_juice: {
    id: 'carrot_juice',
    machine: 'machine_kitchen',
    inputs: { carrot: 3 },
    output: { id: 'carrot_juice', count: 1 },
    seconds: 60,
  },
  tomato_sauce: {
    id: 'tomato_sauce',
    machine: 'machine_kitchen',
    inputs: { tomato: 3 },
    output: { id: 'tomato_sauce', count: 1 },
    seconds: 120,
  },
  flan: { id: 'flan', machine: 'machine_kitchen', inputs: { egg: 1, milk: 1 }, output: { id: 'flan', count: 1 }, seconds: 120 },
  fish_stew: {
    id: 'fish_stew',
    machine: 'machine_kitchen',
    inputs: { mackerel: 1, tomato: 1 },
    output: { id: 'fish_stew', count: 1 },
    seconds: 120,
  },
  strawberry_jam: {
    id: 'strawberry_jam',
    machine: 'machine_kitchen',
    inputs: { strawberry: 3 },
    output: { id: 'strawberry_jam', count: 1 },
    seconds: 120,
  },
  honey_cake: {
    id: 'honey_cake',
    machine: 'machine_oven',
    inputs: { wheat: 1, honey: 1, egg: 1 },
    output: { id: 'honey_cake', count: 1 },
    seconds: 150,
  },
  cheese: { id: 'cheese', machine: 'machine_cheese', inputs: { milk: 1 }, output: { id: 'cheese', count: 1 }, seconds: 120 },
  wool_scarf: {
    id: 'wool_scarf',
    machine: 'machine_loom',
    inputs: { wool: 2 },
    output: { id: 'wool_scarf', count: 1 },
    seconds: 180,
  },
};

export const MACHINES: Record<MachineId, MachineConfig> = {
  machine_oven: {
    id: 'machine_oven',
    name: 'Lò Nướng Bánh',
    icon: '🔥',
    price: 250,
    footprint: 1.0,
    description: 'Lò gạch nướng bánh mì nóng giòn, bánh bí ngô thơm lừng và bánh mật ong.',
    recipes: ['bread', 'pumpkin_pie', 'honey_cake'],
  },
  machine_kitchen: {
    id: 'machine_kitchen',
    name: 'Bếp Nấu Ăn',
    icon: '🍳',
    price: 350,
    footprint: 1.1,
    description: 'Bếp củi nấu nước ép, sốt cà chua, mứt dâu, bánh flan và cá kho tộ.',
    recipes: ['carrot_juice', 'tomato_sauce', 'strawberry_jam', 'flan', 'fish_stew'],
  },
  machine_cheese: {
    id: 'machine_cheese',
    name: 'Máy Làm Phô Mai',
    icon: '🧀',
    price: 450,
    footprint: 0.9,
    description: 'Máy ép gỗ biến sữa tươi thành bánh phô mai.',
    recipes: ['cheese'],
  },
  machine_loom: {
    id: 'machine_loom',
    name: 'Khung Dệt Len',
    icon: '🧶',
    price: 400,
    footprint: 1.1,
    description: 'Khung cửi dệt lông cừu thành khăn len ấm áp.',
    recipes: ['wool_scarf'],
  },
};

export const MACHINE_LIST: MachineConfig[] = Object.values(MACHINES);

export const isMachineId = (id: string): id is MachineId => id in MACHINES;
