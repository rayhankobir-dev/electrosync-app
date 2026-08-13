import { LinkSquare02Icon } from "@hugeicons/core-free-icons";
import { Image, type ImageSource } from "expo-image";
import { Platform, StyleSheet, View } from "react-native";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Text } from "@/components/ui/text";
import { useI18n, type TranslationKey } from "@/i18n";
import { Radius, Spacing, withAlpha } from "@/theme";

/**
 * A mobile financial service a meter can be topped up through.
 *
 * Shaped after `UtilityAdapter` in `@/utility`: the name is a translation key,
 * not a string, because both brands are written in Bangla script in the Bangla
 * locale — বিকাশ, নগদ — so the name has to come out of the catalogue like any
 * other piece of copy.
 */
export type RechargeMethod = {
  /** Stable list key. Also what a caller switches on to start a payment. */
  key: "bkash" | "nagad";
  nameKey: TranslationKey;
  logo: ImageSource;
  brand: string;
  /**
   * The app's own URL scheme — tried first, and the only thing here that is not
   * verifiable: neither company documents a scheme, and neither publishes an
   * `apple-app-site-association` file (Apple's CDN answers 404 for both
   * `bkash.com` and `nagad.com.bd`), so universal links are not an option
   * either. `bkash://` and `nagad://` are the conventional guesses; when one is
   * wrong the open simply rejects and the store link below takes over, so a bad
   * guess costs the user a store page rather than a dead button.
   */
  appUrl: string;
  /**
   * Play Store package name. Verified against the live listings:
   * `play.google.com/store/apps/details?id=com.bKash.customerapp` and
   * `…?id=com.konasl.nagad`. Note bKash's capital K — the package is
   * case-sensitive and a lowercased copy silently 404s.
   */
  androidPackage: string;
  /**
   * App Store numeric id, with the iOS bundle id it resolves to. Both confirmed
   * through Apple's own lookup endpoint (`itunes.apple.com/lookup?id=…`), which
   * is why the two platforms disagree for Nagad: its iOS bundle is
   * `com.konasl.bdpost.nagad`, not the Android package.
   */
  iosAppId: string;
};

const BKASH: RechargeMethod = {
  key: "bkash",
  nameKey: "wallet.methods.bkash",
  logo: require("@/assets/images/recharge/bkash.webp") as ImageSource,
  brand: "#E2136E",
  appUrl: "bKash://",
  androidPackage: "com.bKash.customerapp",
  // bKash Limited — iOS bundle `com.bKash.customerapp`.
  iosAppId: "1351183172",
};

const NAGAD: RechargeMethod = {
  key: "nagad",
  nameKey: "wallet.methods.nagad",
  logo: require("@/assets/images/recharge/nagad.png") as ImageSource,
  brand: "#EE1C25",
  appUrl: "nagad://",
  androidPackage: "com.konasl.nagad",
  // Bangladesh Post Office — iOS bundle `com.konasl.bdpost.nagad`.
  iosAppId: "1471844924",
};

export const RECHARGE_METHODS: readonly RechargeMethod[] = [BKASH, NAGAD];

/**
 * Every URL worth trying for a method, best first: the app itself, then the
 * platform's store app, then the store on the web.
 *
 * A list rather than a single URL because there is no way to ask whether the app
 * is installed — iOS `canOpenURL` needs each scheme declared in
 * `LSApplicationQueriesSchemes` and returns `false` otherwise, and Android 11+
 * wants the same in `<queries>`. So the caller walks the list and lets the first
 * one that does not reject win.
 *
 * The store entries come in pairs because `market:` and `itms-apps:` open the
 * native store instantly but exist only where that store is installed — an
 * emulator without Play Services, or a sideloaded build, needs the https URL.
 */
export function openUrlsFor(method: RechargeMethod): readonly string[] {
  const store =
    Platform.OS === "ios"
      ? [
          `itms-apps://apps.apple.com/app/id${method.iosAppId}`,
          `https://apps.apple.com/app/id${method.iosAppId}`,
        ]
      : [
          `market://details?id=${method.androidPackage}`,
          `https://play.google.com/store/apps/details?id=${method.androidPackage}`,
        ];

  return [method.appUrl, ...store];
}

export function RechargeMethods({
  onOpen,
}: {
  onOpen(method: RechargeMethod): void;
}) {
  return (
    <View style={styles.stack}>
      {RECHARGE_METHODS.map((method) => (
        <MethodCard key={method.key} method={method} onOpen={onOpen} />
      ))}
    </View>
  );
}

function MethodCard({
  method,
  onOpen,
}: {
  method: RechargeMethod;
  onOpen(method: RechargeMethod): void;
}) {
  const { t } = useI18n();
  const name = t(method.nameKey);

  return (
    <Card
      style={{
        borderColor: withAlpha(method.brand, 0.4),
      }}
    >
      <View style={styles.row}>
        {/*
          A white tile under the mark, as in `ProviderRibbon`: bKash's bird and
          Nagad's swirl both carry transparency, and recolouring another
          company's logo to survive dark mode is not ours to do — so what changes
          is the surface beneath it.
        */}
        <View
          style={[
            styles.chip,
            { backgroundColor: withAlpha(method.brand, 0.1) },
          ]}
        >
          <View style={styles.chipInner}>
            <Image
              source={method.logo}
              style={styles.logo}
              contentFit="contain"
              // Decorative: the brand's name is spelt out right beside it.
              accessible={false}
            />
          </View>
        </View>

        {/* `flex: 1` here rather than on the row's other children: the copy is
            the one part that should absorb the leftover width, which keeps the
            button hard against the card's right edge at any card width. */}
        <View style={styles.copy}>
          <Text variant="bodyMedium" numberOfLines={1}>
            {name}
          </Text>
          <Text variant="caption" color="textTertiary" numberOfLines={1}>
            {t("wallet.methodCaption")}
          </Text>
        </View>

        <Button
          label={t("wallet.openApp")}
          accessibilityLabel={t("wallet.openAppA11y", { method: name })}
          variant="secondary"
          size="md"
          icon={LinkSquare02Icon}
          fullWidth={false}
          onPress={() => onOpen(method)}
        />
      </View>
    </Card>
  );
}

/** Square, so a wordmark and a round mark occupy the same footprint. */
const CHIP = 44;

/**
 * How much brand wash shows around the white plate, per side. A hairline: at 4pt
 * the ring read as a coloured frame competing with the mark inside it, where the
 * point is only to keep the plate from disappearing into a white card.
 */
const RING = 0;

const styles = StyleSheet.create({
  stack: {
    gap: Spacing.md,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  chip: {
    width: CHIP,
    height: CHIP,
    borderRadius: Radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  /**
   * The white plate the mark actually sits on, inset inside the brand wash so a
   * ring of colour shows around it. Without the wash the plate would be a bare
   * white square on a white card in light mode.
   */
  chipInner: {
    width: CHIP - RING * 2,
    height: CHIP - RING * 2,
    borderRadius: Radius.sm,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  logo: {
    width: "78%",
    height: "78%",
  },
  copy: {
    flex: 1,
    gap: 2,
  },
});
