import { useQueries } from '@tanstack/solid-query';
import type { Accessor } from 'solid-js';

import getStationInfo from '../api/getStationInfo';

const useStationInfoQuery = (ids: Accessor<string[]>) => {
  return useQueries(() => ({
    queries: ids().map((id) => ({
      queryKey: [id, 'getStationInfo'],
      queryFn: () => getStationInfo(id),
      staleTime: Infinity,
      retry: 1,
      retryOnMount: true,
    })),
  }));
};

export default useStationInfoQuery;
