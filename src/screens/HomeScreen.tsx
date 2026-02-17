import React from 'react';
import { SafeAreaView, StyleSheet, View, TouchableOpacity, ScrollView } from 'react-native';
import { coddleTheme } from '../theme/coddleTheme';
import { Card } from '../components/ui/Card';
import { CText } from '../components/ui/CText';

interface HomeScreenProps {
  onNavigateToSleepLog?: () => void;
  onNavigateToSchedule?: () => void;
  onNavigateToTimeline?: () => void;
  onNavigateToNotificationLog?: () => void;
  onNavigateToCoach?: () => void;
}

interface TileConfig {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  onPress?: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ 
  onNavigateToSleepLog,
  onNavigateToSchedule,
  onNavigateToTimeline,
  onNavigateToNotificationLog,
  onNavigateToCoach,
}) => {
  const tiles: TileConfig[] = [
    {
      id: 'sleepLog',
      title: 'Sleep Log',
      description: 'Start a timer or add a manual sleep session',
      icon: '😴',
      color: coddleTheme.colors.accentYellow,
      onPress: onNavigateToSleepLog,
    },
    {
      id: 'schedule',
      title: "Today's Schedule",
      description: 'See upcoming naps and bedtime with confidence',
      icon: '📅',
      color: coddleTheme.colors.accentMint,
      onPress: onNavigateToSchedule,
    },
    {
      id: 'timeline',
      title: 'Timeline',
      description: 'Visual timeline of sleep sessions by day',
      icon: '📊',
      color: coddleTheme.colors.accentPurple,
      onPress: onNavigateToTimeline,
    },
    {
      id: 'notifications',
      title: 'Notification Log',
      description: 'Review scheduled and recent reminders',
      icon: '🔔',
      color: coddleTheme.colors.accentBlue,
      onPress: onNavigateToNotificationLog,
    },
    {
      id: 'coach',
      title: 'Coach Tips',
      description: 'Get personalized sleep insights and tips',
      icon: '💡',
      color: coddleTheme.colors.accentPeach,
      onPress: onNavigateToCoach,
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Section */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <CText variant="h1" style={styles.title}>
              Coddle Sleep Coach
            </CText>
            <CText variant="body" style={styles.subtitle}>
              Personalized sleep tracking for your baby
            </CText>
          </View>
        </View>

        {/* Grid Section */}
        <View style={styles.grid}>
          {tiles.map((tile, index) => (
            <TouchableOpacity
              key={tile.id}
              onPress={tile.onPress}
              activeOpacity={0.75}
              style={[
                styles.tileWrapper,
                index === tiles.length - 1 && styles.lastTileWrapper
              ]}
            >
              <Card style={[styles.tile, { backgroundColor: tile.color }]}>
                <View style={styles.tileInner}>
                  {/* Icon Section */}
                  <View style={styles.iconWrapper}>
                    <View style={styles.iconContainer}>
                      <CText style={styles.icon}>{tile.icon}</CText>
                    </View>
                  </View>

                  {/* Content Section */}
                  <View style={styles.contentWrapper}>
                    <CText variant="label" style={styles.tileTitle}>
                      {tile.title}
                    </CText>
                    <CText variant="bodySmall" style={styles.tileDescription}>
                      {tile.description}
                    </CText>
                  </View>
                </View>
              </Card>
            </TouchableOpacity>
          ))}
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
  scrollContent: {
    paddingHorizontal: coddleTheme.spacing(5),
    paddingTop: coddleTheme.spacing(8),
    paddingBottom: coddleTheme.spacing(6),
  },
  header: {
    marginBottom: coddleTheme.spacing(8),
    marginTop: coddleTheme.spacing(8),
  },
  headerContent: {
    alignItems: 'center',
  },
  title: {
    fontSize: 34,
    fontWeight: '800',
    color: coddleTheme.colors.textPrimary,
    marginBottom: coddleTheme.spacing(2),
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: coddleTheme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginHorizontal: -coddleTheme.spacing(1),
  },
  tileWrapper: {
    width: '48%',
    marginBottom: coddleTheme.spacing(4),
    paddingHorizontal: coddleTheme.spacing(1),
  },
  lastTileWrapper: {
    marginLeft: '26%',
  },
  tile: {
    minHeight: 160,
    padding: 0,
    borderRadius: coddleTheme.radius.xl + 4,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
  },
  tileInner: {
    flex: 1,
    padding: coddleTheme.spacing(3.5),
    justifyContent: 'flex-start',
  },
  iconWrapper: {
    marginBottom: coddleTheme.spacing(2),
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: coddleTheme.radius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: coddleTheme.spacing(1),
  },
  icon: {
    fontSize: 24,
  },
  contentWrapper: {
    flex: 1,
    justifyContent: 'flex-start',
  },
  tileTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: coddleTheme.colors.textPrimary,
    marginBottom: coddleTheme.spacing(1),
    lineHeight: 20,
    letterSpacing: -0.2,
  },
  tileDescription: {
    fontSize: 12,
    color: coddleTheme.colors.textPrimary,
    lineHeight: 16,
    opacity: 0.85,
  },
});


