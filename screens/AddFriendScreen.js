// screens/AddFriendScreen.js
import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Alert,
  ActivityIndicator,
  FlatList,
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

export default function AddFriendScreen({ navigation }) {
  const { user, profile } = useAuth();
  const [search, setSearch] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sentIds, setSentIds] = useState([]);

  const handleSearch = async () => {
    if (!search.trim()) return;
    setLoading(true);
    setResults([]);
    try {
      const text = search.trim().toLowerCase();
      const q = query(
        collection(db, "users"),
        where("username", ">=", text),
        where("username", "<=", text + "\uf8ff")
      );
      const snap = await getDocs(q);
      const found = snap.docs
        .map((d) => d.data())
        .filter((u) => u.uid !== user.uid); // exclude self
      setResults(found);
      if (!found.length)
        Alert.alert(
          "No results",
          `No user found starting with "${search.trim()}"`
        );
    } catch (err) {
      Alert.alert("Error", err.message);
    } finally {
      setLoading(false);
    }
  };

  const sendRequest = async (toUser) => {
    // Check if already friends
    if (profile?.friends?.includes(toUser.uid)) {
      Alert.alert(
        "Already friends",
        `You and @${toUser.username} are already friends.`
      );
      return;
    }

    try {
      // Check if request already sent
      const existing = await getDocs(
        query(
          collection(db, "friendRequests"),
          where("fromUid", "==", user.uid),
          where("toUid", "==", toUser.uid),
          where("status", "==", "pending")
        )
      );
      if (!existing.empty) {
        Alert.alert(
          "Already sent",
          `You already sent a request to @${toUser.username}.`
        );
        return;
      }

      await addDoc(collection(db, "friendRequests"), {
        fromUid: user.uid,
        fromUsername: profile.username,
        fromAvatar: profile.avatarUrl || "",
        toUid: toUser.uid,
        toUsername: toUser.username,
        status: "pending",
        createdAt: serverTimestamp(),
      });

      setSentIds((p) => [...p, toUser.uid]);
    } catch (err) {
      Alert.alert("Error", err.message);
    }
  };

  return (
    <View style={styles.root}>
      {/* Nav */}
      <View style={styles.navBar}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={{ width: 60 }}
        >
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.navTitle}>Add friend</Text>
        <View style={{ width: 60 }} />
      </View>

      {/* Search */}
      <View style={styles.searchRow}>
        <TextInput
          style={styles.input}
          placeholder="Search by username"
          placeholderTextColor={C.muted}
          autoCapitalize="none"
          value={search}
          onChangeText={setSearch}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
        />
        <TouchableOpacity
          style={[styles.searchBtn, loading && { opacity: 0.6 }]}
          onPress={handleSearch}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <AppIcon name="search" size={18} color={C.surface} />
          )}
        </TouchableOpacity>
      </View>

      {/* Results */}
      <FlatList
        data={results}
        keyExtractor={(item) => item.uid}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          const sent = sentIds.includes(item.uid);
          const isFriend = profile?.friends?.includes(item.uid);
          return (
            <View style={styles.row}>
              <View style={styles.rowLeft}>
                <Avatar
                  uri={item.avatarUrl}
                  username={item.username}
                  size={44}
                />
                <View>
                  <Text style={styles.rowName}>@{item.username}</Text>
                  {item.bio ? (
                    <Text style={styles.rowBio} numberOfLines={1}>
                      {item.bio}
                    </Text>
                  ) : null}
                </View>
              </View>
              {isFriend ? (
                <View style={styles.friendTag}>
                  <AppIcon name="check" size={15} color={C.primary} />
                  <Text style={styles.friendTagText}>Friends</Text>
                </View>
              ) : (
                <TouchableOpacity
                  style={[styles.addBtn, sent && styles.addBtnSent]}
                  onPress={() => sendRequest(item)}
                  disabled={sent}
                >
                  <Text
                    style={[styles.addBtnText, sent && styles.addBtnTextSent]}
                  >
                    {sent ? "Sent ✓" : "Add"}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          );
        }}
        ListEmptyComponent={
          !loading && search.length > 0 ? null : (
            <View style={styles.hint}>
              <View style={styles.hintIcon}>
                <AppIcon name="search" size={28} color={C.primary} />
              </View>
              <Text style={styles.hintText}>
                Search for a friend by their exact username
              </Text>
            </View>
          )
        }
      />
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
    paddingTop: Platform.OS === "ios" ? 56 : (StatusBar.currentHeight || 0) + 12,
    paddingBottom: 12,
    borderBottomWidth: Brutalist.borderWidth,
    borderColor: Brutalist.borderColor,
  },
  back: { fontSize: 14, color: C.primary, fontFamily: Families.bold },
  navTitle: { fontSize: 16, fontFamily: Families.display, color: C.text },

  searchRow: {
    flexDirection: "row",
    gap: 10,
    padding: 20,
    paddingBottom: 12,
  },
  input: {
    flex: 1,
    backgroundColor: C.surface,
    borderWidth: 1.8,
    borderColor: C.ink,
    borderRadius: 6,
    padding: 13,
    fontSize: 14,
    fontFamily: Families.medium,
    color: C.text,
  },
  searchBtn: {
    backgroundColor: C.primary,
    paddingHorizontal: 16,
    borderRadius: 6,
    borderWidth: 1.8,
    borderColor: C.ink,
    justifyContent: "center",
    alignItems: "center",
    minWidth: 52,
    ...Brutalist.btnShadow,
  },
  list: { paddingHorizontal: 20, paddingBottom: 60 },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1.2,
    borderColor: C.border,
  },
  rowLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  rowName: { fontSize: 14, fontFamily: Families.bold, color: C.text },
  rowBio: { fontSize: 12, fontFamily: Families.regular, color: C.muted, marginTop: 2, maxWidth: 180 },

  addBtn: {
    borderWidth: 1.8,
    borderColor: C.ink,
    backgroundColor: C.accent,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    ...Brutalist.btnShadow,
  },
  addBtnSent: {
    borderColor: C.border,
    backgroundColor: C.sand,
    shadowOffset: { width: 0, height: 0 },
    elevation: 0,
  },
  addBtnText: {
    fontSize: 12,
    fontFamily: Families.bold,
    color: C.surface,
  },
  addBtnTextSent: { color: C.muted },

  friendTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: C.surfaceWarm,
    borderWidth: 1.5,
    borderColor: C.ink,
    borderRadius: 6,
    transform: [{ rotate: "1deg" }],
  },
  friendTagText: {
    fontSize: 12,
    fontFamily: Families.bold,
    color: C.primary,
  },

  hint: { alignItems: "center", paddingTop: 60, gap: 10 },
  hintIcon: {
    width: 62,
    height: 62,
    borderRadius: 10,
    backgroundColor: C.surfaceWarm,
    borderWidth: Brutalist.borderWidth,
    borderColor: Brutalist.borderColor,
    justifyContent: "center",
    alignItems: "center",
  },
  hintText: { fontSize: 13, fontFamily: Families.medium, color: C.muted, textAlign: "center" },
});
