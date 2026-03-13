// screens/HomeScreen.js
import { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ScrollView,
} from "react-native";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
} from "firebase/firestore";
import { db } from "../firebase/config";
import { useAuth } from "../context/AuthContext";
import { C } from "../constants/theme";
import VibeTag from "../components/x";
import Avatar from "../components/Avatar";

function PlanCard({ plan, onPress }) {
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View style={styles.cardTop}>
        <View style={styles.hostRow}>
          <Avatar
            uri={plan.hostAvatarUrl}
            username={plan.hostUsername}
            size={28}
          />
          <Text style={styles.hostName}>@{plan.hostUsername}</Text>
          {plan.mutualFriends > 0 && (
            <Text style={styles.mutual}>{plan.mutualFriends} mutual</Text>
          )}
        </View>
        {plan.forks > 0 && (
          <View style={styles.forkBadge}>
            <Text style={styles.forkBadgeText}>⑂ {plan.forks}</Text>
          </View>
        )}
      </View>

      <Text style={styles.cardTitle}>{plan.title}</Text>

      <View style={styles.cardMeta}>
        <Text style={styles.cardMetaText}>📍 {plan.location}</Text>
        <Text style={styles.cardMetaText}>🗓 {plan.date || "Date TBD"}</Text>
      </View>

      <View style={styles.vibes}>
        {(plan.vibes || []).slice(0, 3).map((v) => (
          <VibeTag key={v} label={v} />
        ))}
      </View>

      <View style={styles.cardFooter}>
        <Text style={styles.goingText}>{plan.joinedBy?.length ?? 0} going</Text>
        <View style={styles.cardActions}>
          <TouchableOpacity style={styles.joinBtn} onPress={onPress}>
            <Text style={styles.joinBtnText}>Join</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.forkBtn} onPress={onPress}>
            <Text style={styles.forkBtnText}>⑂ Fork</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function EmptyFeed({ tab }) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyIcon}>{tab === "friends" ? "👥" : "🗺"}</Text>
      <Text style={styles.emptyTitle}>
        {tab === "friends" ? "No friend plans yet" : "Nothing nearby"}
      </Text>
      <Text style={styles.emptySub}>
        {tab === "friends"
          ? "When friends post plans they'll appear here."
          : "Try widening the radius or a different date."}
      </Text>
    </View>
  );
}

const RADII = ["5km", "20km", "50km", "Anywhere"];

