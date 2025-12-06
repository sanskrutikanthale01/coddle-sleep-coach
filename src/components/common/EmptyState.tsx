

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Card } from '../ui/Card';
import { CText } from '../ui/CText';
import { PrimaryButton } from '../ui/PrimaryButton';
import { coddleTheme } from '../../theme/coddleTheme';

interface EmptyStateProps {
  message: string;
  subMessage?: string;
  actionLabel?: string;
  onAction?: () => void;
  variant?: 'default' | 'compact';
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  message,
  subMessage,
  actionLabel,
  onAction,
  variant = 'default',
}) => {
  return (
    <Card style={variant === 'compact' ? styles.compactCard : styles.card}>
      <CText variant="bodySmall" style={styles.message}>
        {message}
      </CText>
      {subMessage && (
        <CText variant="bodySmall" style={styles.subMessage}>
          {subMessage}
        </CText>
      )}
      {actionLabel && onAction && (
        <PrimaryButton
          label={actionLabel}
          onPress={onAction}
          variant="secondary"
          style={styles.actionButton}
        />
      )}
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: coddleTheme.spacing(4),
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactCard: {
    padding: coddleTheme.spacing(3),
    alignItems: 'center',
    justifyContent: 'center',
  },
  message: {
    textAlign: 'center',
    color: coddleTheme.colors.textSecondary,
    marginBottom: coddleTheme.spacing(1),
  },
  subMessage: {
    textAlign: 'center',
    color: coddleTheme.colors.textTertiary,
    marginTop: coddleTheme.spacing(1),
    marginBottom: coddleTheme.spacing(2),
  },
  actionButton: {
    marginTop: coddleTheme.spacing(3),
  },
});

