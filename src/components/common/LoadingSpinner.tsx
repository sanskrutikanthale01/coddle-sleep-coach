
import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { CText } from '../ui/CText';
import { coddleTheme } from '../../theme/coddleTheme';

interface LoadingSpinnerProps {
  message?: string;
  size?: 'small' | 'large';
  variant?: 'default' | 'overlay' | 'inline';
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  message,
  size = 'large',
  variant = 'default',
}) => {
  const content = (
    <View style={styles.content}>
      <ActivityIndicator size={size} color={coddleTheme.colors.primary} />
      {message && (
        <CText variant="body" style={styles.message}>
          {message}
        </CText>
      )}
    </View>
  );

  if (variant === 'overlay') {
    return (
      <View style={styles.overlay}>
        {content}
      </View>
    );
  }

  if (variant === 'inline') {
    return <View style={styles.inline}>{content}</View>;
  }

  return (
    <View style={styles.container}>
      {content}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: coddleTheme.spacing(4),
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  inline: {
    padding: coddleTheme.spacing(4),
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  message: {
    marginTop: coddleTheme.spacing(2),
    color: coddleTheme.colors.textSecondary,
    textAlign: 'center',
  },
});

