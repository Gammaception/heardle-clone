<script>
  import { createEventDispatcher } from 'svelte';
  import { getGameResultByDate } from '$lib/gameHistory.js';

  const dispatch = createEventDispatcher();

  // Game started on January 1, 2026
  const START_DATE = new Date(2026, 0, 1); // Month is 0-indexed
  const TODAY = new Date();
  TODAY.setHours(0, 0, 0, 0);

  let currentMonth = $state(TODAY.getMonth());
  let currentYear = $state(TODAY.getFullYear());
  /** @type {string | null} */
  let selectedDate = $state(null);
  let loading = $state(false);
  /** @type {string | null} */
  let error = $state(null);

  /**
   * Get the number of days in a given month/year
   * @param {number} month
   * @param {number} year
   */
  function getDaysInMonth(month, year) {
    return new Date(year, month + 1, 0).getDate();
  }

  /**
   * Get the day of the week for the first day of the month (0=Sun, 1=Mon, etc.)
   * @param {number} month
   * @param {number} year
   */
  function getFirstDayOfMonth(month, year) {
    return new Date(year, month, 1).getDay();
  }

  /**
   * Check if a given date is available (on or after START_DATE and not in the future)
   * @param {number} day
   * @param {number} month
   * @param {number} year
   */
  function isDateAvailable(day, month, year) {
    const date = new Date(year, month, day);
    return date >= START_DATE && date <= TODAY;
  }

  /**
   * Get ISO date string for a given day
   * @param {number} day
   * @param {number} month
   * @param {number} year
   */
  function getDateStr(day, month, year) {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  /**
   * Get the game result status for a given date
   * @param {string} dateStr
   * @returns {'won' | 'lost' | 'none'}
   */
  function getGameStatus(dateStr) {
    const result = getGameResultByDate(dateStr);
    if (!result) return 'none';
    return result.won ? 'won' : 'lost';
  }

  /**
   * Check if a date is today
   * @param {number} day
   * @param {number} month
   * @param {number} year
   */
  function isToday(day, month, year) {
    return day === TODAY.getDate() && month === TODAY.getMonth() && year === TODAY.getFullYear();
  }

  /**
   * Navigate to previous month
   */
  function prevMonth() {
    if (currentMonth === 0) {
      currentMonth = 11;
      currentYear--;
    } else {
      currentMonth--;
    }
  }

  /**
   * Navigate to next month (only if not future)
   */
  function nextMonth() {
    const nextDate = new Date(currentYear, currentMonth + 1, 1);
    if (nextDate.getMonth() > TODAY.getMonth() ||
        (nextDate.getMonth() === TODAY.getMonth() && nextDate.getFullYear() > TODAY.getFullYear())) {
      return; // Don't allow navigating to future months
    }
    if (currentMonth === 11) {
      currentMonth = 0;
      currentYear++;
    } else {
      currentMonth++;
    }
  }

  /**
   * Select a date and load the daily puzzle for that date
   * @param {number} day
   */
  async function selectDate(day) {
    if (!isDateAvailable(day, currentMonth, currentYear)) return;

    const dateStr = getDateStr(day, currentMonth, currentYear);
    selectedDate = dateStr;
    loading = true;
    error = null;

    try {
      const response = await fetch(`/api/daily?date=${dateStr}`);
      if (!response.ok) {
        throw new Error('Failed to load daily puzzle');
      }
      const data = await response.json();
      dispatch('dailySelected', { date: dateStr, artist: data.artist });
    } catch (err) {
      error = 'Could not load puzzle for this date';
    } finally {
      loading = false;
    }
  }

  /**
   * Get month name
   * @param {number} month
   */
  function getMonthName(month) {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months[month];
  }

  // Calendar grid setup
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const daysInMonth = getDaysInMonth(currentMonth, currentYear);
  const firstDay = getFirstDayOfMonth(currentMonth, currentYear);

  // Generate calendar grid
  let calendarDays = [];
  for (let i = 0; i < firstDay; i++) {
    calendarDays.push(null); // Empty cells before first day
  }
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(day);
  }

  // Split into weeks (rows of 7)
  let weeks = [];
  for (let i = 0; i < calendarDays.length; i += 7) {
    weeks.push(calendarDays.slice(i, i + 7));
  }
