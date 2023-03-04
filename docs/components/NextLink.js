import React from 'react';

export default function NextLink({ href, children }) {
  return (
    <div className="flex flex-col items-center mt-16">
      <div className="link-color-inherit text-white">
        <a
          className="no-underline bg-blue-500 px-6 py-4 rounded-full shadow-lg"
          href={href}
        >
          {children}
        </a>
      </div>
    </div>
  );
}
