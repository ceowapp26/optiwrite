export const extractCategory = (actionType: string, prefix: string): string | null => {
  if (actionType.startsWith(prefix)) {
    return actionType.slice(prefix.length);
  }
  return null; 
};
