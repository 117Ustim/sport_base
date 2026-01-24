export const DAYS_OF_WEEK = [
  { key: 'monday', label: 'ПН' },
  { key: 'tuesday', label: 'ВТ' },
  { key: 'wednesday', label: 'СР' },
  { key: 'thursday', label: 'ЧТ' },
  { key: 'friday', label: 'ПТ' },
  { key: 'saturday', label: 'СБ' },
  { key: 'sunday', label: 'ВС' }
];

export const TIME_OPTIONS = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 70, 80, 90, 100, 110, 120];

export const SETS_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8];

export const REPS_OPTIONS = Array.from(Array(15).keys()).map(i => i + 1);
