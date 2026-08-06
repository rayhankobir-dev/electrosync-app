import {
  createContext,
  use,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, {
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { MaxContentWidth, Spacing } from "@/theme";

import { ToastCard, type ToastTone } from "./toast";

export type ToastInput = {
  tone?: ToastTone;
  title: string;
  description?: string;
};

type Toast = Required<Pick<ToastInput, "tone" | "title">> &
  Pick<ToastInput, "description">;

export type ToastApi = {
  show(input: ToastInput): void;
  success(title: string, description?: string): void;
  error(title: string, description?: string): void;
  info(title: string, description?: string): void;
  /** Takes the current toast away early. Rarely needed — they expire on their own. */
  dismiss(): void;
};

/**
 * How long each tone stays. Errors linger: they carry more text, and they are
 * the one kind of message the user may need to act on rather than just note.
 */
const DURATION: Record<ToastTone, number> = {
  success: 3500,
  info: 3500,
  error: 5000,
};

/** Same shape as the selection spring — quick, with just enough overshoot to feel physical. */
const ENTER_SPRING = { damping: 18, stiffness: 200, mass: 0.6 } as const;

const EXIT_DURATION = 180;

/** How far above its resting place the card starts. */
const ENTER_OFFSET = 24;

/**
 * How far a toast retreats when another one replaces it while it is still on
 * screen. Not all the way to 0: a full exit-and-re-enter reads as two separate
 * events, when what happened is one message being corrected by another.
 */
const REPLACE_DIP = 0.85;

const ToastContext = createContext<ToastApi | null>(null);

/**
 * Hosts the single toast slot above every screen.
 *
 * One toast at a time by design: a newer message replaces whatever is showing
 * rather than queueing behind it. Two feedback events landing together is
 * vanishingly rare in this app, and a stack costs exit re-flow animations to
 * handle a case that would not arise.
 *
 * Note the messages are plain strings, already translated — same contract as
 * `Banner`'s `message`. Descriptions routinely need `t(key, params)` or a
 * dynamic value like a meter's label, so a translation-key-only API would just
 * push every caller into passing a pre-built string anyway.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();

  const [toast, setToast] = useState<Toast | null>(null);
  const progress = useSharedValue(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * Plain functions rather than `useCallback`, and the api object below is a
   * plain literal rather than `useMemo` — both on purpose.
   *
   * `react-hooks/immutability` rejects a `useCallback` that writes to a value it
   * lists as a dependency, which is exactly what `progress.value = …` is. The
   * wrappers bought nothing to begin with: React Compiler is on for this project
   * (`app.json` → `experiments.reactCompiler`), so it memoises these itself.
   * `use-selection-animation.ts` leaves its `onPressIn`/`onPressOut` unwrapped
   * for the same reason.
   */
  function unmount() {
    setToast(null);
  }

  function hide() {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }

    progress.value = withTiming(0, { duration: EXIT_DURATION }, (finished) => {
      /**
       * `finished` is the guard that makes replacement safe. If `show` ran
       * mid-exit, its spring cancelled this timing and Reanimated reports
       * `false` — unmounting there would tear out the toast that just arrived.
       */
      if (finished) runOnJS(unmount)();
    });
  }

  function show(input: ToastInput) {
    if (timer.current) clearTimeout(timer.current);

    const tone = input.tone ?? "info";
    setToast({ tone, title: input.title, description: input.description });

    /**
     * A card that never left the screen must not appear to fly in again, so a
     * live toast gets the dip instead of the entrance. Reading `progress` here is
     * a plain synchronous read on the JS thread, not a worklet.
     */
    progress.value =
      progress.value > 0.99
        ? withSequence(
            withTiming(REPLACE_DIP, { duration: 90 }),
            withSpring(1, ENTER_SPRING),
          )
        : withSpring(1, ENTER_SPRING);

    timer.current = setTimeout(hide, DURATION[tone]);
  }

  // Only a teardown — a pending timer firing after unmount would set state on a
  // gone component.
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const api: ToastApi = {
    show,
    success: (title, description) =>
      show({ tone: "success", title, description }),
    error: (title, description) => show({ tone: "error", title, description }),
    info: (title, description) => show({ tone: "info", title, description }),
    dismiss: hide,
  };

  const cardStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [
      {
        translateY: interpolate(progress.value, [0, 1], [-ENTER_OFFSET, 0]),
      },
      { scale: interpolate(progress.value, [0, 1], [0.94, 1]) },
    ],
  }));

  return (
    <ToastContext value={api}>
      {children}

      {/*
        `box-none` so the layer itself never swallows a touch — it spans the
        width of the screen, and without it the strip under the status bar would
        stop reaching the content behind it even with no toast showing.

        A sibling *after* `children`, so it paints on top without needing to
        reach for elevation, which on Android would bring a shadow with it.
      */}
      <View
        pointerEvents="box-none"
        style={[styles.layer, { top: insets.top + Spacing.sm }]}
      >
        {toast ? (
          <Animated.View style={[styles.slot, cardStyle]}>
            <Pressable
              // Tap to dismiss, rather than a swipe: `GestureHandlerRootView` is
              // not mounted in this app, and a toast that expires on its own does
              // not justify wiring it up.
              onPress={hide}
              accessibilityRole="alert"
              accessibilityLiveRegion="polite"
            >
              <ToastCard
                tone={toast.tone}
                title={toast.title}
                description={toast.description}
              />
            </Pressable>
          </Animated.View>
        ) : null}
      </View>
    </ToastContext>
  );
}

export function useToast(): ToastApi {
  const context = use(ToastContext);
  if (!context) throw new Error("useToast must be used inside <ToastProvider>.");
  return context;
}

const styles = StyleSheet.create({
  layer: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    zIndex: 100,
  },
  slot: {
    width: "100%",
    // Matches `Screen`, so on a tablet or the web build the toast lines up with
    // the content it is talking about instead of spanning the whole window.
    maxWidth: MaxContentWidth,
  },
});
