// screens/AuthScreen.js
import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
  ImageBackground,
} from "react-native";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../firebase/config";
import { C, Typography } from "../constants/theme";
import FormField from "../components/FormField";

const HERO_IMAGE = require("../assets/background.jpg");

export default function AuthScreen() {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);

  const handleAuth = async () => {
    if (!email || !password || (mode === "signup" && !username)) {
      Alert.alert("Missing fields", "Please fill in all fields.");
      return;
    }
    setLoading(true);
    try {
      if (mode === "signup") {
        const { user } = await createUserWithEmailAndPassword(
          auth,
          email,
          password
        );
        await setDoc(doc(db, "users", user.uid), {
          uid: user.uid,
          username: username.trim().toLowerCase(),
          email,
          bio: "",
          avatarUrl: "",
          createdAt: serverTimestamp(),
          plansHosted: 0,
          forksReceived: 0,
          friends: [],
        });
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err) {
      Alert.alert("Error", err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <ImageBackground
          source={HERO_IMAGE}
          style={styles.hero}
          imageStyle={styles.heroImage}
        >
          <View style={styles.heroScrim} />
          <View style={styles.brandMark}>
            <Text style={styles.brandInitial}>L</Text>
          </View>
          <View>
            <Text style={styles.brandKicker}>social plans, lightly held</Text>
            <Text style={styles.brandName}>Lepax</Text>
            <Text style={styles.brandTagline}>Plan less. Lepak more.</Text>
          </View>
        </ImageBackground>

        <View style={styles.panel}>
          <View style={styles.toggleRow}>
            {["login", "signup"].map((m) => (
              <TouchableOpacity
                key={m}
                style={[
                  styles.toggleTab,
                  mode === m && styles.toggleTabActive,
                ]}
                onPress={() => setMode(m)}
              >
                <Text
                  style={[
                    styles.toggleText,
                    mode === m && styles.toggleTextActive,
                  ]}
                >
                  {m === "login" ? "Log in" : "Sign up"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.form}>
            {mode === "signup" && (
              <FormField label="Username" labelStyle={styles.label}>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. ali_lepak"
                  placeholderTextColor={C.muted}
                  autoCapitalize="none"
                  value={username}
                  onChangeText={setUsername}
                />
              </FormField>
            )}
            <FormField label="Email" labelStyle={styles.label}>
              <TextInput
                style={styles.input}
                placeholder="you@email.com"
                placeholderTextColor={C.muted}
                autoCapitalize="none"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
              />
            </FormField>
            <FormField label="Password" labelStyle={styles.label}>
              <TextInput
                style={styles.input}
                placeholder="min 8 characters"
                placeholderTextColor={C.muted}
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />
            </FormField>

            <TouchableOpacity
              style={[styles.btn, loading && { opacity: 0.6 }]}
              onPress={handleAuth}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.btnText}>
                  {mode === "login" ? "Log in" : "Create account"}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.footNote}>
          By continuing you agree to be chill about it.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  container: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 20,
    paddingTop: 72,
    paddingBottom: 40,
  },

  hero: {
    minHeight: 230,
    borderRadius: 18,
    overflow: "hidden",
    padding: 20,
    justifyContent: "space-between",
    marginBottom: 18,
    backgroundColor: C.sand,
  },
  heroImage: { opacity: 0.95 },
  heroScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(37,35,35,0.2)",
  },
  brandMark: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: C.sun,
    borderWidth: 2,
    borderColor: C.ink,
    alignItems: "center",
    justifyContent: "center",
  },
  brandInitial: {
    fontSize: 25,
    fontWeight: Typography.extrabold,
    color: C.ink,
  },
  brandKicker: {
    alignSelf: "flex-start",
    backgroundColor: C.ink,
    color: C.surface,
    fontSize: 11,
    fontWeight: Typography.bold,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    marginBottom: 8,
    textTransform: "uppercase",
  },
  brandName: {
    fontSize: 42,
    fontWeight: Typography.extrabold,
    color: C.surface,
    textShadowColor: "rgba(0,0,0,0.24)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  brandTagline: {
    fontSize: 15,
    color: C.surface,
    fontWeight: Typography.semibold,
    marginTop: 2,
  },

  panel: {
    backgroundColor: C.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    padding: 16,
    shadowColor: C.ink,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
  },

  toggleRow: {
    flexDirection: "row",
    backgroundColor: C.surfaceWarm,
    borderRadius: 10,
    padding: 3,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: C.border,
  },
  toggleTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 8,
  },
  toggleTabActive: { backgroundColor: C.primary },
  toggleText: { fontSize: 14, fontWeight: Typography.semibold, color: C.muted },
  toggleTextActive: { color: C.surface },

  form: { gap: 16 },
  label: { fontSize: 13, fontWeight: Typography.semibold, color: C.text },
  input: {
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 10,
    padding: 13,
    fontSize: 15,
    color: C.text,
  },
  btn: {
    backgroundColor: C.primary,
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 4,
  },
  btnText: { color: C.surface, fontWeight: Typography.bold, fontSize: 15 },
  footNote: {
    textAlign: "center",
    marginTop: 24,
    fontSize: 12,
    color: C.muted,
  },
});
