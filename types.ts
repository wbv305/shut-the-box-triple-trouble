export type GameStatus = 'start' | 'playing' | 'won' | 'lost';

export interface TileData {
  id: string;
  row: number; // 0 = Front (Purple), 1 = Mid (Blue), 2 = Back (Teal)
  col: number; // 0-8 (representing numbers 1-9)
  value: number;
  status: 'open' | 'shut';
}

export interface DiceState {
  values: [number, number];
  rolling: boolean;
}
