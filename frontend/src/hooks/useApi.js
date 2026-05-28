import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';
import { api, adminApi, streamSync } from '../lib/api.js';

// ── Queries ───────────────────────────────────────────────────────────────
export function useBusinesses() {
  return useQuery({
    queryKey: ['businesses'],
    queryFn: () => api.get('/api/businesses').then((d) => d.businesses),
  });
}

export function useIntegrations() {
  return useQuery({
    queryKey: ['integrations'],
    queryFn: () => api.get('/api/integrations').then((d) => d.integrations),
  });
}

export function useMetricsSummary(businessId) {
  const qs = businessId ? `?business_id=${businessId}` : '';
  return useQuery({
    queryKey: ['metrics', 'summary', businessId || 'all'],
    queryFn: () => api.get(`/api/metrics/summary${qs}`),
  });
}

export function useMetricsByBusiness() {
  return useQuery({
    queryKey: ['metrics', 'byBusiness'],
    queryFn: () => api.get('/api/metrics/by-business').then((d) => d.businesses),
  });
}

export function useCampaigns() {
  return useQuery({
    queryKey: ['metrics', 'campaigns'],
    queryFn: () => api.get('/api/metrics/campaigns').then((d) => d.campaigns),
  });
}

export function useTrend() {
  return useQuery({
    queryKey: ['metrics', 'trend'],
    queryFn: () => api.get('/api/metrics/trend').then((d) => d.trend),
  });
}

export function useHero() {
  return useQuery({
    queryKey: ['metrics', 'hero'],
    queryFn: () => api.get('/api/metrics/hero').then((d) => d.hero),
  });
}

export function useJobHealth() {
  return useQuery({
    queryKey: ['metrics', 'jobHealth'],
    queryFn: () => api.get('/api/metrics/job-health').then((d) => d.jobs),
  });
}

// Superadmin-only: list users + approve/reject pending signups.
export function useUsers() {
  return useQuery({
    queryKey: ['admin', 'users'],
    queryFn: () => adminApi.listUsers(),
  });
}

// ── Mutations ─────────────────────────────────────────────────────────────
export function useApproveUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId) => adminApi.approve(userId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'users'] }),
  });
}

export function useRejectUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId) => adminApi.reject(userId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'users'] }),
  });
}

export function useSaveIntegration() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload) => api.put('/api/integrations', payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['integrations'] }),
  });
}

// Lazy: fetched on demand (button) so we don't hit the Google Ads API on every
// Settings render. Returns the client accounts under the business's manager.
export function useGoogleAccounts() {
  return useMutation({
    mutationFn: (businessId) =>
      api.get(`/api/integrations/google/accounts?business_id=${businessId}`).then((d) => d.accounts),
  });
}

export function useSync() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload) => api.post('/api/sync', payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['metrics'] });
      qc.invalidateQueries({ queryKey: ['integrations'] });
    },
  });
}

/**
 * SSE-driven sync hook. Exposes phase + percent + final result for a modal
 * progress UI. start({business_id, provider}) opens the stream and resolves
 * when the backend sends the `result` event.
 *
 * Percent mapping is intentionally coarse — backend reports honest phases,
 * not a true percentage, so the bar maps phases to bands and within the
 * `writing` phase scales linearly on done/total.
 *
 *   start (0) → fetching (10) → fetched (40)
 *   → writing (40..90 scaled) → finalizing (95) → done (100)
 */
export function useStreamSync() {
  const qc = useQueryClient();
  const [state, setState] = useState({
    isRunning: false,
    isDone: false,
    isError: false,
    phase: null,
    provider: null,
    percent: 0,
    done: 0,
    total: 0,
    result: null,
    error: null,
  });
  // Guard against unmount-after-resolve setState warnings.
  const alive = useRef(true);
  useEffect(() => () => { alive.current = false; }, []);

  const percentFor = (ev) => {
    if (!ev) return 0;
    switch (ev.phase) {
      case 'start': return 2;
      case 'fetching': return 10;
      case 'fetched': return 40;
      case 'writing': {
        if (!ev.total) return 40;
        return 40 + Math.floor(50 * (ev.done / ev.total));
      }
      case 'finalizing': return 95;
      case 'done': return 100;
      default: return 0;
    }
  };

  const start = useCallback(async (payload) => {
    setState({
      isRunning: true, isDone: false, isError: false,
      phase: 'start', provider: payload.provider || null,
      percent: 2, done: 0, total: 0, result: null, error: null,
    });
    try {
      const result = await streamSync(payload, ({ type, data }) => {
        if (!alive.current) return;
        if (type === 'progress') {
          setState((s) => ({
            ...s,
            phase: data.phase,
            provider: data.provider || s.provider,
            done: data.done ?? s.done,
            total: data.total ?? s.total,
            percent: Math.max(s.percent, percentFor(data)),
          }));
        }
      });
      if (!alive.current) return result;
      setState((s) => ({
        ...s, isRunning: false, isDone: true,
        percent: 100, phase: 'done', result,
      }));
      qc.invalidateQueries({ queryKey: ['metrics'] });
      qc.invalidateQueries({ queryKey: ['integrations'] });
      return result;
    } catch (err) {
      if (!alive.current) throw err;
      setState((s) => ({
        ...s, isRunning: false, isError: true,
        error: err.message || 'sync failed',
      }));
      throw err;
    }
  }, [qc]);

  const reset = useCallback(() => {
    setState({
      isRunning: false, isDone: false, isError: false,
      phase: null, provider: null, percent: 0,
      done: 0, total: 0, result: null, error: null,
    });
  }, []);

  return { ...state, start, reset };
}
