import { useState, type ReactNode } from "react";
import { ScrollView, StyleSheet, View } from "react-native";

import { Radius, Spacing, useTheme } from "@/theme";

import { Text } from "./text";

export type ColumnAlign = "left" | "center" | "right";

export type Column<T> = {
  key: string;
  header: string;
  width: number;
  /** Applies to the header and the cells alike. Defaults to centred. */
  align?: ColumnAlign;
  render(row: T): ReactNode;
};

/**
 * Gutter between columns, taken out of each cell's declared width. Split evenly
 * left and right so centred content sits in the true middle of its column —
 * padding on one side only would push it visibly off-centre from its header.
 */
const GUTTER = Spacing.md;

const ITEMS: Record<ColumnAlign, "flex-start" | "center" | "flex-end"> = {
  left: "flex-start",
  center: "center",
  right: "flex-end",
};

/**
 * Column widths grown to fill `target`, or the declared widths untouched when
 * the table is already at least that wide.
 *
 * A declared width is a *minimum*, not a fixed size. Left as fixed, a table
 * narrower than its container stopped short of the right edge and left the
 * header band and row rules ending in mid-air, which reads as a broken layout
 * rather than as a narrow table.
 *
 * Grown proportionally, so the ratios the columns were designed at survive —
 * handing the whole surplus to one column would widen `date` into a gap and
 * leave the figures beside it as cramped as before.
 *
 * Rounded to whole pixels, with the drift given to the last column so the parts
 * still sum to exactly `target`. Fractional widths would leave a hairline of
 * card showing past the end of the header band. The rounding has to resolve to
 * the *same* numbers for the header and the body, which is why this returns one
 * array that both read from rather than being recomputed per row.
 *
 * Returning early when `target` is smaller is what keeps the horizontal scroll
 * working: a table wider than its container must keep its declared widths, or
 * shrinking it to fit would defeat the ScrollView it lives in.
 */
function fillWidths(declared: readonly number[], target: number): number[] {
  const natural = declared.reduce((sum, width) => sum + width, 0);
  if (natural <= 0 || target <= natural) return [...declared];

  const grown = declared.map((width) => Math.round((width / natural) * target));
  const drift = target - grown.reduce((sum, width) => sum + width, 0);
  grown[grown.length - 1] += drift;

  return grown;
}

/**
 * Columns carry explicit widths and the grid scrolls horizontally as one unit,
 * so the header can never drift out of alignment with the body.
 *
 * Two rules make that hold:
 *   - spacing lives *inside* the declared width as padding, never as a flex
 *     `gap`. A gap adds width the header and body would have to agree on
 *     separately, and any disagreement shows up as skew.
 *   - every cell clips. Without it, content wider than its column (Bangla unit
 *     names are far longer than their English equivalents) spills across the
 *     neighbouring column while the header stays put — which reads as a
 *     misaligned table rather than as overflow.
 *
 * Rules run horizontally only. A divider between every column boxed each figure
 * in and made the table read as a grid of cells rather than as rows you scan
 * across; the declared widths already hold the columns apart.
 *
 * The header is a tinted band, closed off by a rule top and bottom, with its
 * labels in `captionStrong` so they hold that fill. Colour is what separates it
 * from the body; the rules are what stop the fill from bleeding into whatever
 * sits above and below it in the card.
 */
