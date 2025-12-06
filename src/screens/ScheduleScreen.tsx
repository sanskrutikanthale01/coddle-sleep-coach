import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  FlatList,
  ListRenderItem,
} from 'react-native';
import { coddleTheme } from '../theme/coddleTheme';
import { Card } from '../components/ui/Card';
import { CText } from '../components/ui/CText';
import { ScheduleBlock } from '../types';
import { time } from '../utils/time';
import { TEST_BABY_PROFILE } from '../utils/testScheduler';
import { scheduleNotificationsForBlocks } from '../services/notifications';
import { useScheduleStore } from '../stores/scheduleStore';
import { useSleepSessionsStore } from '../stores/sleepSessionsStore';
import { useLearnerStore } from '../stores/learnerStore';
import { formatBlockTime } from '../utils/formatters';
import { getBlockColor, getConfidenceColor } from '../utils/colors';
import { getBlockIcon } from '../utils/icons';
import { LoadingSpinner } from '../components/common';

export const ScheduleScreen = () => {
 
  const todayBlocks = useScheduleStore((state) => state.todayBlocks);
  const tomorrowBlocks = useScheduleStore((state) => state.tomorrowBlocks);
  const whatIfAdjustment = useScheduleStore((state) => state.whatIfAdjustment);
  const isWhatIfMode = useScheduleStore((state) => state.isWhatIfMode);
  const isLoading = useScheduleStore((state) => state.isLoading);
  const generateSchedule = useScheduleStore((state) => state.generateSchedule);
  const generateWhatIfSchedule = useScheduleStore((state) => state.generateWhatIfSchedule);
  const resetWhatIf = useScheduleStore((state) => state.resetWhatIf);

  const [sliderValue, setSliderValue] = useState(0);

  useEffect(() => {
    generateSchedule(TEST_BABY_PROFILE);
  }, [generateSchedule]);


  useEffect(() => {
    if (!isWhatIfMode && todayBlocks.length > 0) {
      const allBlocks = [...todayBlocks, ...tomorrowBlocks];
      scheduleNotificationsForBlocks(allBlocks).catch((error) => {
        console.error('Error scheduling notifications:', error);
      });
    }
  }, [todayBlocks, tomorrowBlocks, isWhatIfMode]);


  // Memoize render block function for FlatList
  const renderBlock: ListRenderItem<ScheduleBlock> = useCallback(
    ({ item: block, index }) => {
      const blockColor = getBlockColor(block.kind);
      const confidenceColor = getConfidenceColor(block.confidence);

      return (
        <Card key={block.id || index} style={styles.blockCard}>
          <View style={styles.blockHeader}>
            <View style={[styles.blockIcon, { backgroundColor: blockColor }]}>
              <CText variant="h3" style={styles.iconText}>
                {getBlockIcon(block.kind)}
              </CText>
            </View>
            <View style={styles.blockInfo}>
              <CText variant="label" style={styles.blockKind}>
                {block.kind.charAt(0).toUpperCase() + block.kind.slice(1).replace(/([A-Z])/g, ' $1')}
              </CText>
              <CText variant="body" style={styles.blockTime}>
                {formatBlockTime(block.startISO, block.endISO)}
              </CText>
            </View>
            <View style={[styles.confidenceBadge, { backgroundColor: confidenceColor }]}>
              <CText variant="label" style={styles.confidenceText}>
                {Math.round(block.confidence * 100)}%
              </CText>
            </View>
          </View>
          <CText variant="bodySmall" style={styles.rationale}>
            {block.rationale}
          </CText>
        </Card>
      );
    },
    []
  );

 
  const blockKeyExtractor = useCallback((block: ScheduleBlock, index: number) => {
    return block.id || `block-${index}`;
  }, []);

  const handleSliderPress = (event: any) => {
    const { locationX } = event.nativeEvent;
    const sliderWidth = Dimensions.get('window').width - coddleTheme.spacing(8) - 100; // Account for padding and labels
    const percentage = Math.max(0, Math.min(1, locationX / sliderWidth));
    const value = Math.round((percentage * 60) - 30); // -30 to +30
    setSliderValue(value);
 
    generateWhatIfSchedule(value, TEST_BABY_PROFILE);
  };

  const handleResetWhatIf = () => {
    setSliderValue(0);
    resetWhatIf(); 
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <LoadingSpinner message="Loading schedule..." />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <CText variant="h2">Today&apos;s Schedule</CText>
          <CText variant="bodySmall">
            Personalized schedule based on your baby&apos;s patterns
          </CText>
        </View>

    
        <Card style={styles.whatIfCard}>
          <View style={styles.whatIfHeader}>
            <CText variant="h3" style={styles.whatIfTitle}>
              What-If Adjustment
            </CText>
            {isWhatIfMode && (
              <TouchableOpacity onPress={handleResetWhatIf} style={styles.resetButton}>
                <CText variant="bodySmall" style={styles.resetText}>
                  Reset
                </CText>
              </TouchableOpacity>
            )}
          </View>
          <CText variant="bodySmall" style={styles.whatIfDescription}>
            Adjust wake window to preview schedule changes
          </CText>
          
          <View style={styles.sliderContainer}>
            <CText variant="label" style={styles.sliderLabel}>
              -30 min
            </CText>
            <TouchableOpacity
              style={styles.sliderTrack}
              onPress={handleSliderPress}
              activeOpacity={1}
            >
              <View
                style={[
                  styles.sliderFill,
                  {
                    width: `${((sliderValue + 30) / 60) * 100}%`,
                  },
                ]}
              />
              <View
                style={[
                  styles.sliderThumb,
                  {
                    left: `${((sliderValue + 30) / 60) * 100}%`,
                  },
                ]}
              />
            </TouchableOpacity>
            <CText variant="label" style={styles.sliderLabel}>
              +30 min
            </CText>
          </View>

          {whatIfAdjustment !== 0 && (
            <CText variant="bodySmall" style={styles.adjustmentText}>
              Wake window adjusted by {whatIfAdjustment > 0 ? '+' : ''}
              {whatIfAdjustment} minutes
            </CText>
          )}
        </Card>

        {/* Today's Blocks */}
        <View style={styles.section}>
          <CText variant="h3" style={styles.sectionTitle}>
            Rest of Today ({todayBlocks.length} blocks)
          </CText>
          {todayBlocks.length === 0 ? (
            <Card style={styles.emptyCard}>
              <CText variant="bodySmall" style={styles.emptyText}>
                No schedule blocks for today. Add sleep sessions to generate a schedule.
              </CText>
            </Card>
          ) : (
            <FlatList
              data={todayBlocks}
              renderItem={renderBlock}
              keyExtractor={blockKeyExtractor}
              scrollEnabled={false}
              removeClippedSubviews={true}
              maxToRenderPerBatch={10}
              initialNumToRender={10}
            />
          )}
        </View>

        {/* Tomorrow's Blocks */}
        <View style={styles.section}>
          <CText variant="h3" style={styles.sectionTitle}>
            Tomorrow ({tomorrowBlocks.length} blocks)
          </CText>
          {tomorrowBlocks.length === 0 ? (
            <Card style={styles.emptyCard}>
              <CText variant="bodySmall" style={styles.emptyText}>
                No schedule blocks for tomorrow yet.
              </CText>
            </Card>
          ) : (
            <FlatList
              data={tomorrowBlocks}
              renderItem={renderBlock}
              keyExtractor={blockKeyExtractor}
              scrollEnabled={false}
              removeClippedSubviews={true}
              maxToRenderPerBatch={10}
              initialNumToRender={10}
            />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: coddleTheme.colors.background,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: coddleTheme.spacing(4),
    paddingTop: coddleTheme.spacing(6),
    paddingBottom: coddleTheme.spacing(4),
  },
  header: {
    marginBottom: coddleTheme.spacing(4),
  },
  section: {
    marginTop: coddleTheme.spacing(4),
  },
  sectionTitle: {
    marginBottom: coddleTheme.spacing(3),
  },
  whatIfCard: {
    marginBottom: coddleTheme.spacing(4),
    backgroundColor: coddleTheme.colors.primarySoft,
  },
  whatIfHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: coddleTheme.spacing(2),
  },
  whatIfTitle: {
    color: coddleTheme.colors.textPrimary,
  },
  resetButton: {
    padding: coddleTheme.spacing(1),
  },
  resetText: {
    color: coddleTheme.colors.primary,
    fontWeight: '600',
  },
  whatIfDescription: {
    color: coddleTheme.colors.textSecondary,
    marginBottom: coddleTheme.spacing(3),
  },
  sliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: coddleTheme.spacing(2),
  },
  sliderLabel: {
    color: coddleTheme.colors.textSecondary,
    fontSize: 10,
    width: 50,
  },
  sliderTrack: {
    flex: 1,
    height: 40,
    backgroundColor: coddleTheme.colors.border,
    borderRadius: 4,
    position: 'relative',
    marginHorizontal: coddleTheme.spacing(2),
    justifyContent: 'center',
  },
  sliderFill: {
    height: '100%',
    backgroundColor: coddleTheme.colors.primary,
    borderRadius: 4,
  },
  sliderThumb: {
    position: 'absolute',
    width: 20,
    height: 20,
    backgroundColor: coddleTheme.colors.primary,
    borderRadius: 10,
    top: -6,
    marginLeft: -10,
    borderWidth: 2,
    borderColor: coddleTheme.colors.surface,
  },
  adjustmentText: {
    color: coddleTheme.colors.textSecondary,
    textAlign: 'center',
    marginTop: coddleTheme.spacing(1),
  },
  blockCard: {
    marginBottom: coddleTheme.spacing(3),
  },
  blockHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: coddleTheme.spacing(2),
  },
  blockIcon: {
    width: 48,
    height: 48,
    borderRadius: coddleTheme.radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: coddleTheme.spacing(3),
  },
  iconText: {
    fontSize: 24,
  },
  blockInfo: {
    flex: 1,
  },
  blockKind: {
    color: coddleTheme.colors.textPrimary,
    marginBottom: coddleTheme.spacing(0.5),
    fontWeight: '600',
  },
  blockTime: {
    color: coddleTheme.colors.textSecondary,
  },
  confidenceBadge: {
    paddingHorizontal: coddleTheme.spacing(2),
    paddingVertical: coddleTheme.spacing(1),
    borderRadius: coddleTheme.radius.pill,
  },
  confidenceText: {
    color: coddleTheme.colors.textOnPrimary,
    fontSize: 10,
    fontWeight: '600',
  },
  rationale: {
    color: coddleTheme.colors.textSecondary,
    fontStyle: 'italic',
  },
  emptyCard: {
    backgroundColor: coddleTheme.colors.surface,
    alignItems: 'center',
    paddingVertical: coddleTheme.spacing(6),
  },
  emptyText: {
    color: coddleTheme.colors.textSecondary,
    textAlign: 'center',
  },
});

