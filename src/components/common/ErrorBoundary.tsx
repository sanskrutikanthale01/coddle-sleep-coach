/**
 * Error Boundary Component
 * 
 * Catches JavaScript errors anywhere in the child component tree,
 * logs those errors, and displays a fallback UI instead of crashing.
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Card } from '../ui/Card';
import { CText } from '../ui/CText';
import { PrimaryButton } from '../ui/PrimaryButton';
import { coddleTheme } from '../../theme/coddleTheme';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to console (in production, you'd send to error tracking service)
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    this.setState({
      error,
      errorInfo,
    });

    // Call optional error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <View style={styles.container}>
          <Card style={styles.errorCard}>
            <CText variant="h2" style={styles.errorTitle}>
              Something went wrong
            </CText>
            <CText variant="body" style={styles.errorMessage}>
              {this.state.error?.message || 'An unexpected error occurred'}
            </CText>
            {__DEV__ && this.state.error && (
              <View style={styles.errorDetails}>
                <CText variant="bodySmall" style={styles.errorStack}>
                  {this.state.error.stack}
                </CText>
              </View>
            )}
            <PrimaryButton
              label="Try Again"
              onPress={this.handleReset}
              variant="primary"
              style={styles.resetButton}
            />
          </Card>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: coddleTheme.spacing(4),
    backgroundColor: coddleTheme.colors.background,
  },
  errorCard: {
    width: '100%',
    maxWidth: 400,
    padding: coddleTheme.spacing(4),
    alignItems: 'center',
  },
  errorTitle: {
    color: coddleTheme.colors.error,
    marginBottom: coddleTheme.spacing(2),
    textAlign: 'center',
  },
  errorMessage: {
    color: coddleTheme.colors.textSecondary,
    marginBottom: coddleTheme.spacing(3),
    textAlign: 'center',
  },
  errorDetails: {
    width: '100%',
    maxHeight: 200,
    backgroundColor: coddleTheme.colors.surface,
    padding: coddleTheme.spacing(2),
    borderRadius: coddleTheme.radius.md,
    marginBottom: coddleTheme.spacing(3),
  },
  errorStack: {
    color: coddleTheme.colors.textTertiary,
    fontFamily: 'monospace',
    fontSize: 10,
  },
  resetButton: {
    width: '100%',
  },
});

