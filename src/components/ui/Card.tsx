import React from 'react';
import { View, ViewProps, StyleSheet } from 'react-native';
import { coddleTheme } from '../../theme/coddleTheme';

interface CardProps extends ViewProps {
  elevated?: boolean;
}

export const Card: React.FC<CardProps> = ({
  style,
  elevated = true,
  children,
  ...rest
}) => {
  return (
    <View
      style={[
        styles.base,
        elevated && styles.elevated,
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  base: {
    backgroundColor: coddleTheme.colors.surface,
    borderRadius: coddleTheme.radius.xl,
    padding: coddleTheme.spacing(4),
  },
  elevated: {
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
});


