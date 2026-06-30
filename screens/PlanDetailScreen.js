// screens/PlanDetailScreen.js
import { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Alert,
  ActivityIndicator,
  StatusBar,
} from "react-native";
import {
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  arrayUnion,
  arrayRemove,
  addDoc,
  collection,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase/config";
import { useAuth } from "../context/AuthContext";
import { C, Typography, Families, Brutalist } from "../constants/theme";
import VibeTag from "../components/VibeTag";
import Avatar from "../components/Avatar";
import AlertBox from "../components/AlertBox";
import ScaleButton from "../components/ScaleButton";
import MapPicker from "../components/MapPicker";
import AppIcon from "../components/AppIcon";
import { useToast } from "../context/ToastContext";

export default function PlanDetailScreen({ route, navigation }) {
  const { planId } = route.params;
  const { user, profile } = useAuth();
  const { showToast } = useToast();
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [forking, setForking] = useState(false);
  const [cancelAlertVisible, setCancelAlertVisible] = useState(false);

  useEffect(() => {
    fetchPlan();
  }, [planId]);

  const fetchPlan = async () => {
    setLoading(true);
    const snap = await getDoc(doc(db, "plans", planId));
    if (snap.exists()) setPlan({ id: snap.id, ...snap.data() });
    setLoading(false);
  };

  const isJoined = plan?.joinedBy?.includes(user?.uid);
  const isHost = plan?.hostId === user?.uid;

  // ── Delete plan ──────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    try {
      await deleteDoc(doc(db, "plans", planId));
      navigation.goBack();
    } catch (err) {
      console.error(err);
    }
  };

  // ── Open cancel confirmation ──────────────────────────────────────────────────
  const handleCancel = () => {
    setCancelAlertVisible(true);
  };

  // ── Join / leave ─────────────────────────────────────────────────────────────
  const handleJoin = async () => {
    setJoining(true);
    try {
      const ref = doc(db, "plans", planId);
      if (isJoined) {
        await updateDoc(ref, { joinedBy: arrayRemove(user.uid) });
        setPlan((p) => ({
          ...p,
          joinedBy: p.joinedBy.filter((id) => id !== user.uid),
        }));
      } else {
        await updateDoc(ref, { joinedBy: arrayUnion(user.uid) });
        setPlan((p) => ({ ...p, joinedBy: [...(p.joinedBy ?? []), user.uid] }));
      }
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setJoining(false);
    }
  };

  // ── Fork plan ─────────────────────────────────────────────────────────────────
  const handleFork = async () => {
    setForking(true);
    try {
      const forked = await addDoc(collection(db, "plans"), {
        title: `${plan.title} (forked)`,
        location: plan.location,
        itinerary: plan.itinerary ?? [],
        vibes: plan.vibes ?? [],
        visibility: "private",
        hostId: user.uid,
        hostUsername: profile.username,
        forkedFrom: { planId, hostUsername: plan.hostUsername },
        joinedBy: [user.uid],
        forks: 0,
        date: "",
        createdAt: serverTimestamp(),
      });
      await updateDoc(doc(db, "plans", planId), {
        forks: (plan.forks ?? 0) + 1,
      });
      Alert.alert(
        "Forked!",
        "Itinerary copied. Edit the date and make it yours.",
        [
          {
            text: "View plan",
            onPress: () =>
              navigation.replace("PlanDetail", { planId: forked.id }),
          },
        ]
      );
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setForking(false);
    }
  };

  // ── Loading / not found ───────────────────────────────────────────────────────
  if (loading)
    return (
      <View style={styles.center}>
        <ActivityIndicator color={C.primary} />
      </View>
    );

  if (!plan)
    return (
      <View style={styles.center}>
        <Text style={{ color: C.muted }}>Plan not found.</Text>
      </View>
    );

  // ── Main render ───────────────────────────────────────────────────────────────
  return (
    <View style={styles.root}>
      {/* Nav bar */}
      <View style={styles.navBar}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={{ width: 60 }}
        >
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.navTitle}>Plan</Text>
        {isHost ? (
          <TouchableOpacity
            onPress={handleCancel}
            style={{ width: 60, alignItems: "flex-end" }}
          >
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 60 }} />
        )}
      </View>

      {/* Scrollable content */}
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Title + host */}
        <View style={styles.section}>
          <Text style={styles.planTitle}>{plan.title}</Text>
          <View style={styles.hostRow}>
            <Avatar
              uri={plan.hostAvatarUrl}
              username={plan.hostUsername}
              size={32}
            />
            <View>
              <Text style={styles.hostName}>@{plan.hostUsername}</Text>
              {plan.forkedFrom && (
                <Text style={styles.forkedFrom}>
                  forked from @{plan.forkedFrom.hostUsername}
                </Text>
              )}
            </View>
          </View>
        </View>

        {/* Details card */}
        <View style={styles.detailsCard}>
          <DetailRow
            icon="mapPin"
            label="Location"
            value={plan.location}
          />
          <View style={styles.divider} />
          <DetailRow
            icon="calendar"
            label="Date"
            value={
              plan.date
                ? new Date(plan.date).toLocaleDateString([], {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "TBD"
            }
          />
          <View style={styles.divider} />
          <DetailRow
            icon="users"
            label="Going"
            value={`${plan.joinedBy?.length ?? 0} people`}
          />
          <View style={styles.divider} />
          <DetailRow
            icon="branch"
            label="Forks"
            value={plan.forks ?? 0}
          />
        </View>

        {/* Map */}
        {plan.locationCoord && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Location</Text>
            <MapPicker
              mode="view"
              initialCoord={plan.locationCoord}
              showUserLoc
              showRoute={!!plan.locationCoord}
              height={200}
              markerTitle={plan.location}
            />
          </View>
        )}

        {/* Vibes */}
        {plan.vibes?.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Vibe</Text>
            <View style={styles.vibesRow}>
              {plan.vibes.map((v) => (
                <VibeTag key={v} label={v} />
              ))}
            </View>
          </View>
        )}

        {/* Itinerary */}
        {plan.itinerary?.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Itinerary</Text>
            {plan.itinerary.map((item, i) => (
              <View key={i} style={styles.timelineItem}>
                <View style={styles.timelineDotCol}>
                  <View style={styles.dot} />
                  {i < plan.itinerary.length - 1 && (
                    <View style={styles.line} />
                  )}
                </View>
                <View style={styles.timelineBody}>
                  <Text style={styles.timeTime}>{item.time}</Text>
                  <Text style={styles.timeActivity}>{item.activity}</Text>
                  {item.location ? (
                    <View style={styles.timeLocRow}>
                      <AppIcon name="mapPin" size={13} color={C.muted} />
                      <Text style={styles.timeLoc}>{item.location}</Text>
                    </View>
                  ) : null}
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Action bar */}
      <View style={styles.actionBar}>
        {isHost ? (
          <ScaleButton
            style={styles.cancelPlanBtn}
            onPress={handleCancel}
          >
            <Text style={styles.cancelPlanBtnText}>Cancel plan</Text>
          </ScaleButton>
        ) : (
          <>
            <ScaleButton
              style={[styles.joinBtn, isJoined && styles.joinBtnActive]}
              onPress={handleJoin}
              disabled={joining}
            >
              {joining ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.joinBtnText}>
                  {isJoined ? "Joined ✓" : "Join plan"}
                </Text>
              )}
            </ScaleButton>
            <ScaleButton
              style={styles.forkBtn}
              onPress={handleFork}
              disabled={forking}
            >
              {forking ? (
                <ActivityIndicator color={C.text} />
              ) : (
                <View style={styles.forkBtnContent}>
                  <AppIcon name="branch" size={17} color={C.text} />
                  <Text style={styles.forkBtnText}>Fork</Text>
                </View>
              )}
            </ScaleButton>
          </>
        )}
      </View>

      {/* ── AlertBox — cancel plan confirmation ────────────────────────────────── */}
      <AlertBox
        visible={cancelAlertVisible}
        type="confirm"
        title="Cancel plan?"
        message="This will permanently delete the plan for everyone."
        confirmText="Yes, cancel it"
        cancelText="Keep it"
        showCancel
        onConfirm={() => {
          setCancelAlertVisible(false);
          handleDelete();
        }}
        onCancel={() => setCancelAlertVisible(false)}
      />
    </View>
  );
}

