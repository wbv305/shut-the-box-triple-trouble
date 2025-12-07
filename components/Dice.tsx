import React from 'react';

interface DiceProps {
  value: number;
  rolling: boolean;
}

const Dot = () => <div className="w-2.5 h-2.5 bg-black rounded-full" />;

export const Dice: React.FC<DiceProps> = ({ value, rolling }) => {
  // Map dice values to dot positions
  const renderDots = (val: number) => {
    switch (val) {
      case 1:
        return <div className="flex items-center justify-center w-full h-full"><Dot /></div>;
      case 2:
        return (
          <div className="flex justify-between p-2 w-full h-full">
            <div className="self-start"><Dot /></div>
            <div className="self-end"><Dot /></div>
          </div>
        );
      case 3:
        return (
          <div className="flex justify-between p-2 w-full h-full">
            <div className="self-start"><Dot /></div>
            <div className="self-center"><Dot /></div>
            <div className="self-end"><Dot /></div>
          </div>
        );
      case 4:
        return (
          <div className="flex flex-col justify-between p-2 w-full h-full">
            <div className="flex justify-between"><Dot /><Dot /></div>
            <div className="flex justify-between"><Dot /><Dot /></div>
          </div>
        );
      case 5:
        return (
          <div className="flex flex-col justify-between p-2 w-full h-full">
            <div className="flex justify-between"><Dot /><Dot /></div>
            <div className="absolute inset-0 flex items-center justify-center"><Dot /></div>
            <div className="flex justify-between"><Dot /><Dot /></div>
          </div>
        );
      case 6:
        return (
          <div className="flex flex-col justify-between p-2 w-full h-full">
            <div className="flex justify-between"><Dot /><Dot /></div>
            <div className="flex justify-between"><Dot /><Dot /></div>
            <div className="flex justify-between"><Dot /><Dot /></div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div
      className={`relative w-16 h-16 bg-white rounded-xl shadow-[0_4px_0_#999] border-2 border-gray-200 transition-transform duration-300 ${
        rolling ? 'animate-spin' : ''
      }`}
    >
      {renderDots(value)}
    </div>
  );
};
