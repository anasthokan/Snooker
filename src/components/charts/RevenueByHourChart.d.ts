import * as React from 'react';

export interface RevenueByHourChartProps {
  data: any[];
  loading: boolean;
  periodLabel?: string;
}

declare const RevenueByHourChart: React.ComponentType<RevenueByHourChartProps>;

export default RevenueByHourChart;

