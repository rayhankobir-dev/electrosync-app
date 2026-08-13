import {
  Alert02Icon,
  CheckmarkCircle02Icon,
  InformationCircleIcon,
} from "@hugeicons/core-free-icons";
import { StyleSheet, View } from "react-native";

import {
  Radius,
  Spacing,
  useTheme,
  withAlpha,
  type ColorName,
  type TypeVariant,
} from "@/theme";

import { Icon } from "./icon";
import { Text } from "./text";

export type ToastTone = "success" | "error" | "info";

/**
 * Deliberately the same three tones, colours and icons as `Banner`. A toast and
 * a banner say the same kinds of thing in different places, and giving them
 * different icons for "this failed" would make them read as different classes of
 * message.
 */
const TONES: Record<
  ToastTone,
  { fg: ColorName; bg: ColorName; icon: typeof Alert02Icon }
> = {
  success: { fg: "success", bg: "successSoft", icon: CheckmarkCircle02Icon },
  error: { fg: "danger", bg: "dangerSoft", icon: Alert02Icon },
  info: { fg: "primary", bg: "primarySoft", icon: InformationCircleIcon },
};

const BADGE = 36;

/** One number to tune if the edge ever reads too heavy or too faint. */
const BORDER_ALPHA = 0.3;

/**
 * The toast's looks, with no knowledge of how it got on screen or when it
 * leaves — `toast-host` owns all of that. Split out so the card can be read
 * (and restyled) without stepping through timers and shared values.
 */
export function ToastCard({
  tone,
  title,
  description,
}: {
  tone: ToastTone;
  title: string;
  description?: string;
}) {
  const { colors } = useTheme();
  const config = TONES[tone];

  return (
    <View
      style={[
        styles.card,
        {
          /**
           * Soft tone fill rather than a neutral surface, so the toast says what
           * kind of message it is before a word of it is read — the same thing
           * `Banner` does inline.
           *
           * It still needs a border: the soft fills sit very close to the app
           * background in light mode (`successSoft` #E6F6F0 against `background`
           * #F7F8FA), and a floating card needs a definite edge in a way an
           * inline banner does not. A border and not a shadow, because the tokens
           * file rules shadows out — they turn to grey haze on a dark background.
           *
           * The tone at a fraction of its strength, not at full: a saturated
           * outline drew more attention than the message inside it. Diluted
           * against the card's own fill it stays in the same colour family and
           * just describes the edge.
           */
          backgroundColor: colors[config.bg],
          borderColor: withAlpha(colors[config.fg], BORDER_ALPHA),
        },
      ]}
    >
      {/*
        Inverted against the card: on a soft fill a soft badge would disappear,
        so the badge takes the solid tone and the glyph goes to `textInverse`.
        That token is what makes it work in both schemes — the tone colours
        lighten in dark mode exactly as `textInverse` darkens, so it stays white
        on deep red in light mode and near-black on pale red in dark mode.
      */}
      <View style={[styles.badge, { backgroundColor: colors[config.fg] }]}>
        <Icon icon={config.icon} size={20} color="textInverse" />
      </View>

      <View style={styles.copy}>
        {/* `subhead`, not `body`: a toast is glanced at over the top of whatever
            the user was reading, so it should not compete with the page's own
            body text for weight. */}
        <Copy variant="subhead" numberOfLines={2}>
          {title}
        </Copy>

        {description ? (
          <Copy variant="footnote" color="textSecondary" numberOfLines={2}>
            {description}
          </Copy>
        ) : null}
      </View>
    </View>
  );
}

/**
 * A number inside a sentence: digits, the separators *between* digits, and a
 * leading taka sign so an amount stays one visual unit.
 *
 * Bangla numerals are matched as well as Latin ones because that is what
 * actually arrives here — every figure in a toast has already been through
 * `formatNumber`/`formatCurrency`, so under `bn` the string holds ০-৯ before it
 * reaches this component.
 *
 * The separator has to be *followed* by a digit to be part of the run. Without
 * that, the full stop ending "You'll be alerted below ৳১০০." would be pulled
 * into the number and set in the numeral family, leaving the sentence's own
 * punctuation in the wrong typeface.
 */
const NUMBER_RUN = /৳?[\d০-৯]+(?:[.,:][\d০-৯]+)*/g;

/**
 * Toast copy with its numbers in the numeral family and its words left alone.
 *
 * A toast is prose that happens to quote a figure — "You'll be alerted below
 * ৳১০০" — so it cannot simply be flagged `numeric` the way a table cell can:
 * that switches the whole string to Li Ador Noirrit and would set the Bangla
 * words in it in a family the rest of the app's prose never uses. Splitting the
 * string means only the digits change, which is the distinction `numeric` was
 * drawn for in the first place.
 *
 * `color` is threaded onto the nested runs on purpose. `Text` always writes a
 * colour, so a nested run that omitted it would silently reset the description's
 * `textSecondary` back to full-strength `text` — visible as a two-tone sentence.
 */
function Copy({
  variant,
  color,
  numberOfLines,
  children,
}: {
  variant: TypeVariant;
  color?: ColorName;
  numberOfLines?: number;
  children: string;
}) {
  return (
    <Text variant={variant} color={color} numberOfLines={numberOfLines}>
      {splitNumbers(children).map((run, index) =>
        typeof run === "string" ? (
          run
        ) : (
          <Text key={index} variant={variant} color={color} numeric>
            {run.number}
          </Text>
        ),
      )}
    </Text>
  );
}

/** Alternating prose and number runs, in order, for `Copy` to render. */
function splitNumbers(text: string): (string | { number: string })[] {
  const runs: (string | { number: string })[] = [];
  let cursor = 0;

  // `matchAll` rather than `exec` in a loop: the regex is module-level and
  // therefore shared, and a stateful `lastIndex` left behind by one toast would
  // make the next one start matching from the middle of its own string.
  for (const match of text.matchAll(NUMBER_RUN)) {
    const start = match.index;
    if (start > cursor) runs.push(text.slice(cursor, start));
    runs.push({ number: match[0] });
    cursor = start + match[0].length;
  }

  if (cursor < text.length) runs.push(text.slice(cursor));
  return runs;
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    // Centred rather than top-aligned: with a one-line title the badge and text
    // are the same height anyway, and when a description wraps, a badge pinned
    // to the top edge reads as misaligned.
    alignItems: "center",
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
  },
  badge: {
    width: BADGE,
    height: BADGE,
    borderRadius: Radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  copy: {
    flex: 1,
    gap: 2,
  },
});
