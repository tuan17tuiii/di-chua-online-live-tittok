/**
 * MeritLeaderboard: Tracks donor merit points and ranks Top 5 / Top 10 realtime.
 */
export class MeritLeaderboard {
  constructor() {
    this.donors = new Map();
    this.currentTop = [];
  }

  /**
   * Record a donation and re-evaluate ranking.
   * @param {{ id: string, name: string, avatar: string }} user
   * @param {number} coins
   * @returns {{ isTopChange: boolean, newRank: number, totalCoins: number }}
   */
  recordDonation(user, coins) {
    if (!user || !user.id || !coins) {
      return { isTopChange: false, newRank: -1, totalCoins: 0 };
    }

    const previousTopIds = this.currentTop.slice(0, 10).map((d) => d.id);

    let existing = this.donors.get(user.id);
    if (!existing) {
      existing = {
        id: user.id,
        name: user.name,
        avatar: user.avatar,
        coins: 0
      };
      this.donors.set(user.id, existing);
    }

    // Always update name & avatar if provided
    if (user.name) existing.name = user.name;
    if (user.avatar) existing.avatar = user.avatar;
    existing.coins += coins;

    // Sort all donors descending by coins
    const sorted = Array.from(this.donors.values()).sort((a, b) => {
      if (b.coins !== a.coins) return b.coins - a.coins;
      return a.name.localeCompare(b.name);
    });

    const newTop = sorted.slice(0, 10).map((d, index) => ({
      ...d,
      rank: index + 1
    }));

    // Check if newTop changed compared to previousTopIds
    const newTopIds = newTop.map((d) => d.id);
    let isTopChange = false;
    if (previousTopIds.length !== newTopIds.length) {
      isTopChange = true;
    } else {
      for (let i = 0; i < newTopIds.length; i++) {
        if (newTopIds[i] !== previousTopIds[i]) {
          isTopChange = true;
          break;
        }
      }
    }

    this.currentTop = newTop;
    const rankIndex = sorted.findIndex((d) => d.id === user.id);
    const newRank = rankIndex !== -1 ? rankIndex + 1 : -1;

    return {
      isTopChange,
      newRank,
      totalCoins: existing.coins
    };
  }

  /**
   * Get top donors
   * @param {number} [limit=10]
   * @returns {Array<{ id: string, name: string, avatar: string, coins: number, rank: number }>}
   */
  getTop(limit = 10) {
    return this.currentTop.slice(0, limit);
  }

  /**
   * Get user's total coins
   * @param {string} userId
   * @returns {number}
   */
  getUserCoins(userId) {
    return this.donors.get(userId)?.coins || 0;
  }

  /**
   * Reset leaderboard for a new session.
   */
  reset() {
    this.donors.clear();
    this.currentTop = [];
  }
}

export default MeritLeaderboard;
