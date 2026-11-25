// ============================================================================
// QuietHoursHandler - keeps notifications inside the user's active hours
// ============================================================================
export class QuietHoursHandler {
  constructor(startHour, endHour) {
    this.startHour = startHour;
    this.endHour = endHour;
  }

  isWithinActiveHours(time) {
    const hour = time.getHours();
    return hour >= this.startHour && hour < this.endHour;
  }

  /**
   * Return `time` if it's within active hours, otherwise the start of the
   * next active window.
   */
  adjustTime(time) {
    const adjusted = new Date(time);
    if (this.isWithinActiveHours(adjusted)) return adjusted;

    if (adjusted.getHours() >= this.endHour) {
      adjusted.setDate(adjusted.getDate() + 1);
    }
    adjusted.setHours(this.startHour, 0, 0, 0);
    return adjusted;
  }
}