export function DataTable<T>({
  columns,
  rows,
  keyExtractor,
  emptyLabel,
  bleed = 0,
}: {
  columns: readonly Column<T>[];
  rows: readonly T[];
  keyExtractor(row: T, index: number): string;
  emptyLabel: string;
  /**
   * Padding to escape on each side, so the header band and row rules reach the
   * edges of the container. The edge columns take it back as padding, which
   * keeps their content lined up with everything else inside that padding —
   * only the ink that is supposed to span the full width does.
   */
  bleed?: number;
}) {
  const { colors } = useTheme();

  /**
   * The track's own width, from its last layout pass. Zero until it has been
   * measured, which resolves to the declared widths — so the first paint is the
   * natural table rather than one collapsed into no width.
   */
  const [available, setAvailable] = useState(0);

  // A framed table draws its own hairline on each side, outside `totalWidth` —
  // see the note on the wrapper below. Filling the track edge to edge without
  // allowing for it would push the frame a pixel past the end and leave the
  // table scrollable by that pixel.
  const frame = bleed === 0 ? StyleSheet.hairlineWidth * 2 : 0;

  // Measured against the same span the columns cover: the track escapes the
  // container's padding by `bleed` on each side, and `bleed` is inside
  // `totalWidth` too, so both sides of this comparison already include it.
  const widths = fillWidths(
    columns.map((column) => column.width),
    available - bleed * 2 - frame,
  );
  const totalWidth = widths.reduce((sum, width) => sum + width, 0) + bleed * 2;

  /**
   * Horizontal padding for a cell at `index`, applied identically to the header
   * and the body — the two stay aligned only because every width and inset is
   * computed from the same place.
   */
  const cellInset = (index: number) => {
    const leading = index === 0 ? bleed : 0;
    const trailing = index === columns.length - 1 ? bleed : 0;

    return {
      // The bleed is added to the column's width as well as its padding, so the
      // content box stays exactly as wide as its declared width minus the gutter.
      width: widths[index] + leading + trailing,
      paddingLeft: GUTTER / 2 + leading,
      paddingRight: GUTTER / 2 + trailing,
    };
  };

  if (rows.length === 0) {
    return (
      <View style={styles.empty}>
        <Text variant="footnote" color="textTertiary" align="center">
          {emptyLabel}
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      // Stops a short table from being draggable, which feels broken.
      alwaysBounceHorizontal={false}
      style={{ marginHorizontal: -bleed }}
      // The track's frame, not its content: measuring the content would feed the
      // widths derived from it straight back in as their own input.
      onLayout={(event) => setAvailable(event.nativeEvent.layout.width)}
    >
      {/* The outer rule goes on a wrapper with no declared width: on the inner
          View it would eat two pixels out of `totalWidth`, and the cells would
          no longer add up to it. A bleeding table skips it — the container it
          just escaped is drawing that frame already. */}
      <View
        style={[
          styles.grid,
          bleed === 0 && styles.framed,
          { borderColor: colors.border },
        ]}
      >
        <View style={{ width: totalWidth }}>
          <View
            style={[
              styles.headerRow,
              {
                backgroundColor: colors.primarySoft,
                borderTopColor: colors.borderStrong,
                borderBottomColor: colors.borderStrong,
                // A framed table already draws a rule along its top edge, and a
                // second one directly beneath reads as one thick uneven line.
                // A bleeding table has no frame, so the band needs its own.
                borderTopWidth: bleed === 0 ? 0 : StyleSheet.hairlineWidth,
              },
            ]}
          >
            {columns.map((column, columnIndex) => (
              <View
                key={column.key}
                style={[
                  styles.cell,
                  styles.headerCell,
                  cellInset(columnIndex),
                  { alignItems: ITEMS[column.align ?? "center"] },
                ]}
              >
                {/* Headers wrap rather than truncate. Bangla labels run well
                    past their English counterparts — "গত মাসের অবশিষ্ট" against
                    "Closing" — and at these column widths `numberOfLines={1}`
                    cut them off at an ellipsis. The band grows to its tallest
                    label and every cell in the row grows with it, so a
                    two-line header costs alignment nothing. */}
                <Text
                  variant="captionStrong"
                  color="textSecondary"
                  align={column.align ?? "center"}
                >
                  {column.header.toUpperCase()}
                </Text>
              </View>
            ))}
          </View>

          {rows.map((row, index) => (
            <View
              key={keyExtractor(row, index)}
              style={[
                styles.row,
                {
                  borderBottomColor: colors.border,
                  // Rows are separated, not boxed: the last one needs no rule
                  // under it, whether the frame or the card draws the edge.
                  borderBottomWidth:
                    index === rows.length - 1 ? 0 : StyleSheet.hairlineWidth,
                },
              ]}
            >
              {columns.map((column, columnIndex) => (
                <View
                  key={column.key}
                  style={[
                    styles.cell,
                    cellInset(columnIndex),
                    { alignItems: ITEMS[column.align ?? "center"] },
                  ]}
                >
                  {column.render(row)}
                </View>
              ))}
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  grid: {
    alignSelf: "flex-start",
    // Keeps the header's and last row's rules from poking past the rounded
    // corners of the outer rule.
    overflow: "hidden",
  },
  framed: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.md,
  },
  headerRow: {
    flexDirection: "row",
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerCell: {
    paddingVertical: Spacing.sm,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  cell: {
    // Horizontal padding comes from `cellInset` — it varies at the edges.
    paddingVertical: Spacing.md,
    // The clip that keeps overflowing content from invading the next column.
    overflow: "hidden",
    justifyContent: "center",
  },
  empty: {
    paddingVertical: Spacing.xl,
  },
});
