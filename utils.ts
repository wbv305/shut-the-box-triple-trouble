import { TileData } from './types';

/**
 * Checks if a specific tile is currently interactive based on game rules.
 * Rule: A tile is available if it is OPEN and the tile immediately in front of it (row - 1) is SHUT OR SELECTED.
 * Row 0 is always available if open.
 */
export const isTileAvailable = (tile: TileData, allTiles: TileData[], selectedTileIds: string[] = []): boolean => {
  if (tile.status === 'shut') return false;
  if (tile.row === 0) return true;

  // Find the tile directly in front (same column, row - 1)
  const frontTile = allTiles.find(t => t.col === tile.col && t.row === tile.row - 1);
  
  // If front tile exists, this is available if front is shut OR front is currently selected
  if (frontTile) {
    return frontTile.status === 'shut' || selectedTileIds.includes(frontTile.id);
  }
  
  return true;
};

/**
 * Checks if any valid combination of tiles sums up to the target.
 * Supports the rule where multiple tiles in a column can be selected in a chain.
 */
export const canMakeSum = (target: number, allTiles: TileData[]): boolean => {
  // Group by columns
  const columns: TileData[][] = Array.from({ length: 9 }, () => []);
  allTiles.forEach(t => columns[t.col].push(t));
  
  // Ensure sorted by row (0 -> 1 -> 2)
  columns.forEach(col => col.sort((a, b) => a.row - b.row));

  // Generate valid sum options for each column
  // For each column, we can pick a chain of N open tiles starting from the first open one.
  const columnOptions: number[][] = columns.map(colTiles => {
    const options = [0]; // We can always choose to pick nothing from a column
    let currentChainSum = 0;
    
    for (const tile of colTiles) {
      if (tile.status === 'shut') {
        // If tile is shut, it doesn't contribute to the sum, but allows access to the next one
        continue;
      }
      // If tile is open, we can include it in a selection chain
      currentChainSum += tile.value;
      options.push(currentChainSum);
    }
    return options;
  });

  // Recursive check to see if any combination of column options sums to target
  const check = (colIndex: number, currentSum: number): boolean => {
    if (currentSum === target) return true;
    if (currentSum > target) return false;
    if (colIndex >= 9) return false;

    const possibleValues = columnOptions[colIndex];
    for (const val of possibleValues) {
      if (check(colIndex + 1, currentSum + val)) return true;
    }
    return false;
  };

  return check(0, 0);
};

export const rollDie = () => Math.floor(Math.random() * 6) + 1;
