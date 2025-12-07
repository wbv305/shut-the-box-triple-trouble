import React from 'react';
import { TileData } from '../types';

interface TileProps {
  tile: TileData;
  available: boolean;
  selected: boolean;
  onClick: (tile: TileData) => void;
}

export const Tile: React.FC<TileProps> = ({ tile, available, selected, onClick }) => {
  const { row, value, status } = tile;

  // Colors
  const baseColor =
    row === 0 ? 'bg-purple-700 border-purple-900 shadow-purple-900/50' : 
    row === 1 ? 'bg-blue-700 border-blue-900 shadow-blue-900/50' : 
    'bg-teal-700 border-teal-900 shadow-teal-900/50';
    
  const selectedColor = 'bg-yellow-400 border-yellow-600 text-yellow-900 shadow-yellow-500/50';

  // If status is 'shut', render an invisible element that allows clicks to pass through
  if (status === 'shut') {
    return (
      <div className="w-full h-full pointer-events-none">
         {/* Invisible placeholder to maintain grid layout, but lets clicks through */}
      </div>
    );
  }

  // Common classes for Open tiles
  let classes = `
    relative flex items-center justify-center 
    w-full h-24 sm:h-32 lg:h-40
    rounded-lg border-b-8 border-r-2 border-l-2 border-t-0
    text-3xl sm:text-4xl font-black shadow-xl 
    transition-all duration-300 ease-out select-none
    pointer-events-auto
  `;

  if (selected) {
    classes += ` ${selectedColor} -translate-y-4 sm:-translate-y-6 z-30`;
  } else if (available) {
    classes += ` ${baseColor} text-white cursor-pointer hover:-translate-y-2 hover:brightness-110 active:translate-y-1 active:border-b-4`;
  } else {
    // Visible but locked (blocked by front row)
    classes += ` ${baseColor} text-white/50 cursor-not-allowed grayscale-[0.3] brightness-75`;
  }

  return (
    <div className="w-full h-full flex items-end pointer-events-none">
      <div
        onClick={() => available && onClick(tile)}
        className={classes}
      >
        <span className="drop-shadow-md">{value}</span>
      </div>
    </div>
  );
};