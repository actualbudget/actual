import React from 'react';

import { render, screen, act, getByTestId } from '@testing-library/react';

import ElementQuery from './ElementQuery';

// Create a mock implementation of the ResizeObserver class
const ResizeObserverMock = jest.fn(callback => {
  ResizeObserverMock.callback = callback;
  return {
    observe: jest.fn(),
    disconnect: jest.fn()
  };
});

const mockGetBoundingClientRect = (width, height) => {
  return jest.fn(() => {
    return {
      width: width,
      height: height
    };
  });
};

global.ResizeObserver = ResizeObserverMock;

test('ElementQuery component', () => {
  const sizes = [{ width: 100 }, { width: 200 }];
  const testChild = jest.fn((matched, _elementRef) => {
    return (
      <div ref={_elementRef} data-testid="element">
        {matched ? `${matched.width}` : '0'}
      </div>
    );
  });

  const { container } = render(
    <ElementQuery sizes={sizes}>{testChild}</ElementQuery>
  );
  expect(testChild).toHaveBeenCalledWith(null, expect.any(Object));
  act(() => {
    let element = getByTestId(container, 'element');
    jest
      .spyOn(element, 'getBoundingClientRect')
      .mockImplementation(mockGetBoundingClientRect(50, 50));
    ResizeObserver.callback([{ contentRect: { width: 50, height: 50 } }]);
  });
  expect(testChild).toHaveBeenCalledWith({ width: 100 }, expect.any(Object));
  expect(screen.getByText('100')).toBeTruthy();

  act(() => {
    let element = getByTestId(container, 'element');
    jest
      .spyOn(element, 'getBoundingClientRect')
      .mockImplementation(mockGetBoundingClientRect(150, 150));
    ResizeObserver.callback([{ contentRect: { width: 150, height: 150 } }]);
  });
  expect(testChild).toHaveBeenCalledWith({ width: 200 }, expect.any(Object));
  expect(screen.getByText('200')).toBeTruthy();
});
