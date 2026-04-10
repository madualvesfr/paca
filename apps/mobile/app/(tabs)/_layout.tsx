import { useEffect, useState } from "react";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  useI18n,
  useProfile,
  useUpdateProfile,
  useCouple,
  useSyncLocaleFromProfile,
  useSyncCurrencyFromCouple,
} from "@paca/api";
import { TutorialModal } from "@/components/TutorialModal";

export default function TabLayout() {
  const { t } = useI18n();
  const { data: profile } = useProfile();
  const { data: couple } = useCouple();
  const updateProfile = useUpdateProfile();
  useSyncLocaleFromProfile(profile?.language);
  useSyncCurrencyFromCouple(couple?.primary_currency);

  const [tutorialOpen, setTutorialOpen] = useState(false);

  useEffect(() => {
    if (profile && profile.tutorial_completed === false) {
      setTutorialOpen(true);
    }
  }, [profile?.id, profile?.tutorial_completed]);

  const handleTutorialClose = () => {
    setTutorialOpen(false);
    if (profile && !profile.tutorial_completed) {
      updateProfile.mutate({ tutorial_completed: true });
    }
  };

  return (
    <>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: "#FF8FB1",
          tabBarInactiveTintColor: "#ADB5BD",
          tabBarStyle: {
            borderTopWidth: 0,
            elevation: 0,
            shadowOpacity: 0,
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: t.nav.dashboard,
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="home-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="transactions"
          options={{
            title: t.nav.transactions,
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="swap-horizontal-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="budget"
          options={{
            title: t.nav.budget,
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="pie-chart-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="bills"
          options={{
            title: t.nav.bills,
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="clipboard-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: t.nav.profile,
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="person-outline" size={size} color={color} />
            ),
          }}
        />
      </Tabs>
      <TutorialModal visible={tutorialOpen} onClose={handleTutorialClose} />
    </>
  );
}
