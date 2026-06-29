// screens/HomeScreen.js - Geolocation and sorting enabled
import { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ScrollView,
  StatusBar,
  Dimensions,
} from "react-native";
import { StatusBar as ExpoStatusBar } from "expo-status-bar";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
} from "firebase/firestore";
import { db } from "../firebase/config";
import { useAuth } from "../context/AuthContext";
import { C, Typography, Families, Brutalist } from "../constants/theme";
import VibeTag from "../components/VibeTag";
import Avatar from "../components/Avatar";
import AppIcon from "../components/AppIcon";
import { formatDateDisplay } from "../utils/date";
import ScaleButton from "../components/ScaleButton";
import * as Location from "expo-location";

function PlanCard({ plan, onPress, onVibePress }) {
  const { user } = useAuth();
  const isJoined = plan?.joinedBy?.includes(user?.uid);
  const isHost = plan?.hostId === user?.uid;
  const isPast = plan.date && new Date(plan.date) < new Date();

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={isPast && { opacity: 0.55 }}
    >
      <View style={[styles.card, isPast && styles.cardPast]}>
        <View style={styles.cardTop}>
          <View style={styles.hostRow}>
            <Avatar
              uri={plan.hostAvatarUrl}
              username={plan.hostUsername}
              size={32}
            />
            <View style={styles.hostMeta}>
              <Text style={styles.hostName}>@{plan.hostUsername}</Text>
              {plan.mutualFriends > 0 ? (
                <Text style={styles.mutual}>{plan.mutualFriends} mutual</Text>
              ) : (
                <Text style={styles.mutual}>Host</Text>
              )}
            </View>
          </View>
          {plan.forks > 0 && (
            <View style={styles.forkBadge}>
              <AppIcon name="branch" size={11} color={C.primary} />
              <Text style={styles.forkBadgeText}>
                {plan.forks} {plan.forks === 1 ? "fork" : "forks"}
              </Text>
            </View>
          )}
        </View>

        <Text style={styles.cardTitle}>{plan.title}</Text>

        <View style={styles.cardMeta}>
          <View style={styles.metaBadge}>
            <AppIcon name="calendar" size={13} color={C.accent} />
            <Text style={styles.metaBadgeText}>
              {formatDateDisplay(
                plan.date,
                { weekday: "short", day: "numeric", month: "short" },
                "Date TBD"
              )}
            </Text>
          </View>
          <View style={styles.metaBadge}>
            <AppIcon name="mapPin" size={13} color={C.primary} />
            <Text style={styles.metaBadgeText} numberOfLines={1}>
              {plan.location || "Location TBD"}
            </Text>
          </View>
        </View>

        <View style={styles.vibes}>
          {(plan.vibes || []).slice(0, 3).map((v) => (
            <VibeTag key={v} label={v} onPress={() => onVibePress?.(v)} />
          ))}
        </View>

        <View style={styles.dashedLine} />

        <View style={styles.cardFooter}>
          <View style={styles.footerLeft}>
            <AppIcon name="users" size={14} color={C.primary} />
            <Text style={styles.goingText}>{plan.joinedBy?.length ?? 0} going</Text>
          </View>
          <View style={styles.cardActions}>
            {isHost ? (
              <View style={styles.hostTagBadge}>
                <Text style={styles.hostTagBadgeText}>Host</Text>
              </View>
            ) : (
              <TouchableOpacity style={[styles.joinBtn, isJoined && styles.joinBtnActive]} onPress={onPress}>
                <Text style={[styles.joinBtnText, isJoined && styles.joinBtnTextActive]}>
                  {isJoined ? "Joined ✓" : "Join Plan"}
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.forkBtn} onPress={onPress}>
              <AppIcon name="branch" size={14} color={C.text} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function EmptyFeed({ tab }) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>
        <AppIcon
          name={tab === "friends" ? "users" : "map"}
          size={30}
          color={C.primary}
        />
      </View>
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

function getDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) *
      Math.cos(deg2rad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  return d;
}

function deg2rad(deg) {
  return deg * (Math.PI / 180);
}

export default function HomeScreen({ navigation }) {
  const { user, profile } = useAuth();
  const [tab, setTab] = useState("friends");
  const [radius, setRadius] = useState("20km");
  const [friendPlans, setFriendPlans] = useState([]);
  const [explorePlans, setExplorePlans] = useState([]);
  const [sortBy, setSortBy] = useState("date");
  const [sortDirection, setSortDirection] = useState("asc");
  const [selectedVibe, setSelectedVibe] = useState(null);
  const [userLocation, setUserLocation] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;
        let loc = await Location.getCurrentPositionAsync({});
        setUserLocation(loc.coords);
      } catch (err) {
        console.warn("Error getting location: ", err);
      }
    })();
  }, []);

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

  const sortPlans = (plans) => {
    return [...plans].sort((a, b) => {
      let comparison = 0;
      if (sortBy === "date") {
        const da = a.date ? new Date(a.date) : new Date(8640000000000000);
        const db = b.date ? new Date(b.date) : new Date(8640000000000000);
        comparison = da - db;
      } else if (sortBy === "event") {
        comparison = (a.title || "").localeCompare(b.title || "");
      } else if (sortBy === "popular") {
        comparison = (a.forks ?? 0) - (b.forks ?? 0);
      }
      return sortDirection === "asc" ? comparison : -comparison;
    });
  };

  const filterByRadius = (plans) => {
    if (radius === "Anywhere" || !userLocation) return plans;
    return plans.filter((p) => {
      if (!p.locationCoord) return false;
      const dist = getDistanceKm(
        userLocation.latitude,
        userLocation.longitude,
        p.locationCoord.latitude,
        p.locationCoord.longitude
      );
      const maxDist = parseInt(radius, 10);
      return dist <= maxDist;
    });
  };

  const filterByVibe = (plans) => {
    if (!selectedVibe) return plans;
    return plans.filter((p) => p.vibes?.includes(selectedVibe));
  };

  const sortedFriendPlans = sortPlans(filterByVibe(friendPlans));
  const sortedExplorePlans = sortPlans(filterByVibe(filterByRadius(explorePlans)));

  const nextPlan = friendPlans.find(p => {
    const isMember = p.hostId === user?.uid || p.joinedBy?.includes(user?.uid);
    return isMember && p.date && new Date(p.date) >= new Date();
  }) ?? null;
  const { width: SCREEN_WIDTH } = Dimensions.get("window");
  const scrollViewRef = useRef(null);

  const handleTabPress = (t) => {
    setTab(t);
    const pageIndex = t === "friends" ? 0 : 1;
    scrollViewRef.current?.scrollTo({ x: pageIndex * SCREEN_WIDTH, animated: true });
  };

  const handleSortPress = (option) => {
    if (sortBy === option) {
      setSortDirection(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setSortBy(option);
      setSortDirection(option === "popular" ? "desc" : "asc");
    }
  };

  return (
    <View style={styles.root}>
      <ExpoStatusBar style="light" />

      {/* Header Panel */}
      <View style={styles.headerPanel}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>
              Hey {profile?.username?.split("_")[0] ?? "there"}
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
                {formatDateDisplay(
                  nextPlan.date,
                  { weekday: "short", day: "numeric", month: "short" },
                  "Date TBD"
                )}{" "}
                · {nextPlan.location}
              </Text>
            </View>
            <View style={styles.nextArrow}>
              <AppIcon name="arrowRight" size={18} color={C.surface} />
            </View>
          </TouchableOpacity>
        )}
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {["friends", "explore"].map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.tab, tab === t && styles.tabActive]}
            onPress={() => handleTabPress(t)}
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
          style={{ flexGrow: 0 }}
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

      {/* Sort controls */}
      <View style={styles.sortRow}>
        <Text style={styles.sortLabel}>Sort:</Text>
        {["date", "event", "popular"].map((option) => {
          const isActive = sortBy === option;
          const arrow = sortDirection === "asc" ? " ▲" : " ▼";
          return (
            <TouchableOpacity
              key={option}
              style={[styles.sortPill, isActive && styles.sortPillActive]}
              onPress={() => handleSortPress(option)}
              activeOpacity={0.8}
            >
              <Text style={[styles.sortPillText, isActive && styles.sortPillTextActive]}>
                {option}{isActive ? arrow : ""}
              </Text>
            </TouchableOpacity>
          );
        })}
        {selectedVibe && (
          <TouchableOpacity
            style={styles.vibeFilterPill}
            onPress={() => setSelectedVibe(null)}
            activeOpacity={0.8}
          >
            <Text style={styles.vibeFilterPillText}>
              {selectedVibe} ✕
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Swipeable Tab Content */}
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => {
          const contentOffset = e.nativeEvent.contentOffset.x;
          const width = e.nativeEvent.layoutMeasurement.width;
          const page = Math.round(contentOffset / width);
          if (page === 0 && tab !== "friends") {
            setTab("friends");
          } else if (page === 1 && tab !== "explore") {
            setTab("explore");
          }
        }}
        style={{ flex: 1 }}
      >
        {/* Page 1: Friends feed */}
        <View style={{ width: SCREEN_WIDTH }}>
          <FlatList
            data={sortedFriendPlans}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <PlanCard
                plan={item}
                onPress={() =>
                  navigation.navigate("PlanDetail", { planId: item.id })
                }
                onVibePress={setSelectedVibe}
              />
            )}
            contentContainerStyle={styles.feed}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={<EmptyFeed tab="friends" />}
          />
        </View>

        {/* Page 2: Explore feed */}
        <View style={{ width: SCREEN_WIDTH }}>
          <FlatList
            data={sortedExplorePlans}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <PlanCard
                plan={item}
                onPress={() =>
                  navigation.navigate("PlanDetail", { planId: item.id })
                }
                onVibePress={setSelectedVibe}
              />
            )}
            contentContainerStyle={styles.feed}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={<EmptyFeed tab="explore" />}
          />
        </View>
      </ScrollView>

      {/* FAB */}
      <ScaleButton
        style={styles.fab}
        onPress={() => navigation.navigate("CreatePlan")}
      >
        <AppIcon name="plus" size={28} color={C.surface} />
      </ScaleButton>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },

  headerPanel: {
    backgroundColor: C.ink,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
    borderBottomWidth: Brutalist.borderWidth,
    borderColor: Brutalist.borderColor,
    paddingBottom: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "ios" ? 56 : (StatusBar.currentHeight || 0) + 16,
    paddingBottom: 12,
  },
  greeting: { fontSize: 13, fontFamily: Families.regular, color: "rgba(255, 255, 255, 0.7)" },
  headerTitle: {
    fontSize: 24,
    fontFamily: Families.display,
    color: C.surface,
    marginTop: 2,
  },

  nextStrip: {
    marginHorizontal: 20,
    marginBottom: 8,
    backgroundColor: C.primary,
    borderRadius: 10,
    borderWidth: Brutalist.borderWidth,
    borderColor: Brutalist.borderColor,
    ...Brutalist.btnShadow,
    padding: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  nextLabel: {
    fontSize: 10,
    color: C.sun,
    fontFamily: Families.bold,
    marginBottom: 2,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  nextTitle: { fontSize: 15, fontFamily: Families.bold, color: C.surface },
  nextDate: { fontSize: 11, fontFamily: Families.medium, color: "rgba(255,255,255,0.85)", marginTop: 2 },
  nextArrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: C.ink,
    borderWidth: 1.5,
    borderColor: C.surface,
    justifyContent: "center",
    alignItems: "center",
  },

  tabs: {
    flexDirection: "row",
    paddingHorizontal: 20,
    marginTop: 20,
    marginBottom: 8,
    gap: 8,
  },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    borderWidth: Brutalist.borderWidth,
    borderColor: "transparent",
  },
  tabActive: {
    backgroundColor: C.surfaceWarm,
    borderColor: Brutalist.borderColor,
    ...Brutalist.btnShadow,
    transform: [{ rotate: "-1.5deg" }],
  },
  tabText: { fontSize: 13, fontFamily: Families.bold, color: C.muted },
  tabTextActive: { color: C.text },

  radii: { paddingHorizontal: 20, paddingBottom: 10, gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1.8,
    borderColor: C.ink,
    backgroundColor: C.surface,
  },
  chipActive: { backgroundColor: C.text, borderColor: C.text },
  chipText: { fontSize: 12, color: C.muted, fontFamily: Families.semibold },
  chipTextActive: { color: C.surface },

  feed: { paddingHorizontal: 20, paddingBottom: 100, gap: 16, paddingTop: 8 },

  card: {
    backgroundColor: C.surface,
    borderRadius: 12,
    padding: 18,
    borderWidth: Brutalist.borderWidth,
    borderColor: Brutalist.borderColor,
    ...Brutalist.cardShadow,
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  hostRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  hostMeta: { gap: 1 },
  hostName: { fontSize: 13, fontFamily: Families.bold, color: C.text },
  mutual: { fontSize: 11, fontFamily: Families.regular, color: C.muted },
  forkBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: C.surfaceWarm,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: C.ink,
    transform: [{ rotate: "1.5deg" }],
  },
  forkBadgeText: {
    fontSize: 10,
    color: C.primary,
    fontFamily: Families.bold,
  },
  cardTitle: {
    fontSize: 18,
    fontFamily: Families.display,
    color: C.text,
    marginBottom: 12,
    lineHeight: 22,
  },
  cardMeta: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  metaBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: C.surfaceWarm,
    borderWidth: 1.5,
    borderColor: C.ink,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  metaBadgeText: {
    fontSize: 11,
    color: C.text,
    fontFamily: Families.medium,
    maxWidth: 160,
  },
  vibes: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 8 },
  dashedLine: {
    borderWidth: 0.8,
    borderColor: C.border,
    borderStyle: "dashed",
    marginVertical: 12,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },
  footerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  goingText: {
    fontSize: 13,
    color: C.primary,
    fontFamily: Families.bold,
  },
  cardActions: { flexDirection: "row", gap: 8, alignItems: "center" },
  joinBtn: {
    backgroundColor: C.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1.8,
    borderColor: C.ink,
    ...Brutalist.btnShadow,
  },
  joinBtnText: {
    color: C.surface,
    fontFamily: Families.bold,
    fontSize: 12,
  },
  forkBtn: {
    backgroundColor: C.surfaceWarm,
    borderWidth: 1.8,
    borderColor: C.ink,
    width: 34,
    height: 34,
    borderRadius: 6,
    justifyContent: "center",
    alignItems: "center",
    ...Brutalist.btnShadow,
  },

  empty: { alignItems: "center", paddingTop: 60, paddingHorizontal: 32 },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 10,
    marginBottom: 12,
    backgroundColor: C.surfaceWarm,
    borderWidth: Brutalist.borderWidth,
    borderColor: Brutalist.borderColor,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: Families.bold,
    color: C.text,
    marginBottom: 6,
    textAlign: "center",
  },
  emptySub: {
    fontSize: 13,
    fontFamily: Families.regular,
    color: C.muted,
    textAlign: "center",
    lineHeight: 18,
  },

  fab: {
    position: "absolute",
    bottom: 32,
    right: 24,
    width: 52,
    height: 52,
    borderRadius: 10,
    borderWidth: Brutalist.borderWidth,
    borderColor: Brutalist.borderColor,
    backgroundColor: C.primary,
    justifyContent: "center",
    alignItems: "center",
    ...Brutalist.cardShadow,
  },

  joinBtnActive: {
    backgroundColor: "#5A7A4A",
  },
  joinBtnTextActive: {
    color: C.surface,
  },
  hostTagBadge: {
    backgroundColor: C.surfaceWarm,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: C.ink,
    transform: [{ rotate: "1deg" }],
  },
  hostTagBadgeText: {
    color: C.primary,
    fontFamily: Families.bold,
    fontSize: 11,
  },

  sortRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 10,
    gap: 8,
    backgroundColor: C.bg,
  },
  sortLabel: {
    fontSize: 11,
    fontFamily: Families.bold,
    color: C.muted,
    textTransform: "uppercase",
    marginRight: 2,
  },
  sortPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: C.ink,
    backgroundColor: C.surface,
  },
  sortPillActive: {
    backgroundColor: C.primary,
    ...Brutalist.btnShadow,
  },
  sortPillText: {
    fontSize: 11,
    fontFamily: Families.bold,
    color: C.text,
    textTransform: "capitalize",
  },
  sortPillTextActive: {
    color: C.surface,
  },
  cardPast: {
    shadowOffset: { width: 0, height: 0 },
    elevation: 0,
    backgroundColor: C.surfaceWarm,
    borderColor: C.border,
  },
  vibeFilterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: C.ink,
    backgroundColor: C.accent,
    ...Brutalist.btnShadow,
    marginLeft: "auto",
  },
  vibeFilterPillText: {
    fontSize: 11,
    fontFamily: Families.bold,
    color: C.ink,
    textTransform: "uppercase",
  },
});
