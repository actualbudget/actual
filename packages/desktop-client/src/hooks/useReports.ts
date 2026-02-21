import { useQuery } from '@tanstack/react-query';

import { reportQueries } from '@desktop-client/reports';

export function useReports() {
  return useQuery(reportQueries.list());
}
