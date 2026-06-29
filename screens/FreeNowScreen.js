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
  StatusBar,
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
import { C, Typography, Families, Brutalist } from "../constants/theme";
import Avatar from "../components/Avatar";
import AppIcon from "../components/AppIcon";
import { useToast } from "../context/ToastContext";

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
  const { showToast } = useToast();
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
      showToast(err.message, "error");
    }
  };

  const broadcastNudge = async () => {
    const ids = profile?.friends ?? [];
    if (!ids.length) {
      showToast("Add friends first.", "error");
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
      showToast(`Sent "${msg}" to all friends!`, "success");
    } catch (err) {
      showToast(err.message, "error");
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
              <AppIcon name="mail" size={18} color={C.text} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.headerBtn, styles.headerBtnPrimary]}
              onPress={() => navigation.navigate("AddFriend")}
            >
              <AppIcon name="userPlus" size={18} color={C.surface} />
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
        <View style={styles.broadcastArrow}>
          <AppIcon name="send" size={18} color={C.ink} />
        </View>
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
              <View style={styles.emptyIcon}>
                <AppIcon name="users" size={30} color={C.primary} />
              </View>
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
          For actual chatting, use WhatsApp or Telegram — Lepax keeps it
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
    paddingTop: Platform.OS === "ios" ? 56 : (StatusBar.currentHeight || 0) + 16,
    paddingBottom: 16,
    borderBottomWidth: Brutalist.borderWidth,
    borderColor: Brutalist.borderColor,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerActions: { flexDirection: "row", gap: 8 },
  headerBtn: {
    borderWidth: 1.8,
    borderColor: C.ink,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 6,
    backgroundColor: C.surface,
    minWidth: 42,
    alignItems: "center",
    ...Brutalist.btnShadow,
  },
  headerBtnPrimary: { backgroundColor: C.primary, borderColor: C.ink },
  title: { fontSize: 24, fontFamily: Families.display, color: C.text },
  subtitle: { fontSize: 13, fontFamily: Families.regular, color: C.muted, marginTop: 2 },

  broadcast: {
    margin: 20,
    backgroundColor: C.ink,
    borderRadius: 10,
    borderWidth: Brutalist.borderWidth,
    borderColor: Brutalist.borderColor,
    ...Brutalist.btnShadow,
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  broadcastTitle: {
    fontSize: 15,
    fontFamily: Families.bold,
    color: C.surface,
  },
  broadcastSub: { fontSize: 12, fontFamily: Families.medium, color: "rgba(255,255,255,0.85)", marginTop: 2 },
  broadcastArrow: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1.5,
    borderColor: C.ink,
    backgroundColor: C.sun,
    justifyContent: "center",
    alignItems: "center",
  },

  list: { paddingHorizontal: 20, paddingBottom: 80 },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1.2,
    borderColor: C.border,
  },
  rowLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  rowName: { fontSize: 14, fontFamily: Families.bold, color: C.text },
  rowStatus: { fontSize: 12, fontFamily: Families.regular, color: C.muted, marginTop: 1 },

  nudgeBtn: {
    borderWidth: 1.8,
    borderColor: C.ink,
    backgroundColor: C.primary,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 6,
    ...Brutalist.btnShadow,
  },
  nudgeBtnDone: {
    borderColor: C.border,
    backgroundColor: C.sand,
    shadowOffset: { width: 0, height: 0 },
    elevation: 0,
  },
  nudgeBtnText: {
    fontSize: 12,
    fontFamily: Families.bold,
    color: C.surface,
  },
  nudgeBtnTextDone: { color: C.muted },

  empty: { alignItems: "center", paddingTop: 48, paddingHorizontal: 32 },
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
  },
  emptySub: {
    fontSize: 13,
    fontFamily: Families.regular,
    color: C.muted,
    textAlign: "center",
    lineHeight: 18,
  },

  chatNote: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: C.surface,
    borderTopWidth: Brutalist.borderWidth,
    borderColor: Brutalist.borderColor,
  },
  chatNoteText: { fontSize: 11, fontFamily: Families.regular, color: C.muted, textAlign: "center" },
});
