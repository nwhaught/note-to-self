// ============================================================================
// MessageSelector - weighted random selection of wisdom messages
// ============================================================================
const NEW_MESSAGE_BOOST = 1.5;
const DEFAULT_WEIGHT = 3;

export class MessageSelector {
  constructor(storageService, random = Math.random) {
    this.storage = storageService;
    this.random = random;
  }

  /**
   * Select `count` messages for upcoming notifications. Avoids repeating the
   * previous pick when there's more than one candidate, so the same note
   * doesn't arrive twice in a row.
   */
  async selectMessages(count, { avoidId = null } = {}) {
    const messages = await this.storage.getMessages();
    const candidates = this._calculateWeights(messages.filter(m => !m.isNagMe));
    if (candidates.length === 0) return [];

    const picks = [];
    let previousId = avoidId;
    for (let i = 0; i < count; i++) {
      const pool =
        candidates.length > 1 ? candidates.filter(m => m.id !== previousId) : candidates;
      const pick = this._weightedRandomSelection(pool);
      picks.push(pick);
      previousId = pick.id;
    }
    return picks;
  }

  async selectMessage() {
    const [message] = await this.selectMessages(1);
    return message || null;
  }

  _calculateWeights(messages) {
    return messages.map(msg => {
      let weight = msg.weight || DEFAULT_WEIGHT;
      if (weight === DEFAULT_WEIGHT && this.storage.isMessageNew(msg)) {
        weight *= NEW_MESSAGE_BOOST;
      }
      return { ...msg, effectiveWeight: weight };
    });
  }

  _weightedRandomSelection(weighted) {
    const total = weighted.reduce((sum, m) => sum + m.effectiveWeight, 0);
    let r = this.random() * total;
    for (const msg of weighted) {
      r -= msg.effectiveWeight;
      if (r <= 0) return msg;
    }
    return weighted[weighted.length - 1];
  }
}
