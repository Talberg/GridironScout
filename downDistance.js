const DOWN_LABELS = ['1st', '2nd', '3rd', '4th'];
const CATEGORY_ORDER = { Short: 1, Medium: 2, Long: 3 };

export function getDownDistanceBucket(down, distance) {
  const downNumber = Number(down);
  const downLabel = DOWN_LABELS[downNumber - 1];
  const distanceText = String(distance ?? '').trim().toUpperCase();
  const yardsToGo = distanceText === 'G' ? 1 : Number(distanceText);

  if (!downLabel || !Number.isFinite(yardsToGo) || yardsToGo <= 0) {
    return 'Unknown Down & Distance';
  }

  const category = yardsToGo <= 3
    ? 'Short'
    : yardsToGo <= 6
      ? 'Medium'
      : 'Long';
  const abbreviation = category[0];
  return `${downLabel} & ${category} (${abbreviation})`;
}

export function compareDownDistanceBuckets(left, right) {
  const parseBucket = (bucket) => {
    const match = bucket.match(/^(1st|2nd|3rd|4th) & (Short|Medium|Long) \([SML]\)$/);
    return match
      ? { down: DOWN_LABELS.indexOf(match[1]), category: CATEGORY_ORDER[match[2]] }
      : null;
  };

  const leftBucket = parseBucket(left);
  const rightBucket = parseBucket(right);
  if (!leftBucket || !rightBucket) return left.localeCompare(right);
  return leftBucket.down - rightBucket.down || leftBucket.category - rightBucket.category;
}

export function refreshDownDistanceBuckets(plays) {
  return plays.map((play) => ({
    ...play,
    downDistBucket: getDownDistanceBucket(play.down, play.distance),
  }));
}
