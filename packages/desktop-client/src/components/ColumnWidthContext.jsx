import React, { createContext, useContext, useState, useCallback } from 'react';

const ColumnWidthContext = createContext();

export const ColumnWidthProvider = ({ children }) => {
  const [columnWidths, setColumnWidths] = useState({});

  const updateColumnWidth = useCallback((columnName, width) => {
    setColumnWidths(prevWidths => ({
      ...prevWidths,
      [columnName]: Math.max(prevWidths[columnName] || 100, width),
    }));
  }, []);

  const resetColumnWidths = useCallback((columnName = '') => {
    if (columnName) {
      setColumnWidths(prevWidths => ({
        ...prevWidths,
        [columnName]: 0,
      }));
    } else {
      setColumnWidths({});
    }
  }, []);

  return (
    <ColumnWidthContext.Provider
      value={{ columnWidths, updateColumnWidth, resetColumnWidths }}
    >
      {children}
    </ColumnWidthContext.Provider>
  );
};

export const useColumnWidth = () => {
  return useContext(ColumnWidthContext);
};
