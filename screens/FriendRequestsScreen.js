// screens/FriendRequestsScreen.js
import { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Alert,
  ActivityIndicator,
} from "react-native";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
  arrayUnion,
} from "firebase/firestore";
import { db } from "../firebase/config";
import { useAuth } from "../context/AuthContext";
import { C } from "../constants/theme";
import Avatar from "../components/Avatar";

export default function FriendRequestsScreen({ navigation }) {
  const { user, setProfile } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(null); // uid being processed

  useEffect(() => {
    const q = query(
      collection(db, "friendRequests"),
      where("toUid", "==", user.uid),
      where("status", "==", "pending")
    );
    const unsub = onSnapshot(q, (snap) => {
      setRequests(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, []);

  const handleAccept = async (req) => {
    setProcessing(req.fromUid);
    try {
      // Update request status
      await updateDoc(doc(db, "friendRequests", req.id), {
        status: "accepted",
      });

      // Add each user to the other's friends list
      await updateDoc(doc(db, "users", user.uid), {
        friends: arrayUnion(req.fromUid),
      });
      await updateDoc(doc(db, "users", req.fromUid), {
        friends: arrayUnion(user.uid),
      });

      // Update local profile state
      setProfile((p) => ({
        ...p,
        friends: [...(p.friends ?? []), req.fromUid],
      }));
    } catch (err) {
      Alert.alert("Error", err.message);
    } finally {
      setProcessing(null);
    }
  };

  const handleDecline = async (req) => {
    setProcessing(req.fromUid);
    try {
      await updateDoc(doc(db, "friendRequests", req.id), {
        status: "declined",
      });
    } catch (err) {
      Alert.alert("Error", err.message);
    } finally {
      setProcessing(null);
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
        <Text style={styles.navTitle}>Friend requests</Text>
        <View style={{ width: 60 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={C.primary} />
        </View>
      ) : (
        <FlatList
          data={requests}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const isProcessing = processing === item.fromUid;
            return (
              <View style={styles.row}>
                <View style={styles.rowLeft}>
                  <Avatar
                    uri={item.fromAvatar}
                    username={item.fromUsername}
                    size={44}
                  />
                  <View>
                    <Text style={styles.rowName}>@{item.fromUsername}</Text>
                    <Text style={styles.rowSub}>wants to be your friend</Text>
                  </View>
                </View>
                <View style={styles.rowActions}>
                  {isProcessing ? (
                    <ActivityIndicator color={C.primary} />
                  ) : (
                    <>
                      <TouchableOpacity
                        style={styles.acceptBtn}
                        onPress={() => handleAccept(item)}
                      >
                        <Text style={styles.acceptBtnText}>Accept</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.declineBtn}
                        onPress={() => handleDecline(item)}
                      >
                        <Text style={styles.declineBtnText}>Decline</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>👋</Text>
              <Text style={styles.emptyTitle}>No pending requests</Text>
              <Text style={styles.emptySub}>
                When someone adds you, their request will show up here.
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },

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
  back: { fontSize: 15, color: C.primary, fontWeight: "600" },
  navTitle: { fontSize: 15, fontWeight: "700", color: C.text },

  list: { paddingHorizontal: 20, paddingBottom: 60 },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderColor: C.border,
    gap: 10,
  },
  rowLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  rowName: { fontSize: 15, fontWeight: "600", color: C.text },
  rowSub: { fontSize: 12, color: C.muted, marginTop: 2 },
  rowActions: { flexDirection: "row", gap: 8, alignItems: "center" },

  acceptBtn: {
    backgroundColor: C.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  acceptBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },

  declineBtn: {
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  declineBtnText: { color: C.muted, fontWeight: "600", fontSize: 13 },

  empty: { alignItems: "center", paddingTop: 60, paddingHorizontal: 32 },
  emptyIcon: { fontSize: 36, marginBottom: 12 },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: C.text,
    marginBottom: 6,
  },
  emptySub: {
    fontSize: 14,
    color: C.muted,
    textAlign: "center",
    lineHeight: 20,
  },
});
