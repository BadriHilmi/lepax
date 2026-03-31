// components/MapPicker.js
// Stable Leaflet map via WebView + OpenStreetMap
// No API key needed
//
// Install:
//   npx expo install react-native-webview expo-location

import { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from "react-native";
import { WebView } from "react-native-webview";
import * as Location from "expo-location";
import { C, Typography, Spacing, BorderRadius } from "../constants/theme";

// ─── Default region (KL) ──────────────────────────────────────────────────────
const DEFAULT_LAT = 3.139;
const DEFAULT_LNG = 101.6869;
const DEFAULT_ZOOM = 14;

// ─── Build Leaflet HTML ───────────────────────────────────────────────────────
// Important: build once per meaningful state change, not on every tiny UI update.
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
  const hasMarker = typeof lat === "number" && typeof lng === "number";
  const hasDest = typeof destLat === "number" && typeof destLng === "number";
  const hasUser = typeof userLat === "number" && typeof userLng === "number";

  const centerLat = hasMarker ? lat : hasUser ? userLat : DEFAULT_LAT;
  const centerLng = hasMarker ? lng : hasUser ? userLng : DEFAULT_LNG;

  const safeMarkerTitle = JSON.stringify(markerTitle || "Location");

  return `
<!DOCTYPE html>
<html>
<head>
  <meta
    name="viewport"
    content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"
  />
  <link
    rel="stylesheet"
    href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
  />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body, #map { width: 100%; height: 100%; background: #E6DCC4; }
    .leaflet-control-attribution { display: none !important; }
    .leaflet-container { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
  </style>
</head>
<body>
  <div id="map"></div>

  <script>
    (function () {
      var map = L.map("map", {
        zoomControl: true,
        attributionControl: false
      }).setView([${centerLat}, ${centerLng}], ${DEFAULT_ZOOM});

      window.__LEPAX_MAP__ = map;
      window.__LEPAX_PICKED_MARKER__ = null;
      window.__LEPAX_DEST_MARKER__ = null;
      window.__LEPAX_USER_MARKER__ = null;
      window.__LEPAX_ROUTE_LINE__ = null;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
      }).addTo(map);

      var greenIcon = L.divIcon({
        className: "",
        html: '<div style="width:28px;height:28px;border-radius:50% 50% 50% 0;background:#7C9A6B;border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.25);transform:rotate(-45deg);"></div>',
        iconSize: [28, 28],
        iconAnchor: [14, 28],
        popupAnchor: [0, -30],
      });

      var accentIcon = L.divIcon({
        className: "",
        html: '<div style="width:28px;height:28px;border-radius:50% 50% 50% 0;background:#D4847C;border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.25);transform:rotate(-45deg);"></div>',
        iconSize: [28, 28],
        iconAnchor: [14, 28],
        popupAnchor: [0, -30],
      });

      var userIcon = L.divIcon({
        className: "",
        html: '<div style="width:16px;height:16px;border-radius:50%;background:#4A90D9;border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.3);"></div>',
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      });

      function postMessage(payload) {
        if (
          window.ReactNativeWebView &&
          typeof window.ReactNativeWebView.postMessage === "function"
        ) {
          window.ReactNativeWebView.postMessage(JSON.stringify(payload));
        }
      }

      function setPickedMarker(lat, lng, title) {
        if (window.__LEPAX_PICKED_MARKER__) {
          window.__LEPAX_PICKED_MARKER__.setLatLng([lat, lng]);
          window.__LEPAX_PICKED_MARKER__.bindPopup(title);
        } else {
          window.__LEPAX_PICKED_MARKER__ = L.marker([lat, lng], { icon: greenIcon })
            .addTo(map)
            .bindPopup(title);
        }
      }

      function setDestinationMarker(lat, lng) {
        if (window.__LEPAX_DEST_MARKER__) {
          window.__LEPAX_DEST_MARKER__.setLatLng([lat, lng]);
        } else {
          window.__LEPAX_DEST_MARKER__ = L.marker([lat, lng], { icon: accentIcon })
            .addTo(map)
            .bindPopup("Destination");
        }
      }

      function setUserMarker(lat, lng) {
        if (window.__LEPAX_USER_MARKER__) {
          window.__LEPAX_USER_MARKER__.setLatLng([lat, lng]);
        } else {
          window.__LEPAX_USER_MARKER__ = L.marker([lat, lng], { icon: userIcon })
            .addTo(map)
            .bindPopup("You are here");
        }
      }

      function setRoute(startLat, startLng, endLat, endLng) {
        if (window.__LEPAX_ROUTE_LINE__) {
          map.removeLayer(window.__LEPAX_ROUTE_LINE__);
          window.__LEPAX_ROUTE_LINE__ = null;
        }

        window.__LEPAX_ROUTE_LINE__ = L.polyline(
          [[startLat, startLng], [endLat, endLng]],
          {
            color: "#7C9A6B",
            weight: 3,
            dashArray: "8, 6",
            opacity: 0.85,
          }
        ).addTo(map);
      }

      ${
        hasMarker
          ? `
      setPickedMarker(${lat}, ${lng}, ${safeMarkerTitle});
      `
          : ""
      }

      ${
        hasDest
          ? `
      setDestinationMarker(${destLat}, ${destLng});
      `
          : ""
      }

      ${
        hasUser
          ? `
      setUserMarker(${userLat}, ${userLng});
      `
          : ""
      }

      ${
        showRoute && hasMarker && hasDest
          ? `
      setRoute(${lat}, ${lng}, ${destLat}, ${destLng});
      `
          : ""
      }

      ${
        mode === "pick"
          ? `
      map.on("click", function (e) {
        var nextLat = e.latlng.lat;
        var nextLng = e.latlng.lng;

        setPickedMarker(nextLat, nextLng, ${safeMarkerTitle});

        postMessage({
          type: "pick",
          lat: nextLat,
          lng: nextLng
        });
      });
      `
          : ""
      }

      map.whenReady(function () {
        postMessage({ type: "ready" });
      });

      // Expose small bridge helpers for React Native injectJavaScript
      window.__LEPAX_UPDATE_MARKER_TITLE__ = function (title) {
        if (window.__LEPAX_PICKED_MARKER__) {
          window.__LEPAX_PICKED_MARKER__.bindPopup(title);
        }
      };

      window.__LEPAX_SET_PICKED_COORD__ = function (lat, lng, title, shouldPan) {
        setPickedMarker(lat, lng, title);
        if (shouldPan) {
          map.panTo([lat, lng]);
        }
      };

      window.__LEPAX_SET_USER_COORD__ = function (lat, lng) {
        setUserMarker(lat, lng);
      };
    })();
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
  const webViewRef = useRef(null);
  const isMapReadyRef = useRef(false);

  const [loadingLoc, setLoadingLoc] = useState(false);
  const [userCoord, setUserCoord] = useState(null);
  const [pickedCoord, setPickedCoord] = useState(initialCoord);

  // Keep local picked coord in sync when parent changes it
  useEffect(() => {
    setPickedCoord(initialCoord ?? null);
  }, [initialCoord]);

  useEffect(() => {
    if (showUserLoc) {
      fetchUserLocation();
    }
  }, [showUserLoc]);

  const fetchUserLocation = async () => {
    setLoadingLoc(true);

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        return;
      }

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const nextUserCoord = {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      };

      setUserCoord(nextUserCoord);
    } catch (err) {
      console.error("Location error:", err);
    } finally {
      setLoadingLoc(false);
    }
  };

  // Always prefer the actively picked coord over the original initialCoord
  const effectiveCoord = pickedCoord ?? initialCoord ?? null;

  const html = useMemo(() => {
    return buildMapHTML({
      lat: effectiveCoord?.latitude,
      lng: effectiveCoord?.longitude,
      destLat: destination?.latitude,
      destLng: destination?.longitude,
      userLat: userCoord?.latitude,
      userLng: userCoord?.longitude,
      mode,
      markerTitle,
      showRoute,
    });
  }, [
    effectiveCoord?.latitude,
    effectiveCoord?.longitude,
    destination?.latitude,
    destination?.longitude,
    userCoord?.latitude,
    userCoord?.longitude,
    mode,
    markerTitle,
    showRoute,
  ]);

  const injectSafe = (js) => {
    if (!webViewRef.current || !isMapReadyRef.current) return;
    webViewRef.current.injectJavaScript(`${js}\ntrue;`);
  };

  const handleMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);

      if (data?.type === "ready") {
        isMapReadyRef.current = true;
        return;
      }

      if (
        data?.type === "pick" &&
        typeof data.lat === "number" &&
        typeof data.lng === "number"
      ) {
        const coord = {
          latitude: data.lat,
          longitude: data.lng,
        };

        setPickedCoord(coord);
        onLocationPick?.(coord);
      }
    } catch (err) {
      console.error("Map message error:", err);
    }
  };

  // Update popup title without rebuilding whole map
  useEffect(() => {
    injectSafe(`
      if (window.__LEPAX_UPDATE_MARKER_TITLE__) {
        window.__LEPAX_UPDATE_MARKER_TITLE__(${JSON.stringify(
          markerTitle || "Location"
        )});
      }
    `);
  }, [markerTitle]);

  // Update marker position when coord changes
  useEffect(() => {
    if (
      typeof effectiveCoord?.latitude === "number" &&
      typeof effectiveCoord?.longitude === "number"
    ) {
      injectSafe(`
        if (window.__LEPAX_SET_PICKED_COORD__) {
          window.__LEPAX_SET_PICKED_COORD__(
            ${effectiveCoord.latitude},
            ${effectiveCoord.longitude},
            ${JSON.stringify(markerTitle || "Location")},
            false
          );
        }
      `);
    }
  }, [effectiveCoord?.latitude, effectiveCoord?.longitude, markerTitle]);

  // Update user marker when location arrives
  useEffect(() => {
    if (
      typeof userCoord?.latitude === "number" &&
      typeof userCoord?.longitude === "number"
    ) {
      injectSafe(`
        if (window.__LEPAX_SET_USER_COORD__) {
          window.__LEPAX_SET_USER_COORD__(
            ${userCoord.latitude},
            ${userCoord.longitude}
          );
        }
      `);
    }
  }, [userCoord?.latitude, userCoord?.longitude]);

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
        onError={(event) => {
          console.error("WebView error:", event.nativeEvent);
        }}
        onHttpError={(event) => {
          console.error("WebView HTTP error:", event.nativeEvent);
        }}
        renderLoading={() => (
          <View style={styles.loading}>
            <ActivityIndicator color={C.primary} />
          </View>
        )}
      />

      {mode === "pick" && (
        <View style={styles.hint}>
          <Text style={styles.hintText}>
            {effectiveCoord
              ? "Location pinned"
              : "Tap on the map to pin location"}
          </Text>
        </View>
      )}

      {mode === "pick" && effectiveCoord && (
        <View style={styles.coordBadge}>
          <Text style={styles.coordText}>
            {effectiveCoord.latitude.toFixed(5)},{" "}
            {effectiveCoord.longitude.toFixed(5)}
          </Text>
        </View>
      )}

      {loadingLoc && (
        <View style={styles.locBadge}>
          <Text style={styles.locBadgeText}>Getting your location...</Text>
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
  locBadge: {
    position: "absolute",
    bottom: 12,
    right: 12,
    backgroundColor: C.surface,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: C.border,
  },
  locBadgeText: {
    fontSize: Typography.xs,
    color: C.text,
  },
});
