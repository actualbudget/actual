import { useQuery } from '@tanstack/react-query';

import { reportQueries } from '@desktop-client/reports';

export function useReport(id?: string | null) {
  return useQuery({
    ...reportQueries.list(),
    select: reports => reports.find(report => report.id === id),
    enabled: !!id,
  });
}
