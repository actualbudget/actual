import { useEffect, useRef, useState } from 'react';

import useResizeObserver from './useResizeObserver';

// Helper function that finds the first size in the sizes array that
// is larger than the element's dimensions. If no such size is found,
// it returns the last size in the array.
function findMatch(element, sizes) {
  const rect = element.getBoundingClientRect();
  const matched = sizes.find(size => {
    return (
      (size.width != null && rect.width < size.width) ||
      (size.height != null && rect.height < size.height)
    );
  });
  return matched || sizes[sizes.length - 1];
}

// Component
function ElementQuery({ children, sizes }) {
  const elementRef = useRef(null);
  const [matched, setMatched] = useState(null);
  const observe = useResizeObserver(() => {
    setMatched(findMatch(elementRef.current, sizes));
  });

  useEffect(() => {
    observe(elementRef.current);
    return () => observe(null);
  }, []);

  return children(matched, elementRef);
}

export default ElementQuery;
