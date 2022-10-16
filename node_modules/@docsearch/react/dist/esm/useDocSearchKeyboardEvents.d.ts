import React from 'react';
export interface UseDocSearchKeyboardEventsProps {
    isOpen: boolean;
    onOpen: () => void;
    onClose: () => void;
    onInput?: (event: KeyboardEvent) => void;
    searchButtonRef?: React.RefObject<HTMLButtonElement>;
}
export declare function useDocSearchKeyboardEvents({ isOpen, onOpen, onClose, onInput, searchButtonRef, }: UseDocSearchKeyboardEventsProps): void;
