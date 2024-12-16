import { Component, CSSProperties, useState } from 'react';
import { Container } from '../Container';
import { Layer, Rectangle, ResponsiveContainer, Sankey, Tooltip } from 'recharts';
import { balanceTypeOpType, DataEntity, RuleConditionEntity } from 'loot-core/types/models';
import { useNavigate } from '../../../hooks/useNavigate';
import { useCategories } from '../../../hooks/useCategories';
import { useAccounts } from '../../../hooks/useAccounts';
import { showActivity } from './showActivity';
import { numberFormatterTooltip } from '../numberFormatter';
import { useTranslation } from 'react-i18next';
import { theme } from '../../../style/theme';
import { AlignedText } from '../../common/AlignedText';
import { PrivacyFilter } from '../../PrivacyFilter';
import { amountToCurrency, amountToInteger, integerToAmount } from 'loot-core/shared/util';

type PayloadItem = {
  name: string;
  value: number;
  payload: {
    payload: {
      name: string;
      source: {
        name: string;
      };
      target: {
        name: string;
      };
    };
  };
};

type CustomTooltipProps = {
  active?: boolean;
  payload?: PayloadItem[];
  balanceTypeOp: balanceTypeOpType;
};

const CustomTooltip = ({ active, payload }: CustomTooltipProps) => {
  const { t } = useTranslation();
  if (active && payload && payload.length) {
    return (
      <div
        style={
          {
            zIndex: 1000,
            pointerEvents: 'none',
            borderRadius: 2,
            boxShadow: '0 1px 6px rgba(0, 0, 0, .20)',
            backgroundColor: theme.menuBackground,
            color: theme.menuItemText,
            padding: 10,
          }
        }
      >
        <div>
          {payload[0].payload.payload.source && (
            <div style={{ marginBottom: 10 }}>
              {t('From')}{' '}
              <strong>{payload[0].payload.payload.source.name}</strong>{' '}
              {t('to')}{' '}
              <strong>{payload[0].payload.payload.target.name}</strong>
            </div>
          )}
          {payload[0].payload.payload.name && (
            <div style={{ marginBottom: 10 }}>
              <strong>{payload[0].name}</strong>
            </div>
          )}
          <div style={{ lineHeight: 1.5 }}>
            <AlignedText
              left=""
              right={
                <PrivacyFilter>
                  {amountToCurrency(integerToAmount(payload[0].value))}
                </PrivacyFilter>
              }
            />
          </div>
        </div>
      </div>
    );
  }

  return <div />;
};

type SankeyNodeProps = {
  x: number;
  y: number;
  width: number;
  height: number;
  index: number;
  payload: {
    name: string;
    value: number;
    color: string;
  };
  containerWidth: number;
  compact: boolean;
  viewLabels: boolean;
  style: CSSProperties;
  onMouseLeave: () => void;
  onMouseEnter: () => void;
  onClick: () => void;
};

function SankeyNode({
  x,
  y,
  width,
  height,
  index,
  payload,
  containerWidth,
  compact,
  viewLabels,
  style,
  onMouseLeave,
  onMouseEnter,
  onClick,
}: SankeyNodeProps): JSX.Element {
  const isOut = x + width + 6 > containerWidth;
  const payloadValue = amountToCurrency(integerToAmount(payload.value));

  const display = compact ? 'none' : 'inline';

  return (
    <Layer key={`CustomNode${index}`}>
      <Rectangle
        x={x}
        y={y}
        width={width}
        height={height}
        fill={payload.color}
        fillOpacity="1"
        style={style}
        onMouseLeave={onMouseLeave}
        onMouseEnter={onMouseEnter}
        onClick={onClick}
      />
      <text
        textAnchor={isOut ? 'end' : 'start'}
        x={isOut ? x - 6 : x + width + 6}
        y={y + height / 2}
        fontSize="13"
        fill={theme.pageText}
        display={display}
        dominantBaseline={viewLabels ? 'auto' : 'middle'}
      >
        {payload.name}
      </text>
      {viewLabels && (
        <text
          textAnchor={isOut ? 'end' : 'start'}
          x={isOut ? x - 6 : x + width + 6}
          y={y + height / 2 + 13}
          fontSize="10"
          strokeOpacity="1"
          fill={theme.pageText}
          display={display}
        >
          <PrivacyFilter>{payloadValue}</PrivacyFilter>
        </text>
      )}
    </Layer>
  );
}

