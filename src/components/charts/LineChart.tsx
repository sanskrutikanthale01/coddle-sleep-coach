import React from 'react';
import { View, Dimensions } from 'react-native';
import Svg, { Polyline, Line, Rect, Text as SvgText, G } from 'react-native-svg';
import { coddleTheme } from '../../theme/coddleTheme';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CHART_PADDING = coddleTheme.spacing(4);

interface LineChartProps {
  data: number[];
  labels: string[];
  color: string;
  height?: number;
  yAxisLabel?: string;
}

const LineChartComponent: React.FC<LineChartProps> = ({
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
  const minValue = Math.min(...data, 0);
  const range = maxValue - minValue || 1;

  // Calculate points
  const points = data.map((value, index) => {
    const x = padding + (index / (data.length - 1 || 1)) * graphWidth;
    const y = padding + graphHeight - ((value - minValue) / range) * graphHeight;
    return { x, y, value };
  });

  // Create polyline path
  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

  return (
    <View style={{ alignItems: 'center' }}>
      <Svg width={chartWidth} height={chartHeight}>
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
          const y = padding + graphHeight - ratio * graphHeight;
          return (
            <Line
              key={ratio}
              x1={padding}
              y1={y}
              x2={padding + graphWidth}
              y2={y}
              stroke={coddleTheme.colors.divider}
              strokeWidth={1}
            />
          );
        })}

        {/* Y-axis labels */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
          const value = Math.round(minValue + ratio * range);
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

        {/* Line */}
        <Polyline
          points={points.map((p) => `${p.x},${p.y}`).join(' ')}
          fill="none"
          stroke={color}
          strokeWidth={3}
        />

        {/* Data points */}
        {points.map((point, index) => (
          <G key={index}>
            <Rect
              x={point.x - 4}
              y={point.y - 4}
              width={8}
              height={8}
              fill={color}
              rx={4}
            />
          </G>
        ))}

        {/* X-axis labels */}
        {labels.map((label, index) => {
          const x = padding + (index / (labels.length - 1 || 1)) * graphWidth;
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

// Memoize chart component to prevent unnecessary re-renders
export const LineChart = React.memo(LineChartComponent, (prevProps, nextProps) => {
  // Only re-render if data, labels, or color change
  if (prevProps.data.length !== nextProps.data.length) return false;
  if (prevProps.labels.length !== nextProps.labels.length) return false;
  if (prevProps.color !== nextProps.color) return false;
  if (prevProps.height !== nextProps.height) return false;
  
  // Deep compare data arrays
  const prevDataStr = prevProps.data.join(',');
  const nextDataStr = nextProps.data.join(',');
  if (prevDataStr !== nextDataStr) return false;
  
  // Deep compare labels
  const prevLabelsStr = prevProps.labels.join(',');
  const nextLabelsStr = nextProps.labels.join(',');
  if (prevLabelsStr !== nextLabelsStr) return false;
  
  return true;
});

