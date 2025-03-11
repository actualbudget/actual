import React, { useState, useRef, useEffect } from 'react';
import { useDispatch } from '../../redux';
import { addNotification } from 'loot-core/client/notifications/notificationsSlice';
import { View } from '@actual-app/components/view';
import {
  Dialog,
  DialogTrigger,
  Heading,
  TextArea,
} from 'react-aria-components';
import { Button } from '@actual-app/components/button';
import { Text } from '@actual-app/components/text';
import {
  SvgAdd,
  SvgDownload,
  SvgExclamationSolid,
  SvgUpload,
} from '@actual-app/components/icons/v1';
import { SvgRemove } from '@actual-app/components/icons/v2';
import { Popover } from '@actual-app/components/popover';
import { validateFormula } from './formulaValidator';
import { Menu } from '@actual-app/components/menu';
import { Input } from '@actual-app/components/input';
import { css } from '@emotion/css';
import { ExcelFormulaInput } from './FormulaInput';

export type FormulaNode = {
  id: string;
  type: string;
  value?: string | number;
  from?: FormulaNode;
  to?: FormulaNode;
  left?: FormulaNode;
  right?: FormulaNode;
  base?: FormulaNode;
  exponent?: FormulaNode;
};

type ChildKey = 'from' | 'to' | 'left' | 'right' | 'base' | 'exponent';

