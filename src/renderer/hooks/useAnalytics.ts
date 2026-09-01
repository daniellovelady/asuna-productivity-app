import { useAnalyticsContext } from '../context/AnalyticsProvider';

export function useAnalytics() {
  return useAnalyticsContext();
}
