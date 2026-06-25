export type ReportSection =
  | 'overview'
  | 'profitability-summary'
  | 'revenue-per-day'
  | 'weekend-revenue'
  | 'revenue-by-player'
  | 'canteen-by-product';

export const REPORT_SECTION_LABELS: Record<ReportSection, string> = {
  overview: 'Overview',
  'profitability-summary': 'Summary',
  'revenue-per-day': 'Revenue Per Day',
  'weekend-revenue': 'Weekend Revenue',
  'revenue-by-player': 'Revenue by Player',
  'canteen-by-product': 'Canteen by Product',
};

export const REPORT_NAV_ITEMS: { section: ReportSection; group: 'overview' | 'profitability' }[] = [
  { section: 'overview', group: 'overview' },
  { section: 'profitability-summary', group: 'profitability' },
  { section: 'revenue-per-day', group: 'profitability' },
  { section: 'weekend-revenue', group: 'profitability' },
  { section: 'revenue-by-player', group: 'profitability' },
  { section: 'canteen-by-product', group: 'profitability' },
];

export const DEFAULT_REPORT_SECTION: ReportSection = 'overview';

export function reportSectionFromParam(value: string | null): ReportSection {
  if (value === 'revenue-by-client') return 'revenue-by-player';
  if (value && value in REPORT_SECTION_LABELS) {
    return value as ReportSection;
  }
  return DEFAULT_REPORT_SECTION;
}

export function isProfitabilitySection(section: ReportSection): boolean {
  return section !== 'overview';
}
