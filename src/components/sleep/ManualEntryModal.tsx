/**
 * Manual Entry Modal Component
 * 
 * Modal for manually entering sleep session data
 */

import React, { useState } from 'react';
import {
  Modal,
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Card } from '../ui/Card';
import { CText } from '../ui/CText';
import { PrimaryButton } from '../ui/PrimaryButton';
import { coddleTheme } from '../../theme/coddleTheme';
import { time } from '../../utils/time';

interface ManualEntryModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (data: {
    startISO: string;
    endISO: string;
    quality?: 1 | 2 | 3 | 4 | 5;
    notes?: string;
  }) => void;
}

export const ManualEntryModal: React.FC<ManualEntryModalProps> = ({
  visible,
  onClose,
  onSave,
}) => {
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [quality, setQuality] = useState<1 | 2 | 3 | 4 | 5 | undefined>(undefined);
  const [notes, setNotes] = useState('');

  const handleSave = () => {
    const startISO = time.parse(startDate.toISOString()).toISOString();
    const endISO = time.parse(endDate.toISOString()).toISOString();
    
    if (time.parse(endISO).isBefore(time.parse(startISO))) {
      // End time is before start time, show error
      return;
    }

    onSave({
      startISO,
      endISO,
      quality,
      notes: notes.trim() || undefined,
    });

    // Reset form
    setStartDate(new Date());
    setEndDate(new Date());
    setQuality(undefined);
    setNotes('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Card style={styles.card}>
          <View style={styles.header}>
            <CText variant="h3" style={styles.title}>
              Add Manual Entry
            </CText>
            <TouchableOpacity onPress={onClose}>
              <CText variant="h3" style={styles.closeButton}>×</CText>
            </TouchableOpacity>
          </View>

          <CText variant="label" style={styles.inputLabel}>
            Start Time
          </CText>
          <View style={styles.dateTimeRow}>
            <TouchableOpacity
              style={styles.dateTimeButton}
              onPress={() => setShowStartDatePicker(true)}
            >
              <CText variant="body" style={styles.dateTimeText}>
                📅 {startDate.toLocaleDateString()}
              </CText>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.dateTimeButton}
              onPress={() => setShowStartTimePicker(true)}
            >
              <CText variant="body" style={styles.dateTimeText}>
                🕐 {startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </CText>
            </TouchableOpacity>
          </View>

          {showStartDatePicker && (
            <DateTimePicker
              value={startDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(event, selectedDate) => {
                setShowStartDatePicker(Platform.OS === 'ios');
                if (selectedDate) {
                  const newDate = new Date(startDate);
                  newDate.setFullYear(selectedDate.getFullYear());
                  newDate.setMonth(selectedDate.getMonth());
                  newDate.setDate(selectedDate.getDate());
                  setStartDate(newDate);
                }
              }}
            />
          )}

          {showStartTimePicker && (
            <DateTimePicker
              value={startDate}
              mode="time"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(event, selectedTime) => {
                setShowStartTimePicker(Platform.OS === 'ios');
                if (selectedTime) {
                  const newDate = new Date(startDate);
                  newDate.setHours(selectedTime.getHours());
                  newDate.setMinutes(selectedTime.getMinutes());
                  newDate.setSeconds(0);
                  setStartDate(newDate);
                }
              }}
            />
          )}

          <CText variant="label" style={styles.inputLabel}>
            End Time
          </CText>
          <View style={styles.dateTimeRow}>
            <TouchableOpacity
              style={styles.dateTimeButton}
              onPress={() => setShowEndDatePicker(true)}
            >
              <CText variant="body" style={styles.dateTimeText}>
                📅 {endDate.toLocaleDateString()}
              </CText>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.dateTimeButton}
              onPress={() => setShowEndTimePicker(true)}
            >
              <CText variant="body" style={styles.dateTimeText}>
                🕐 {endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </CText>
            </TouchableOpacity>
          </View>

          {showEndDatePicker && (
            <DateTimePicker
              value={endDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(event, selectedDate) => {
                setShowEndDatePicker(Platform.OS === 'ios');
                if (selectedDate) {
                  const newDate = new Date(endDate);
                  newDate.setFullYear(selectedDate.getFullYear());
                  newDate.setMonth(selectedDate.getMonth());
                  newDate.setDate(selectedDate.getDate());
                  setEndDate(newDate);
                }
              }}
            />
          )}

          {showEndTimePicker && (
            <DateTimePicker
              value={endDate}
              mode="time"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(event, selectedTime) => {
                setShowEndTimePicker(Platform.OS === 'ios');
                if (selectedTime) {
                  const newDate = new Date(endDate);
                  newDate.setHours(selectedTime.getHours());
                  newDate.setMinutes(selectedTime.getMinutes());
                  newDate.setSeconds(0);
                  setEndDate(newDate);
                }
              }}
            />
          )}

          <CText variant="label" style={styles.inputLabel}>
            Quality (1-5, optional)
          </CText>
          <View style={styles.qualityButtons}>
            {[1, 2, 3, 4, 5].map((q) => (
              <TouchableOpacity
                key={q}
                style={[
                  styles.qualityButton,
                  quality === q && styles.qualityButtonActive,
                ]}
                onPress={() => setQuality(q as 1 | 2 | 3 | 4 | 5)}
              >
                <CText
                  variant="label"
                  style={[
                    styles.qualityButtonText,
                    quality === q && styles.qualityButtonTextActive,
                  ]}
                >
                  {q}
                </CText>
              </TouchableOpacity>
            ))}
          </View>

          <CText variant="label" style={styles.inputLabel}>
            Notes (optional)
          </CText>
          <TextInput
            style={[styles.input, styles.notesInput]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Add any notes..."
            placeholderTextColor={coddleTheme.colors.textTertiary}
            multiline
          />

          <View style={styles.modalButtons}>
            <PrimaryButton
              label="Cancel"
              onPress={onClose}
              variant="secondary"
              style={styles.modalButton}
            />
            <PrimaryButton
              label="Save"
              onPress={handleSave}
              variant="primary"
              style={styles.modalButton}
            />
          </View>
        </Card>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: coddleTheme.spacing(4),
  },
  card: {
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: coddleTheme.spacing(3),
  },
  title: {
    flex: 1,
  },
  closeButton: {
    color: coddleTheme.colors.textSecondary,
    fontSize: 32,
    lineHeight: 32,
  },
  inputLabel: {
    marginTop: coddleTheme.spacing(2),
    marginBottom: coddleTheme.spacing(1),
    color: coddleTheme.colors.textPrimary,
  },
  dateTimeRow: {
    flexDirection: 'row',
    gap: coddleTheme.spacing(2),
    marginBottom: coddleTheme.spacing(2),
  },
  dateTimeButton: {
    flex: 1,
    backgroundColor: coddleTheme.colors.surface,
    borderWidth: 1,
    borderColor: coddleTheme.colors.border,
    borderRadius: coddleTheme.radius.md,
    padding: coddleTheme.spacing(2),
    alignItems: 'center',
  },
  dateTimeText: {
    color: coddleTheme.colors.textPrimary,
  },
  input: {
    backgroundColor: coddleTheme.colors.surface,
    borderWidth: 1,
    borderColor: coddleTheme.colors.border,
    borderRadius: coddleTheme.radius.md,
    padding: coddleTheme.spacing(2),
    color: coddleTheme.colors.textPrimary,
    fontSize: 14,
  },
  notesInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  qualityButtons: {
    flexDirection: 'row',
    gap: coddleTheme.spacing(2),
    marginBottom: coddleTheme.spacing(2),
  },
  qualityButton: {
    flex: 1,
    backgroundColor: coddleTheme.colors.surface,
    borderWidth: 1,
    borderColor: coddleTheme.colors.border,
    borderRadius: coddleTheme.radius.md,
    padding: coddleTheme.spacing(2),
    alignItems: 'center',
  },
  qualityButtonActive: {
    backgroundColor: coddleTheme.colors.primary,
    borderColor: coddleTheme.colors.primary,
  },
  qualityButtonText: {
    color: coddleTheme.colors.textPrimary,
  },
  qualityButtonTextActive: {
    color: coddleTheme.colors.textOnPrimary,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: coddleTheme.spacing(2),
    marginTop: coddleTheme.spacing(3),
  },
  modalButton: {
    flex: 1,
  },
});

