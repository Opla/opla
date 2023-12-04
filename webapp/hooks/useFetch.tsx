// Copyright 2023 mik
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

/* H/T: 
  Avoiding Race Conditions and Memory Leaks in React useEffect
  https://javascript.plainenglish.io/avoiding-race-conditions-and-memory-leaks-in-react-useeffect-2034b8a0a3c7
*/

type UseFetchResponse = {
  fetchedData: unknown;
  isLoading: boolean;
  error: Error | null;
};

const useFetch = (endpoint: string, options?: ResponseInit): UseFetchResponse => {
  const [fetchedData, setFetchedData] = useState();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

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
        }
      }
    };
    fetchData();
    return () => {
      abortController.abort();
    };
  }, [endpoint, error, options]);

  return { fetchedData, isLoading, error };
};

export default useFetch;
