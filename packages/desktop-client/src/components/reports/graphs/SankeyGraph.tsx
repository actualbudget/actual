import { Sankey, Tooltip } from 'recharts';

type SankeyProps = {
  data;
};

function SankeyGraph({ data }: SankeyProps) {
  return (
    <Sankey
      // width={"100%" as any}
      // height={"100%" as any}
      width={960}
      height={500}
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
  );
}

export default SankeyGraph;
