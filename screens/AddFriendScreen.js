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
import { C } from "../constants/theme";
import Avatar from "../components/Avatar";

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
      const q = query(
        collection(db, "users"),
        where("username", "==", search.trim().toLowerCase())
      );
      const snap = await getDocs(q);
      const found = snap.docs
        .map((d) => d.data())
        .filter((u) => u.uid !== user.uid); // exclude self
      setResults(found);
      if (!found.length)
        Alert.alert(
          "No results",
          `No user found with username "${search.trim()}"`
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
            <Text style={styles.searchBtnText}>Search</Text>
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
                  <Text style={styles.friendTagText}>Friends ✓</Text>
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
              <Text style={styles.hintIcon}>🔍</Text>
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
    paddingTop: Platform.OS === "ios" ? 56 : 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderColor: C.border,
  },
  back: { fontSize: 15, color: C.primary, fontWeight: Typography.semibold },
  navTitle: { fontSize: 15, fontWeight: "700", color: C.text },

  searchRow: {
    flexDirection: "row",
    gap: 10,
    padding: 20,
    paddingBottom: 12,
  },
  input: {
    flex: 1,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 10,
    padding: 13,
    fontSize: 15,
    color: C.text,
  },
  searchBtn: {
    backgroundColor: C.primary,
    paddingHorizontal: 18,
    borderRadius: 10,
    justifyContent: "center",
  },
  searchBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },

  list: { paddingHorizontal: 20, paddingBottom: 60 },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderColor: C.border,
  },
  rowLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  rowName: { fontSize: 15, fontWeight: Typography.semibold, color: C.text },
  rowBio: { fontSize: 12, color: C.muted, marginTop: 2, maxWidth: 180 },

  addBtn: {
    borderWidth: 1,
    borderColor: C.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addBtnSent: { borderColor: C.border, backgroundColor: C.sand },
  addBtnText: {
    fontSize: 13,
    fontWeight: Typography.semibold,
    color: C.primary,
  },
  addBtnTextSent: { color: C.muted },

  friendTag: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: C.sand,
    borderRadius: 8,
  },
  friendTagText: {
    fontSize: 13,
    fontWeight: Typography.semibold,
    color: C.primary,
  },

  hint: { alignItems: "center", paddingTop: 60, gap: 10 },
  hintIcon: { fontSize: 32 },
  hintText: { fontSize: 14, color: C.muted, textAlign: "center" },
});
