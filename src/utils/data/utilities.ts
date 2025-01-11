export function processJsonData(data: any) {
  if (typeof data === 'object') return data;
  try {
    if (
      typeof data === 'string' &&
      ((data.trim().startsWith('{') && data.trim().endsWith('}')) ||
        (data.trim().startsWith('[') && data.trim().endsWith(']')))
    ) {
      return JSON.parse(data);
    }
    if (Array.isArray(data)) {
      return data; 
    }
    return {};
  } catch {
    return {};
  }
}


