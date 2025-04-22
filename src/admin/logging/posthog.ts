export const TrackingEvent = {
  VIEWED_SUGGESTION: 'VIEWED_SMART_EDIT',
  APPLIED_SUGGESTION: 'APPLIED_SMART_EDIT',
  REVERTED_SUGGESTION: 'REVERTED_SMART_EDIT',
  DISMISSED_SUGGESTION: 'DISMISSED_SMART_EDIT',
} as const;

export type TrackingEvent = (typeof TrackingEvent)[keyof typeof TrackingEvent];

export const captureEvent = (event: TrackingEvent, properties: Record<string, unknown> = {}) => {
  window.posthog?.capture(event, properties);
};
