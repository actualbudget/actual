import React from 'react';

import {
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Legend,
  Tooltip,
} from 'recharts';
import { theme } from '../../../style';
import { type CSSProperties } from '../../../style';
import Container from '../Container';

type NetWorthGraphProps = {
  style?: CSSProperties;
  graphData;
  compact: boolean;
  domain?: {
    y?: [number, number];
  };
};

function formatDate(date) {
  // Array of month names
  const monthNames = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];

  // Get the month and year from the date
  const month = monthNames[date.getMonth()];
  const year = date.getFullYear().toString().slice(-2); // Get the last 2 digits of the year

  // Format and return the result
  return `${month} '${year}`;
}

function NetWorthGraph({
  style,
  graphData,
  compact,
  domain,
}: NetWorthGraphProps) {
  let chartValues = [];
  for (let i = 0; i < graphData.data.length; i++) {
    chartValues.push({
      name: formatDate(graphData.data[i].x),
      NetWorth: graphData.data[i].y,
    });
  }

  return (
    <Container
      style={{
        ...style,
        ...(compact && { height: 'auto' }),
      }}
    >
      {(width, height, portalHost) =>
        graphData && (
          <LineChart
            width={width}
            height={height}
            data={chartValues}
            margin={{ top: 0, right: 5, left: 50, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis
              dataKey="NetWorth"
              domain= {[
                dataMin => Math.min(dataMin * 0.85, dataMin * 1.15),
                dataMax => Math.max(dataMax * 0.85, dataMax * 1.15),
              ]}
              tickFormatter={value => Math.round(value)}
            />
            <Tooltip />
            <Line
              type="monotone"
              dataKey="NetWorth"
              stroke={theme.reportsBlue}
            />
          </LineChart>
        )
      }
    </Container>
  );
}

export default NetWorthGraph;
