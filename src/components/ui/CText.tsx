import React from 'react';
import { Text, TextProps, StyleSheet } from 'react-native';
import { coddleTheme } from '../../theme/coddleTheme';

type Variant = 'h1' | 'h2' | 'h3' | 'body' | 'bodySmall' | 'label';

interface CTextProps extends TextProps {
  variant?: Variant;
}

const variantStyles = StyleSheet.create({
  h1: {
    fontSize: 28,
    fontWeight: '700',
    color: coddleTheme.colors.textPrimary,
  },
  h2: {
    fontSize: 22,
    fontWeight: '700',
    color: coddleTheme.colors.textPrimary,
  },
  h3: {
    fontSize: 18,
    fontWeight: '600',
    color: coddleTheme.colors.textPrimary,
  },
  body: {
    fontSize: 14,
    color: coddleTheme.colors.textPrimary,
  },
  bodySmall: {
    fontSize: 12,
    color: coddleTheme.colors.textSecondary,
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 0.4,
    color: coddleTheme.colors.textSecondary,
  },
});

export const CText: React.FC<CTextProps> = ({
  variant = 'body',
  style,
  children,
  ...rest
}) => {
  return (
    <Text style={[variantStyles[variant], style]} {...rest}>
      {children}
    </Text>
  );
};


