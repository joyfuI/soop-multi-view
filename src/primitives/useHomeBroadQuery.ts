import { useQueries } from '@tanstack/solid-query';
import type { Accessor } from 'solid-js';

import getHomeBroad from '../api/getHomeBroad';

const useHomeBroadQuery = (ids: Accessor<string[]>) => {
  return useQueries(() => ({
    queries: ids().map((id) => ({
      queryKey: [id, 'getHomeBroad'],
      queryFn: () => getHomeBroad(id),
      staleTime: 60000,
      refetchInterval: 60000,
    })),
  }));
};

export default useHomeBroadQuery;
