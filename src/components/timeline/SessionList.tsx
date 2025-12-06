import React, { useCallback, useMemo } from 'react';
import { View, StyleSheet, FlatList, ListRenderItem } from 'react-native';
import { CText } from '../ui/CText';
import { SessionCard } from '../common/SessionCard';
import { EmptyState } from '../common/EmptyState';
import { SleepSession } from '../../types';
import { coddleTheme } from '../../theme/coddleTheme';

interface SessionListProps {
  sessions: SleepSession[];
  highlightSessionIds?: string[];
  onSessionPress?: (session: SleepSession) => void;
  onSessionDelete?: (sessionId: string) => void;
}

interface SessionItem {
  session: SleepSession;
  isHighlighted: boolean;
}

const SessionListComponent: React.FC<SessionListProps> = ({
  sessions,
  highlightSessionIds = [],
  onSessionPress,
  onSessionDelete,
}) => {

  const highlightSet = useMemo(() => {
    return new Set(Array.isArray(highlightSessionIds) ? highlightSessionIds : []);
  }, [highlightSessionIds]);

 
  const sessionItems = useMemo<SessionItem[]>(() => {
    return sessions.map((session) => ({
      session,
      isHighlighted: highlightSet.has(session.id),
    }));
  }, [sessions, highlightSet]);

  
  const renderItem: ListRenderItem<SessionItem> = useCallback(
    ({ item }) => {
      return (
        <SessionCard
          session={item.session}
          onPress={onSessionPress}
          onDelete={onSessionDelete}
          highlighted={item.isHighlighted}
        />
      );
    },
    [onSessionPress, onSessionDelete]
  );


  const keyExtractor = useCallback((item: SessionItem) => item.session.id, []);


  const ListHeaderComponent = useMemo(
    () => (
      <CText variant="h3" style={styles.title}>
        Sessions
      </CText>
    ),
    []
  );

  if (sessions.length === 0) {
    return (
      <EmptyState
        message="No sleep sessions logged for this day."
        variant="compact"
      />
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={sessionItems}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        ListHeaderComponent={ListHeaderComponent}
        scrollEnabled={false}
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        updateCellsBatchingPeriod={50}
        initialNumToRender={10}
        windowSize={5}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: coddleTheme.spacing(4),
    marginTop: coddleTheme.spacing(3),
  },
  title: {
    marginBottom: coddleTheme.spacing(2),
  },
});


export const SessionList = React.memo(SessionListComponent, (prevProps, nextProps) => {
 
  if (prevProps.sessions.length !== nextProps.sessions.length) return false;
  if (prevProps.highlightSessionIds?.length !== nextProps.highlightSessionIds?.length) return false;
  

  const prevIds = prevProps.sessions.map(s => s.id).join(',');
  const nextIds = nextProps.sessions.map(s => s.id).join(',');
  if (prevIds !== nextIds) return false;
  
  return true;
});

