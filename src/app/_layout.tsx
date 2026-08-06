import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ToastProvider } from "@/components/ui/toast-host";
import { I18nProvider } from "@/i18n";
import { SessionProvider, useSession } from "@/session";
import { FontAssets, ThemeProvider, useTheme } from "@/theme";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(FontAssets);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <I18nProvider>
          <ThemeProvider>
            {/*
              Outside `SessionProvider` so the auth screens can toast too, and
              inside `ThemeProvider`/`SafeAreaProvider` because the toast needs
              both colours and the top inset.

              Caveat worth knowing: an iOS `Modal` is its own native window, so a
              toast fired while one is open sits behind it. Every caller closes
              its modal before toasting, so this does not bite in practice.
            */}
            <ToastProvider>
              <SessionProvider>
                <RootNavigator />
              </SessionProvider>
            </ToastProvider>
          </ThemeProvider>
        </I18nProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

function RootNavigator() {
  const { isRestoring, isAuthenticated } = useSession();
  const { colors, scheme } = useTheme();

  useEffect(() => {
    if (!isRestoring) void SplashScreen.hideAsync();
  }, [isRestoring]);

  if (isRestoring) return null;

  return (
    <>
      <StatusBar style={scheme === "dark" ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          animation: "fade",
        }}
      >
        <Stack.Protected guard={isAuthenticated}>
          <Stack.Screen name="(app)" />
        </Stack.Protected>

        <Stack.Protected guard={!isAuthenticated}>
          <Stack.Screen name="(auth)" />
        </Stack.Protected>
      </Stack>
    </>
  );
}
