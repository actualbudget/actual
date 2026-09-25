import type { CustomReportEntity } from '@actual-app/core/types/models';

type SessionReport = Partial<CustomReportEntity> & {
  savedStatus?: 'saved' | 'modified';
};

export const setSessionReport = <K extends keyof SessionReport>(
  propName: K,
  propValue: SessionReport[K],
) => {
  const storedReport =
    sessionStorage.report && JSON.parse(sessionStorage.getItem('report') || '');
  sessionStorage.setItem(
    'report',
    JSON.stringify({
      ...storedReport,
      [propName]: propValue,
    }),
  );
};
