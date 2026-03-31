// screens/CreatePlanScreen.js
import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
  Alert,
  ActivityIndicator,
} from "react-native";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase/config";
import { useAuth } from "../context/AuthContext";
import { C, Typography, VIBES } from "../constants/theme";
import DatePickerInput from "../components/DatePickerInput";
import MapPicker from "../components/MapPicker";

const VISIBILITY_OPTIONS = [
  {
    value: "private",
    label: "Just me",
    desc: "Invite people manually",
    icon: "🔒",
  },
  {
    value: "friends",
    label: "Friends",
    desc: "Visible to your friends",
    icon: "👥",
  },
  {
    value: "public",
    label: "Public",
    desc: "Anyone can discover it",
    icon: "🌏",
  },
];

const STEPS = [
  "Who can see it?",
  "When and where?",
  "Build the itinerary",
  "Set the vibe",
];

export default function CreatePlanScreen({ navigation }) {
  const { user, profile } = useAuth();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [findingLocation, setFindingLocation] = useState(false);

  const [visibility, setVisibility] = useState("friends");
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(null);
  const [location, setLocation] = useState("");
  const [locationCoord, setLocationCoord] = useState(null);
  const [itinerary, setItinerary] = useState([
    { time: "", activity: "", location: "" },
  ]);
  const [selectedVibes, setSelectedVibes] = useState([]);

  const toggleVibe = (v) =>
    setSelectedVibes((p) =>
      p.includes(v) ? p.filter((x) => x !== v) : p.length < 3 ? [...p, v] : p
    );

  const updateStop = (i, field, val) =>
    setItinerary((p) =>
      p.map((item, idx) => (idx === i ? { ...item, [field]: val } : item))
    );

  const removeStop = (i) =>
    setItinerary((p) => p.filter((_, idx) => idx !== i));

  const canNext = () => {
    if (step === 1) return !!visibility;
    if (step === 2) return title.trim() && date !== null && location.trim();
    if (step === 3) return itinerary.some((x) => x.activity.trim());
    return true;
  };

  const findLocationOnMap = async () => {
    const query = location.trim();
    if (!query) {
      Alert.alert("Missing location", "Enter a location name first.");
      return;
    }

    setFindingLocation(true);

    try {
      const url =
        "https://nominatim.openstreetmap.org/search?" +
        `q=${encodeURIComponent(query)}` +
        "&format=jsonv2&limit=1";

      const res = await fetch(url, {
        headers: {
          Accept: "application/json",
        },
      });

      if (!res.ok) {
        throw new Error("Failed to search location");
      }

      const results = await res.json();

      if (!Array.isArray(results) || results.length === 0) {
        Alert.alert(
          "Location not found",
          "Try a more specific place name, area, or city."
        );
        return;
      }

      const first = results[0];
      const lat = Number(first.lat);
      const lon = Number(first.lon);

      if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
        throw new Error("Invalid coordinates returned");
      }

      setLocationCoord({
        latitude: lat,
        longitude: lon,
      });
    } catch (err) {
      Alert.alert("Could not find location", err.message);
    } finally {
      setFindingLocation(false);
    }
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      await addDoc(collection(db, "plans"), {
        title: title.trim(),
        date: date ? date.toISOString() : "",
        location: location.trim(),
        locationCoord: locationCoord ?? null,
        visibility,
        vibes: selectedVibes,
        itinerary: itinerary.filter((x) => x.activity.trim()),
        hostId: user.uid,
        hostUsername: profile.username,
        hostAvatarUrl: profile.avatarUrl || "",
        joinedBy: [user.uid],
        forks: 0,
        createdAt: serverTimestamp(),
      });
      navigation.goBack();
    } catch (err) {
      Alert.alert("Error", err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.root}>
      <View style={styles.navBar}>
        <TouchableOpacity
          onPress={() => (step > 1 ? setStep(step - 1) : navigation.goBack())}
        >
          <Text style={styles.back}>{step > 1 ? "← Back" : "Cancel"}</Text>
        </TouchableOpacity>
        <Text style={styles.navTitle}>New plan</Text>
        <Text style={styles.stepCount}>
          {step}/{STEPS.length}
        </Text>
      </View>

      <View style={styles.progressTrack}>
        <View
          style={[
            styles.progressFill,
            { width: `${(step / STEPS.length) * 100}%` },
          ]}
        />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.stepTitle}>{STEPS[step - 1]}</Text>

        {step === 1 && (
          <View style={styles.visOptions}>
            {VISIBILITY_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[
                  styles.visCard,
                  visibility === opt.value && styles.visCardActive,
                ]}
                onPress={() => setVisibility(opt.value)}
                activeOpacity={0.85}
              >
                <Text style={styles.visIcon}>{opt.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      styles.visLabel,
                      visibility === opt.value && { color: C.primary },
                    ]}
                  >
                    {opt.label}
                  </Text>
                  <Text style={styles.visDesc}>{opt.desc}</Text>
                </View>
                <View
                  style={[
                    styles.radio,
                    visibility === opt.value && styles.radioActive,
                  ]}
                >
                  {visibility === opt.value && <View style={styles.radioDot} />}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {step === 2 && (
          <View style={styles.form}>
            <Field label="Plan name">
              <TextInput
                style={styles.input}
                placeholder="e.g. Genting day trip"
                placeholderTextColor={C.muted}
                value={title}
                onChangeText={setTitle}
              />
            </Field>

            <DatePickerInput
              label="Date"
              value={date}
              onChange={setDate}
              mode="datetime"
              required
              minimumDate={new Date()}
              placeholder="Pick a date and time"
            />

            <Field label="Location name">
              <TextInput
                style={styles.input}
                placeholder="e.g. Genting Highlands"
                placeholderTextColor={C.muted}
                value={location}
                onChangeText={setLocation}
                onSubmitEditing={findLocationOnMap}
                returnKeyType="search"
              />
            </Field>

            <TouchableOpacity
              style={[
                styles.findBtn,
                findingLocation && styles.findBtnDisabled,
              ]}
              onPress={findLocationOnMap}
              disabled={findingLocation}
            >
              {findingLocation ? (
                <ActivityIndicator color={C.surface} />
              ) : (
                <Text style={styles.findBtnText}>Find on map</Text>
              )}
            </TouchableOpacity>

            <Field label="Pin on map">
              <MapPicker
                mode="pick"
                initialCoord={locationCoord}
                showUserLoc
                height={220}
                markerTitle={location || "Plan location"}
                onLocationPick={(coord) => setLocationCoord(coord)}
              />
            </Field>

            {!!locationCoord && (
              <Text style={styles.coordHint}>
                Found: {locationCoord.latitude.toFixed(5)},{" "}
                {locationCoord.longitude.toFixed(5)}
              </Text>
            )}
          </View>
        )}

        {step === 3 && (
          <View style={styles.form}>
            {itinerary.map((item, i) => (
              <View key={i} style={styles.stopCard}>
                <View style={styles.stopHeader}>
                  <Text style={styles.stopNum}>Stop {i + 1}</Text>
                  {itinerary.length > 1 && (
                    <TouchableOpacity onPress={() => removeStop(i)}>
                      <Text style={styles.removeText}>Remove</Text>
                    </TouchableOpacity>
                  )}
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="Time (e.g. 10:00am)"
                  placeholderTextColor={C.muted}
                  value={item.time}
                  onChangeText={(v) => updateStop(i, "time", v)}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Activity"
                  placeholderTextColor={C.muted}
                  value={item.activity}
                  onChangeText={(v) => updateStop(i, "activity", v)}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Location (optional)"
                  placeholderTextColor={C.muted}
                  value={item.location}
                  onChangeText={(v) => updateStop(i, "location", v)}
                />
              </View>
            ))}
            <TouchableOpacity
              style={styles.addStopBtn}
              onPress={() =>
                setItinerary((p) => [
                  ...p,
                  { time: "", activity: "", location: "" },
                ])
              }
            >
              <Text style={styles.addStopText}>+ Add stop</Text>
            </TouchableOpacity>
          </View>
        )}

        {step === 4 && (
          <View style={styles.form}>
            <Text style={styles.vibeHint}>Pick up to 3</Text>
            <View style={styles.vibeGrid}>
              {VIBES.map((v) => {
                const on = selectedVibes.includes(v);
                return (
                  <TouchableOpacity
                    key={v}
                    style={[styles.vibeChip, on && styles.vibeChipActive]}
                    onPress={() => toggleVibe(v)}
                  >
                    <Text
                      style={[
                        styles.vibeChipText,
                        on && styles.vibeChipTextActive,
                      ]}
                    >
                      {v}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        {step < STEPS.length ? (
          <TouchableOpacity
            style={[styles.nextBtn, !canNext() && { opacity: 0.4 }]}
            onPress={() => setStep(step + 1)}
            disabled={!canNext()}
          >
            <Text style={styles.nextBtnText}>Continue</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.nextBtn}
            onPress={handleSubmit}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.nextBtnText}>Post plan</Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

function Field({ label, children }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },

  navBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "ios" ? 56 : 20,
    paddingBottom: 12,
  },
  back: { fontSize: 15, color: C.primary, fontWeight: Typography.semibold },
  navTitle: { fontSize: 15, fontWeight: Typography.bold, color: C.text },
  stepCount: { fontSize: 13, color: C.muted, width: 40, textAlign: "right" },

  progressTrack: { height: 2, backgroundColor: C.border },
  progressFill: { height: 2, backgroundColor: C.primary },

  content: { padding: 24, paddingBottom: 120, gap: 20 },
  stepTitle: { fontSize: 20, fontWeight: Typography.bold, color: C.text },

  visOptions: { gap: 10 },
  visCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: C.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
    padding: 16,
  },
  visCardActive: { borderColor: C.primary },
  visIcon: { fontSize: 22 },
  visLabel: { fontSize: 15, fontWeight: Typography.semibold, color: C.text },
  visDesc: { fontSize: 12, color: C.muted, marginTop: 2 },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: C.border,
    justifyContent: "center",
    alignItems: "center",
  },
  radioActive: { borderColor: C.primary },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: C.primary,
  },

  form: { gap: 16 },
  fieldLabel: { fontSize: 13, fontWeight: Typography.semibold, color: C.text },
  input: {
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 10,
    padding: 13,
    fontSize: 15,
    color: C.text,
  },

  findBtn: {
    backgroundColor: C.primary,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  findBtnDisabled: {
    opacity: 0.7,
  },
  findBtnText: {
    color: C.surface,
    fontWeight: Typography.bold,
    fontSize: 14,
  },
  coordHint: {
    fontSize: 12,
    color: C.muted,
    marginTop: -4,
  },

  stopCard: {
    backgroundColor: C.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
    padding: 14,
    gap: 8,
  },
  stopHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  stopNum: { fontSize: 13, fontWeight: Typography.semibold, color: C.muted },
  removeText: { fontSize: 13, color: C.accent },
  addStopBtn: {
    borderWidth: 1,
    borderColor: C.border,
    borderStyle: "dashed",
    borderRadius: 10,
    padding: 13,
    alignItems: "center",
  },
  addStopText: {
    fontSize: 14,
    fontWeight: Typography.semibold,
    color: C.primary,
  },

  vibeHint: { fontSize: 13, color: C.muted },
  vibeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  vibeChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surface,
  },
  vibeChipActive: { backgroundColor: C.primary, borderColor: C.primary },
  vibeChipText: {
    fontSize: 14,
    fontWeight: Typography.semibold,
    color: C.text,
  },
  vibeChipTextActive: { color: C.surface },

  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    paddingBottom: Platform.OS === "ios" ? 36 : 20,
    backgroundColor: C.surface,
    borderTopWidth: 1,
    borderColor: C.border,
  },
  nextBtn: {
    backgroundColor: C.primary,
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
  },
  nextBtnText: { color: C.surface, fontWeight: Typography.bold, fontSize: 15 },
});
