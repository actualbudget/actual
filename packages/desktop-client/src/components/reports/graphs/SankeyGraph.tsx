import { Sankey, Tooltip } from 'recharts';

import Container from '../Container';
type SankeyProps = {
  style;
  data;
};

function SankeyGraph({ style, data }: SankeyProps) {
  return (
    <Container
      style={{
        ...style,
        ...{ height: 'auto' },
      }}
    >
      {(width, height, portalHost) =>
        data && (
          <Sankey
            width={width}
            height={height}
            data={data}
            margin={{
              left: 0,
              right: 0,
              top: 0,
              bottom: 0,
            }}
          >
            <Tooltip />
          </Sankey>
        )
      }
    </Container>
  );
}

export default SankeyGraph;
