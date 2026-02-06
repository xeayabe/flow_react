/**
 * Extract emoji from category name
 * Example: "🛒 Groceries" → { emoji: "🛒", name: "Groceries" }
 */
export function extractEmoji(text: string): { emoji: string; name: string } {
  if (!text) {
    return { emoji: '📊', name: 'Unknown' };
  }

  // Match emoji at start of string (handles multi-byte emojis)
  const emojiRegex = /^(\p{Emoji_Presentation}|\p{Emoji}\uFE0F)\s*/u;
  const match = text.match(emojiRegex);

  if (match) {
    return {
      emoji: match[0].trim(),
      name: text.slice(match[0].length).trim(),
    };
  }

  // No emoji found, return defaults
  return {
    emoji: '📊', // Default emoji
    name: text.trim(),
  };
}
