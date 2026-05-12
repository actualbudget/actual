import { Trans } from 'react-i18next';

import type { Template } from '@actual-app/core/types/models/templates';
import type { TransObjectLiteral } from '@actual-app/core/types/util';

import { BySaveAutomationReadOnly } from './editor/BySaveAutomationReadOnly';
import { FixedAutomationReadOnly } from './editor/FixedAutomationReadOnly';
import { HistoricalAutomationReadOnly } from './editor/HistoricalAutomationReadOnly';
import { LimitAutomationReadOnly } from './editor/LimitAutomationReadOnly';
import { LongTermGoalAutomationReadOnly } from './editor/LongTermGoalAutomationReadOnly';
import { PercentageAutomationReadOnly } from './editor/PercentageAutomationReadOnly';
import { RefillAutomationReadOnly } from './editor/RefillAutomationReadOnly';
import { RemainderAutomationReadOnly } from './editor/RemainderAutomationReadOnly';
import { ScheduleAutomationReadOnly } from './editor/ScheduleAutomationReadOnly';

type TemplateSentenceProps = {
  template: Template;
  categoryNameMap: Record<string, string>;
};

export function TemplateSentence({
  template,
  categoryNameMap,
}: TemplateSentenceProps) {
  switch (template.type) {
    case 'limit':
      return <LimitAutomationReadOnly template={template} />;
    case 'refill':
      return <RefillAutomationReadOnly />;
    case 'periodic':
      return <FixedAutomationReadOnly template={template} />;
    case 'schedule':
      return <ScheduleAutomationReadOnly template={template} />;
    case 'percentage':
      return (
        <PercentageAutomationReadOnly
          template={template}
          categoryNameMap={categoryNameMap}
        />
      );
    case 'average':
    case 'copy':
      return <HistoricalAutomationReadOnly template={template} />;
    case 'by':
      return <BySaveAutomationReadOnly template={template} />;
    case 'remainder':
      return <RemainderAutomationReadOnly template={template} />;
    case 'goal':
      return <LongTermGoalAutomationReadOnly template={template} />;
    case 'simple':
    case 'spend':
    case 'error': {
      const type = template.type;
      return (
        <Trans>
          Unsupported template type: {{ type } satisfies TransObjectLiteral}
        </Trans>
      );
    }
    default:
      template satisfies never;
      return null;
  }
}
