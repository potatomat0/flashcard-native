import React from 'react';
import { View, StyleSheet, Text as RNText, Dimensions } from 'react-native';
import Svg, { Rect, G, Text } from 'react-native-svg';

type Series = { key: string; color: string };
type Datum = { category: string; values: Record<string, number> };

type Props = {
  data: Datum[];
  series: Series[];
  height?: number;
  width?: number;
  title?: string;
};

export default function GroupedBarChart({ data, series, height = 220, width, title }: Props) {
  const screenWidth = Dimensions.get('window').width;
  const W = width || Math.max(280, screenWidth - 32);
  const H = height;
  const margin = { top: 24, right: 16, bottom: 40, left: 16 };
  const innerW = W - margin.left - margin.right;
  const innerH = H - margin.top - margin.bottom;

  const maxVal = Math.max(1, ...data.flatMap(d => series.map(s => d.values[s.key] || 0)));
  const categories = data.map(d => d.category);
  const groupCount = categories.length;
  const groupW = innerW / Math.max(1, groupCount);

  const yScale = (v: number) => (v / maxVal) * innerH;

  return (
    <View style={styles.container}>
      {!!title && <RNText style={styles.title}>{title}</RNText>}
      <Svg width={W} height={H}>
        <G x={margin.left} y={margin.top}>
          {/* X axis labels and bars */}
          {data.map((d, i) => {
            const x0 = i * groupW;
            return (
              <G key={d.category} x={x0}>
                {/* Bars (skip zeros and tighten spacing) */}
                {(() => {
                  const bars = series.filter(s => (d.values[s.key] || 0) > 0);
                  const count = bars.length;
                  if (count === 0) return null;
                  const desiredGap = 6; // tighter gap between bars
                  const barW = Math.min(24, (groupW - 12 - desiredGap * (count - 1)) / Math.max(1, count));
                  const totalBarsW = count * barW + (count - 1) * desiredGap;
                  const startX = (groupW - totalBarsW) / 2;
                  return bars.map((s, j) => {
                    const v = d.values[s.key] || 0;
                    const h = yScale(v);
                    const x = startX + j * (barW + desiredGap);
                    const y = innerH - h;
                    return (
                      <G key={s.key}>
                        <Rect x={x} y={y} width={barW} height={h} fill={s.color} stroke="#000" strokeWidth={2} rx={4} ry={4} />
                        {/* Value label (only for > 0) */}
                        {v > 0 && (
                          <Text x={x + barW / 2} y={Math.max(12, y - 6)} fontSize={10} fontWeight="bold" textAnchor="middle" fill="#000">
                            {v}
                          </Text>
                        )}
                      </G>
                    );
                  });
                })()}
                {/* Category label */}
                <Text x={groupW / 2} y={innerH + 16} fontSize={12} fontWeight="bold" textAnchor="middle" fill="#000">
                  {d.category}
                </Text>
              </G>
            );
          })}
        </G>
      </Svg>
      {/* Legend (wrap into 2 rows if needed) */}
      <View style={[styles.legendRow, { width: W }]}>
        {series.map(s => (
          <View key={s.key} style={styles.legendItem}>
            <View style={[styles.swatch, { backgroundColor: s.color }]} />
            <RNText style={styles.legendText}>{s.key}</RNText>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center' },
  title: { fontWeight: '900', marginBottom: 8 },
  legendRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, rowGap: 8 as any, marginTop: 8, justifyContent: 'center' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  swatch: { width: 14, height: 14, borderWidth: 2, borderColor: '#000', borderRadius: 4 },
  legendText: { fontWeight: '900' },
});
