import React from 'react';

import Link from '@docusaurus/Link';

import classes from './Button.module.css';

export default function Button({ primary, to, className, ...props }) {
  return (
    <Link
      className={`${classes.button} ${
        primary ? classes.primary : ''
      } ${className}`}
      to={to}
      {...props}
    />
  );
}
