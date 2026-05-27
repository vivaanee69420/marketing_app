import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api.js';

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

// ── Mutations ─────────────────────────────────────────────────────────────
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
