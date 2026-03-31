// screens/FreeNowScreen.js
// "Also free?" — nudge friends who have no plans today
import { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Alert,
} from "react-native";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase/config";
import { useAuth } from "../context/AuthContext";
import { C, Typography } from "../constants/theme";
import Avatar from "../components/Avatar";

const NUDGE_MSGS = [
  "jom mamak?",
  "anyone free?",
  "jom keluar!",
  "bored. jom?",
  "free tak?",
];
const randMsg = () => NUDGE_MSGS[Math.floor(Math.random() * NUDGE_MSGS.length)];

export default function FreeNowScreen({ navigation }) {
  const { user, profile } = useAuth();
  const [friends, setFriends] = useState([]);
  const [nudgedIds, setNudgedIds] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFriends();
  }, []);

  const loadFriends = async () => {
    setLoading(true);
    try {
      const ids = profile?.friends ?? [];
      if (!ids.length) {
        setFriends([]);
        return;
      }
      const snap = await getDocs(
        query(collection(db, "users"), where("uid", "in", ids.slice(0, 10)))
      );
      setFriends(snap.docs.map((d) => d.data()));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const sendNudge = async (toUid, toUsername) => {
    try {
      await addDoc(collection(db, "nudges"), {
        fromUid: user.uid,
        fromUsername: profile.username,
        toUid,
        message: randMsg(),
        createdAt: serverTimestamp(),
        read: false,
      });
      setNudgedIds((p) => [...p, toUid]);
    } catch (err) {
      Alert.alert("Error", err.message);
    }
  };

  const broadcastNudge = async () => {
    const ids = profile?.friends ?? [];
    if (!ids.length) {
      Alert.alert("No friends yet", "Add friends first.");
      return;
    }
    const msg = randMsg();
    try {
      await addDoc(collection(db, "nudges"), {
        fromUid: user.uid,
        fromUsername: profile.username,
        toAll: true,
        toUids: ids,
        message: msg,
        createdAt: serverTimestamp(),
        read: false,
      });
      setNudgedIds(ids);
      Alert.alert("Nudged!", `"${msg}" sent to all friends.`);
    } catch (err) {
      Alert.alert("Error", err.message);
    }
  };

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.title}>Also free?</Text>
            <Text style={styles.subtitle}>Friends with no plans today</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.headerBtn}
              onPress={() => navigation.navigate("FriendRequests")}
            >
              <Text style={styles.headerBtnText}>Requests</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.headerBtn, styles.headerBtnPrimary]}
              onPress={() => navigation.navigate("AddFriend")}
            >
              <Text style={styles.headerBtnPrimaryText}>+ Add</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Broadcast */}
      <TouchableOpacity
        style={styles.broadcast}
        onPress={broadcastNudge}
        activeOpacity={0.85}
      >
        <View>
          <Text style={styles.broadcastTitle}>Broadcast "jom?"</Text>
          <Text style={styles.broadcastSub}>
            Nudge all free friends at once
          </Text>
        </View>
        <Text style={styles.broadcastArrow}>→</Text>
      </TouchableOpacity>

      <FlatList
        data={friends}
        keyExtractor={(item) => item.uid}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          const nudged = nudgedIds.includes(item.uid);
          return (
            <View style={styles.row}>
              <View style={styles.rowLeft}>
                <Avatar
                  uri={item.avatarUrl}
                  username={item.username}
                  size={40}
                />
                <View>
                  <Text style={styles.rowName}>@{item.username}</Text>
                  <Text style={styles.rowStatus}>No plans today</Text>
                </View>
              </View>
              <TouchableOpacity
                style={[styles.nudgeBtn, nudged && styles.nudgeBtnDone]}
                onPress={() => sendNudge(item.uid, item.username)}
                disabled={nudged}
              >
                <Text
                  style={[
                    styles.nudgeBtnText,
                    nudged && styles.nudgeBtnTextDone,
                  ]}
                >
                  {nudged ? "Sent ✓" : "Nudge"}
                </Text>
              </TouchableOpacity>
            </View>
          );
        }}
        ListEmptyComponent={
          !loading && (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>👥</Text>
              <Text style={styles.emptyTitle}>No friends yet</Text>
              <Text style={styles.emptySub}>
                Add friends by username or share your QR at your next lepak.
              </Text>
            </View>
          )
        }
      />

      <View style={styles.chatNote}>
        <Text style={styles.chatNoteText}>
          💬 For actual chatting, use WhatsApp or Telegram — Lepax keeps it
          simple.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },

  header: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "ios" ? 56 : 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderColor: C.border,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerActions: { flexDirection: "row", gap: 8 },
  headerBtn: {
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: C.surface,
  },
  headerBtnText: {
    fontSize: 13,
    fontWeight: Typography.semibold,
    color: C.text,
  },
  headerBtnPrimary: { backgroundColor: C.primary, borderColor: C.primary },
  headerBtnPrimaryText: {
    fontSize: 13,
    fontWeight: Typography.bold,
    color: C.surface,
  },
  title: { fontSize: 22, fontWeight: Typography.bold, color: C.text },
  subtitle: { fontSize: 13, color: C.muted, marginTop: 2 },

  broadcast: {
    margin: 20,
    backgroundColor: C.primary,
    borderRadius: 10,
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  broadcastTitle: {
    fontSize: 15,
    fontWeight: Typography.bold,
    color: C.surface,
  },
  broadcastSub: { fontSize: 12, color: "rgba(255,255,255,0.75)", marginTop: 2 },
  broadcastArrow: { fontSize: 18, color: C.surface },

  list: { paddingHorizontal: 20, paddingBottom: 80 },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderColor: C.border,
  },
  rowLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  rowName: { fontSize: 14, fontWeight: Typography.semibold, color: C.text },
  rowStatus: { fontSize: 12, color: C.muted, marginTop: 1 },

  nudgeBtn: {
    borderWidth: 1,
    borderColor: C.primary,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
  },
  nudgeBtnDone: { borderColor: C.border, backgroundColor: C.sand },
  nudgeBtnText: {
    fontSize: 13,
    fontWeight: Typography.semibold,
    color: C.primary,
  },
  nudgeBtnTextDone: { color: C.muted },

  empty: { alignItems: "center", paddingTop: 48, paddingHorizontal: 32 },
  emptyIcon: { fontSize: 36, marginBottom: 12 },
  emptyTitle: {
    fontSize: 16,
    fontWeight: Typography.bold,
    color: C.text,
    marginBottom: 6,
  },
  emptySub: {
    fontSize: 14,
    color: C.muted,
    textAlign: "center",
    lineHeight: 20,
  },

  chatNote: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: C.surface,
    borderTopWidth: 1,
    borderColor: C.border,
  },
  chatNoteText: { fontSize: 12, color: C.muted, textAlign: "center" },
});
