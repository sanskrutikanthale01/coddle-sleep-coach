/**
 * Timer Card Component
 * 
 * Displays sleep timer with start/stop functionality
 */

import React from 'react';
import { StyleSheet } from 'react-native';
import { Card } from '../ui/Card';
import { CText } from '../ui/CText';
import { PrimaryButton } from '../ui/PrimaryButton';
import { formatDurationFromSeconds } from '../../utils/formatters';
import { coddleTheme } from '../../theme/coddleTheme';

interface TimerCardProps {
  isRunning: boolean;
  elapsedSeconds: number;
  onStart: () => void;
  onStop: () => void;
}

export const TimerCard: React.FC<TimerCardProps> = ({
  isRunning,
  elapsedSeconds,
  onStart,
  onStop,
}) => {
  return (
    <Card style={styles.card}>
      <CText variant="label" style={styles.label}>
        {isRunning ? 'Sleep Timer Running' : 'Start Sleep Timer'}
      </CText>
      {isRunning ? (
        <>
          <CText variant="h1" style={styles.display}>
            {formatDurationFromSeconds(elapsedSeconds)}
          </CText>
          <PrimaryButton
            label="Stop Timer"
            onPress={onStop}
            variant="primary"
            style={styles.button}
          />
        </>
      ) : (
        <PrimaryButton
          label="Start Timer"
          onPress={onStart}
          variant="primary"
          style={styles.button}
        />
      )}
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: coddleTheme.colors.primarySoft,
    alignItems: 'center',
    marginBottom: coddleTheme.spacing(3),
  },
  label: {
    marginBottom: coddleTheme.spacing(2),
    color: coddleTheme.colors.textPrimary,
  },
  display: {
    fontSize: 48,
    color: coddleTheme.colors.primary,
    marginBottom: coddleTheme.spacing(3),
    fontFamily: 'monospace',
  },
  button: {
    width: '100%',
  },
});

