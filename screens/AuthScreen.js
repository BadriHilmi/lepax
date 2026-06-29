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
import { C, Typography, Families, Brutalist } from "../constants/theme";
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
    paddingTop: 64,
    paddingBottom: 40,
  },

  hero: {
    minHeight: 230,
    borderRadius: 12,
    borderWidth: Brutalist.borderWidth,
    borderColor: Brutalist.borderColor,
    ...Brutalist.cardShadow,
    overflow: "hidden",
    padding: 20,
    justifyContent: "space-between",
    marginBottom: 20,
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
    borderRadius: 8,
    backgroundColor: C.sun,
    borderWidth: Brutalist.borderWidth,
    borderColor: C.ink,
    alignItems: "center",
    justifyContent: "center",
  },
  brandInitial: {
    fontSize: 24,
    fontFamily: Families.display,
    color: C.ink,
  },
  brandKicker: {
    alignSelf: "flex-start",
    backgroundColor: C.ink,
    color: C.surface,
    fontSize: 10,
    fontFamily: Families.bold,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 4,
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  brandName: {
    fontSize: 44,
    fontFamily: Families.display,
    color: C.surface,
    textShadowColor: C.ink,
    textShadowOffset: { width: 3, height: 3 },
    textShadowRadius: 0,
  },
  brandTagline: {
    fontSize: 15,
    color: C.surface,
    fontFamily: Families.semibold,
    marginTop: 2,
  },

  panel: {
    backgroundColor: C.surface,
    borderRadius: 12,
    borderWidth: Brutalist.borderWidth,
    borderColor: Brutalist.borderColor,
    padding: 18,
    ...Brutalist.cardShadow,
  },

  toggleRow: {
    flexDirection: "row",
    backgroundColor: C.surfaceWarm,
    borderRadius: 8,
    padding: 4,
    marginBottom: 18,
    borderWidth: 1.8,
    borderColor: C.ink,
  },
  toggleTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 6,
  },
  toggleTabActive: {
    backgroundColor: C.primary,
    borderWidth: 1.5,
    borderColor: C.ink,
    transform: [{ rotate: "-1deg" }],
  },
  toggleText: { fontSize: 13, fontFamily: Families.bold, color: C.muted },
  toggleTextActive: { color: C.surface },

  form: { gap: 16 },
  label: { fontSize: 12, fontFamily: Families.bold, color: C.text, marginBottom: 4 },
  input: {
    backgroundColor: C.surface,
    borderWidth: 1.8,
    borderColor: C.ink,
    borderRadius: 6,
    padding: 13,
    fontSize: 14,
    fontFamily: Families.medium,
    color: C.text,
  },
  btn: {
    backgroundColor: C.accent,
    padding: 15,
    borderRadius: 8,
    borderWidth: Brutalist.borderWidth,
    borderColor: Brutalist.borderColor,
    ...Brutalist.btnShadow,
    alignItems: "center",
    marginTop: 8,
  },
  btnText: { color: C.surface, fontFamily: Families.bold, fontSize: 15 },
  footNote: {
    textAlign: "center",
    marginTop: 24,
    fontSize: 11,
    fontFamily: Families.regular,
    color: C.muted,
  },
});
