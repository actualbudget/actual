import { Sankey, Tooltip, Rectangle, Layer } from 'recharts';

import Container from '../Container';
type SankeyProps = {
  style;
  data;
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
        fontSize="14"
        stroke="#333"
      >
        {payload.name}
      </text>
      <text
        textAnchor={isOut ? 'end' : 'start'}
        x={isOut ? x - 6 : x + width + 6}
        y={y + height / 2 + 13}
        fontSize="12"
        stroke="#333"
        strokeOpacity="0.5"
      >
        {payloadValue}
      </text>
    </Layer>
  );
}

function SankeyGraph({ style, data }: SankeyProps) {
  return (
    <Container
      style={{
        ...style,
        ...{ height: 'auto' },
      }}
    >
      {(width, height, portalHost) =>
        data.links &&
        data.links.length > 0 && (
          <Sankey
            width={width}
            height={height}
            data={data}
            node={<SankeyNode />}
            sort={false}
            nodePadding={23}
            margin={{
              left: 25,
              right: 100,
              top: 25,
              bottom: 25,
            }}
          >
            <Tooltip formatter={value => Math.round(value as number)} />
          </Sankey>
        )
      }
    </Container>
  );
}

export default SankeyGraph;
