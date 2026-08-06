import {
  DashboardSpeed01Icon,
  Home01Icon,
  PlusSignIcon,
  Settings01Icon,
} from "@hugeicons/core-free-icons";
import { Tabs } from "expo-router";
import { StyleSheet, View } from "react-native";

import { AppTabBar, FloatingTabAction } from "@/components/app-tab-bar";
import { MeterFormHost, useMeterForm } from "@/components/meter-form-host";
import { Icon } from "@/components/ui/icon";
import { useI18n } from "@/i18n";
import { usePushRegistration } from "@/notifications/use-push-registration";
import { useSettingsSync } from "@/settings/use-settings-sync";

/**
 * Standard `Tabs` rather than the starter's `NativeTabs`: native tabs take
 * bitmap icons, and the icon set here is SVG. Notifications joins this bar in a
 * later slice — `AppTabBar` splits whatever tabs it is handed around the centre
 * action button, so a fourth tab needs no layout change here.
 */
export default function AppLayout() {
  // Mounted here rather than at the root because it only has work to do once
  // the user is authenticated.
  useSettingsSync();
  // Sends this device's FCM token to the backend once signed in. No-ops on a
  // simulator or when permission is refused.
  usePushRegistration();

  return (
    <MeterFormHost>
      <AppTabs />
    </MeterFormHost>
  );
}

/**
 * Split out so it sits *inside* the host: the tab bar's action button opens the
 * add-meter sheet, and a provider cannot consume its own context.
 */
function AppTabs() {
  const { t } = useI18n();
  const meterForm = useMeterForm();

  return (
    // Anchors the floating action button, which has to sit above the navigator
    // rather than inside the tab bar to overlap both the bar and the screen.
    <View style={styles.root}>
      <Tabs
        // Colours and label fonts are no longer threaded through `screenOptions`
        // — `AppTabBar` reads the theme directly and renders labels with the
        // project's `Text`, which already resolves the per-locale font family.
        screenOptions={{ headerShown: false }}
        tabBar={(props) => <AppTabBar {...props} />}
      >
      <Tabs.Screen
        name="index"
        options={{
          title: t("common.appName"),
          tabBarIcon: ({ focused }) => (
            <Icon
              icon={Home01Icon}
              color={focused ? "primary" : "textTertiary"}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="meters"
        options={{
          title: t("meters.title"),
          tabBarIcon: ({ focused }) => (
            <Icon
              icon={DashboardSpeed01Icon}
              color={focused ? "primary" : "textTertiary"}
            />
          ),
        }}
      />
      {/* Nested detail route. Without `href: null` Tabs would add it to the
          tab bar alongside the real tabs. */}
      <Tabs.Screen name="meter/[id]" options={{ href: null }} />

      {/* Reached from the header bell, not the tab bar. */}
      <Tabs.Screen name="notifications" options={{ href: null }} />

      <Tabs.Screen
        name="settings"
        options={{
          title: t("settings.title"),
          tabBarIcon: ({ focused }) => (
            <Icon
              icon={Settings01Icon}
              color={focused ? "primary" : "textTertiary"}
            />
          ),
        }}
        />
      </Tabs>

      <FloatingTabAction
        icon={PlusSignIcon}
        label={t("meters.add")}
        onPress={meterForm.add}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
