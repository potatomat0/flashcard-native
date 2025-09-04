import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { RouteProp } from '@react-navigation/native';
import GroupedBarChart from '../charts/GroupedBarChart';
import { useNavigation } from '@react-navigation/native';
import colors from '../../themes/colors';

type Props = {
  route: RouteProp<{ MyDeckReviewSummary: { deckId: string; stats: any; totals: any } }, 'MyDeckReviewSummary'>;
};

export default function MyDeckReviewSummaryScreen({ route }: Props) {
  const navigation = useNavigation<any>();
  const { stats, totals, deckId } = route.params;
  const showFlash = (totals?.flashcard || 0) > 0;
  const showMcq = (totals?.mcq || 0) > 0;
  const showFill = (totals?.fill || 0) > 0;

  const data = useMemo(() => {
    const rows: Array<{ category: string; values: Record<string, number> }> = [];
    if (showFlash) rows.push({ category: 'Flashcard', values: { Easy: stats.flashcard.easy || 0, Medium: stats.flashcard.medium || 0, Hard: stats.flashcard.hard || 0 } });
    if (showMcq) rows.push({ category: 'MCQ', values: { Correct: stats.mcq.correct || 0, Wrong: stats.mcq.wrong || 0 } });
    if (showFill) rows.push({ category: 'Fill', values: { Correct: stats.fill.correct || 0, Wrong: stats.fill.wrong || 0 } });
    return rows;
  }, [stats, showFlash, showMcq, showFill]);

  const series = useMemo(() => {
    const keys: Array<{ key: string; color: string }> = [];
    const pushOnce = (k: string, color: string) => { if (!keys.find(x => x.key === k)) keys.push({ key: k, color }); };
    if (showFlash) { pushOnce('Easy', '#86EFAC'); pushOnce('Medium', '#FEF9C3'); pushOnce('Hard', '#FEE2E2'); }
    if (showMcq || showFill) { pushOnce('Correct', '#93C5FD'); pushOnce('Wrong', '#FCA5A5'); }
    return keys;
  }, [showFlash, showMcq, showFill]);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Review Summary</Text>
      <Text style={styles.sub}>Completed per method (with details)</Text>
      <View style={{ marginTop: 12 }}>
        <GroupedBarChart data={data} series={series} title="Questions Completed" />
      </View>

      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Totals</Text>
        {showFlash && (
          <Text style={styles.row}>Flashcard: {stats.flashcard.done || 0} / {totals.flashcard || 0} (Easy {stats.flashcard.easy || 0}, Medium {stats.flashcard.medium || 0}, Hard {stats.flashcard.hard || 0})</Text>
        )}
        {showMcq && (
          <Text style={styles.row}>MCQ: {stats.mcq.done || 0} / {totals.mcq || 0}</Text>
        )}
        {showFill && (
          <Text style={styles.row}>Fill in the Blank: {stats.fill.done || 0} / {totals.fill || 0}</Text>
        )}
      </View>

      <Pressable style={styles.exitBtn} onPress={() => (navigation as any).navigate('MyDeckDetail', { deckId })}>
        <Text style={styles.exitText}>Back to Deck</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: colors.bg },
  title: { fontSize: 22, fontWeight: '900' },
  sub: { marginTop: 6, color: colors.subtext },
  panel: { marginTop: 16, backgroundColor: colors.white, borderWidth: 2, borderColor: colors.border, borderRadius: 12, padding: 12 },
  panelTitle: { fontWeight: '900', marginBottom: 6 },
  row: { marginTop: 4, fontWeight: '800' },
  exitBtn: { marginTop: 16, backgroundColor: colors.primary, borderWidth: 2, borderColor: colors.border, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  exitText: { fontWeight: '900' },
});
