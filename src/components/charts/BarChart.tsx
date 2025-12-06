import React from 'react';
import { View, Dimensions } from 'react-native';
import Svg, { Rect, Text as SvgText, G } from 'react-native-svg';
import { coddleTheme } from '../../theme/coddleTheme';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CHART_PADDING = coddleTheme.spacing(4);

interface BarChartProps {
  data: number[];
  labels: string[];
  color: string;
  height?: number;
  yAxisLabel?: string;
}

const BarChartComponent: React.FC<BarChartProps> = ({
  data,
  labels,
  color,
  height = 200,
  yAxisLabel = 'm',
}) => {
  const chartWidth = SCREEN_WIDTH - CHART_PADDING * 2 - coddleTheme.spacing(6);
  const chartHeight = height;
  const padding = 40;
  const graphWidth = chartWidth - padding * 2;
  const graphHeight = chartHeight - padding * 2;

  const maxValue = Math.max(...data, 1);
  const barSpacing = 8;
  const barWidth = (graphWidth - barSpacing * (data.length + 1)) / data.length;

  return (
    <View style={{ alignItems: 'center' }}>
      <Svg width={chartWidth} height={chartHeight}>
        {/* Y-axis labels */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
          const value = Math.round(maxValue * ratio);
          const y = padding + graphHeight - ratio * graphHeight;
          return (
            <G key={ratio}>
              <SvgText
                x={padding - 10}
                y={y + 4}
                fontSize={10}
                fill={coddleTheme.colors.textSecondary}
                textAnchor="end"
              >
                {value}{yAxisLabel}
              </SvgText>
            </G>
          );
        })}

        {/* Bars */}
        {data.map((value, index) => {
          const barHeight = (value / maxValue) * graphHeight;
          const x = padding + index * (barWidth + barSpacing) + barSpacing;
          const y = padding + graphHeight - barHeight;
          return (
            <G key={index}>
              <Rect
                x={x}
                y={y}
                width={barWidth}
                height={barHeight}
                fill={color}
                rx={4}
              />
              {/* Value on top */}
              {value > 0 && (
                <SvgText
                  x={x + barWidth / 2}
                  y={y - 5}
                  fontSize={10}
                  fill={coddleTheme.colors.textPrimary}
                  textAnchor="middle"
                  fontWeight="600"
                >
                  {Math.round(value)}{yAxisLabel}
                </SvgText>
              )}
            </G>
          );
        })}

        {/* X-axis labels */}
        {labels.map((label, index) => {
          const x = padding + index * (barWidth + barSpacing) + barSpacing + barWidth / 2;
          return (
            <G key={index}>
              <SvgText
                x={x}
                y={chartHeight - padding + 20}
                fontSize={10}
                fill={coddleTheme.colors.textSecondary}
                textAnchor="middle"
              >
                {label}
              </SvgText>
            </G>
          );
        })}
      </Svg>
    </View>
  );
};


export const BarChart = React.memo(BarChartComponent, (prevProps, nextProps) => {
 
  if (prevProps.data.length !== nextProps.data.length) return false;
  if (prevProps.labels.length !== nextProps.labels.length) return false;
  if (prevProps.color !== nextProps.color) return false;
  if (prevProps.height !== nextProps.height) return false;
  

  const prevDataStr = prevProps.data.join(',');
  const nextDataStr = nextProps.data.join(',');
  if (prevDataStr !== nextDataStr) return false;
  

  const prevLabelsStr = prevProps.labels.join(',');
  const nextLabelsStr = nextProps.labels.join(',');
  if (prevLabelsStr !== nextLabelsStr) return false;
  
  return true;
});

