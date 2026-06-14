import React from 'react';
import { View, Text, Canvas } from '@tarojs/components';
import styles from './index.module.scss';
import { TempRecord } from '../../types';

interface TempChartProps {
  records: TempRecord[];
  tempMin?: number;
  tempMax?: number;
  height?: number;
}

const TempChart: React.FC<TempChartProps> = ({
  records,
  tempMin = -2,
  tempMax = 15,
  height = 320,
}) => {
  const width = 620;
  const padding = { top: 30, right: 50, bottom: 40, left: 10 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  if (records.length === 0) {
    return (
      <View className={styles.empty}>
        <Text className={styles.emptyText}>暂无温湿度记录</Text>
      </View>
    );
  }

  const displayRecords = records.slice(-12);
  const n = displayRecords.length;

  const tempRange = tempMax - tempMin;
  const getX = (i: number) => padding.left + (n > 1 ? (i * chartWidth) / (n - 1) : chartWidth / 2);
  const getTempY = (t: number) => {
    const clamped = Math.max(tempMin, Math.min(tempMax, t));
    return padding.top + chartHeight - ((clamped - tempMin) / tempRange) * chartHeight;
  };
  const getHumY = (h: number) => {
    const clamped = Math.max(0, Math.min(100, h));
    return padding.top + chartHeight - (clamped / 100) * chartHeight;
  };

  const tempPathData = displayRecords
    .map((r, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getTempY(r.temperature)}`)
    .join(' ');

  const humPathData = displayRecords
    .map((r, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getHumY(r.humidity)}`)
    .join(' ');

  const gridLines = [];
  for (let i = 0; i <= 4; i++) {
    const y = padding.top + (i * chartHeight) / 4;
    const tempVal = tempMax - (i * tempRange) / 4;
    gridLines.push({ y, tempVal });
  }

  const avgTemp = (displayRecords.reduce((s, r) => s + r.temperature, 0) / n).toFixed(1);
  const avgHum = (displayRecords.reduce((s, r) => s + r.humidity, 0) / n).toFixed(1);
  const maxTemp = Math.max(...displayRecords.map(r => r.temperature)).toFixed(1);
  const minTemp = Math.min(...displayRecords.map(r => r.temperature)).toFixed(1);

  return (
    <View className={styles.chartCard}>
      <View className={styles.header}>
        <Text className={styles.title}>温湿度曲线</Text>
        <View className={styles.legend}>
          <View className={styles.legendItem}>
            <View className={styles.legendLine} style={{ backgroundColor: '#EF4444' }} />
            <Text className={styles.legendText}>温度</Text>
          </View>
          <View className={styles.legendItem}>
            <View className={styles.legendLine} style={{ backgroundColor: '#0EA5E9' }} />
            <Text className={styles.legendText}>湿度</Text>
          </View>
        </View>
      </View>

      <View className={styles.stats}>
        <View className={styles.statItem}>
          <Text className={styles.statLabel}>平均温度</Text>
          <Text className={styles.statValue} style={{ color: '#EF4444' }}>{avgTemp}°C</Text>
        </View>
        <View className={styles.statItem}>
          <Text className={styles.statLabel}>最高/最低</Text>
          <Text className={styles.statValue} style={{ color: '#F59E0B' }}>{maxTemp}° / {minTemp}°</Text>
        </View>
        <View className={styles.statItem}>
          <Text className={styles.statLabel}>平均湿度</Text>
          <Text className={styles.statValue} style={{ color: '#0EA5E9' }}>{avgHum}%</Text>
        </View>
      </View>

      <Canvas
        canvasId="tempChart"
        id="tempChart"
        style={{ width: `${width}rpx`, height: `${height}rpx` }}
        className={styles.canvas}
      />

      <View className={styles.svgContainer} style={{ width: `${width}rpx`, height: `${height}rpx` }}>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          width="100%"
          height="100%"
          style={{ display: 'block' }}
        >
          {gridLines.map((g, i) => (
            <g key={i}>
              <line
                x1={padding.left}
                y1={g.y}
                x2={width - padding.right}
                y2={g.y}
                stroke="#F1F5F9"
                strokeWidth="1"
              />
              <text
                x={width - padding.right + 8}
                y={g.y + 4}
                fontSize="10"
                fill="#94A3B8"
              >
                {g.tempVal.toFixed(0)}°
              </text>
            </g>
          ))}

          <line
            x1={padding.left}
            y1={getTempY(4)}
            x2={width - padding.right}
            y2={getTempY(4)}
            stroke="#10B981"
            strokeWidth="1"
            strokeDasharray="4 4"
          />
          <text
            x={width - padding.right + 8}
            y={getTempY(4) + 4}
            fontSize="9"
            fill="#10B981"
          >
            4°C
          </text>

          <path
            d={humPathData}
            fill="none"
            stroke="#0EA5E9"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.5"
          />

          <path
            d={tempPathData}
            fill="none"
            stroke="#EF4444"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {displayRecords.map((r, i) => {
            const x = getX(i);
            const yT = getTempY(r.temperature);
            return (
              <g key={i}>
                <circle cx={x} cy={yT} r="4" fill="#fff" stroke="#EF4444" strokeWidth="2" />
                <text
                  x={x}
                  y={height - 12}
                  fontSize="9"
                  fill="#94A3B8"
                  textAnchor="middle"
                >
                  {r.timestamp.slice(11, 16)}
                </text>
              </g>
            );
          })}
        </svg>
      </View>
    </View>
  );
};

export default TempChart;
