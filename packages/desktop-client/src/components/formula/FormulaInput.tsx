import React, {
  useState,
  useRef,
  useEffect,
  forwardRef,
  FocusEventHandler,
} from 'react';
import {
  getCurrentParameterIndex,
  getCustomVariables,
  getFunctionParameterInfo,
  getFunctionSuggestions,
  validateExcelFormula,
} from './excelFormula';
import { View } from '@actual-app/components/view';
import { Text } from '@actual-app/components/text';
import { Input } from '@actual-app/components/input';
import { useMergedRefs } from '../../hooks/useMergedRefs';
import { Popover } from '@actual-app/components/popover';
import { Menu } from '@actual-app/components/menu';

interface ExcelFormulaInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled: boolean;
  onBlur?: FocusEventHandler<HTMLInputElement> | undefined;
}

export const ExcelFormulaInput = forwardRef<
  HTMLInputElement,
  ExcelFormulaInputProps
>(
  (
    { value, onChange, placeholder = 'Formula', disabled, onBlur = null },
    ref,
  ) => {
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [cursorPosition, setCursorPosition] = useState(0);
    const [parameterInfo, setParameterInfo] = useState<{
      functionName: string;
      parameters: string[];
      currentParameter: number;
      description: string;
    } | null>(null);

    const inputRef = useRef<HTMLInputElement>(null);

    const mergedRef = useMergedRefs(inputRef, ref);

    useEffect(() => {
      if (value.startsWith('=')) {
        const functionSuggestions = getFunctionSuggestions(value);
        const isInsideFunction = /=.*\([^)]*$/.test(value);
        //const customVars = isInsideFunction ? getCustomVariables() : [];
        if (functionSuggestions.length > 0) {
          setSuggestions([...functionSuggestions]);
          setShowSuggestions(true);
        }
      } else if (showSuggestions) {
        setShowSuggestions(false);
      }
    }, [value]);

    useEffect(() => {
      if (value.startsWith('=')) {
        const { functionName, parameterIndex, openParens } = getCurrentParameterIndex(
          value,
          cursorPosition,
        );
        if (functionName && openParens) {
          const { parameters, description } =
            getFunctionParameterInfo(functionName);
          setParameterInfo({
            functionName,
            parameters,
            currentParameter: parameterIndex,
            description,
          });
        } else {
          setParameterInfo(null);
        }
      } else {
        setParameterInfo(null);
      }
    }, [value, cursorPosition]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(e.target.value);
      setCursorPosition(e.target.selectionStart || 0);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.ctrlKey && e.key === ' ') {
        e.preventDefault();

        if (value.startsWith('=')) {
          const isInsideFunction = /=.*\([^)]*$/.test(value);
          const customVars = isInsideFunction ? getCustomVariables() : [];
          if (customVars.length > 0) {
            setSuggestions([...customVars]);
            setShowSuggestions(true);
          }
        } else if (showSuggestions) {
          setShowSuggestions(false);
        }
      } else {
        setTimeout(() => {
          if (inputRef.current) {
            setCursorPosition(inputRef.current.selectionStart || 0);
          }
        }, 0);
      }
    };

    const insertSuggestion = (suggestion: string) => {
      if (!value.startsWith('=')) {
        onChange(`=${suggestion}(`);
      } else {
        const beforeCursor = value.substring(0, cursorPosition);
        const match = beforeCursor.match(/[A-Za-z0-9_]*$/);
        if (match) {
          const wordStart = cursorPosition - match[0].length;
          const newValue =
            value.substring(0, wordStart) +
            suggestion +
            (!suggestion.match(/^[A-Z]+$/) ? '' : '(') +
            value.substring(cursorPosition);
          onChange(newValue);
          setTimeout(() => {
            if (inputRef.current) {
              const newPosition =
                wordStart +
                suggestion.length +
                (suggestion.match(/^[A-Z]+$/) ? 0 : 1);
              inputRef.current.setSelectionRange(newPosition, newPosition);
              setCursorPosition(newPosition);
            }
          }, 0);
        }
      }
      setShowSuggestions(false);
    };

    const { isValid, error } = validateExcelFormula(value);

    return (
      <View style={{ position: 'relative', width: '50%' }}>
        <Input
          inputRef={mergedRef}
          type="text"
          value={value}
          onChange={handleChange}
          onBlur={onBlur}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={placeholder}
          style={{
            marginTop: 50,
            width: '100%',
            padding: '0.5rem',
            border: `1px solid ${!isValid ? 'red' : '#ccc'}`,
            borderRadius: '4px',
            outline: 'none',
          }}
        />

        <Popover
          isOpen={showSuggestions && suggestions.length > 0}
          triggerRef={inputRef}
          onOpenChange={isOpen => {
            if (!isOpen) {
              setShowSuggestions(false);
            }
          }}
        >
          <View>
            <Menu
              items={suggestions.map((suggestion, index) => ({
                name: suggestion,
                text: suggestion,
              }))}
              onMenuSelect={selectedSuggestion => {
                insertSuggestion(selectedSuggestion);
                setTimeout(() => {
                  if (inputRef.current) {
                    inputRef.current.focus();
                  }
                }, 0);
              }}
            />
          </View>
        </Popover>

        {parameterInfo && (
          <View
            style={{
              position: 'absolute',
              zIndex: 50,
              top: '100%',
              left: 0,
              marginTop: '0.25rem',
              backgroundColor: 'white',
              border: '1px solid #ccc',
              borderRadius: '4px',
              boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
              padding: '0.5rem',
              width: '16rem',
            }}
          >
            <Text style={{ fontWeight: '500' }}>
              {parameterInfo.functionName}(
            </Text>
            <Text style={{ fontSize: '0.875rem' }}>
              {parameterInfo.parameters.map((param, index) => (
                <Text
                  key={index}
                  style={{
                    fontWeight:
                      index === parameterInfo.currentParameter
                        ? 'bold'
                        : 'normal',
                    color:
                      index === parameterInfo.currentParameter
                        ? 'blue'
                        : 'inherit',
                  }}
                >
                  {index > 0 ? ', ' : ''}
                  {param}
                </Text>
              ))}
              <Text>)</Text>
            </Text>
            <Text
              style={{
                fontSize: '0.75rem',
                color: '#6b7280',
                marginTop: '0.25rem',
              }}
            >
              {parameterInfo.description}
            </Text>
          </View>
        )}
      </View>
    );
  },
);