function ConvertToSankey(
  data,
  groupBy: string,
  balanceTypeOp: balanceTypeOpType,
) {
  // convert to nodes and edges
  // Split types:
  // Category:  Income Category -> Budget -> Group -> Category
  // Group:     Income          -> Budget -> Group
  // Payee:     Payee in -> Budget -> Payee Out
  // Accuount:  Account in balance -> Budget -> Account out balance (not totals)
  const nodes = [];
  const links = [];
  const nodeNames = [];

  const { t } = useTranslation();

  nodes.push({ id: null, name: t('Budget'), isMouse: true });
  nodeNames.push(t('Budget'));

  if (groupBy === 'Category' && data.groupedData) {
    data.groupedData.forEach(group => {
      nodes.push({ id: null, name: group.name, isMouse: false });
      nodeNames.push(group.name);
      if (group.totalTotals < 0) {
        links.push({
          source: t('Budget'),
          target: group.name,
          value: -amountToInteger(group.totalTotals),
        });
      } else {
        links.push({
          source: group.name,
          target: t('Budget'),
          value: amountToInteger(group.totalTotals),
        });
      }
      group.categories.forEach(category => {
        nodes.push({ id: category.id, name: category.name, isMouse: true });
        nodeNames.push(group.name + category.name);
        if (category.totalTotals < 0) {
          links.push({
            source: group.name,
            target: group.name + category.name,
            value: -amountToInteger(category.totalTotals),
          });
        } else {
          links.push({
            source: group.name + category.name,
            target: group.name,
            value: amountToInteger(category.totalTotals),
          });
        }
      });
    });
  } else if (groupBy === 'Account') {
    data.data.forEach(split => {
      if (split.totalDebts < 0 && !balanceTypeOp.includes('Assets')) {
        nodes.push({ id: split.id, name: split.name, isMouse: true });
        nodeNames.push(split.name + 'out');
        links.push({
          source: t('Budget'),
          target: split.name + 'out',
          value: -amountToInteger(split.totalDebts),
        });
      }
      if (split.totalAssets > 0 && !balanceTypeOp.includes('Debts')) {
        nodes.push({ id: split.id, name: split.name, isMouse: true });
        nodeNames.push(split.name + 'in');
        links.push({
          source: split.name + 'in',
          target: t('Budget'),
          value: amountToInteger(split.totalAssets),
        });
      }
    });
  } else {
    // Group or Payee
    data.data.forEach(split => {
      if (groupBy === 'Payee') {
        nodes.push({ id: split.id, name: split.name, isMouse: true });
      } else {
        nodes.push({ id: null, name: split.name, isMouse: false });
      }
      nodeNames.push(split.name);
      if (split.totalTotals < 0) {
        links.push({
          source: t('Budget'),
          target: split.name,
          value: -amountToInteger(split.totalTotals),
        });
      } else {
        links.push({
          source: split.name,
          target: t('Budget'),
          value: amountToInteger(split.totalTotals),
        });
      }
    });
  }

  // Map source and target in links to the index of the node
  links.forEach(link => {
    link.source = nodeNames.findIndex(node => node === link.source);
    link.target = nodeNames.findIndex(node => node === link.target);
  });

  nodes.forEach(node => {
    const result = data.legend.find(leg => leg.name === node.name);
    if (result !== undefined) {
      node.color = result.color;
    } else {
      node.color = theme.pageTextLight;
    }
  });

  return {
    nodes,
    links,
  };
}

class SankeyLink extends Component<any, any> {
  render() {
    const {
      sourceX,
      targetX,
      sourceY,
      targetY,
      sourceControlX,
      targetControlX,
      linkWidth,
      index,
    } = this.props;
    return (
      <Layer key={`CustomLink${index}`}>
        <path
          d={`
            M ${sourceX}        ,${sourceY + linkWidth / 2}
            C ${sourceControlX} ,${sourceY + linkWidth / 2}
              ${targetControlX} ,${targetY + linkWidth / 2}
              ${targetX}        ,${targetY + linkWidth / 2}
            L ${targetX}        ,${targetY - linkWidth / 2}
            C ${targetControlX} ,${targetY - linkWidth / 2}
              ${sourceControlX} ,${sourceY - linkWidth / 2}
              ${sourceX}        ,${sourceY - linkWidth / 2}
            Z
          `}
          fill={theme.pageBackground}
        />
      </Layer>
    );
  }
}

type SankeyGraphProps = {
  style?: CSSProperties;
  graphData: DataEntity;
  filters: RuleConditionEntity[];
  groupBy: string;
  balanceTypeOp: balanceTypeOpType;
  compact?: boolean;
  viewLabels: boolean;
  showHiddenCategories?: boolean;
  showOffBudget?: boolean;
  showTooltip?: boolean;
};

export function SankeyGraph({
  style,
  graphData,
  filters,
  groupBy,
  balanceTypeOp,
  compact,
  viewLabels,
  showHiddenCategories,
  showOffBudget,
  showTooltip = true,
}: SankeyGraphProps) {
  const navigate = useNavigate();
  const categories = useCategories();
  const accounts = useAccounts();
  const [pointer, setPointer] = useState('');

  const sankeyData = ConvertToSankey(graphData, groupBy, balanceTypeOp);

  const margin = {
    left: 0,
    right: 0,
    top: 0,
    bottom: compact ? 0 : 25,
  };

  const padding = compact ? 4 : 23;

  return (
    <Container
      style={{
        ...style,
        ...(compact && { height: 'auto' }),
      }}
    >
      {(width, height) =>
        sankeyData.links && sankeyData.links.length > 0 && (
          <ResponsiveContainer>
            <div style={{ ...(!compact && { marginTop: '15px' }) }}>
              <Sankey
                width={width}
                height={height}
                data={sankeyData}
                node={props => 
                  <SankeyNode
                    {...props}
                    containerWidth={width}
                    compact={compact}
                    viewLabels={viewLabels}
                    style={{ cursor: pointer }}
                    onMouseLeave={() => setPointer('')}
                    onMouseEnter={() =>
                      props.payload.isMouse && setPointer('pointer')
                    }
                    onClick={() =>
                      ((compact && showTooltip) || !compact) &&
                      props.payload.isMouse &&
                      showActivity({
                        navigate,
                        categories,
                        accounts,
                        balanceTypeOp,
                        filters,
                        showHiddenCategories,
                        showOffBudget,
                        type: 'totals',
                        startDate: graphData.startDate,
                        endDate: graphData.endDate,
                        field: groupBy.toLowerCase(),
                        id: props.payload.id,
                      })
                    }
                  />
                }
                sort={true}
                nodePadding={padding}
                margin={margin}
                link={<SankeyLink />}
                linkCurvature={0.25}
              >
                {showTooltip && (
                  <Tooltip
                    content={<CustomTooltip balanceTypeOp={balanceTypeOp} />}
                    formatter={numberFormatterTooltip}
                    isAnimationActive={false}
                  />
                )}
              </Sankey>
            </div>
          </ResponsiveContainer>
        )
      }
    </Container>
  );
}
