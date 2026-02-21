import { useQuery } from '@tanstack/react-query';

import { getPayeesById, payeeQueries } from '@desktop-client/payees';

export function useNearbyPayees(locationAccess: boolean = false) {
  const dispatch = useDispatch();
  const isInitialMount = useInitialMount();
  const isNearbyPayeesDirty = useSelector(
    state => state.payees.isNearbyPayeesDirty,
  );

  useEffect(() => {
    let isCancelled = false;
    const fetchNearbyPayees = async () => {
      // Skip fetching nearby payees if we shouldn't be accessing location
      if (!locationAccess) {
        return;
      }

      try {
        const location = await locationService.getCurrentPosition();
        if (isCancelled) {
          return;
        }

        dispatch(
          getNearbyPayees({
            latitude: location.latitude,
            longitude: location.longitude,
          }),
        );
      } catch (error) {
        console.warn('Could not get location for nearby payees', { error });
      }
    };

    if ((isInitialMount || isNearbyPayeesDirty) && locationAccess) {
      fetchNearbyPayees();
    }

    return () => {
      isCancelled = true;
    };
  }, [dispatch, isInitialMount, isNearbyPayeesDirty, locationAccess]);

  return useSelector(state =>
    locationAccess ? state.payees.nearbyPayees : [],
  );
}

export function usePayees() {
  return useQuery(payeeQueries.list());
}

export function usePayeesById() {
  return useQuery({
    ...payeeQueries.list(),
    select: payees => getPayeesById(payees),
  });
}
