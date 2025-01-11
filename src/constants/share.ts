export const LENGTH_OPTIONS = [
  {
    key: "200",
    value: 200,
    label: "200 words"
  },
  {
    key: "500",
    value: 500,
    label: "500 words"
  },
   {
    key: "1000",
    value: 1000,
    label: "1000 words"
  },
   {
    key: "2000",
    value: 2000,
    label: "2000 words"
  },
];

export enum ToneType {
  PROFESSIONAL = 'PROFESSIONAL',
  FRIENDLY = 'FRIENDLY',
  PERSUASIVE = 'PERSUASIVE'
}

export const TONE_OPTIONS = [
  {
    id: 'professional',
    panelID: 'professional',
    content: 'Professional',
    accessibilityLabel: 'Professional',
  },
  {
    id: 'friendly',
    panelID: 'friendly',
    content: 'Friendly',
    accessibilityLabel: 'Friendly',
  },
  {
    id: 'persuasive',
    panelID: 'persuasive',
    content: 'Persuasive',
    accessibilityLabel: 'Persuasive',
  },
];