</script>

<div class="calendar-container">
  <div class="calendar-header">
    <button class="nav-btn" onclick={prevMonth} disabled={currentMonth === 0 && currentYear === 2026}>
      ←
    </button>
    <h2 class="month-year">{getMonthName(currentMonth)} {currentYear}</h2>
    <button class="nav-btn" onclick={nextMonth} disabled={isToday(1, currentMonth, currentYear) || (currentMonth === TODAY.getMonth() && currentYear === TODAY.getFullYear())}>
      →
    </button>
  </div>

  {#if loading}
    <div class="loading">Loading...</div>
  {/if}

  {#if error}
    <p class="error">{error}</p>
  {/if}

  <div class="calendar-grid">
    <div class="day-names">
      {#each dayNames as day}
        <div class="day-name">{day}</div>
      {/each}
    </div>

    <div class="weeks">
      {#each weeks as week}
        <div class="week">
          {#each week as day}
            {#if day === null}
              <div class="day empty"></div>
            {:else}
              {#if isDateAvailable(day, currentMonth, currentYear)}
                <button
                  class="day available"
                  class:today={isToday(day, currentMonth, currentYear)}
                  class:selected={selectedDate === getDateStr(day, currentMonth, currentYear)}
                  class:won={getGameStatus(getDateStr(day, currentMonth, currentYear)) === 'won'}
                  class:lost={getGameStatus(getDateStr(day, currentMonth, currentYear)) === 'lost'}
                  onclick={() => selectDate(day)}
                >
                  {day}{getGameStatus(getDateStr(day, currentMonth, currentYear)) === 'won' ? '✓' : getGameStatus(getDateStr(day, currentMonth, currentYear)) === 'lost' ? '✗' : ''}
                </button>
              {:else}
                <div class="day unavailable">{day}</div>
              {/if}
            {/if}
          {/each}
        </div>
      {/each}
    </div>
  </div>

  <p class="hint">Select a date to play that day's puzzle</p>
</div>

<style>
.calendar-container {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 1.5rem;
  max-width: 400px;
  margin: 1rem auto;
}

.calendar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.month-year {
  font-size: 1.1rem;
  font-weight: 600;
  color: #fff;
  margin: 0;
}

.nav-btn {
  background: rgba(255, 255, 255, 0.1);
  border: none;
  color: #fff;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  cursor: pointer;
  font-size: 1rem;
  transition: background 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.nav-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.2);
}

.nav-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.calendar-grid {
  margin-top: 1rem;
}

.day-names {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
  margin-bottom: 0.5rem;
}

.day-name {
  text-align: center;
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.5);
  font-weight: 600;
  text-transform: uppercase;
}

.weeks {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.week {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
}

.day {
  aspect-ratio: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  font-size: 0.9rem;
  min-height: 36px;
}

.day.empty {
  visibility: hidden;
}

.day.available {
  background: rgba(255, 255, 255, 0.1);
  border: none;
  color: #fff;
  cursor: pointer;
  transition: background 0.2s, transform 0.1s;
  font-weight: 500;
}

.day.available:hover {
  background: rgba(247, 151, 30, 0.3);
  transform: scale(1.05);
}

.day.today {
  background: linear-gradient(135deg, #f7971e, #ffd200);
  color: #000;
  font-weight: 700;
}

.day.selected {
  background: rgba(247, 151, 30, 0.5);
  box-shadow: 0 0 0 2px #f7971e;
}

.day.unavailable {
  color: rgba(255, 255, 255, 0.2);
  cursor: default;
}

.day.won {
  background: linear-gradient(135deg, #2ecc71, #27ae60) !important;
  color: #fff;
  font-weight: 700;
}

.day.lost {
  background: linear-gradient(135deg, #e74c3c, #c0392b) !important;
  color: #fff;
  font-weight: 700;
}

.loading {
  text-align: center;
  padding: 1rem;
  color: rgba(255, 255, 255, 0.7);
}

.error {
  color: #ff6b6b;
  text-align: center;
  font-size: 0.85rem;
  margin: 0.5rem 0;
}

.hint {
  text-align: center;
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.5);
  margin-top: 1rem;
  margin-bottom: 0;
}
</style>
