import React, { useEffect, useState } from 'react';

function title(str) {
  if (str.length > 0) {
    return str[0].toUpperCase() + str.slice(1).toLowerCase();
  }
  return '';
}

function detectMac() {
  return /(Mac|iPhone|iPod|iPad)/i.test(navigator.platform);
}

function transform(mod, isMacLike) {
  if (isMacLike) {
    return mod;
  }

  switch (mod.toLowerCase()) {
    case 'cmd':
      return 'ctrl';
    default:
      return mod;
  }
}

export default function Key({ mod, mods = [], k }) {
  let [isMacLike, setMacLike] = useState(true);

  useEffect(() => {
    setMacLike(detectMac());
  }, []);

  if (mod) {
    mods = [mod];
  }

  mods = mods.map(mod => transform(mod, isMacLike)).map(title);

  let keys = [...mods, k];

  return (
    <div className="inline-block">
      {keys.reduce((acc, key, idx) => {
        if (idx !== 0) {
          acc.push(<span className="ml-1"></span>);
        }
        acc.push(
          <div className="bg-gray-300 inline-block rounded px-1">{key}</div>,
        );
        return acc;
      }, [])}
    </div>
  );
}
