// screens/ProfileScreen.js
import { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Platform,
  Alert,
  ActivityIndicator,
  StatusBar,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import {
  collection,
  doc,
  onSnapshot,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import { signOut } from "firebase/auth";
import { auth, db } from "../firebase/config";
import { useAuth } from "../context/AuthContext";
import { C, Typography, Families, Brutalist } from "../constants/theme";
import Avatar from "../components/Avatar";
import AppIcon from "../components/AppIcon";

const CLOUD_NAME = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

async function uploadToCloudinary(uri, uid) {
  // Build a multipart form — works directly from React Native, no SDK needed
  const formData = new FormData();
  formData.append("file", {
    uri,
    type: "image/jpeg",
    name: `avatar_${uid}.jpg`,
  });
  formData.append("upload_preset", UPLOAD_PRESET);
  // Use uid as public_id so re-uploading replaces the old avatar automatically
  formData.append("public_id", `avatars/${uid}`);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    { method: "POST", body: formData }
  );

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message ?? "Cloudinary upload failed");
  }

  const data = await res.json();
  // Add w_200,c_fill so Firestore stores an already-optimised URL
  return data.secure_url.replace(
    "/upload/",
    "/upload/w_200,h_200,c_fill,q_auto/"
  );
}
// ──────────────────────────────────────────────────────────────────────────────

