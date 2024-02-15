// Copyright 2023 Mik Bry
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
import { useState, useEffect } from 'react';
import { toast } from '@/components/ui/Toast';

type UseFetchResponse<T> = [
  fetchedData: T | undefined,
  isLoading: boolean,
  error: Error | undefined,
];

function useFetch<T>(endpoint: string, options?: ResponseInit): UseFetchResponse<T> {
  const [fetchedData, setFetchedData] = useState<T | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | undefined>(undefined);

  useEffect(() => {
    const abortController = new AbortController();
    const fetchData = async () => {
      try {
        const response = await fetch(endpoint, {
          ...options,
          signal: abortController.signal,
        });
        const newData = await response.json();
        setIsLoading(false);
        setFetchedData(newData);
      } catch (err) {
        if (!abortController.signal.aborted) {
          setError(error);
          setIsLoading(false);
          toast.error(`Error fetching data ${err}`);
        }
      }
    };
    fetchData();
    return () => {
      abortController.abort();
    };
  }, [endpoint, error, options]);

  return [fetchedData, isLoading, error];
}

export default useFetch;
