import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  View,
  TouchableOpacity,
  RefreshControl,
  FlatList,
  ListRenderItem,
} from 'react-native';
import { coddleTheme } from '../theme/coddleTheme';
import { Card } from '../components/ui/Card';
import { CText } from '../components/ui/CText';
import { PrimaryButton } from '../components/ui/PrimaryButton';
import { CoachTip } from '../types';
import { generateCoachTips } from '../services/coach';
import { TEST_BABY_PROFILE } from '../utils/testScheduler';
import { useSleepSessionsStore } from '../stores/sleepSessionsStore';
import { useLearnerStore } from '../stores/learnerStore';
import { getTipIcon } from '../utils/icons';
import { EmptyState } from '../components/common';

interface CoachScreenProps {
  onNavigateToTimeline?: (highlightSessionIds?: string[]) => void;
}

export const CoachScreen: React.FC<CoachScreenProps> = ({ onNavigateToTimeline }) => {

  const allSessions = useSleepSessionsStore((state) => state.sessions);
  const learnerState = useLearnerStore((state) => state.learnerState);
  const babyProfile = useLearnerStore((state) => state.babyProfile) || TEST_BABY_PROFILE;

  const sessions = React.useMemo(
    () => allSessions.filter((s) => !s.deleted),
    [allSessions]
  );

  const [tips, setTips] = useState<CoachTip[]>([]);
  const [refreshing, setRefreshing] = useState(false);


  const generateTips = useCallback(() => {
    const generatedTips = generateCoachTips(sessions, learnerState, babyProfile);
    setTips(generatedTips);
  }, [sessions, learnerState, babyProfile]);

 
  useEffect(() => {
    generateTips();
  }, [generateTips]);


  const onRefresh = useCallback(() => {
    setRefreshing(true);
    generateTips();
    setRefreshing(false);
  }, [generateTips]);

  
  const handleViewOnTimeline = useCallback((tip: CoachTip) => {
    if (onNavigateToTimeline && tip.relatedSessionIds.length > 0) {
      // Navigate to timeline with first related date
      const firstDate = tip.relatedDateKeys[0];
      onNavigateToTimeline(tip.relatedSessionIds);
    }
  }, [onNavigateToTimeline]);

  
  const renderTipItem: ListRenderItem<CoachTip> = useCallback(
    ({ item: tip }) => (
      <Card style={styles.tipCard}>
        <View
          style={[
            styles.tipBorder,
            { borderLeftColor: getTipBorderColor(tip.type) },
          ]}
        >
          <View style={styles.tipHeader}>
            <View style={styles.tipIconContainer}>
              <CText variant="h3" style={styles.tipIcon}>
                {getTipIcon(tip.type)}
              </CText>
            </View>
            <View style={styles.tipHeaderText}>
              <CText variant="label" style={styles.tipTitle}>
                {tip.title}
              </CText>
              <View
                style={[
                  styles.severityBadge,
                  { backgroundColor: getSeverityBadgeColor(tip.severity) },
                ]}
              >
                <CText variant="bodySmall" style={styles.severityText}>
                  {tip.severity}
                </CText>
              </View>
            </View>
          </View>

          <CText variant="body" style={styles.tipMessage}>
            {tip.message}
          </CText>

          <View style={styles.justificationContainer}>
            <CText variant="bodySmall" style={styles.justificationLabel}>
              Why this tip:
            </CText>
            <CText variant="bodySmall" style={styles.justificationText}>
              {tip.justification}
            </CText>
          </View>

          {tip.relatedSessionIds.length > 0 && onNavigateToTimeline && (
            <PrimaryButton
              label="View on Timeline"
              onPress={() => handleViewOnTimeline(tip)}
              style={styles.viewButton}
            />
          )}
        </View>
      </Card>
    ),
    [handleViewOnTimeline, onNavigateToTimeline]
  );

  // Memoize key extractor
  const keyExtractor = useCallback((tip: CoachTip) => tip.id, []);


  const getTipBorderColor = (type: CoachTip['type']): string => {
    switch (type) {
      case 'warning':
        return coddleTheme.colors.error;
      case 'suggestion':
        return coddleTheme.colors.warning;
      case 'info':
        return coddleTheme.colors.info;
      default:
        return coddleTheme.colors.border;
    }
  };

  const getSeverityBadgeColor = (severity: CoachTip['severity']): string => {
    switch (severity) {
      case 'high':
        return coddleTheme.colors.error;
      case 'medium':
        return coddleTheme.colors.warning;
      case 'low':
        return coddleTheme.colors.info;
      default:
        return coddleTheme.colors.border;
    }
  };


  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.scrollView}>
        <View style={styles.header}>
          <CText variant="h2">Coach Tips</CText>
          <CText variant="bodySmall" style={styles.subtitle}>
            Personalized insights based on your baby's sleep patterns
          </CText>
          {tips.length > 0 && (
            <View style={styles.badge}>
              <CText variant="label" style={styles.badgeText}>
                {tips.length} {tips.length === 1 ? 'tip' : 'tips'}
              </CText>
            </View>
          )}
        </View>

        {tips.length === 0 ? (
          <EmptyState
            message="No tips at this time"
            subMessage="Keep logging sleep sessions to get personalized tips and insights!"
          />
        ) : (
          <FlatList
            data={tips}
            renderItem={renderTipItem}
            keyExtractor={keyExtractor}
            contentContainerStyle={styles.tipsContainer}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            removeClippedSubviews={true}
            maxToRenderPerBatch={10}
            initialNumToRender={10}
            windowSize={5}
          />
        )}
      </View>
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
  scrollContent: {
    padding: coddleTheme.spacing(4),
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    marginBottom: coddleTheme.spacing(4),
  },
  subtitle: {
    color: coddleTheme.colors.textSecondary,
    marginTop: coddleTheme.spacing(1),
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: coddleTheme.colors.primary,
    paddingHorizontal: coddleTheme.spacing(2),
    paddingVertical: coddleTheme.spacing(1),
    borderRadius: coddleTheme.radius.pill,
    marginTop: coddleTheme.spacing(2),
  },
  badgeText: {
    color: coddleTheme.colors.textOnPrimary,
  },
  tipsContainer: {
    gap: coddleTheme.spacing(3),
  },
  tipCard: {
    padding: 0,
    overflow: 'hidden',
  },
  tipBorder: {
    borderLeftWidth: 4,
    padding: coddleTheme.spacing(3),
  },
  tipHeader: {
    flexDirection: 'row',
    marginBottom: coddleTheme.spacing(2),
  },
  tipIconContainer: {
    marginRight: coddleTheme.spacing(2),
  },
  tipIcon: {
    fontSize: 24,
  },
  tipHeaderText: {
    flex: 1,
  },
  tipTitle: {
    color: coddleTheme.colors.textPrimary,
    marginBottom: coddleTheme.spacing(1),
  },
  severityBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: coddleTheme.spacing(2),
    paddingVertical: coddleTheme.spacing(0.5),
    borderRadius: coddleTheme.radius.sm,
  },
  severityText: {
    color: coddleTheme.colors.textOnPrimary,
    textTransform: 'capitalize',
    fontSize: 10,
  },
  tipMessage: {
    color: coddleTheme.colors.textPrimary,
    marginBottom: coddleTheme.spacing(2),
    lineHeight: 20,
  },
  justificationContainer: {
    backgroundColor: coddleTheme.colors.divider,
    padding: coddleTheme.spacing(2),
    borderRadius: coddleTheme.radius.sm,
    marginBottom: coddleTheme.spacing(2),
  },
  justificationLabel: {
    color: coddleTheme.colors.textSecondary,
    fontWeight: '600',
    marginBottom: coddleTheme.spacing(0.5),
  },
  justificationText: {
    color: coddleTheme.colors.textSecondary,
    lineHeight: 18,
  },
  viewButton: {
    marginTop: coddleTheme.spacing(1),
  },
});

