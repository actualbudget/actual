import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
} from 'react';
import { useLocalPref } from '../hooks/useLocalPref';
import { useMove } from 'react-aria';

const ColumnWidthContext = createContext();

export const ColumnWidthProvider = ({ children }) => {
  const [columnSizePrefs, setColumnSizePrefs] = useLocalPref(
    'transaction-column-sizes',
  );
  const [columnWidths, setColumnWidths] = useState({});
  const [fixedSizedColumns, setFixedSizedColumns] = useState({});
  const [deltaAccumulator, setDeltaAccumulator] = useState(0);
  const refs = useRef({});

  useEffect(() => {
    if (columnSizePrefs) {
      setColumnWidths(JSON.parse(columnSizePrefs));
    }
  }, [columnSizePrefs]);

  const totalSize = useCallback(() => {
    const currentTotalWidth = Object.values(columnWidths).reduce(
      (acc, width) => acc + width,
      0,
    );
    const otherColumnsWidth = Object.values(fixedSizedColumns).reduce(
      (acc, width) => acc + width + 10, //plus 10 cuz the divider must be counted
      0,
    );

    return otherColumnsWidth + currentTotalWidth;
  });

  const handleDoubleClick = useCallback((columnName) => {
    setColumnWidths(prevWidths => ({
      ...prevWidths,
      [columnName]: -1,
    }));

    setTimeout(() => {
      let maximum = -1;
      document.querySelectorAll(`[data-resizeable-column=${columnName}]`).forEach(row => {
        const rect = row.getBoundingClientRect();
        const styles = getComputedStyle(row);
        const localValue = Math.max(rect.width + parseFloat(styles.marginLeft) + parseFloat(styles.marginRight), 110);

        if(localValue > maximum) {
          maximum = localValue;
        }
      });

      setColumnWidths(prevWidths => ({
        ...prevWidths,
        [columnName]: maximum,
      }));

      savePrefs();
    }, 100);
  });

  const setFixedColumn = useCallback(fixedColumns => {
    setFixedSizedColumns(fixedColumns);
  });

  const getViewportWidth = () => window.innerWidth;
  const updateColumnWidth = useCallback(
    (columnName, accumulatedDelta) => {
      const newWidth = accumulatedDelta;

      const currentTotalWidth = Object.values(columnWidths)
        .filter(col => col !== columnName)
        .reduce((acc, width) => acc + width, 0);
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

      setColumnWidths(prevWidths => ({
        ...prevWidths,
        [columnName]: Math.max(adjustedWidth, 110),
      }));
    },
    [columnWidths],
  );

  const savePrefs = useCallback(() => {
    setColumnSizePrefs(JSON.stringify(columnWidths));
  }, [columnWidths, setColumnSizePrefs]);

  const handleMoveProps = (columnName, ref, resizerRef) => {
    let animationFrameId = null;

    const updateLinePosition = deltaX => {
      setDeltaAccumulator(prevDelta => {
        const newDelta = prevDelta + deltaX;
        updateColumnWidth(columnName, newDelta);
        return newDelta;
      });
    };

    return {
      onMoveStart(e) {
        if (resizerRef.current) {
          resizerRef.current.classList.add('dragging');
          const startWidth = columnWidths[columnName] || ref.offsetLeft || 110;
          setDeltaAccumulator(startWidth);
        }
      },
      onMove(e) {
        if (resizerRef.current) {
          updateLinePosition(e.deltaX);
        }
      },
      onMoveEnd(e) {
        savePrefs();
        if (resizerRef.current) {
          resizerRef.current.classList.remove('dragging');
        }
        if (animationFrameId) {
          cancelAnimationFrame(animationFrameId);
        }
        setDeltaAccumulator(0);
      },
    };
  };

  return (
    <ColumnWidthContext.Provider
      value={{ columnWidths, handleMoveProps, setFixedColumn, handleDoubleClick, totalSize, refs }}
    >
      {children}
    </ColumnWidthContext.Provider>
  );
};

export const useColumnWidth = () => {
  return useContext(ColumnWidthContext);
};
