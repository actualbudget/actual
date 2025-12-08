import React, { useEffect, useState } from 'react';
import classes from './Key.module.css';

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

const arrows = {
  up: '↑',
  down: '↓',
  left: '←',
  right: '→',
};

export default function Key({ mod, fixed, mods = [], k, arrow }) {
  let [isMacLike, setMacLike] = useState(true);

  useEffect(() => {
    setMacLike(detectMac());
  }, []);

  if (mod) {
    mods = mod.split(' ');
  }

  if (arrow) {
    k = arrows[arrow];
  }

  mods = mods.map(mod => (fixed ? mod : transform(mod, isMacLike))).map(title);

  let keys = [...mods, title(k)];

  return (
    <div style={{ display: 'inline-flex' }}>
      {keys.map((key, idx) => (
        <div
          key={idx}
          className={classes.key}
          style={{ marginLeft: idx === 0 ? 0 : '0.25rem' }}
        >
          {key}
        </div>
      ))}
    </div>
  );
}
