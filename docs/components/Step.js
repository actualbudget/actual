import React from 'react';

export default function Step({ n, text }) {
  return (
    <div className="flex items-center flex-row mb-6 mt-12">
      <div className="w-10 h-10 text-teal-100 relative flex items-center justify-center">
        <div className="w-10 h-10 rounded-full bg-teal-500 absolute top-0 left-0" />
        <div className="z-10" style={{ lineHeight: '1em' }}>
          {n}
        </div>
      </div>

      <div className="ml-3 font-bold">{text}</div>
    </div>
  );
}
