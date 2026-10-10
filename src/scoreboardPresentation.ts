export function firstSolveTimes(
  cells: Iterable<{ problemId: string; acceptedAt: number }>,
) {
  const times = new Map<string, number>();
  for (const { problemId, acceptedAt } of cells) {
    const previous = times.get(problemId);
    if (previous === undefined || acceptedAt < previous)
      times.set(problemId, acceptedAt);
  }
  return times;
}
