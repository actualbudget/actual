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
              left: 25,
              right: 25,
              top: 25,
              bottom: 25,
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
