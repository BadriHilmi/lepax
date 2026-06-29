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
  StatusBar,
} from "react-native";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase/config";
import { useAuth } from "../context/AuthContext";
import { C, Typography, VIBES, Families, Brutalist } from "../constants/theme";
import DatePickerInput from "../components/DatePickerInput";
import MapPicker from "../components/MapPicker";
import FormField from "../components/FormField";
import AppIcon from "../components/AppIcon";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import { formatTimeDisplay } from "../utils/date";

// ─── Constants ────────────────────────────────────────────────────────────────

const VISIBILITY_OPTIONS = [
  {
    value: "private",
    label: "Just me",
    desc: "Invite people manually",
    icon: "lock",
  },
  {
    value: "friends",
    label: "Friends",
    desc: "Visible to your friends",
    icon: "users",
  },
  {
    value: "public",
    label: "Public",
    desc: "Anyone can discover it",
    icon: "globe",
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

async function fetchPhoton(query, signal) {
  const url =
    "https://photon.komoot.io/api/?" +
    `q=${encodeURIComponent(query)}` +
    `&limit=${PHOTON_LIMIT}` +
    "&lang=en" +
    `&lat=${MALAYSIA_BIAS.lat}` +
    `&lon=${MALAYSIA_BIAS.lng}`;

  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    signal,
  });
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
    const controller = new AbortController();
    abortRef.current = controller;

    const trimmed = query.trim();
    if (!trimmed) {
      setLocationResults([]);
      setShowSuggestions(false);
      setGeocoding(false);
      return [];
    }

    setGeocoding(true);
    try {
      const results = await fetchPhoton(trimmed, controller.signal);
      setLocationResults(results);
      setShowSuggestions(results.length > 0);
      return results;
    } catch (err) {
      if (err.name !== "AbortError") {
        console.error("Photon error:", err);
        setLocationResults([]);
        setShowSuggestions(false);
      }
      return [];
    } finally {
      if (abortRef.current === controller) {
        setGeocoding(false);
      }
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
    const results = await runSearch(location);
    const first = results[0];

    if (first) {
      setLocation(first.label);
      setLocationCoord({
        latitude: first.latitude,
        longitude: first.longitude,
      });
      setLocationResults([]);
      setShowSuggestions(false);
    } else {
      Alert.alert("Location not found", "Try a more specific place or venue.");
    }
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
            mainLocation={location}
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
          <View
            style={[
              styles.visIcon,
              visibility === opt.value && styles.visIconActive,
            ]}
          >
            <AppIcon
              name={opt.icon}
              size={20}
              color={visibility === opt.value ? C.surface : C.primary}
            />
          </View>
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
      <FormField label="Plan name" labelStyle={styles.fieldLabel}>
        <TextInput
          style={styles.input}
          placeholder="e.g. Genting day trip"
          placeholderTextColor={C.muted}
          value={title}
          onChangeText={onTitleChange}
        />
      </FormField>

      <DatePickerInput
        label="Date"
        value={date}
        onChange={onDateChange}
        mode="datetime"
        required
        minimumDate={new Date()}
        placeholder="Pick a date and time"
      />

      <FormField label="Location name" labelStyle={styles.fieldLabel}>
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
      </FormField>

      <TouchableOpacity
        style={[styles.findBtn, geocoding && styles.findBtnDisabled]}
        onPress={onUseFirstResult}
        disabled={geocoding}
      >
        {geocoding ? (
          <ActivityIndicator color={C.surface} />
        ) : (
          <View style={styles.findBtnContent}>
            <AppIcon name="navigation" size={17} color={C.surface} />
            <Text style={styles.findBtnText}>Use first result</Text>
          </View>
        )}
      </TouchableOpacity>

      <FormField label="Pin on map" labelStyle={styles.fieldLabel}>
        <MapPicker
          mode="pick"
          initialCoord={locationCoord}
          showUserLoc
          height={220}
          markerTitle={location || "Plan location"}
          onLocationPick={onMapPick}
        />
      </FormField>

      {!!locationCoord && (
        <Text style={styles.coordHint}>
          {locationCoord.latitude.toFixed(5)},{" "}
          {locationCoord.longitude.toFixed(5)}
        </Text>
      )}
    </View>
  );
}

