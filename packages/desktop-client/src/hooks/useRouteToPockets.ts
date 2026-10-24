import { useTranslation } from 'react-i18next';

import { send } from '@actual-app/core/platform/client/connection';

import { pushModal } from '#modals/modalsSlice';
import { addNotification } from '#notifications/notificationsSlice';
import { useDispatch } from '#redux';

import { useCategories } from './useCategories';
import { useMulticurrencyAvailable } from './useMulticurrencyAvailable';
import { useSyncedPref } from './useSyncedPref';

/**
 * Route to pockets (MC-10.6): re-applies entry routing to selected rows,
 * from the category each shows or from a chosen one, so a row reaches a
 * currency pocket added after it. Ordinary edits keep a row's lane; only
 * this explicit action moves it. Null when pockets are unavailable.
 */
export function useRouteToPockets() {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const available = useMulticurrencyAvailable();
  const [budgetType = 'envelope'] = useSyncedPref('budgetType');
  const { data: categories } = useCategories();
  if (!available || budgetType !== 'envelope') return null;
  // Rows route into live expense categories only, as the server requires.
  const destinations = (categories?.grouped ?? [])
    .filter(group => !group.is_income)
    .map(group => ({
      ...group,
      categories: (group.categories ?? []).filter(
        c => !c.is_income && !c.tombstone,
      ),
    }));
  const route = (args: { ids: string[]; category?: string }) =>
    send('budget/route-to-pockets', args).catch(() => {
      dispatch(
        addNotification({
          notification: {
            type: 'error',
            message: t(
              'These transactions could not be routed to currency pockets.',
            ),
          },
        }),
      );
    });
  return {
    items: [
      { name: 'route-to-pockets', text: t('Route to currency pockets') },
      {
        name: 'route-to-pockets-category',
        text: t('Route to currency pockets in category…'),
      },
    ] as const,
    /** Handles a menu item; false when it is not a routing item. */
    select(name: string, ids: string[]) {
      if (name === 'route-to-pockets') {
        void route({ ids });
        return true;
      }
      if (name !== 'route-to-pockets-category') return false;
      dispatch(
        pushModal({
          modal: {
            name: 'category-autocomplete',
            options: {
              title: t('Route to currency pockets in category'),
              categoryGroups: destinations,
              onSelect: categoryId => {
                if (categoryId) void route({ ids, category: categoryId });
              },
            },
          },
        }),
      );
      return true;
    },
  };
}
