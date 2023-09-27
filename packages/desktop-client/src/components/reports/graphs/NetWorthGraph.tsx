import React from 'react';

import {
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
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
  let chartValues = graphData.data.map(d => ({
    name: formatDate(d.x),
    NetWorth: d.y,
  }));

  const tickFormatter = tick => {
    return `${Math.round(tick).toLocaleString()}`; // Formats the tick values as strings with commas
  };

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
            {compact ? null : <CartesianGrid strokeDasharray="3 3" />}
            <XAxis dataKey="name" />
            <YAxis
              dataKey="NetWorth"
              domain={['auto', 'auto']}
              tickFormatter={tickFormatter}
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
