import React from 'react';
import {
  Pressable,
  PressableProps,
  StyleSheet,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { coddleTheme } from '../../theme/coddleTheme';
import { CText } from './CText';

type BasePressableProps = Omit<PressableProps, 'style'>;

interface PrimaryButtonProps extends BasePressableProps {
  label: string;
  variant?: 'primary' | 'secondary';
  style?: StyleProp<ViewStyle>;
}

export const PrimaryButton: React.FC<PrimaryButtonProps> = ({
  label,
  variant = 'primary',
  style,
  ...rest
}) => {
  const backgroundStyle: ViewStyle =
    variant === 'primary'
      ? { backgroundColor: coddleTheme.colors.primary }
      : {
          backgroundColor: coddleTheme.colors.surface,
          borderWidth: 1,
          borderColor: coddleTheme.colors.border,
        };

  const textColor =
    variant === 'primary'
      ? coddleTheme.colors.textOnPrimary
      : coddleTheme.colors.textPrimary;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.base,
        backgroundStyle,
        pressed && styles.pressed,
        style,
      ]}
      {...rest}
    >
      <CText
        variant="label"
        style={{ color: textColor }}
      >
        {label}
      </CText>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  base: {
    borderRadius: coddleTheme.radius.lg,
    paddingVertical: coddleTheme.spacing(3.5),
    paddingHorizontal: coddleTheme.spacing(5),
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.9,
  },
});


