import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { SvgReports } from '@actual-app/components/icons/v1';

import type { DashboardPageEntity } from 'loot-core/types/models';

import { Item } from './Item';
import { Report } from './Report';

import { useDashboardPages } from '@desktop-client/hooks/useDashboardPages';
import { useMoveDashboardPageMutation } from '@desktop-client/reports';

export function Reports() {
  const { t } = useTranslation();
  const [isDragging, setIsDragging] = useState(false);
  const { data: dashboardPages = [] } = useDashboardPages();

  const getDashboardPath = (dashboardPage: DashboardPageEntity) =>
    `/reports/${dashboardPage.id}`;

  function onDragChange(drag: { state: string }) {
    setIsDragging(drag.state === 'start');
  }

  const moveDashboardPage = useMoveDashboardPageMutation();

  const makeDropPadding = (i: number) => {
    if (i === 0) {
      return {
        paddingTop: isDragging ? 15 : 0,
        marginTop: isDragging ? -15 : 0,
      };
    }
    return undefined;
  };

  async function onReorder(
    id: string,
    dropPos: 'top' | 'bottom',
    targetId: unknown,
  ) {
    let targetIdToMove = targetId;
    if (dropPos === 'bottom') {
      const idx = dashboardPages.findIndex(a => a.id === targetId) + 1;
      targetIdToMove =
        idx < dashboardPages.length ? dashboardPages[idx].id : null;
    }

    moveDashboardPage.mutate({ id, targetId: targetIdToMove as string });
  }

  if (dashboardPages.length === 1) {
    return <Item title={t('Reports')} to="/reports" Icon={SvgReports} />;
  }

  return (
    <>
      <Item
        title={t('Reports')}
        Icon={SvgReports}
        style={{
          marginBottom: 8,
        }}
      />

      {dashboardPages.map((dashboardPage, i) => (
        <Report
          key={dashboardPage.id}
          dashboardPage={dashboardPage}
          name={dashboardPage.name}
          to={getDashboardPath(dashboardPage)}
          onDragChange={onDragChange}
          onDrop={onReorder}
          outerStyle={makeDropPadding(i)}
        />
      ))}
    </>
  );
}
