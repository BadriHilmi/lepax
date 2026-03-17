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
} from "react-native";
import {
  doc,
  getDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  addDoc,
  collection,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase/config";
import { useAuth } from "../context/AuthContext";
import { C, Typography } from "../constants/theme";
import VibeTag from "../components/VibeTag";
import Avatar from "../components/Avatar";

export default function PlanDetailScreen({ route, navigation }) {
  const { planId } = route.params;
  const { user, profile } = useAuth();
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [forking, setForking] = useState(false);

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
      Alert.alert("Error", err.message);
    } finally {
      setJoining(false);
    }
  };

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
      Alert.alert("Error", err.message);
    } finally {
      setForking(false);
    }
  };

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

  return (
    <View style={styles.root}>
      <View style={styles.navBar}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={{ width: 60 }}
        >
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.navTitle}>Plan</Text>
        <View style={{ width: 60 }} />
      </View>

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
                  ⑂ forked from @{plan.forkedFrom.hostUsername}
                </Text>
              )}
            </View>
          </View>
        </View>

        {/* Details card */}
        <View style={styles.detailsCard}>
          <DetailRow icon="📍" label="Location" value={plan.location} />
          <View style={styles.divider} />
          <DetailRow
            icon="🗓"
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
            icon="👥"
            label="Going"
            value={`${plan.joinedBy?.length ?? 0} people`}
          />
          <View style={styles.divider} />
          <DetailRow icon="⑂" label="Forks" value={plan.forks ?? 0} />
        </View>

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
                    <Text style={styles.timeLoc}>📍 {item.location}</Text>
                  ) : null}
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Action bar */}
      <View style={styles.actionBar}>
        <TouchableOpacity
          style={[styles.joinBtn, isJoined && styles.joinBtnActive]}
          onPress={handleJoin}
          disabled={joining}
          activeOpacity={0.85}
        >
          {joining ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.joinBtnText}>
              {isJoined ? "Joined ✓" : "Join plan"}
            </Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.forkBtn}
          onPress={handleFork}
          disabled={forking}
          activeOpacity={0.85}
        >
          {forking ? (
            <ActivityIndicator color={C.text} />
          ) : (
            <Text style={styles.forkBtnText}>⑂ Fork</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

function DetailRow({ icon, label, value }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailIcon}>{icon}</Text>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{String(value)}</Text>
    </View>
  );
}

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
    paddingTop: Platform.OS === "ios" ? 56 : 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderColor: C.border,
  },
  back: { fontSize: 15, color: C.primary, fontWeight: Typography.semibold },
  navTitle: { fontSize: 15, fontWeight: "700", color: C.text },

  content: { padding: 20, paddingBottom: 120, gap: 24 },

  section: { gap: 10 },
  sectionLabel: {
    fontSize: 12,
    fontWeight: Typography.semibold,
    color: C.muted,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },

  planTitle: { fontSize: 24, fontWeight: "700", color: C.text, lineHeight: 30 },
  hostRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  hostName: { fontSize: 14, fontWeight: Typography.semibold, color: C.primary },
  forkedFrom: { fontSize: 12, color: C.muted, marginTop: 1 },

  detailsCard: {
    backgroundColor: C.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
    overflow: "hidden",
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    gap: 10,
  },
  detailIcon: { fontSize: 16, width: 22 },
  detailLabel: { fontSize: 13, color: C.muted, flex: 1 },
  detailValue: { fontSize: 14, fontWeight: Typography.semibold, color: C.text },
  divider: { height: 1, backgroundColor: C.border, marginHorizontal: 14 },

  vibesRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },

  timelineItem: { flexDirection: "row", gap: 12, marginBottom: 0 },
  timelineDotCol: { alignItems: "center", width: 10 },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: C.primary,
    marginTop: 4,
  },
  line: {
    width: 1,
    flex: 1,
    backgroundColor: C.border,
    marginTop: 4,
    minHeight: 24,
  },
  timelineBody: { flex: 1, paddingBottom: 20 },
  timeTime: {
    fontSize: 11,
    color: C.muted,
    fontWeight: Typography.semibold,
    marginBottom: 2,
  },
  timeActivity: {
    fontSize: 15,
    fontWeight: Typography.semibold,
    color: C.text,
  },
  timeLoc: { fontSize: 12, color: C.muted, marginTop: 2 },

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
    borderTopWidth: 1,
    borderColor: C.border,
  },
  joinBtn: {
    flex: 1,
    backgroundColor: C.primary,
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
  },
  joinBtnActive: { backgroundColor: "#5A7A4A" },
  joinBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  forkBtn: {
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: "center",
  },
  forkBtnText: { color: C.text, fontWeight: Typography.semibold, fontSize: 15 },
});
