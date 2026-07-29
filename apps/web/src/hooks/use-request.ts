"use client";

import * as React from "react";

import { ApiError, errorMessage } from "@/lib/api-client";

/**
 * Small request primitives, hand-rolled on hooks rather than pulling in React
 * Query. v0.1 has a handful of endpoints and one genuinely stateful flow (the
 * audit poll); a full cache layer would be more machinery than the app earns.
 *
 * Swap to React Query when we need cross-component cache sharing or
 * optimistic updates — not before.
 */

export interface RequestState<T> {
  data: T | null;
  error: ApiError | Error | null;
  isLoading: boolean;
  isError: boolean;
  message: string | null;
}

/**
 * Fetch-on-mount with cancellation.
 *
 * `deps` controls refetching, exactly like useEffect. The in-flight request is
 * abandoned when deps change or the component unmounts, so a slow response
 * can't overwrite fresher state.
 */
export function useQuery<T>(
  fetcher: (signal: AbortSignal) => Promise<T>,
  deps: React.DependencyList = [],
  options: { enabled?: boolean } = {},
): RequestState<T> & { refetch: () => void } {
  const { enabled = true } = options;

  const [state, setState] = React.useState<RequestState<T>>({
    data: null,
    error: null,
    isLoading: enabled,
    isError: false,
    message: null,
  });

  const [nonce, setNonce] = React.useState(0);

  // Held in a ref so changing the fetcher identity doesn't retrigger the
  // effect — callers pass inline arrows and shouldn't have to memoise.
  const fetcherRef = React.useRef(fetcher);
  fetcherRef.current = fetcher;

  React.useEffect(() => {
    if (!enabled) {
      setState((s) => ({ ...s, isLoading: false }));
      return;
    }

    const controller = new AbortController();
    let active = true;

    setState((s) => ({ ...s, isLoading: true, isError: false, error: null }));

    fetcherRef
      .current(controller.signal)
      .then((data) => {
        if (!active) return;
        setState({ data, error: null, isLoading: false, isError: false, message: null });
      })
      .catch((error: unknown) => {
        if (!active || controller.signal.aborted) return;
        setState({
          data: null,
          error: error as Error,
          isLoading: false,
          isError: true,
          message: errorMessage(error),
        });
      });

    return () => {
      active = false;
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, nonce, ...deps]);

  const refetch = React.useCallback(() => setNonce((n) => n + 1), []);

  return { ...state, refetch };
}

/**
 * Imperative action — form submits, generate buttons, sign-in.
 *
 * Guards against double-submit internally, so callers don't each have to
 * remember to disable the button.
 */
export function useMutation<TInput, TOutput>(
  mutator: (input: TInput) => Promise<TOutput>,
  options: {
    onSuccess?: (data: TOutput, input: TInput) => void;
    onError?: (error: ApiError | Error, input: TInput) => void;
  } = {},
) {
  const [state, setState] = React.useState<RequestState<TOutput>>({
    data: null,
    error: null,
    isLoading: false,
    isError: false,
    message: null,
  });

  const inFlight = React.useRef(false);
  const mounted = React.useRef(true);

  React.useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const optionsRef = React.useRef(options);
  optionsRef.current = options;

  const mutate = React.useCallback(async (input: TInput): Promise<TOutput | null> => {
    if (inFlight.current) return null;
    inFlight.current = true;

    setState((s) => ({ ...s, isLoading: true, isError: false, error: null, message: null }));

    try {
      const data = await mutator(input);
      if (mounted.current) {
        setState({ data, error: null, isLoading: false, isError: false, message: null });
      }
      optionsRef.current.onSuccess?.(data, input);
      return data;
    } catch (error) {
      if (mounted.current) {
        setState({
          data: null,
          error: error as Error,
          isLoading: false,
          isError: true,
          message: errorMessage(error),
        });
      }
      optionsRef.current.onError?.(error as Error, input);
      return null;
    } finally {
      inFlight.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const reset = React.useCallback(() => {
    setState({ data: null, error: null, isLoading: false, isError: false, message: null });
  }, []);

  return { ...state, mutate, reset };
}

/**
 * Polls until `isDone` returns true.
 *
 * This is what drives the audit checklist loader: the job runs on a worker, so
 * the client watches the row rather than holding a long request open. Backs
 * off on repeated failure instead of hammering a struggling server, and stops
 * after `maxAttempts` so a stuck job doesn't poll forever.
 */
export function usePolling<T>(
  fetcher: (signal: AbortSignal) => Promise<T>,
  isDone: (data: T) => boolean,
  options: {
    intervalMs?: number;
    enabled?: boolean;
    maxAttempts?: number;
    onDone?: (data: T) => void;
  } = {},
): RequestState<T> & { attempts: number; gaveUp: boolean } {
  const { intervalMs = 1500, enabled = true, maxAttempts = 400, onDone } = options;

  const [state, setState] = React.useState<RequestState<T>>({
    data: null,
    error: null,
    isLoading: enabled,
    isError: false,
    message: null,
  });
  const [attempts, setAttempts] = React.useState(0);
  const [gaveUp, setGaveUp] = React.useState(false);

  const fetcherRef = React.useRef(fetcher);
  fetcherRef.current = fetcher;
  const isDoneRef = React.useRef(isDone);
  isDoneRef.current = isDone;
  const onDoneRef = React.useRef(onDone);
  onDoneRef.current = onDone;

  React.useEffect(() => {
    if (!enabled) return;

    const controller = new AbortController();
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    let consecutiveFailures = 0;
    let count = 0;

    const tick = async () => {
      if (!active) return;

      count += 1;
      setAttempts(count);

      if (count > maxAttempts) {
        setGaveUp(true);
        setState((s) => ({ ...s, isLoading: false }));
        return;
      }

      try {
        const data = await fetcherRef.current(controller.signal);
        if (!active) return;

        consecutiveFailures = 0;
        const done = isDoneRef.current(data);

        setState({
          data,
          error: null,
          isLoading: !done,
          isError: false,
          message: null,
        });

        if (done) {
          onDoneRef.current?.(data);
          return;
        }
      } catch (error) {
        if (!active || controller.signal.aborted) return;

        consecutiveFailures += 1;

        // Three strikes before surfacing an error — a single blip during a
        // long audit shouldn't look like a failure to the user.
        if (consecutiveFailures >= 3) {
          setState((s) => ({
            ...s,
            error: error as Error,
            isError: true,
            isLoading: false,
            message: errorMessage(error),
          }));
          return;
        }
      }

      // Back off while failing, normal cadence otherwise.
      const delay = consecutiveFailures > 0 ? intervalMs * 2 ** consecutiveFailures : intervalMs;
      timer = setTimeout(tick, delay);
    };

    void tick();

    return () => {
      active = false;
      controller.abort();
      clearTimeout(timer);
    };
  }, [enabled, intervalMs, maxAttempts]);

  return { ...state, attempts, gaveUp };
}
