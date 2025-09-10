// App.js
import React, { useEffect, useState, useRef } from "react";
import {
  SafeAreaView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  TextInput,
  Alert,
  Platform,
  Vibration,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Audio } from "expo-av";

const STORAGE_KEYS = {
  COUNT: "@mantra_count",
  TARGET: "@mantra_target",
};

export default function App() {
  const [count, setCount] = useState(0);
  const [target, setTarget] = useState(null); // null = no target set
  const [modalVisible, setModalVisible] = useState(false);
  const [tempTargetText, setTempTargetText] = useState("");
  const [justReached, setJustReached] = useState(false); // to avoid repeat notify
  const soundRef = useRef(null);

  useEffect(() => {
    loadFromStorage();
    loadSound();
    return () => {
      // unload sound on unmount
      if (soundRef.current) {
        soundRef.current.unloadAsync && soundRef.current.unloadAsync();
      }
    };
  }, []);

  useEffect(() => {
    // Persist whenever count or target changes
    AsyncStorage.setItem(STORAGE_KEYS.COUNT, JSON.stringify(count));
  }, [count]);

  useEffect(() => {
    AsyncStorage.setItem(STORAGE_KEYS.TARGET, JSON.stringify(target));
    // reset justReached so notification occurs again when a new target is set
    setJustReached(false);
  }, [target]);

  useEffect(() => {
    // if target set and count reached/exceeded and we haven't notified yet
    if (target !== null && count >= target && !justReached) {
      notifyTargetReached();
      setJustReached(true);
    }
  }, [count, target, justReached]);

  async function loadFromStorage() {
    try {
      const countVal = await AsyncStorage.getItem(STORAGE_KEYS.COUNT);
      const targetVal = await AsyncStorage.getItem(STORAGE_KEYS.TARGET);
      if (countVal !== null) setCount(JSON.parse(countVal));
      if (targetVal !== null) setTarget(JSON.parse(targetVal));
    } catch (e) {
      console.warn("Failed to load storage", e);
    }
  }

  async function loadSound() {
    try {
      const { sound } = await Audio.Sound.createAsync(
        // simple built-in beep sound: using silence short waveform would be better.
        // For a packaged app, you can use local asset require('./assets/beep.mp3')
        { uri: "https://actions.google.com/sounds/v1/alarms/beep_short.ogg" }
      );
      soundRef.current = sound;
    } catch (e) {
      console.warn("Failed to load sound", e);
    }
  }

  async function playSound() {
    try {
      if (soundRef.current) {
        await soundRef.current.replayAsync();
      }
    } catch (e) {
      console.warn("Sound play error", e);
    }
  }

  function notifyTargetReached() {
    // Vibrate
    if (Platform.OS === "ios") {
      Vibration.vibrate(1000); // 1s - iOS may have limits
    } else {
      Vibration.vibrate([0, 500, 200, 500]); // pattern
    }
    // Play sound
    playSound();
    // Also show an alert briefly
    Alert.alert("Target reached 🎉", `You reached ${target} repetitions.`, [{ text: "OK" }], {
      cancelable: true,
    });
  }

  function increment() {
    setCount(prev => prev + 1);
  }

  function resetCounter() {
    Alert.alert("Reset counter", "Do you want to reset the counter to 0?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Reset",
        style: "destructive",
        onPress: () => {
          setCount(0);
          setJustReached(false);
        },
      },
    ]);
  }

  function openSetTarget() {
    setTempTargetText(target !== null ? String(target) : "");
    setModalVisible(true);
  }

  function saveTarget() {
    const trimmed = tempTargetText.trim();
    if (trimmed === "") {
      setTarget(null);
      setModalVisible(false);
      return;
    }
    const n = parseInt(trimmed, 10);
    if (isNaN(n) || n <= 0) {
      Alert.alert("Invalid target", "Please enter a positive whole number.");
      return;
    }
    setTarget(n);
    setModalVisible(false);
  }

  function clearTarget() {
    Alert.alert("Clear target", "Remove the current target?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Yes",
        onPress: () => {
          setTarget(null);
          setJustReached(false);
        },
      },
    ]);
  }

  async function exportStateToClipboard() {
    // optional: could implement sharing, skipping for brevity
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Mantra Counter</Text>

      <View style={styles.infoRow}>
        <View style={styles.infoBox}>
          <Text style={styles.infoLabel}>Count</Text>
          <Text style={styles.countText}>{count}</Text>
        </View>

        <View style={styles.infoBox}>
          <Text style={styles.infoLabel}>Target</Text>
          <Text style={styles.targetText}>{target !== null ? target : "--"}</Text>
        </View>
      </View>

      <TouchableOpacity
        activeOpacity={0.7}
        style={styles.bigButton}
        onPress={increment}
        onLongPress={() => {
          // long press increments by 10 - optional handy feature
          setCount(prev => prev + 10);
        }}
      >
        <Text style={styles.bigButtonText}>+1</Text>
      </TouchableOpacity>

      <View style={styles.controlsRow}>
        <TouchableOpacity style={styles.controlButton} onPress={openSetTarget}>
          <Text style={styles.controlButtonText}>Set Target</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.controlButton} onPress={resetCounter}>
          <Text style={styles.controlButtonText}>Reset</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.controlButton, target === null && { opacity: 0.6 }]}
          onPress={clearTarget}
          disabled={target === null}
        >
          <Text style={styles.controlButtonText}>Clear Target</Text>
        </TouchableOpacity>
      </View>

      <View style={{ marginTop: 14 }}>
        <Text style={{ color: "#666", fontSize: 14, textAlign: "center" }}>
          Tip: long-press +1 to add 10.
        </Text>
      </View>

      {/* Modal for set target */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Set Target</Text>
            <TextInput
              keyboardType="number-pad"
              value={tempTargetText}
              onChangeText={setTempTargetText}
              placeholder="e.g. 108"
              style={styles.input}
              maxLength={6}
            />

            <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 14 }}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: "#eee" }]}
                onPress={() => setModalVisible(false)}
              >
                <Text>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.modalButton} onPress={saveTarget}>
                <Text style={{ color: "#fff" }}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "flex-start", alignItems: "center", backgroundColor: "#fff" },
  title: { fontSize: 28, fontWeight: "700", marginTop: 36 },
  infoRow: { flexDirection: "row", marginTop: 30 },
  infoBox: { alignItems: "center", marginHorizontal: 20 },
  infoLabel: { color: "#666", fontSize: 14 },
  countText: { fontSize: 48, fontWeight: "700", marginTop: 6 },
  targetText: { fontSize: 36, fontWeight: "600", marginTop: 6 },
  bigButton: {
    marginTop: 36,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: "#4a90e2",
    alignItems: "center",
    justifyContent: "center",
    elevation: 6,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 10,
  },
  bigButtonText: { fontSize: 56, color: "#fff", fontWeight: "800" },
  controlsRow: { flexDirection: "row", marginTop: 28 },
  controlButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginHorizontal: 8,
    borderRadius: 8,
    backgroundColor: "#f1f1f1",
  },
  controlButtonText: { fontSize: 16, fontWeight: "600" },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  modalContent: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 18,
  },
  modalTitle: { fontSize: 20, fontWeight: "700" },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    marginTop: 14,
    borderRadius: 8,
    padding: 10,
    fontSize: 18,
  },
  modalButton: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    backgroundColor: "#4a90e2",
    borderRadius: 8,
  },
});