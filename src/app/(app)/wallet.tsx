import { Linking } from "react-native";

import {
  openUrlsFor,
  RechargeMethods,
  type RechargeMethod,
} from "@/components/recharge-methods";
import { ScreenHeader } from "@/components/screen-header";
import { Screen } from "@/components/ui/screen";
import { useToast } from "@/components/ui/toast-host";
import { useI18n } from "@/i18n";

export default function WalletScreen() {
  const { t } = useI18n();
  const toast = useToast();

  /**
   * There is no in-app payment flow yet, so a card hands off to the brand's own
   * app — and to its store page when the app is not installed.
   *
   * Sequential `await`s rather than one call: `openURL` rejecting is the only
   * signal either platform gives that nothing handles a URL, so each candidate
   * has to be attempted in turn. The first success stops the walk, which is why
   * `openUrlsFor` returns them best-first.
   */
  async function openApp(method: RechargeMethod) {
    for (const url of openUrlsFor(method)) {
      try {
        await Linking.openURL(url);
        return;
      } catch {
        // Nothing on the device claims this one; fall through to the next.
      }
    }

    toast.error(t("wallet.openFailed", { method: t(method.nameKey) }));
  }

  return (
    <Screen edgeToEdgeBottom={false}>
      <ScreenHeader
        title={t("wallet.title")}
        subtitle={t("wallet.rechargeHint")}
      />

      <RechargeMethods onOpen={openApp} />
    </Screen>
  );
}
