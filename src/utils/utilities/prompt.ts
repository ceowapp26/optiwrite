import { Prompt } from '@/types/prompt';
import { getToday } from './date';
import Papa from 'papaparse';

export const importPromptCSV = (csvString: string, header: boolean = true) => {
  const results = Papa.parse(csvString, {
    header,
    delimiter: ',',
    newline: '\n',
    skipEmptyLines: true,
  });
  const filteredData = (results.data as Record<string, string>[]).filter(row => {
    return Object.values(row).some(value => 
      value !== undefined && value !== null && value.trim() !== ''
    );
  });
  return filteredData;
};

export const exportPrompts = (prompts: Prompt[]) => {
  const csvString = Papa.unparse(
    prompts.map((prompt) => ({ name: prompt.name, prompt: prompt.prompt }))
  );
  const blob = new Blob([csvString], {
    type: 'text/csv;charset=utf-8;',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${getToday()}.csv`;
  link.click();
  link.remove();
};