import * as React from 'react';

export interface TopGamesChartProps {
  data: any[];
  loading: boolean;
  periodLabel?: string;
}

declare const TopGamesChart: React.ComponentType<TopGamesChartProps>;

export default TopGamesChart;

