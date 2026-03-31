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
} from "react-native";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../firebase/config";
import { C, Typography } from "../constants/theme";

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
        <View style={styles.brand}>
          <Text style={styles.brandLeaf}>🌿</Text>
          <Text style={styles.brandName}>Lepax</Text>
          <Text style={styles.brandTagline}>Plan less, lepak more</Text>
        </View>

        <View style={styles.toggleRow}>
          {["login", "signup"].map((m) => (
            <TouchableOpacity
              key={m}
              style={[styles.toggleTab, mode === m && styles.toggleTabActive]}
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
            <Field label="Username">
              <TextInput
                style={styles.input}
                placeholder="e.g. ali_lepak"
                placeholderTextColor={C.muted}
                autoCapitalize="none"
                value={username}
                onChangeText={setUsername}
              />
            </Field>
          )}
          <Field label="Email">
            <TextInput
              style={styles.input}
              placeholder="you@email.com"
              placeholderTextColor={C.muted}
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />
          </Field>
          <Field label="Password">
            <TextInput
              style={styles.input}
              placeholder="min 8 characters"
              placeholderTextColor={C.muted}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
          </Field>

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

        <Text style={styles.footNote}>
          By continuing you agree to be chill about it.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({ label, children }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  container: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 24,
    paddingTop: 72,
    paddingBottom: 40,
  },

  brand: { alignItems: "center", marginBottom: 40 },
  brandLeaf: { fontSize: 40, marginBottom: 8 },
  brandName: {
    fontSize: 34,
    fontWeight: Typography.bold,
    color: C.text,
    letterSpacing: -0.5,
  },
  brandTagline: { fontSize: 14, color: C.muted, marginTop: 4 },

  toggleRow: {
    flexDirection: "row",
    backgroundColor: C.sand,
    borderRadius: 10,
    padding: 3,
    marginBottom: 28,
  },
  toggleTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 8,
  },
  toggleTabActive: { backgroundColor: C.surface },
  toggleText: { fontSize: 14, fontWeight: Typography.semibold, color: C.muted },
  toggleTextActive: { color: C.text },

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