// ── Helper ────────────────────────────────────────────────────────────────────
function DetailRow({ icon, label, value }) {
  return (
    <View style={styles.detailRow}>
      <View style={styles.detailIcon}>
        <AppIcon name={icon} size={17} color={C.primary} />
      </View>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{String(value)}</Text>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: C.bg,
  },

  navBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "ios" ? 56 : (StatusBar.currentHeight || 0) + 12,
    paddingBottom: 12,
    borderBottomWidth: Brutalist.borderWidth,
    borderColor: Brutalist.borderColor,
  },
  back: { fontSize: 14, color: C.primary, fontFamily: Families.bold },
  cancelText: {
    fontSize: 14,
    color: C.danger,
    fontFamily: Families.bold,
  },
  navTitle: { fontSize: 16, fontFamily: Families.display, color: C.text },

  content: { padding: 20, paddingBottom: 120, gap: 24 },

  section: { gap: 10 },
  sectionLabel: {
    fontSize: 11,
    fontFamily: Families.bold,
    color: C.muted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  planTitle: {
    fontSize: 24,
    fontFamily: Families.display,
    color: C.text,
    lineHeight: 28,
  },
  hostRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  hostName: { fontSize: 14, fontFamily: Families.bold, color: C.primary },
  forkedFrom: { fontSize: 11, fontFamily: Families.regular, color: C.muted, marginTop: 1 },

  detailsCard: {
    backgroundColor: C.surface,
    borderRadius: 12,
    borderWidth: Brutalist.borderWidth,
    borderColor: Brutalist.borderColor,
    ...Brutalist.cardShadow,
    overflow: "hidden",
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    gap: 10,
  },
  detailIcon: {
    width: 28,
    height: 28,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: C.ink,
    backgroundColor: C.surfaceWarm,
    justifyContent: "center",
    alignItems: "center",
  },
  detailLabel: { fontSize: 13, fontFamily: Families.medium, color: C.muted },
  detailValue: { fontSize: 13, fontFamily: Families.bold, color: C.text, flex: 1, textAlign: "right" },
  divider: { height: 1.5, backgroundColor: C.ink, marginHorizontal: 14 },

  vibesRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },

  timelineItem: { flexDirection: "row", gap: 12, marginBottom: 0 },
  timelineDotCol: { alignItems: "center", width: 14 },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: C.ink,
    backgroundColor: C.sun,
    marginTop: 4,
  },
  line: {
    width: 2,
    flex: 1,
    backgroundColor: C.ink,
    marginTop: 4,
    minHeight: 24,
  },
  timelineBody: { flex: 1, paddingBottom: 20 },
  timeTime: {
    fontSize: 11,
    color: C.accent,
    fontFamily: Families.bold,
    marginBottom: 2,
  },
  timeActivity: {
    fontSize: 15,
    fontFamily: Families.semibold,
    color: C.text,
  },
  timeLocRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 3,
  },
  timeLoc: { fontSize: 12, fontFamily: Families.medium, color: C.muted },

  actionBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    gap: 10,
    padding: 20,
    paddingBottom: Platform.OS === "ios" ? 36 : 20,
    backgroundColor: C.surface,
    borderTopWidth: Brutalist.borderWidth,
    borderColor: Brutalist.borderColor,
  },
  joinBtn: {
    flex: 1,
    backgroundColor: C.primary,
    padding: 15,
    borderRadius: 8,
    borderWidth: Brutalist.borderWidth,
    borderColor: Brutalist.borderColor,
    ...Brutalist.btnShadow,
    alignItems: "center",
  },
  joinBtnActive: { backgroundColor: "#5A7A4A" },
  joinBtnText: { color: C.surface, fontFamily: Families.bold, fontSize: 15 },
  forkBtn: {
    backgroundColor: C.surfaceWarm,
    borderWidth: Brutalist.borderWidth,
    borderColor: Brutalist.borderColor,
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderRadius: 8,
    ...Brutalist.btnShadow,
    alignItems: "center",
    justifyContent: "center",
  },
  forkBtnContent: { flexDirection: "row", alignItems: "center", gap: 6 },
  forkBtnText: { color: C.text, fontFamily: Families.bold, fontSize: 15 },
  cancelPlanBtn: {
    flex: 1,
    backgroundColor: C.surfaceWarm,
    borderWidth: Brutalist.borderWidth,
    borderColor: C.danger,
    padding: 15,
    borderRadius: 8,
    ...Brutalist.btnShadow,
    alignItems: "center",
  },
  cancelPlanBtnText: {
    color: C.danger,
    fontFamily: Families.bold,
    fontSize: 15,
  },
});
