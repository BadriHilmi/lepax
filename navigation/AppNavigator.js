// navigation/AppNavigator.js
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { View } from "react-native";
import { useAuth } from "../context/AuthContext";
import { C, Typography } from "../constants/theme";
import AppIcon from "../components/AppIcon";

import AuthScreen from "../screens/AuthScreen";
import HomeScreen from "../screens/HomeScreen";
import FreeNowScreen from "../screens/FreeNowScreen";
import ProfileScreen from "../screens/ProfileScreen";
import PlanDetailScreen from "../screens/PlanDetailScreen";
import CreatePlanScreen from "../screens/CreatePlanScreen";
import AddFriendScreen from "../screens/AddFriendScreen";
import FriendRequestsScreen from "../screens/FriendRequestsScreen";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function TabIcon({ name, focused }) {
  return (
    <View
      style={{
        width: 36,
        height: 24,
        borderRadius: 12,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: focused ? "rgba(255, 255, 255, 0.08)" : "transparent",
      }}
    >
      <AppIcon
        name={name}
        size={20}
        color={focused ? C.aqua : "rgba(255, 255, 255, 0.4)"}
      />
    </View>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: C.ink,
          borderTopWidth: 0,
          elevation: 0,
          shadowOpacity: 0,
          height: 64,
          paddingTop: 6,
        },
        tabBarActiveTintColor: C.aqua,
        tabBarInactiveTintColor: "rgba(255, 255, 255, 0.4)",
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: Typography.semibold,
          marginBottom: 2,
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: "Home",
          tabBarIcon: ({ focused }) => (
            <TabIcon name="map" focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="FreeNow"
        component={FreeNowScreen}
        options={{
          tabBarLabel: "Free now",
          tabBarIcon: ({ focused }) => (
            <TabIcon name="zap" focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: "Profile",
          tabBarIcon: ({ focused }) => (
            <TabIcon name="circleUser" focused={focused} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { user, loading } = useAuth();
  if (loading) return null;

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{ headerShown: false, animation: "slide_from_right" }}
      >
        {user ? (
          <>
            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen name="PlanDetail" component={PlanDetailScreen} />
            <Stack.Screen name="CreatePlan" component={CreatePlanScreen} />
            <Stack.Screen name="AddFriend" component={AddFriendScreen} />
            <Stack.Screen
              name="FriendRequests"
              component={FriendRequestsScreen}
            />
          </>
        ) : (
          <Stack.Screen name="Auth" component={AuthScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
