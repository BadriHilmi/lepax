// screens/CreatePlanScreen.js
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase/config";
import { useAuth } from "../context/AuthContext";
import { C, Typography, VIBES } from "../constants/theme";
import DatePickerInput from "../components/DatePickerInput";
import MapPicker from "../components/MapPicker";

// ─── Constants ────────────────────────────────────────────────────────────────

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

const MALAYSIA_BIAS = { lat: 3.139, lng: 101.6869 };
const PHOTON_DEBOUNCE_MS = 450;
const PHOTON_LIMIT = 5;

const makeStopId = () => Math.random().toString(36).slice(2, 8);
const makeStop = () => ({
  id: makeStopId(),
  time: "",
  activity: "",
  location: "",
});

// ─── Photon geocoder (pure, no state) ────────────────────────────────────────

async function fetchPhoton(query) {
  const url =
    "https://photon.komoot.io/api/?" +
    `q=${encodeURIComponent(query)}` +
    `&limit=${PHOTON_LIMIT}` +
    "&lang=en" +
    `&lat=${MALAYSIA_BIAS.lat}` +
    `&lon=${MALAYSIA_BIAS.lng}`;

  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`Photon ${res.status}`);

  const data = await res.json();
  const features = Array.isArray(data?.features) ? data.features : [];

  return features
    .map((feature) => {
      const coords = feature?.geometry?.coordinates;
      const props = feature?.properties ?? {};

      if (
        !Array.isArray(coords) ||
        coords.length < 2 ||
        typeof coords[0] !== "number" ||
        typeof coords[1] !== "number"
      )
        return null;

      const parts = [
        props.name,
        props.street,
        props.city ?? props.county ?? props.state,
        props.postcode,
        props.country,
      ].filter(Boolean);

      return {
        id: `${props.osm_id ?? ""}-${props.osm_type ?? ""}-${coords[0]}-${
          coords[1]
        }`,
        label: parts.join(", ") || "",
        latitude: coords[1],
        longitude: coords[0],
      };
    })
    .filter(Boolean);
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function CreatePlanScreen({ navigation }) {
  const { user, profile } = useAuth();

  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  // Step 1
  const [visibility, setVisibility] = useState("friends");

  // Step 2
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(null);
  const [location, setLocation] = useState("");
  const [locationCoord, setLocationCoord] = useState(null);

  // Step 2 – geocoder UI state
  const [geocoding, setGeocoding] = useState(false);
  const [locationResults, setLocationResults] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Step 3
  const [itinerary, setItinerary] = useState([makeStop()]);

  // Step 4
  const [selectedVibes, setSelectedVibes] = useState([]);

  // ── Refs ──────────────────────────────────────────────────────────────────
  const debounceRef = useRef(null);
  const abortRef = useRef(null); // AbortController for in-flight fetch

  // ── Cleanup on unmount ────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      clearTimeout(debounceRef.current);
      abortRef.current?.abort();
    };
  }, []);

  // ── Geocoder ──────────────────────────────────────────────────────────────

  const runSearch = useCallback(async (query) => {
    // Cancel any in-flight request
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    if (!query.trim()) {
      setLocationResults([]);
      setShowSuggestions(false);
      setGeocoding(false);
      return;
    }

    setGeocoding(true);
    try {
      const results = await fetchPhoton(query.trim());
      setLocationResults(results);
      setShowSuggestions(results.length > 0);
    } catch (err) {
      if (err.name !== "AbortError") {
        console.error("Photon error:", err);
        setLocationResults([]);
        setShowSuggestions(false);
      }
    } finally {
      setGeocoding(false);
    }
  }, []);

  // Debounced search on location text change
  useEffect(() => {
    if (step !== 2) return;
    clearTimeout(debounceRef.current);

    if (!location.trim()) {
      setLocationResults([]);
      setShowSuggestions(false);
      return;
    }

    debounceRef.current = setTimeout(
      () => runSearch(location),
      PHOTON_DEBOUNCE_MS
    );
    return () => clearTimeout(debounceRef.current);
  }, [location, step, runSearch]);

  const handleLocationChange = useCallback(
    (text) => {
      setLocation(text);
      if (!text.trim()) {
        setLocationCoord(null);
        setShowSuggestions(false);
      } else if (locationResults.length > 0) {
        setShowSuggestions(true);
      }
    },
    [locationResults.length]
  );

  const handleSelectSuggestion = useCallback((item) => {
    setLocation(item.label);
    setLocationCoord({ latitude: item.latitude, longitude: item.longitude });
    setLocationResults([]);
    setShowSuggestions(false);
  }, []);

  // "Use first result" — runs an immediate (non-debounced) search
  const handleUseFirstResult = useCallback(async () => {
    if (!location.trim()) {
      Alert.alert("Missing location", "Enter a location name first.");
      return;
    }
    clearTimeout(debounceRef.current); // cancel pending debounce
    await runSearch(location);

    // Read results after the async call — state is updated inside runSearch
    setLocationResults((prev) => {
      if (prev.length > 0) {
        const first = prev[0];
        setLocation(first.label);
        setLocationCoord({
          latitude: first.latitude,
          longitude: first.longitude,
        });
        setShowSuggestions(false);
      } else {
        Alert.alert(
          "Location not found",
          "Try a more specific place or venue."
        );
      }
      return prev;
    });
  }, [location, runSearch]);

  const handleMapPick = useCallback((coord) => {
    setLocationCoord(coord);
    setShowSuggestions(false);
  }, []);

  // ── Itinerary ─────────────────────────────────────────────────────────────

  const updateStop = useCallback(
    (id, field, val) =>
      setItinerary((prev) =>
        prev.map((item) => (item.id === id ? { ...item, [field]: val } : item))
      ),
    []
  );

  const removeStop = useCallback(
    (id) => setItinerary((prev) => prev.filter((item) => item.id !== id)),
    []
  );

  const addStop = useCallback(
    () => setItinerary((prev) => [...prev, makeStop()]),
    []
  );

  // ── Vibes ─────────────────────────────────────────────────────────────────

  const toggleVibe = useCallback(
    (v) =>
      setSelectedVibes((prev) =>
        prev.includes(v)
          ? prev.filter((x) => x !== v)
          : prev.length < 3
          ? [...prev, v]
          : prev
      ),
    []
  );

  // ── Validation ────────────────────────────────────────────────────────────

  const canNext = useMemo(() => {
    if (step === 1) return true; // visibility always has a default
    if (step === 2) return !!(title.trim() && date !== null && location.trim());
    if (step === 3) return itinerary.some((x) => x.activity.trim());
    return true;
  }, [step, title, date, location, itinerary]);

  // ── Submit ────────────────────────────────────────────────────────────────

  const handleSubmit = useCallback(async () => {
    setSaving(true);
    try {
      await addDoc(collection(db, "plans"), {
        title: title.trim(),
        date: date ? date.toISOString() : "",
        location: location.trim(),
        locationCoord: locationCoord ?? null,
        visibility,
        vibes: selectedVibes,
        itinerary: itinerary
          .filter((x) => x.activity.trim())
          .map(({ id, ...rest }) => rest), // strip client-only id before saving
        hostId: user.uid,
        hostUsername: profile.username,
        hostAvatarUrl: profile.avatarUrl ?? "",
        joinedBy: [user.uid],
        forks: 0,
        createdAt: serverTimestamp(),
      });
      navigation.goBack();
    } catch (err) {
      Alert.alert("Error saving plan", err.message);
    } finally {
      setSaving(false);
    }
  }, [
    title,
    date,
    location,
    locationCoord,
    visibility,
    selectedVibes,
    itinerary,
    user,
    profile,
    navigation,
  ]);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <View style={styles.root}>
      {/* Nav */}
      <View style={styles.navBar}>
        <TouchableOpacity
          onPress={() =>
            step > 1 ? setStep((s) => s - 1) : navigation.goBack()
          }
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.back}>{step > 1 ? "← Back" : "Cancel"}</Text>
        </TouchableOpacity>
        <Text style={styles.navTitle}>New plan</Text>
        <Text style={styles.stepCount}>
          {step}/{STEPS.length}
        </Text>
      </View>

      {/* Progress bar */}
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
          <StepVisibility visibility={visibility} onSelect={setVisibility} />
        )}

        {step === 2 && (
          <StepDetails
            title={title}
            onTitleChange={setTitle}
            date={date}
            onDateChange={setDate}
            location={location}
            onLocationChange={handleLocationChange}
            locationCoord={locationCoord}
            geocoding={geocoding}
            locationResults={locationResults}
            showSuggestions={showSuggestions}
            onSelectSuggestion={handleSelectSuggestion}
            onUseFirstResult={handleUseFirstResult}
            onMapPick={handleMapPick}
            onLocationFocus={() => {
              if (locationResults.length > 0) setShowSuggestions(true);
            }}
          />
        )}

        {step === 3 && (
          <StepItinerary
            itinerary={itinerary}
            onUpdate={updateStop}
            onRemove={removeStop}
            onAdd={addStop}
          />
        )}

        {step === 4 && (
          <StepVibes selectedVibes={selectedVibes} onToggle={toggleVibe} />
        )}
      </ScrollView>

      {/* Footer CTA */}
      <View style={styles.footer}>
        {step < STEPS.length ? (
          <TouchableOpacity
            style={[styles.nextBtn, !canNext && styles.nextBtnDisabled]}
            onPress={() => setStep((s) => s + 1)}
            disabled={!canNext}
          >
            <Text style={styles.nextBtnText}>Continue</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.nextBtn, saving && styles.nextBtnDisabled]}
            onPress={handleSubmit}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color={C.surface} />
            ) : (
              <Text style={styles.nextBtnText}>Post plan</Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StepVisibility({ visibility, onSelect }) {
  return (
    <View style={styles.visOptions}>
      {VISIBILITY_OPTIONS.map((opt) => (
        <TouchableOpacity
          key={opt.value}
          style={[
            styles.visCard,
            visibility === opt.value && styles.visCardActive,
          ]}
          onPress={() => onSelect(opt.value)}
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
  );
}

function StepDetails({
  title,
  onTitleChange,
  date,
  onDateChange,
  location,
  onLocationChange,
  onLocationFocus,
  locationCoord,
  geocoding,
  locationResults,
  showSuggestions,
  onSelectSuggestion,
  onUseFirstResult,
  onMapPick,
}) {
  return (
    <View style={styles.form}>
      <Field label="Plan name">
        <TextInput
          style={styles.input}
          placeholder="e.g. Genting day trip"
          placeholderTextColor={C.muted}
          value={title}
          onChangeText={onTitleChange}
        />
      </Field>

      <DatePickerInput
        label="Date"
        value={date}
        onChange={onDateChange}
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
          onChangeText={onLocationChange}
          onFocus={onLocationFocus}
          onSubmitEditing={onUseFirstResult}
          returnKeyType="search"
          autoCorrect={false}
          autoCapitalize="words"
        />

        {geocoding && (
          <View style={styles.inlineSearchState}>
            <ActivityIndicator size="small" color={C.primary} />
            <Text style={styles.inlineSearchText}>Searching…</Text>
          </View>
        )}

        {showSuggestions && locationResults.length > 0 && (
          <View style={styles.suggestions}>
            {locationResults.map((item, idx) => (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.suggestionItem,
                  idx === locationResults.length - 1 &&
                    styles.suggestionItemLast,
                ]}
                activeOpacity={0.8}
                onPress={() => onSelectSuggestion(item)}
              >
                <Text style={styles.suggestionTitle} numberOfLines={2}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </Field>

      <TouchableOpacity
        style={[styles.findBtn, geocoding && styles.findBtnDisabled]}
        onPress={onUseFirstResult}
        disabled={geocoding}
      >
        {geocoding ? (
          <ActivityIndicator color={C.surface} />
        ) : (
          <Text style={styles.findBtnText}>Use first result</Text>
        )}
      </TouchableOpacity>

      <Field label="Pin on map">
        <MapPicker
          mode="pick"
          initialCoord={locationCoord}
          showUserLoc
          height={220}
          markerTitle={location || "Plan location"}
          onLocationPick={onMapPick}
        />
      </Field>

      {!!locationCoord && (
        <Text style={styles.coordHint}>
          {locationCoord.latitude.toFixed(5)},{" "}
          {locationCoord.longitude.toFixed(5)}
        </Text>
      )}
    </View>
  );
}

function StepItinerary({ itinerary, onUpdate, onRemove, onAdd }) {
  return (
    <View style={styles.form}>
      {itinerary.map((item, i) => (
        <View key={item.id} style={styles.stopCard}>
          <View style={styles.stopHeader}>
            <Text style={styles.stopNum}>Stop {i + 1}</Text>
            {itinerary.length > 1 && (
              <TouchableOpacity
                onPress={() => onRemove(item.id)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.removeText}>Remove</Text>
              </TouchableOpacity>
            )}
          </View>

          <TextInput
            style={styles.input}
            placeholder="Time (e.g. 10:00am)"
            placeholderTextColor={C.muted}
            value={item.time}
            onChangeText={(v) => onUpdate(item.id, "time", v)}
          />
          <TextInput
            style={styles.input}
            placeholder="Activity"
            placeholderTextColor={C.muted}
            value={item.activity}
            onChangeText={(v) => onUpdate(item.id, "activity", v)}
          />
          <TextInput
            style={styles.input}
            placeholder="Location (optional)"
            placeholderTextColor={C.muted}
            value={item.location}
            onChangeText={(v) => onUpdate(item.id, "location", v)}
          />
        </View>
      ))}

      <TouchableOpacity style={styles.addStopBtn} onPress={onAdd}>
        <Text style={styles.addStopText}>+ Add stop</Text>
      </TouchableOpacity>
    </View>
  );
}

function StepVibes({ selectedVibes, onToggle }) {
  return (
    <View style={styles.form}>
      <Text style={styles.vibeHint}>Pick up to 3</Text>
      <View style={styles.vibeGrid}>
        {VIBES.map((v) => {
          const on = selectedVibes.includes(v);
          return (
            <TouchableOpacity
              key={v}
              style={[styles.vibeChip, on && styles.vibeChipActive]}
              onPress={() => onToggle(v)}
            >
              <Text
                style={[styles.vibeChipText, on && styles.vibeChipTextActive]}
              >
                {v}
              </Text>
            </TouchableOpacity>
          );
        })}
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

// ─── Styles ───────────────────────────────────────────────────────────────────

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

  // Visibility
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

  // Form
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

  // Geocoder
  inlineSearchState: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
  },
  inlineSearchText: { fontSize: 12, color: C.muted },
  suggestions: {
    marginTop: 8,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 10,
    overflow: "hidden",
  },
  suggestionItem: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  suggestionItemLast: { borderBottomWidth: 0 },
  suggestionTitle: { fontSize: 14, color: C.text, lineHeight: 20 },
  findBtn: {
    backgroundColor: C.primary,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  findBtnDisabled: { opacity: 0.6 },
  findBtnText: { color: C.surface, fontWeight: Typography.bold, fontSize: 14 },
  coordHint: { fontSize: 12, color: C.muted, marginTop: -4 },

  // Itinerary
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

  // Vibes
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

  // Footer
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
  nextBtnDisabled: { opacity: 0.4 },
  nextBtnText: { color: C.surface, fontWeight: Typography.bold, fontSize: 15 },
});