export default function HomeScreen({ navigation }) {
  const { profile } = useAuth();
  const [tab, setTab] = useState("friends");
  const [radius, setRadius] = useState("20km");
  const [friendPlans, setFriendPlans] = useState([]);
  const [explorePlans, setExplorePlans] = useState([]);

  useEffect(() => {
    const q = query(
      collection(db, "plans"),
      where("visibility", "in", ["friends", "public"]),
      orderBy("createdAt", "desc")
    );
    return onSnapshot(q, (snap) =>
      setFriendPlans(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
  }, []);

  useEffect(() => {
    const q = query(
      collection(db, "plans"),
      where("visibility", "==", "public"),
      orderBy("forks", "desc")
    );
    return onSnapshot(q, (snap) =>
      setExplorePlans(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
  }, []);

  const nextPlan = friendPlans[0] ?? null;
  const feed = tab === "friends" ? friendPlans : explorePlans;

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>
            Hey {profile?.username?.split("_")[0] ?? "there"} 👋
          </Text>
          <Text style={styles.headerTitle}>What's the plan?</Text>
        </View>
        <TouchableOpacity onPress={() => navigation.navigate("Profile")}>
          <Avatar
            uri={profile?.avatarUrl}
            username={profile?.username}
            size={38}
          />
        </TouchableOpacity>
      </View>

      {/* Next plan strip */}
      {nextPlan && (
        <TouchableOpacity
          style={styles.nextStrip}
          onPress={() =>
            navigation.navigate("PlanDetail", { planId: nextPlan.id })
          }
          activeOpacity={0.85}
        >
          <View>
            <Text style={styles.nextLabel}>Your next plan</Text>
            <Text style={styles.nextTitle}>{nextPlan.title}</Text>
            <Text style={styles.nextDate}>
              {nextPlan.date} · {nextPlan.location}
            </Text>
          </View>
          <Text style={styles.nextArrow}>→</Text>
        </TouchableOpacity>
      )}

      {/* Tabs */}
      <View style={styles.tabs}>
        {["friends", "explore"].map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.tab, tab === t && styles.tabActive]}
            onPress={() => setTab(t)}
          >
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Radius chips */}
      {tab === "explore" && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.radii}
        >
          {RADII.map((r) => (
            <TouchableOpacity
              key={r}
              style={[styles.chip, radius === r && styles.chipActive]}
              onPress={() => setRadius(r)}
            >
              <Text
                style={[styles.chipText, radius === r && styles.chipTextActive]}
              >
                {r}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Feed */}
      <FlatList
        data={feed}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <PlanCard
            plan={item}
            onPress={() =>
              navigation.navigate("PlanDetail", { planId: item.id })
            }
          />
        )}
        contentContainerStyle={styles.feed}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={<EmptyFeed tab={tab} />}
      />

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate("CreatePlan")}
        activeOpacity={0.85}
      >
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "ios" ? 56 : 20,
    paddingBottom: 16,
  },
  greeting: { fontSize: 13, color: C.muted },
  headerTitle: { fontSize: 22, fontWeight: "700", color: C.text, marginTop: 2 },

  nextStrip: {
    marginHorizontal: 20,
    marginBottom: 16,
    backgroundColor: C.primary,
    borderRadius: 10,
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  nextLabel: {
    fontSize: 11,
    color: "rgba(255,255,255,0.7)",
    fontWeight: "600",
    marginBottom: 3,
  },
  nextTitle: { fontSize: 16, fontWeight: "700", color: "#fff" },
  nextDate: { fontSize: 12, color: "rgba(255,255,255,0.8)", marginTop: 2 },
  nextArrow: { fontSize: 20, color: "#fff" },

  tabs: {
    flexDirection: "row",
    paddingHorizontal: 20,
    marginBottom: 4,
    gap: 4,
  },
  tab: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8 },
  tabActive: { backgroundColor: C.sand },
  tabText: { fontSize: 14, fontWeight: "600", color: C.muted },
  tabTextActive: { color: C.text },

  radii: { paddingHorizontal: 20, paddingBottom: 10, gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surface,
  },
  chipActive: { backgroundColor: C.text, borderColor: C.text },
  chipText: { fontSize: 13, color: C.muted, fontWeight: "500" },
  chipTextActive: { color: "#fff" },

  feed: { paddingHorizontal: 20, paddingBottom: 100, gap: 12, paddingTop: 8 },

  card: {
    backgroundColor: C.surface,
    borderRadius: 10,
    padding: 16,
    borderWidth: 1,
    borderColor: C.border,
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  hostRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  hostName: { fontSize: 13, fontWeight: "600", color: C.primary },
  mutual: { fontSize: 11, color: C.muted },
  forkBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: C.sand,
    borderRadius: 6,
  },
  forkBadgeText: { fontSize: 12, color: C.text, fontWeight: "600" },
  cardTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: C.text,
    marginBottom: 8,
  },
  cardMeta: { gap: 3, marginBottom: 10 },
  cardMetaText: { fontSize: 13, color: C.muted },
  vibes: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 12 },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderColor: C.border,
    paddingTop: 10,
  },
  goingText: { fontSize: 13, color: C.muted },
  cardActions: { flexDirection: "row", gap: 8 },
  joinBtn: {
    backgroundColor: C.primary,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
  },
  joinBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  forkBtn: {
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  forkBtnText: { color: C.text, fontWeight: "600", fontSize: 13 },

  empty: { alignItems: "center", paddingTop: 60, paddingHorizontal: 32 },
  emptyIcon: { fontSize: 36, marginBottom: 12 },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: C.text,
    marginBottom: 6,
    textAlign: "center",
  },
  emptySub: {
    fontSize: 14,
    color: C.muted,
    textAlign: "center",
    lineHeight: 20,
  },

  fab: {
    position: "absolute",
    bottom: 32,
    right: 24,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: C.primary,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  fabIcon: { fontSize: 26, color: "#fff", lineHeight: 30 },
});
