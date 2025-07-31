import '@rschedule/standard-date-adapter/setup';
import { Schedule as OriginalSchedule } from '@rschedule/core/generators';

export * from '@rschedule/standard-date-adapter';
export * from '@rschedule/core';
export * from '@rschedule/core/generators';

// Creates a wrapper class to ensure constructor behavior when bundled with vite
export class RSchedule extends OriginalSchedule {}
