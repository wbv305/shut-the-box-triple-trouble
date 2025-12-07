import { TileData } from './types';

/**
 * Checks if a specific tile is currently interactive based on game rules.
 * Rule: A tile is available if it is OPEN and the tile immediately in front of it (row - 1) is SHUT.
 * Row 0 is always available if open.
 */
export const isTileAvailable = (tile: TileData, allTiles: TileData[]): boolean => {
  if (tile.status === 'shut') return false;
  if (tile.row === 0) return true;

  // Find the tile directly in front (same column, row - 1)
  const frontTile = allTiles.find(t => t.col === tile.col && t.row === tile.row - 1);
  
  // If front tile exists and is shut, this one is available
  return frontTile ? frontTile.status === 'shut' : true;
};

/**
 * Checks if any subset of the available tiles sums up to the target.
 * This is a subset sum problem. Given N is small (max 27, usually <10 active), recursion is fine.
 */
export const canMakeSum = (target: number, availableTiles: TileData[]): boolean => {
  const values = availableTiles.map(t => t.value);
  
  const checkSubset = (index: number, currentSum: number): boolean => {
    if (currentSum === target) return true;
    if (index >= values.length || currentSum > target) return false;

    // Include current
    if (checkSubset(index + 1, currentSum + values[index])) return true;
    
    // Exclude current
    if (checkSubset(index + 1, currentSum)) return true;

    return false;
  };

  return checkSubset(0, 0);
};

export const rollDie = () => Math.floor(Math.random() * 6) + 1;
