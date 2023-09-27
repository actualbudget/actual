import React from 'react';

import { LineChart, Line, CartesianGrid, XAxis, YAxis, Legend } from 'recharts';

import { type CSSProperties } from '../../../style';
import Container from '../Container';
import Tooltip from '../Tooltip';

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
  console.log(graphData);
  let chartValues = [];
  for (let i = 0; i < graphData.data.length; i++) {
    chartValues.push({
      name: formatDate(graphData.data[i].x),
      value: graphData.data[i].y,
    });
  }
  console.log(chartValues);

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
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="uv" stroke="#82ca9d" />
          </LineChart>
        )
      }
    </Container>
  );
}

export default NetWorthGraph;
