export const queryKeys = {
  decks: () => ['decks'] as const,
  deck: (deckId: string) => ['deck', deckId] as const,
  deckCards: (deckId: string, page: number, limit: number) => ['deck-cards', deckId, page, limit] as const,
  card: (cardId: string) => ['card', cardId] as const,
  searchCards: (q: string, page: number, limit: number) => ['search-cards', q, page, limit] as const,
  // Defaults (static content)
  defaultDecks: (page: number, limit: number) => ['default-decks', page, limit] as const,
  defaultDeck: (deckId: string) => ['default-deck', deckId] as const,
  defaultDeckCards: (deckId: string, page: number, limit: number) => ['default-deck-cards', deckId, page, limit] as const,
};

