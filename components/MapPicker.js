// components/MapPicker.js
// Uses Leaflet.js via WebView + OpenStreetMap tiles
// No API key needed, completely free
//
// Install:
//   npx expo install react-native-webview expo-location

import { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import { WebView } from "react-native-webview";
import * as Location from "expo-location";
import { C, Typography, Spacing, BorderRadius } from "../constants/theme";

// ─── Default region (KL) ──────────────────────────────────────────────────────
const DEFAULT_LAT = 3.139;
const DEFAULT_LNG = 101.6869;

// ─── Build Leaflet HTML ───────────────────────────────────────────────────────
function buildMapHTML({
  lat,
  lng,
  destLat,
  destLng,
  userLat,
  userLng,
  mode,
  markerTitle,
  showRoute,
}) {
  const hasMarker = lat != null && lng != null;
  const hasDest = destLat != null && destLng != null;
  const hasUser = userLat != null && userLng != null;
  const centerLat = lat ?? userLat ?? DEFAULT_LAT;
  const centerLng = lng ?? userLng ?? DEFAULT_LNG;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body, #map { width: 100%; height: 100%; }
    .leaflet-control-attribution { display: none; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var map = L.map('map', { zoomControl: true }).setView([${centerLat}, ${centerLng}], 14);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
    }).addTo(map);

    // Custom green marker icon matching Lepax primary color
    var greenIcon = L.divIcon({
      className: '',
      html: '<div style="width:28px;height:28px;border-radius:50% 50% 50% 0;background:#7C9A6B;border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.25);transform:rotate(-45deg);"></div>',
      iconSize: [28, 28],
      iconAnchor: [14, 28],
      popupAnchor: [0, -30],
    });

    var accentIcon = L.divIcon({
      className: '',
      html: '<div style="width:28px;height:28px;border-radius:50% 50% 50% 0;background:#D4847C;border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.25);transform:rotate(-45deg);"></div>',
      iconSize: [28, 28],
      iconAnchor: [14, 28],
      popupAnchor: [0, -30],
    });

    var userIcon = L.divIcon({
      className: '',
      html: '<div style="width:16px;height:16px;border-radius:50%;background:#4A90D9;border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.3);"></div>',
      iconSize: [16, 16],
      iconAnchor: [8, 8],
    });

    var pickedMarker = null;

    ${
      hasMarker
        ? `
      pickedMarker = L.marker([${lat}, ${lng}], { icon: greenIcon })
        .addTo(map)
        .bindPopup('${markerTitle || "Location"}');
    `
        : ""
    }

    ${
      hasDest
        ? `
      L.marker([${destLat}, ${destLng}], { icon: accentIcon })
        .addTo(map)
        .bindPopup('Destination');
    `
        : ""
    }

    ${
      hasUser
        ? `
      L.marker([${userLat}, ${userLng}], { icon: userIcon })
        .addTo(map)
        .bindPopup('You are here');
    `
        : ""
    }

    ${
      showRoute && hasMarker && hasDest
        ? `
      L.polyline(
        [[${lat}, ${lng}], [${destLat}, ${destLng}]],
        { color: '#7C9A6B', weight: 3, dashArray: '8, 6', opacity: 0.85 }
      ).addTo(map);
    `
        : ""
    }

    ${
      mode === "pick"
        ? `
      map.on('click', function(e) {
        var lat = e.latlng.lat;
        var lng = e.latlng.lng;

        if (pickedMarker) {
          pickedMarker.setLatLng([lat, lng]);
        } else {
          pickedMarker = L.marker([lat, lng], { icon: greenIcon })
            .addTo(map)
            .bindPopup('${markerTitle || "Selected location"}');
        }

        // Send coord back to React Native
        window.ReactNativeWebView.postMessage(JSON.stringify({ lat: lat, lng: lng }));
      });
    `
        : ""
    }
  </script>
</body>
</html>
  `;
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function MapPicker({
  mode = "view", // "view" | "pick"
  initialCoord = null, // { latitude, longitude }
  destination = null, // { latitude, longitude }
  showUserLoc = true,
  showRoute = false,
  onLocationPick,
  height = 300,
  markerTitle = "Location",
  style,
}) {
  const [userCoord, setUserCoord] = useState(null);
  const [loadingLoc, setLoadingLoc] = useState(false);
  const [pickedCoord, setPickedCoord] = useState(initialCoord);
  const webViewRef = useRef(null);

  useEffect(() => {
    if (showUserLoc) fetchUserLocation();
  }, []);

  const fetchUserLocation = async () => {
    setLoadingLoc(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setUserCoord({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });
    } catch (err) {
      console.error("Location error:", err);
    } finally {
      setLoadingLoc(false);
    }
  };

  // Receive tapped coord from Leaflet via postMessage
  const handleMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.lat && data.lng) {
        const coord = { latitude: data.lat, longitude: data.lng };
        setPickedCoord(coord);
        if (onLocationPick) onLocationPick(coord);
      }
    } catch (err) {
      console.error("Map message error:", err);
    }
  };

  // When markerTitle changes, update the popup label without reloading the map
  useEffect(() => {
    if (webViewRef.current && markerTitle) {
      webViewRef.current.injectJavaScript(`
        if (pickedMarker) {
          pickedMarker.bindPopup(${JSON.stringify(markerTitle)});
        }
        true;
      `);
    }
  }, [markerTitle]);

  const html = buildMapHTML({
    lat: initialCoord?.latitude ?? pickedCoord?.latitude,
    lng: initialCoord?.longitude ?? pickedCoord?.longitude,
    destLat: destination?.latitude,
    destLng: destination?.longitude,
    userLat: userCoord?.latitude,
    userLng: userCoord?.longitude,
    mode,
    markerTitle,
    showRoute,
  });

  return (
    <View style={[styles.container, { height }, style]}>
      <WebView
        ref={webViewRef}
        originWhitelist={["*"]}
        source={{ html }}
        onMessage={handleMessage}
        scrollEnabled={false}
        style={styles.webview}
        javaScriptEnabled
        domStorageEnabled
        startInLoadingState
        renderLoading={() => (
          <View style={styles.loading}>
            <ActivityIndicator color={C.primary} />
          </View>
        )}
      />

      {/* Pick mode hint */}
      {mode === "pick" && (
        <View style={styles.hint}>
          <Text style={styles.hintText}>
            {pickedCoord
              ? "📍 Location pinned"
              : "Tap on the map to pin location"}
          </Text>
        </View>
      )}

      {/* Coord readout */}
      {mode === "pick" && pickedCoord && (
        <View style={styles.coordBadge}>
          <Text style={styles.coordText}>
            {pickedCoord.latitude.toFixed(5)},{" "}
            {pickedCoord.longitude.toFixed(5)}
          </Text>
        </View>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
    backgroundColor: C.sand,
    borderWidth: 1,
    borderColor: C.border,
  },
  webview: {
    flex: 1,
    backgroundColor: "transparent",
  },
  loading: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: C.sand,
  },
  hint: {
    position: "absolute",
    top: 12,
    alignSelf: "center",
    backgroundColor: C.surface,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: C.border,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  hintText: {
    fontSize: Typography.sm,
    color: C.text,
    fontWeight: Typography.medium,
  },
  coordBadge: {
    position: "absolute",
    bottom: 12,
    left: 12,
    backgroundColor: C.surface,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: C.border,
  },
  coordText: {
    fontSize: Typography.xs,
    color: C.muted,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
});
