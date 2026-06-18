import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { SvgExpandArrow } from '@actual-app/components/icons/v0';
import { Menu } from '@actual-app/components/menu';
import { Popover } from '@actual-app/components/popover';

import type { ChartConfig, ChartSpec, Mark } from 'loot-core/types/chart-spec';

type MarkStack = 'grouped' | 'stack' | 'normalize';

type MarkOptionValue =
  | { mark: 'table' }
  | { mark: 'number' }
  | { mark: 'column'; stack: MarkStack }
  | { mark: 'bar'; stack: MarkStack };

function keyToValue(key: string): MarkOptionValue | null {
  if (key === 'table') return { mark: 'table' };
  if (key === 'number') return { mark: 'number' };
  const [mark, stack] = key.split(':');
  if (mark === 'column' || mark === 'bar') {
    if (stack === 'grouped' || stack === 'stack' || stack === 'normalize') {
      return { mark, stack };
    }
  }
  return null;
}

function currentKey(spec: ChartSpec): string {
  if (spec.mark === 'table' || spec.mark === 'number') return spec.mark;
  if (spec.mark === 'column' || spec.mark === 'bar') {
    const stack = spec.config?.stack;
    const s: MarkStack =
      stack === 'stack' || stack === 'normalize' ? stack : 'grouped';
    return `${spec.mark}:${s}`;
  }
  return spec.mark;
}

function currentLabel(spec: ChartSpec, t: (key: string) => string): string {
  if (spec.mark === 'table') return t('Table');
  if (spec.mark === 'number') return t('Number');
  if (spec.mark === 'column' || spec.mark === 'bar') {
    const category = spec.mark === 'column' ? t('Column') : t('Bar');
    const stack = spec.config?.stack;
    if (stack === 'stack') return `${category} – ${t('Stacked')}`;
    if (stack === 'normalize') return `${category} – ${t('100%')}`;
    return `${category} – ${t('Grouped')}`;
  }
  return '';
}

function stackToChartStack(s: MarkStack): ChartConfig['stack'] | undefined {
  if (s === 'stack' || s === 'normalize') return s;
  return undefined;
}

type MarkSelectorProps = {
  value: ChartSpec;
  onChange: (next: ChartSpec) => void;
};

export function MarkSelector({ value, onChange }: MarkSelectorProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef(null);

  return (
    <>
      <Button
        ref={triggerRef}
        onPress={() => setIsOpen(true)}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 5,
          width: '100%',
        }}
      >
        <span
          style={{
            textAlign: 'left',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            width: 'calc(100% - 7px)',
          }}
        >
          {currentLabel(value, t)}
        </span>
        <SvgExpandArrow style={{ width: 7, height: 7, color: 'inherit' }} />
      </Button>
      <Popover
        triggerRef={triggerRef}
        placement="bottom start"
        isOpen={isOpen}
        onOpenChange={() => setIsOpen(false)}
      >
        <Menu
          onMenuSelect={key => {
            setIsOpen(false);
            const parsed = keyToValue(key);
            if (!parsed) return;
            const nextMark: Mark = parsed.mark;
            const nextStack =
              'stack' in parsed ? stackToChartStack(parsed.stack) : undefined;
            const stackUnchanged =
              (value.config?.stack ?? undefined) === (nextStack ?? undefined);
            if (nextMark === value.mark && stackUnchanged) return;
            const newSpec: ChartSpec = {
              ...(nextMark === value.mark
                ? value
                : { mark: nextMark, encoding: {} }),
              config: {
                ...value.config,
                stack: nextStack,
              },
            };
            onChange(newSpec);
          }}
          getItemStyle={item => {
            if (item.name === currentKey(value)) {
              return { fontWeight: 'bold' };
            }
            return {};
          }}
          items={[
            { type: Menu.label, name: t('Text'), text: '' },
            { name: 'table', text: t('Table') },
            { name: 'number', text: t('Number') },
            Menu.line,
            { type: Menu.label, name: t('Column'), text: '' },
            { name: 'column:grouped', text: t('Grouped') },
            { name: 'column:stack', text: t('Stacked') },
            { name: 'column:normalize', text: t('100%') },
            Menu.line,
            { type: Menu.label, name: t('Bar'), text: '' },
            { name: 'bar:grouped', text: t('Grouped') },
            { name: 'bar:stack', text: t('Stacked') },
            { name: 'bar:normalize', text: t('100%') },
          ]}
        />
      </Popover>
    </>
  );
}
