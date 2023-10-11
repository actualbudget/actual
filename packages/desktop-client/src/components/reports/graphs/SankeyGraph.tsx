import {
  Sankey,
  Tooltip,
  Rectangle,
  Layer,
  ResponsiveContainer,
} from 'recharts';

import Container from '../Container';
type SankeyProps = {
  style;
  data;
  compact: boolean;
};

function SankeyNode({ x, y, width, height, index, payload, containerWidth }) {
  const isOut = x + width + 6 > containerWidth;
  let payloadValue = Math.round(payload.value / 1000).toString();
  if (payload.value < 1000) {
    payloadValue = '<1k';
  } else {
    payloadValue = payloadValue + 'k';
  }
  return (
    <Layer key={`CustomNode${index}`}>
      <Rectangle
        x={x}
        y={y}
        width={width}
        height={height}
        fill="#5192ca"
        fillOpacity="1"
      />
      <text
        textAnchor={isOut ? 'end' : 'start'}
        x={isOut ? x - 6 : x + width + 6}
        y={y + height / 2}
        fontSize="13"
      >
        {payload.name}
      </text>
      <text
        textAnchor={isOut ? 'end' : 'start'}
        x={isOut ? x - 6 : x + width + 6}
        y={y + height / 2 + 13}
        fontSize="9"
        strokeOpacity="0.5"
      >
        {payloadValue}
      </text>
    </Layer>
  );
}

function SankeyGraph({ style, data, compact }: SankeyProps) {
  return (
    <Container
      style={{
        ...style,
        ...(compact && { height: 'auto' }),
      }}
    >
      {(width, height, portalHost) =>
        data.links &&
        data.links.length > 0 && (
          <ResponsiveContainer>
            <Sankey
              width={width}
              height={height}
              data={data}
              node={<SankeyNode containerWidth={width} />}
              sort={false}
              nodePadding={23}
              margin={{
                left: 0,
                right: 0,
                top: 10,
                bottom: 25,
              }}
            >
              <Tooltip formatter={value => Math.round(value as number)} />
            </Sankey>
          </ResponsiveContainer>
        )
      }
    </Container>
  );
}

export default SankeyGraph;