export default function ProfileScreen({ navigation }) {
  const { user, profile, setProfile } = useAuth();
  const bioInputRef = useRef(null);
  const [bio, setBio] = useState(profile?.bio ?? "");
  const [editing, setEditing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [myPlans, setMyPlans] = useState([]);
  const [loadingPlans, setLoadingPlans] = useState(true);

  useEffect(() => {
    if (!user?.uid) return;

    const q = query(collection(db, "plans"), where("hostId", "==", user.uid));
    const unsub = onSnapshot(q, (snap) => {
      const plans = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .sort(
          (a, b) =>
            new Date(b.date || b.createdAt?.toDate?.() || 0) -
            new Date(a.date || a.createdAt?.toDate?.() || 0)
        );
      setMyPlans(plans);
      setLoadingPlans(false);
    });

    return unsub;
  }, [user?.uid]);

  const handleAvatarChange = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission needed",
        "Allow photo access to change your avatar."
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images",
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (result.canceled) return;

    setUploading(true);
    try {
      const uri = result.assets[0].uri;
      const url = await uploadToCloudinary(uri, user.uid);
      await updateDoc(doc(db, "users", user.uid), { avatarUrl: url });
      setProfile((p) => ({ ...p, avatarUrl: url }));
    } catch (err) {
      Alert.alert("Upload failed", err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateDoc(doc(db, "users", user.uid), { bio: bio.trim() });
      setProfile((p) => ({ ...p, bio: bio.trim() }));
      setEditing(false);
    } catch (err) {
      Alert.alert("Error", err.message);
    } finally {
      setSaving(false);
    }
  };


  return (
    <View style={styles.root}>
      <View style={styles.navBar}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={{ width: 60 }}
        >
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.navTitle}>Profile</Text>
        <TouchableOpacity
          style={{ width: 60, alignItems: "flex-end" }}
          onPress={() => {
            if (editing) {
              setBio(profile?.bio ?? "");
            }
            setEditing(!editing);
          }}
        >
          <Text style={styles.editText}>{editing ? "Cancel" : "Edit"}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Avatar */}
        <View style={styles.profileTop}>
          <TouchableOpacity
            onPress={handleAvatarChange}
            style={styles.avatarWrap}
          >
            {uploading ? (
              <View style={styles.avatarLoader}>
                <ActivityIndicator color={C.primary} />
              </View>
            ) : (
              <Avatar
                uri={profile?.avatarUrl}
                username={profile?.username}
                size={80}
              />
            )}
            <View style={styles.editBadge}>
              <AppIcon name="pencil" size={12} color={C.text} />
            </View>
          </TouchableOpacity>
          <Text style={styles.username}>@{profile?.username}</Text>
          <Text style={styles.email}>{profile?.email}</Text>
        </View>

        {/* Stats */}
        <View style={styles.statsCard}>
          <Stat label="Plans hosted" value={profile?.plansHosted ?? 0} />
          <View style={styles.statDiv} />
          <Stat label="Forks received" value={profile?.forksReceived ?? 0} />
          <View style={styles.statDiv} />
          <Stat label="Friends" value={profile?.friends?.length ?? 0} />
        </View>

        {/* Bio */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Bio</Text>
          {editing ? (
            <>
              <TextInput
                ref={bioInputRef}
                style={styles.bioInput}
                value={bio}
                onChangeText={setBio}
                multiline
                placeholder="Tell people what kind of plans you like..."
                placeholderTextColor={C.muted}
                maxLength={160}
              />
              <TouchableOpacity
                style={[styles.saveBtn, saving && { opacity: 0.6 }]}
                onPress={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.saveBtnText}>Save changes</Text>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <Text style={styles.bioText}>{profile?.bio || "No bio yet."}</Text>
          )}
        </View>

        {/* My Plans */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Plans you've made</Text>
          {loadingPlans ? (
            <ActivityIndicator color={C.primary} />
          ) : myPlans.length === 0 ? (
            <Text style={styles.bioText}>No plans yet. Create your first one!</Text>
          ) : (
            <View style={styles.planList}>
              {myPlans.slice(0, 5).map((plan) => (
                <TouchableOpacity
                  key={plan.id}
                  style={styles.planCard}
                  onPress={() =>
                    navigation.navigate("PlanDetail", { planId: plan.id })
                  }
                  activeOpacity={0.85}
                >
                  <View style={styles.planTop}>
                    <Text style={styles.planTitle}>{plan.title}</Text>
                    <Text style={styles.planVisibility}>{plan.visibility}</Text>
                  </View>
                  <MetaLine icon="mapPin" text={plan.location} />
                  <MetaLine
                    icon="calendar"
                    text={
                      plan.date
                        ? new Date(plan.date).toLocaleDateString([], {
                            weekday: "short",
                            day: "numeric",
                            month: "short",
                          })
                        : "Date TBD"
                    }
                  />
                  <MetaLine
                    icon="users"
                    text={`${plan.joinedBy?.length ?? 0} going · ${
                      plan.forks ?? 0
                    } forks`}
                  />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>


        {/* Logout */}
        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={() => signOut(auth)}
        >
          <Text style={styles.logoutText}>Log out</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

function Stat({ label, value }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function MetaLine({ icon, text }) {
  return (
    <View style={styles.metaLine}>
      <AppIcon name={icon} size={13} color={C.muted} />
      <Text style={styles.planMeta} numberOfLines={1}>
        {text}
      </Text>
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
    paddingTop: Platform.OS === "ios" ? 56 : (StatusBar.currentHeight || 0) + 12,
    paddingBottom: 12,
    borderBottomWidth: Brutalist.borderWidth,
    borderColor: Brutalist.borderColor,
  },
  back: { fontSize: 14, color: C.primary, fontFamily: Families.bold },
  navTitle: { fontSize: 16, fontFamily: Families.display, color: C.text },
  editText: { fontSize: 14, color: C.primary, fontFamily: Families.bold },

  content: { padding: 24, gap: 28, paddingBottom: 60 },

  profileTop: { alignItems: "center", gap: 6 },
  avatarWrap: {
    position: "relative",
    marginBottom: 4,
    borderWidth: Brutalist.borderWidth,
    borderColor: Brutalist.borderColor,
    borderRadius: 44,
    ...Brutalist.cardShadow,
  },
  avatarLoader: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: C.sand,
    justifyContent: "center",
    alignItems: "center",
  },
  editBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 26,
    height: 26,
    borderRadius: 6,
    backgroundColor: C.surface,
    borderWidth: 1.5,
    borderColor: C.ink,
    justifyContent: "center",
    alignItems: "center",
    ...Brutalist.btnShadow,
  },
  username: { fontSize: 20, fontFamily: Families.display, color: C.text },
  email: { fontSize: 13, fontFamily: Families.regular, color: C.muted },

  statsCard: {
    backgroundColor: C.surface,
    borderRadius: 12,
    borderWidth: Brutalist.borderWidth,
    borderColor: Brutalist.borderColor,
    ...Brutalist.cardShadow,
    flexDirection: "row",
    padding: 16,
  },
  stat: { flex: 1, alignItems: "center", gap: 2 },
  statValue: { fontSize: 20, fontFamily: Families.bold, color: C.text },
  statLabel: { fontSize: 10, fontFamily: Families.bold, color: C.muted, textTransform: "uppercase", letterSpacing: 0.5, textAlign: "center" },
  statDiv: { width: 2, backgroundColor: C.ink },

  section: { gap: 10 },
  sectionLabel: {
    fontSize: 11,
    fontFamily: Families.bold,
    color: C.muted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  bioText: { fontSize: 14, fontFamily: Families.regular, color: C.text, lineHeight: 20 },
  bioInput: {
    backgroundColor: C.surface,
    borderWidth: 1.8,
    borderColor: C.ink,
    borderRadius: 8,
    padding: 13,
    fontSize: 14,
    fontFamily: Families.medium,
    color: C.text,
    minHeight: 80,
    textAlignVertical: "top",
  },
  saveBtn: {
    backgroundColor: C.primary,
    padding: 13,
    borderRadius: 8,
    borderWidth: Brutalist.borderWidth,
    borderColor: Brutalist.borderColor,
    ...Brutalist.btnShadow,
    alignItems: "center",
  },
  saveBtnText: { color: C.surface, fontFamily: Families.bold, fontSize: 14 },

  logoutBtn: {
    backgroundColor: C.surfaceWarm,
    borderRadius: 8,
    borderWidth: Brutalist.borderWidth,
    borderColor: C.danger,
    padding: 14,
    ...Brutalist.btnShadow,
    alignItems: "center",
  },
  logoutText: {
    fontSize: 14,
    fontFamily: Families.bold,
    color: C.danger,
  },

  planList: { gap: 12 },
  planCard: {
    backgroundColor: C.surface,
    borderWidth: 1.8,
    borderColor: C.ink,
    borderRadius: 10,
    ...Brutalist.cardShadow,
    padding: 12,
    gap: 6,
  },
  planTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
  },
  planTitle: {
    flex: 1,
    fontSize: 15,
    color: C.text,
    fontFamily: Families.bold,
  },
  planVisibility: {
    textTransform: "uppercase",
    fontSize: 10,
    fontFamily: Families.bold,
    color: C.primary,
    backgroundColor: C.surfaceWarm,
    borderWidth: 1.2,
    borderColor: C.ink,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    transform: [{ rotate: "1deg" }],
  },
  metaLine: { flexDirection: "row", alignItems: "center", gap: 5 },
  planMeta: { flex: 1, fontSize: 12, fontFamily: Families.medium, color: C.muted },

});
