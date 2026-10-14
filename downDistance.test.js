import {
  compareDownDistanceBuckets,
  getDownDistanceBucket,
  refreshDownDistanceBuckets,
} from './downDistance';

describe('down-and-distance buckets', () => {
  it.each([
    ['1', '1', '1st & Short (S)'],
    ['2', '3', '2nd & Short (S)'],
    ['3', '4', '3rd & Medium (M)'],
    ['4', '6', '4th & Medium (M)'],
    ['1', '7', '1st & Long (L)'],
    ['2', '10', '2nd & Long (L)'],
    ['3', 'G', '3rd & Short (S)'],
  ])('classifies down %s and distance %s', (down, distance, expected) => {
    expect(getDownDistanceBucket(down, distance)).toBe(expected);
  });

  it('sorts buckets by down and then short, medium, long', () => {
    expect([
      '2nd & Long (L)',
      '1st & Long (L)',
      '1st & Medium (M)',
      '1st & Short (S)',
    ].sort(compareDownDistanceBuckets)).toEqual([
      '1st & Short (S)',
      '1st & Medium (M)',
      '1st & Long (L)',
      '2nd & Long (L)',
    ]);
  });

  it('refreshes the derived bucket for previously saved plays', () => {
    expect(refreshDownDistanceBuckets([{
      down: '2',
      distance: '6',
      downDistBucket: '26',
    }])).toEqual([{
      down: '2',
      distance: '6',
      downDistBucket: '2nd & Medium (M)',
    }]);
  });
});
