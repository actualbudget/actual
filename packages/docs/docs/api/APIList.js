import React from 'react';

export default function APIList({ title, sections }) {
  return (
    <div className="mt-4">
      <div className="">{title}</div>

      <ul>
        {sections.map(name => {
          let id = name.replace(/[ -]/g, '-').toLowerCase();
          return (
            <li
              key={id}
              className="list-none m-0 mt-1 pl-4 text-sm link-color-inherit text-gray-700"
            >
              <a className="no-underline" href={'#' + id}>
                {name}
              </a>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
