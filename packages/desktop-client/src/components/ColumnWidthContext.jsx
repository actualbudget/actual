import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from 'react';

import { useSyncedPref } from '../hooks/useSyncedPref';

const ColumnWidthContext = createContext();

export const ColumnWidthProvider = ({ children, prefName }) => {
  const [columnSizePrefs, setColumnSizePrefs] = useSyncedPref(prefName);
  const [columnWidths, setColumnWidths] = useState({});
  const [fixedSizedColumns, setFixedSizedColumns] = useState({});
  const [, setPositionAccumulator] = useState(0);
  const [clientWidth, setClientWidth] = useState(0);
  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    if (columnSizePrefs) {
      setColumnWidths(JSON.parse(columnSizePrefs));
    }
  }, [columnSizePrefs]);

  const totalWidth = useCallback(() => {
    const currentTotalWidth = Object.values(columnWidths).reduce(
      (acc, width) => acc + width,
      0,
    );

    const otherColumnsWidth = Object.entries(fixedSizedColumns)
      .filter(([key]) => !(key in columnWidths))
      .reduce((acc, [, width]) => acc + width + 10, 0);

    const widthSum = otherColumnsWidth + currentTotalWidth + 10;
    return widthSum > clientWidth ? widthSum : clientWidth;
  }, [columnWidths, fixedSizedColumns, clientWidth]);

  const savePrefs = useCallback(
    value => {
      setColumnSizePrefs(JSON.stringify(value ?? columnWidths));
    },
    [columnWidths, setColumnSizePrefs],
  );

  const removeColumn = columnName => {
    const { [columnName]: _, ...newObj } = columnWidths;
    setColumnWidths(newObj);
    savePrefs(newObj);
  };

  const resetAllColumns = () => {
    setColumnWidths({});
    savePrefs({});
  };

  const handleDoubleClick = columnName => {
    updateColumnWidth(columnName, -1);

    setTimeout(() => {
      let maximum = -1;
      document
        .querySelectorAll(`[data-resizeable-column=${columnName}]`)
        .forEach(row => {
          const rect = row.getBoundingClientRect();
          const styles = getComputedStyle(row);
          const localValue = Math.max(
            rect.width +
              parseFloat(styles.marginLeft) +
              parseFloat(styles.marginRight),
            110,
          );

          maximum = Math.max(localValue, maximum);
        });

      const newObj = updateColumnWidth(columnName, maximum);

      savePrefs(newObj);
    }, 100);
  };

  const setFixedColumn = useCallback(fixedColumns => {
    setFixedSizedColumns(fixedColumns);
  }, []);

  const getViewportWidth = useCallback(() => clientWidth, [clientWidth]);

  const updateColumnWidth = useCallback(
    (columnName, accumulatedDelta) => {
      const newWidth = accumulatedDelta;

      if (newWidth === -1) {
        const newObj = {
          ...columnWidths,
          [columnName]: newWidth,
        };
        setColumnWidths(newObj);
        return newObj;
      }

      const currentTotalWidth = Object.values(columnWidths).reduce(
        (acc, width) => acc + width,
        0,
      );
      const otherColumnsWidth = Object.values(fixedSizedColumns).reduce(
        (acc, width) => acc + width + 10,
        0,
      );

      const proposedTotalWidth =
        currentTotalWidth - otherColumnsWidth - newWidth;

      const viewportWidth = getViewportWidth();
      const adjustedWidth =
        proposedTotalWidth > viewportWidth
          ? viewportWidth - otherColumnsWidth
          : newWidth;

      const newObj = {
        ...columnWidths,
        [columnName]: Math.max(adjustedWidth, 110),
      };

      setColumnWidths(newObj);

      return newObj;
    },
    [columnWidths, fixedSizedColumns, getViewportWidth],
  );

  const handleMoveProps = (columnName, ref, resizerRef) => {
    const animationFrameId = null;

    const updatePosition = deltaX => {
      setPositionAccumulator(prevDelta => {
        const newDelta = prevDelta + deltaX;
        updateColumnWidth(columnName, newDelta);
        return newDelta;
      });
    };

    return {
      onMoveStart() {
        if (resizerRef.current) {
          resizerRef.current.classList.add('dragging');
          let columnWidth = columnWidths[columnName];
          if (!columnWidth) {
            const rect = ref.getBoundingClientRect();
            columnWidth = rect.width;
          }
          const startWidth = columnWidth;
          setPositionAccumulator(startWidth);
        }
      },
      onMove(e) {
        if (resizerRef.current) {
          updatePosition(e.deltaX);
        }
      },
      onMoveEnd() {
        savePrefs();
        if (resizerRef.current) {
          resizerRef.current.classList.remove('dragging');
        }
        if (animationFrameId) {
          cancelAnimationFrame(animationFrameId);
        }
        setPositionAccumulator(0);
      },
    };
  };

  return (
    <ColumnWidthContext.Provider
      value={{
        columnWidths,
        handleMoveProps,
        setFixedColumn,
        handleDoubleClick,
        totalWidth,
        removeColumn,
        clientWidth,
        setClientWidth,
        resetAllColumns,
        editMode,
        setEditMode,
        fixedSizedColumns,
      }}
    >
      {children}
    </ColumnWidthContext.Provider>
  );
};

export const useColumnWidth = () => {
  const context = useContext(ColumnWidthContext);
  if (!context) {
    throw new Error('useColumnWidth must be used within a ColumnWidthProvider');
  }
  return context;
};
