export function formatJapaneseDate(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  return `${year}年${month}月${day}日`;
}

export function formatPoints(points: number) {
  return points.toLocaleString("ja-JP");
}