function StepItinerary({ itinerary, onUpdate, onRemove, onAdd, mainLocation }) {
  const [activeStopId, setActiveStopId] = useState(null);

  const parseTimeToMinutes = (timeStr) => {
    if (!timeStr) return null;
    const cleanStr = timeStr.trim().toUpperCase();

    // 1. Matches "8 AM", "12 PM", "08 AM", etc.
    const hourAmPmRegex = /^(\d+)\s*(AM|PM)$/;
    const matchHourAmPm = cleanStr.match(hourAmPmRegex);
    if (matchHourAmPm) {
      let hours = parseInt(matchHourAmPm[1], 10);
      const ampm = matchHourAmPm[2];
      if (ampm === "PM" && hours < 12) hours += 12;
      if (ampm === "AM" && hours === 12) hours = 0;
      return hours * 60;
    }

    // 2. Matches "8:30 AM", "12:00 PM", etc.
    const fullAmPmRegex = /^(\d+):(\d+)\s*(AM|PM)$/;
    const matchFullAmPm = cleanStr.match(fullAmPmRegex);
    if (matchFullAmPm) {
      let hours = parseInt(matchFullAmPm[1], 10);
      const minutes = parseInt(matchFullAmPm[2], 10);
      const ampm = matchFullAmPm[3];
      if (ampm === "PM" && hours < 12) hours += 12;
      if (ampm === "AM" && hours === 12) hours = 0;
      return hours * 60 + minutes;
    }

    // 3. Matches "14:30", "08:00", etc. (24h)
    const regex24 = /^(\d+):(\d+)$/;
    const match24 = cleanStr.match(regex24);
    if (match24) {
      const hours = parseInt(match24[1], 10);
      const minutes = parseInt(match24[2], 10);
      return hours * 60 + minutes;
    }

    return null;
  };

  const getInitialPickerDate = () => {
    if (!activeStopId) return new Date();
    const index = itinerary.findIndex((item) => item.id === activeStopId);
    let referenceTimeStr = null;
    for (let j = index - 1; j >= 0; j--) {
      if (itinerary[j].time) {
        referenceTimeStr = itinerary[j].time;
        break;
      }
    }
    const d = new Date();
    d.setMinutes(0, 0, 0);
    if (referenceTimeStr) {
      const parsed = parseTimeToMinutes(referenceTimeStr);
      if (parsed !== null) {
        const hours = Math.floor(parsed / 60);
        d.setHours(hours, 0, 0, 0);
        return d;
      }
    }
    return d;
  };

  const handleTimeConfirm = (date) => {
    if (activeStopId) {
      date.setMinutes(0, 0, 0);
      let hours = date.getHours();
      const ampm = hours >= 12 ? "PM" : "AM";
      hours = hours % 12;
      hours = hours ? hours : 12;
      const formattedTime = `${hours} ${ampm}`;
      onUpdate(activeStopId, "time", formattedTime);
    }
    setActiveStopId(null);
  };

  return (
    <View style={styles.form}>
      {itinerary.map((item, i) => {
        const showUseMainLocation =
          mainLocation?.trim() &&
          item.location !== mainLocation &&
          !item.location?.trim();

        return (
          <View key={item.id} style={styles.timelineStopRow}>
            {/* Left Column: Time Picker Trigger */}
            <View style={styles.timelineTimeCol}>
              <TouchableOpacity
                style={[styles.timePickerBtn, !item.time && styles.timePickerBtnEmpty]}
                onPress={() => setActiveStopId(item.id)}
                activeOpacity={0.8}
              >
                <AppIcon name="clock" size={13} color={item.time ? C.primary : C.muted} />
                <Text style={[styles.timePickerText, !item.time && styles.timePickerTextEmpty]}>
                  {item.time || "Set time"}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Middle Column: Node and vertical line */}
            <View style={styles.timelineDotCol}>
              <View style={styles.timelineDot} />
              {i < itinerary.length - 1 && <View style={styles.timelineConnector} />}
            </View>

            {/* Right Column: Inputs */}
            <View style={styles.timelineInputCol}>
              <View style={styles.stopCardBody}>
                <View style={styles.activityRow}>
                  <TextInput
                    style={styles.activityInput}
                    placeholder={`Stop ${i + 1} activity`}
                    placeholderTextColor={C.muted}
                    value={item.activity}
                    onChangeText={(v) => onUpdate(item.id, "activity", v)}
                  />
                  {itinerary.length > 1 && (
                    <TouchableOpacity
                      onPress={() => onRemove(item.id)}
                      style={styles.trashBtn}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <AppIcon name="trash" size={15} color={C.danger} />
                    </TouchableOpacity>
                  )}
                </View>

                <TextInput
                  style={styles.locationInput}
                  placeholder="Location (optional)"
                  placeholderTextColor={C.muted}
                  value={item.location}
                  onChangeText={(v) => onUpdate(item.id, "location", v)}
                />

                {/* Main Location Suggestion Pill */}
                {!!showUseMainLocation && (
                  <TouchableOpacity
                    style={styles.suggestPill}
                    onPress={() => onUpdate(item.id, "location", mainLocation)}
                    activeOpacity={0.8}
                  >
                    <AppIcon name="mapPin" size={11} color={C.primary} />
                    <Text style={styles.suggestPillText} numberOfLines={1}>
                      Use "{mainLocation}"
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        );
      })}

      <TouchableOpacity style={styles.addStopBtn} onPress={onAdd}>
        <Text style={styles.addStopText}>+ Add stop</Text>
      </TouchableOpacity>

      <DateTimePickerModal
        isVisible={activeStopId !== null}
        mode="time"
        minuteInterval={60}
        date={getInitialPickerDate()}
        onConfirm={handleTimeConfirm}
        onCancel={() => setActiveStopId(null)}
      />
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

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },

  navBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "ios" ? 56 : (StatusBar.currentHeight || 0) + 12,
    paddingBottom: 12,
  },
  back: { fontSize: 14, color: C.primary, fontFamily: Families.bold },
  navTitle: { fontSize: 16, fontFamily: Families.display, color: C.text },
  stepCount: { fontSize: 12, fontFamily: Families.bold, color: C.muted, width: 40, textAlign: "right" },

  progressTrack: { height: 4, backgroundColor: C.border, borderRadius: 2 },
  progressFill: { height: 4, backgroundColor: C.primary, borderRadius: 2 },

  content: { padding: 24, paddingBottom: 120, gap: 20 },
  stepTitle: { fontSize: 20, fontFamily: Families.display, color: C.text },

  // Visibility
  visOptions: { gap: 12 },
  visCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: C.surface,
    borderRadius: 8,
    borderWidth: 1.8,
    borderColor: C.ink,
    padding: 16,
  },
  visCardActive: {
    backgroundColor: C.surfaceWarm,
    ...Brutalist.cardShadow,
  },
  visIcon: {
    width: 40,
    height: 40,
    borderRadius: 6,
    backgroundColor: C.surfaceWarm,
    borderWidth: 1.5,
    borderColor: C.ink,
    justifyContent: "center",
    alignItems: "center",
  },
  visIconActive: {
    backgroundColor: C.primary,
    borderColor: C.ink,
  },
  visLabel: { fontSize: 15, fontFamily: Families.bold, color: C.text },
  visDesc: { fontSize: 12, fontFamily: Families.regular, color: C.muted, marginTop: 2 },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: C.ink,
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
  fieldLabel: { fontSize: 12, fontFamily: Families.bold, color: C.text },
  input: {
    backgroundColor: C.surface,
    borderWidth: 1.8,
    borderColor: C.ink,
    borderRadius: 6,
    padding: 13,
    fontSize: 14,
    fontFamily: Families.medium,
    color: C.text,
  },

  // Geocoder
  inlineSearchState: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
  },
  inlineSearchText: { fontSize: 12, fontFamily: Families.regular, color: C.muted },
  suggestions: {
    marginTop: 8,
    backgroundColor: C.surface,
    borderWidth: 1.8,
    borderColor: C.ink,
    borderRadius: 8,
    overflow: "hidden",
  },
  suggestionItem: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1.5,
    borderBottomColor: C.ink,
  },
  suggestionItemLast: { borderBottomWidth: 0 },
  suggestionTitle: { fontSize: 14, fontFamily: Families.medium, color: C.text, lineHeight: 20 },
  findBtn: {
    backgroundColor: C.primary,
    paddingVertical: 12,
    borderRadius: 6,
    borderWidth: 1.8,
    borderColor: C.ink,
    ...Brutalist.btnShadow,
    alignItems: "center",
  },
  findBtnDisabled: { opacity: 0.6 },
  findBtnContent: { flexDirection: "row", alignItems: "center", gap: 7 },
  findBtnText: { color: C.surface, fontFamily: Families.bold, fontSize: 14 },
  coordHint: { fontSize: 12, fontFamily: Families.regular, color: C.muted, marginTop: -4 },

  // Itinerary
  timelineStopRow: { flexDirection: "row", gap: 10, marginBottom: 8 },
  timelineTimeCol: { width: 95, alignItems: "flex-end", paddingTop: 10 },
  timePickerBtn: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: C.surfaceWarm, borderWidth: 1.5, borderColor: C.ink, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 7 },
  timePickerBtnEmpty: { backgroundColor: C.surface, borderStyle: "dashed" },
  timePickerText: { fontSize: 12, fontFamily: Families.bold, color: C.primary },
  timePickerTextEmpty: { color: C.muted },
  timelineDotCol: { alignItems: "center", width: 12, paddingTop: 16 },
  timelineDot: { width: 10, height: 10, borderRadius: 5, borderWidth: 1.5, borderColor: C.ink, backgroundColor: C.primary },
  timelineConnector: { width: 2, flex: 1, backgroundColor: C.ink, marginTop: 6, marginBottom: -16 },
  timelineInputCol: { flex: 1 },
  stopCardBody: { backgroundColor: C.surface, borderRadius: 8, borderWidth: 1.8, borderColor: C.ink, ...Brutalist.cardShadow, padding: 12, gap: 8 },
  activityRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  activityInput: { flex: 1, borderWidth: 0, borderBottomWidth: 1.5, borderBottomColor: C.ink, paddingHorizontal: 2, paddingVertical: 5, fontSize: 14, color: C.text, fontFamily: Families.semibold },
  locationInput: { borderWidth: 0, borderBottomWidth: 1.5, borderBottomColor: C.ink, paddingHorizontal: 2, paddingVertical: 4, fontSize: 13, color: C.text, fontFamily: Families.regular },
  trashBtn: { padding: 4 },
  suggestPill: { flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-start", backgroundColor: C.surfaceWarm, borderRadius: 6, borderWidth: 1.5, borderColor: C.ink, paddingHorizontal: 8, paddingVertical: 4, marginTop: 2, maxWidth: "100%" },
  suggestPillText: { fontSize: 11, fontFamily: Families.medium, color: C.primary },
  addStopBtn: {
    borderWidth: 1.8,
    borderColor: C.ink,
    borderStyle: "dashed",
    borderRadius: 8,
    padding: 13,
    alignItems: "center",
    marginTop: 8,
  },
  addStopText: {
    fontSize: 14,
    fontFamily: Families.bold,
    color: C.primary,
  },

  // Vibes
  vibeHint: { fontSize: 13, fontFamily: Families.regular, color: C.muted },
  vibeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  vibeChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 6,
    borderWidth: 1.8,
    borderColor: C.ink,
    backgroundColor: C.surface,
    ...Brutalist.btnShadow,
  },
  vibeChipActive: { backgroundColor: C.primary },
  vibeChipText: {
    fontSize: 14,
    fontFamily: Families.bold,
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
    borderTopWidth: Brutalist.borderWidth,
    borderColor: Brutalist.borderColor,
  },
  nextBtn: {
    backgroundColor: C.primary,
    padding: 15,
    borderRadius: 8,
    borderWidth: Brutalist.borderWidth,
    borderColor: Brutalist.borderColor,
    ...Brutalist.btnShadow,
    alignItems: "center",
  },
  nextBtnDisabled: { opacity: 0.4 },
  nextBtnText: { color: C.surface, fontFamily: Families.bold, fontSize: 15 },
});
