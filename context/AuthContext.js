// context/AuthContext.js
import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db } from "../firebase/config";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubSnapshot = null;
    let timerId = null;

    const unsubAuth = onAuthStateChanged(auth, (firebaseUser) => {
      // Clean up any pending timers
      if (timerId) {
        clearTimeout(timerId);
        timerId = null;
      }
      // Clean up previous snapshot listeners
      if (unsubSnapshot) {
        unsubSnapshot();
        unsubSnapshot = null;
      }

      if (firebaseUser) {
        // Wait 200ms to allow Auth token propagation to the Firestore client
        timerId = setTimeout(() => {
          unsubSnapshot = onSnapshot(
            doc(db, "users", firebaseUser.uid),
            (snap) => {
              setProfile(snap.exists() ? snap.data() : null);
              setUser(firebaseUser);
              setLoading(false);
            },
            (err) => {
              console.error("AuthProvider: Profile snapshot error:", err);
              setUser(firebaseUser);
              setLoading(false);
            }
          );
        }, 200);
      } else {
        setProfile(null);
        setUser(null);
        setLoading(false);
      }
    });

    return () => {
      unsubAuth();
      if (unsubSnapshot) unsubSnapshot();
      if (timerId) clearTimeout(timerId);
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, setProfile, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
