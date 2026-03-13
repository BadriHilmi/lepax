// App.js
import { StatusBar } from "expo-status-bar";
import { AuthProvider } from "./context/AuthContext";
import AppNavigator from "./navigation/AppNavigator";

export default function App() {
  return (
    <AuthProvider>
      <StatusBar style="dark" />
      <AppNavigator />
    </AuthProvider>
  );
}
