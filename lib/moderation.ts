export const blockedWords = [
  "fuck",
  "fucking",
  "bitch",
  "shit",
  "asshole"
];

export function containsProfanity(text: string) {
  const lowerText = text.toLowerCase();

  return blockedWords.some((word) => { const pattern = new RegExp(`\\b${word}\\b`, "i");
    return pattern.test(lowerText);
  });
}