export default function FormulaEditor({
  formula,
  setFormula,
}: {
  formula: FormulaNode | null;
  setFormula: React.Dispatch<React.SetStateAction<FormulaNode | null>>;
}) {
  const [importText, setImportText] = useState('');
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const dispatch = useDispatch();
  const [formulaEdittingNode, setFormulaEdittingNode] = useState<FormulaNode>(null);
  const [excelText, setExcelText] = useState<string>("");
  
  const formulaInput = useRef<HTMLInputElement>(null);

  const initialSelectorRef = useRef<HTMLDivElement>(null);

  // Create a new node by type – no default children
  function createNode(type: string): FormulaNode {
    return { id: crypto.randomUUID(), type };
  }

  // Update Handlers
  const handleAddOperator = (
    type: string,
    parent: FormulaNode | null,
    position: string | null,
  ) => {
    const newNode = createNode(type);
    setFormula(prevFormula => {
      if (!parent) return newNode;
      if (!prevFormula) return null;
      const updatedFormula = JSON.parse(
        JSON.stringify(prevFormula),
      ) as FormulaNode;

      function updateNode(node: FormulaNode): FormulaNode {
        if (node.id === parent.id && position) {
          return { ...node, [position]: newNode };
        }
        for (const key of [
          'from',
          'to',
          'left',
          'right',
          'base',
          'exponent',
        ] as const) {
          if (node[key]) {
            node[key] = updateNode(node[key] as FormulaNode);
          }
        }
        return node;
      }
      return updateNode(updatedFormula);
    });
  };

  const handleValueChange = (node: FormulaNode, value: string) => {
    setFormula(prevFormula => {
      if (!prevFormula) return null;
      const updatedFormula = JSON.parse(
        JSON.stringify(prevFormula),
      ) as FormulaNode;
      function updateNode(n: FormulaNode): FormulaNode {
        if (n.id === node.id) {
          return { ...n, value };
        }
        for (const key of [
          'from',
          'to',
          'left',
          'right',
          'base',
          'exponent',
        ] as const) {
          if (n[key]) {
            n[key] = updateNode(n[key] as FormulaNode);
          }
        }
        return n;
      }
      return updateNode(updatedFormula);
    });
  };

  const handleRemoveNode = (
    parent: FormulaNode | null,
    node: FormulaNode,
    position: string | null,
  ) => {
    setFormula(prevFormula => {
      if (!prevFormula) return null;
      if (!parent) return null; // removing the root node
      const updatedFormula = JSON.parse(
        JSON.stringify(prevFormula),
      ) as FormulaNode;
      function updateNode(n: FormulaNode): FormulaNode {
        if (n.id === parent.id && position) {
          const updatedParent = { ...n };
          delete (updatedParent as Record<ChildKey, FormulaNode | undefined>)[
            position as ChildKey
          ];
          return updatedParent;
        }
        for (const key of [
          'from',
          'to',
          'left',
          'right',
          'base',
          'exponent',
        ] as const) {
          if (n[key]) {
            n[key] = updateNode(n[key] as FormulaNode);
          }
        }
        return n;
      }
      return updateNode(updatedFormula);
    });
  };

  // Validation
  const handleValidate = () => {
    const errors = validateFormula(formula);
    setValidationErrors(errors);
    if (errors.length === 0) {
      dispatch(
        addNotification({
          notification: {
            type: 'message',
            title: 'Formula is valid',
            message: 'All operators and leaf nodes are correctly filled.',
            sticky: false,
          },
        }),
      );
    }
  };

  // Import / Export
  const exportFormula = () => {
    if (!formula) return;
    try {
      const json = JSON.stringify(formula, null, 2);
      navigator.clipboard.writeText(json);
      dispatch(
        addNotification({
          notification: {
            type: 'message',
            title: 'Formula exported to clipboard',
            message: 'The formula JSON has been copied to your clipboard.',
            sticky: false,
          },
        }),
      );
    } catch (error) {
      dispatch(
        addNotification({
          notification: {
            type: 'error',
            title: 'Export failed',
            message: 'There was an error exporting the formula.',
            sticky: true,
          },
        }),
      );
    }
  };

  const importFormula = () => {
    try {
      const parsed = JSON.parse(importText);
      setFormula(parsed);
      dispatch(
        addNotification({
          notification: {
            type: 'message',
            title: 'Formula imported successfully',
            message: 'The formula has been loaded into the editor.',
            sticky: false,
          },
        }),
      );
    } catch (error) {
      dispatch(
        addNotification({
          notification: {
            type: 'error',
            title: 'Import failed',
            message: 'The JSON format is invalid. Please check and try again.',
            sticky: true,
          },
        }),
      );
    }
  };

  return (
    <View style={{ flexDirection: 'column', gap: '1.5rem', height: '100vh' }}>
      {/* Top Toolbar: Import / Export / Validate */}
      <View style={{ flexDirection: 'row', gap: '1rem' }}>
        <DialogTrigger>
          <Button
            variant="normal"
            style={{ display: 'flex', alignItems: 'center' }}
          >
            <SvgUpload
              style={{ marginRight: '0.5rem', height: '2rem', width: '2rem' }}
            />
            Import Formula
          </Button>
          <Popover>
            <Heading>Import Formula</Heading>
            <TextArea
              placeholder="Paste JSON formula here..."
              style={{ minHeight: '200px' }}
              value={importText}
              onChange={e => setImportText(e.target.value)}
            />
            <Button onPress={importFormula}>Import</Button>
          </Popover>
        </DialogTrigger>

        <Button variant="normal" onPress={exportFormula} isDisabled={!formula}>
          <SvgDownload
            style={{ marginRight: '0.5rem', height: '2rem', width: '2rem' }}
          />
          Export Formula
        </Button>
        <Button variant="normal" onPress={handleValidate} isDisabled={!formula}>
          Validate Formula
        </Button>
      </View>

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <Text
          style={{
            display: 'block',
            border: '1px solid red',
            padding: '0.5rem',
            borderRadius: '0.375rem',
            color: 'red',
            margin: '0.5rem 0',
          }}
        >
          <SvgExclamationSolid
            style={{ height: '1rem', width: '1rem', marginRight: '0.5rem' }}
          />
          <span style={{ fontWeight: 'bold' }}>Validation Errors</span>
          <span>
            <ul
              style={{ listStyleType: 'disc', paddingLeft: '1rem', margin: 0 }}
            >
              {validationErrors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </span>
        </Text>
      )}

      {/* Main Formula Editor UI */}
      <View
        style={{
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {!formula ? (
          <View style={{ position: 'relative' }}>
            <DialogTrigger>
              <Button
                variant="normal"
                style={{
                  height: '3rem',
                  width: '3rem',
                  alignItems: 'center',
                  justifyContent: 'center',
                  display: 'flex',
                }}
              >
                <SvgAdd style={{ height: '2rem', width: '2rem' }} />
              </Button>
              <OperationPopover
                onMenuSelect={opType => handleAddOperator(opType, null, null)}
              />
            </DialogTrigger>
          </View>
        ) : (
          // Render root node
          <FormulaNodeView
            node={formula}
            parent={null}
            position={null}
            onAddOperator={handleAddOperator}
            onValueChange={handleValueChange}
            onRemoveNode={handleRemoveNode}
            errors={validationErrors}
            setFocusedEdit={(node) => {
                setFormulaEdittingNode(node);
                setExcelText(node?.value?.toString() ?? "");
            }}
          />
        )}
        <ExcelFormulaInput
          ref={formulaInput}
          placeholder={
            formulaEdittingNode === null
              ? 'Select a node'
              : 'Start typing here'
          }
          value={excelText}
          disabled={formulaEdittingNode === null}
          onChange={newValue => {
            if (formulaEdittingNode) {
              formulaEdittingNode.value = newValue;
              setExcelText(newValue);
            }
          }}
          onBlur={() => {
            // setFormulaEditting(null);
            // if(formulaInput.current.value) {
            //     handleValidate();
            // }
            // formulaInput.current.value = "";
          }}
        />
      </View>
    </View>
  );
}

// -------------------------------------------------
// Recursive Node Renderer
// -------------------------------------------------
interface FormulaNodeViewProps {
  node: FormulaNode;
  parent: FormulaNode | null;
  position: string | null;
  onAddOperator: (
    type: string,
    parent: FormulaNode | null,
    position: string | null,
  ) => void;
  onValueChange: (node: FormulaNode, value: string) => void;
  onRemoveNode: (
    parent: FormulaNode | null,
    node: FormulaNode,
    position: string | null,
  ) => void;
  errors: string[];
  setFocusedEdit: (node: FormulaNode) => void;
}

type OperationPopoverProps = {
  onMenuSelect: (type: string) => void;
};

function OperationPopover({ onMenuSelect }: OperationPopoverProps) {
  return (
    <Popover>
      <Menu
        items={[
          'excel formula',
          'sum',
          'division',
          'multiplication',
          'addition',
          'subtraction',
          'power',
        ].map(operator => ({
          name: operator,
          text: `${
            operator === 'excel formula'
              ? 'ƒ'
              : operator === 'sum'
                ? 'Σ'
                : operator === 'division'
                  ? '÷'
                  : operator === 'multiplication'
                    ? '×'
                    : operator === 'addition'
                      ? '+'
                      : operator === 'subtraction'
                        ? '-'
                        : operator === 'power'
                          ? 'xⁿ'
                          : ''
          } (${operator})`,
        }))}
        onMenuSelect={opType => {
          onMenuSelect(opType);
        }}
      />
    </Popover>
  );
}

function FormulaNodeView({
  node,
  parent,
  position,
  onAddOperator,
  onValueChange,
  onRemoveNode,
  errors,
  setFocusedEdit,
}: FormulaNodeViewProps) {
  const [isHovered, setIsHovered] = useState(false);
  const operatorSelectorRef = useRef<HTMLDivElement>(null);

  const hasError = errors.some(error => error.includes(node.id));

  // Plus button that opens the operator selector
  const renderAddButton = (targetPosition: string) => (
    <Button
      variant="bare"
      style={{
        height: '2rem',
        width: '2rem',
        borderRadius: '50%',
        padding: 0,
        background: 'none',
        border: 'none',
        cursor: 'pointer',
      }}
    >
      <SvgAdd style={{ height: '1.25rem', width: '1.25rem' }} />
    </Button>
  );

  // Dashed box placeholder for a missing child
  const renderPlaceholder = (targetPosition: string) => (
    <View style={{ position: 'relative' }}>
      <DialogTrigger>
        <View
          style={{
            minWidth: '40px',
            minHeight: '30px',
            border: `1px dashed ${hasError ? 'red' : '#ccc'}`,
            borderRadius: '0.375rem',
            alignItems: 'center',
            justifyContent: 'center',
            display: 'flex',
          }}
        >
          {renderAddButton(targetPosition)}
        </View>
        <OperationPopover
          onMenuSelect={opType => onAddOperator(opType, node, targetPosition)}
        />
      </DialogTrigger>
    </View>
  );

  // "X" to remove this node from its parent
  const renderRemoveButton = () => (
    <Button
      variant="bare"
      style={{
        height: '1.5rem',
        width: '1.5rem',
        padding: 0,
        position: 'absolute',
        top: '-0.75rem',
        right: '-0.75rem',
        opacity: isHovered ? 1 : 0,
        transition: 'opacity 0.2s',
      }}
      onPress={e => {
        onRemoveNode(parent, node, position);
      }}
    >
      <SvgRemove style={{ height: '1rem', width: '1rem' }} />
    </Button>
  );

  if (node.type === 'excel formula') {
    return (
      <View
        style={{
          position: 'relative',
          flexDirection: 'row',
          alignItems: 'center',
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <Button
          variant="normal"
          style={{
            border: `1px solid ${hasError ? 'red' : '#ccc'}`,
            borderRadius: '0.375rem',
            padding: '0.5rem',
            width: '4rem',
            textAlign: 'center',
          }}
          onPress={() => setFocusedEdit(node)}
        >
          Edit
        </Button>
        {renderRemoveButton()}
      </View>
    );
  }

  if (node.type === 'sum') {
    return (
      <View
        style={{ position: 'relative' }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ flexDirection: 'column', alignItems: 'center' }}>
            <View style={{ marginBottom: '0.25rem' }}>
              {node.to ? (
                <FormulaNodeView
                  node={node.to}
                  parent={node}
                  position="to"
                  onAddOperator={onAddOperator}
                  onValueChange={onValueChange}
                  onRemoveNode={onRemoveNode}
                  errors={errors}
                  setFocusedEdit={setFocusedEdit}
                />
              ) : (
                renderPlaceholder('to')
              )}
            </View>
            <View style={{ fontSize: '1.5rem' }}>Σ</View>
            <View style={{ marginTop: '0.25rem' }}>
              {node.from ? (
                <FormulaNodeView
                  node={node.from}
                  parent={node}
                  position="from"
                  onAddOperator={onAddOperator}
                  onValueChange={onValueChange}
                  onRemoveNode={onRemoveNode}
                  errors={errors}
                  setFocusedEdit={setFocusedEdit}
                />
              ) : (
                renderPlaceholder('from')
              )}
            </View>
          </View>
          <View style={{ marginLeft: '0.5rem' }}>
            {node.right ? (
              <FormulaNodeView
                node={node.right}
                parent={node}
                position="right"
                onAddOperator={onAddOperator}
                onValueChange={onValueChange}
                onRemoveNode={onRemoveNode}
                errors={errors}
                setFocusedEdit={setFocusedEdit}
              />
            ) : (
              renderPlaceholder('right')
            )}
          </View>
        </View>
        {renderRemoveButton()}
      </View>
    );
  }

  if (node.type === 'division') {
    return (
      <View
        style={{ position: 'relative' }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <View style={{ flexDirection: 'column', alignItems: 'center' }}>
          <View style={{ marginBottom: '0.25rem' }}>
            {node.left ? (
              <FormulaNodeView
                node={node.left}
                parent={node}
                position="left"
                onAddOperator={onAddOperator}
                onValueChange={onValueChange}
                onRemoveNode={onRemoveNode}
                errors={errors}
                setFocusedEdit={setFocusedEdit}
              />
            ) : (
              renderPlaceholder('left')
            )}
          </View>
          <View
            style={{ width: '100%', height: '2px', backgroundColor: 'black' }}
          />
          <View style={{ marginTop: '0.25rem' }}>
            {node.right ? (
              <FormulaNodeView
                node={node.right}
                parent={node}
                position="right"
                onAddOperator={onAddOperator}
                onValueChange={onValueChange}
                onRemoveNode={onRemoveNode}
                errors={errors}
                setFocusedEdit={setFocusedEdit}
              />
            ) : (
              renderPlaceholder('right')
            )}
          </View>
        </View>
        {renderRemoveButton()}
      </View>
    );
  }

  if (
    node.type === 'multiplication' ||
    node.type === 'addition' ||
    node.type === 'subtraction'
  ) {
    const symbol =
      node.type === 'multiplication'
        ? '×'
        : node.type === 'addition'
          ? '+'
          : '-';
    return (
      <View
        style={{ position: 'relative' }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View>
            {node.left ? (
              <FormulaNodeView
                node={node.left}
                parent={node}
                position="left"
                onAddOperator={onAddOperator}
                onValueChange={onValueChange}
                onRemoveNode={onRemoveNode}
                errors={errors}
                setFocusedEdit={setFocusedEdit}
              />
            ) : (
              renderPlaceholder('left')
            )}
          </View>
          <View style={{ margin: '0 0.5rem' }}>{symbol}</View>
          <View>
            {node.right ? (
              <FormulaNodeView
                node={node.right}
                parent={node}
                position="right"
                onAddOperator={onAddOperator}
                onValueChange={onValueChange}
                onRemoveNode={onRemoveNode}
                errors={errors}
                setFocusedEdit={setFocusedEdit}
              />
            ) : (
              renderPlaceholder('right')
            )}
          </View>
        </View>
        {renderRemoveButton()}
      </View>
    );
  }

  if (node.type === 'power') {
    return (
      <View
        style={{ position: 'relative' }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
          <View>
            {node.base ? (
              <FormulaNodeView
                node={node.base}
                parent={node}
                position="base"
                onAddOperator={onAddOperator}
                onValueChange={onValueChange}
                onRemoveNode={onRemoveNode}
                errors={errors}
                setFocusedEdit={setFocusedEdit}
              />
            ) : (
              renderPlaceholder('base')
            )}
          </View>
          <View style={{ position: 'relative', bottom: '0.5rem', left: 0 }}>
            <View style={{ fontSize: '0.875rem' }}>
              {node.exponent ? (
                <FormulaNodeView
                  node={node.exponent}
                  parent={node}
                  position="exponent"
                  onAddOperator={onAddOperator}
                  onValueChange={onValueChange}
                  onRemoveNode={onRemoveNode}
                  errors={errors}
                  setFocusedEdit={setFocusedEdit}
                />
              ) : (
                renderPlaceholder('exponent')
              )}
            </View>
          </View>
        </View>
        {renderRemoveButton()}
      </View>
    );
  }

  return null;
}
