export const logError = (error: Error, context?: Record<string, string | number>) => {
  // eslint-disable-next-line no-console
  console.error(error, context);
};
