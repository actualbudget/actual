/**
 * Core date utilities supporting both calendar months (MM 01-12) and pay periods (MM 13-99).
 * Uses YYYYMM string identifiers. Pay period behavior depends on a configuration object.
 * All functions are pure and do not mutate inputs. Uses only built-in Date APIs (UTC based).
 */

/**
 * Parse an ISO date (yyyy-mm-dd) to a UTC Date at 00:00:00.
 * @param {string} iso
 * @returns {Date}
 */
function parseISODateUTC(iso) {
	const m = /^([0-9]{4})-([0-9]{2})-([0-9]{2})$/.exec(String(iso));
	if (!m) return new Date(NaN);
	const y = Number(m[1]);
	const mo = Number(m[2]);
	const d = Number(m[3]);
	return new Date(Date.UTC(y, mo - 1, d));
}

/**
 * Add a number of days to a UTC date, returning a new Date.
 * @param {Date} date
 * @param {number} days
 * @returns {Date}
 */
function addDaysUTC(date, days) {
	const copy = new Date(date.getTime());
	copy.setUTCDate(copy.getUTCDate() + days);
	return copy;
}

/**
 * Add a number of months to a UTC date, returning a new Date at start of the resulting month.
 * @param {Date} date
 * @param {number} months
 * @returns {Date}
 */
function addMonthsUTC(date, months) {
	const y = date.getUTCFullYear();
	const m = date.getUTCMonth();
	return new Date(Date.UTC(y, m + months, 1));
}

/**
 * Start of month in UTC
 * @param {Date} date
 * @returns {Date}
 */
function startOfMonthUTC(date) {
	return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

/**
 * End of month in UTC (at 00:00:00 of the last day)
 * @param {Date} date
 * @returns {Date}
 */
function endOfMonthUTC(date) {
	return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0));
}

/**
 * Format month label like "January 2024" using en-US locale.
 * @param {Date} date
 * @returns {string}
 */
function formatMonthYear(date) {
	return new Intl.DateTimeFormat('en-US', {
		month: 'long',
		year: 'numeric',
		timeZone: 'UTC',
	}).format(date);
}

/** @typedef {Object} PayPeriodConfig
 *  @property {boolean} enabled
 *  @property {('weekly'|'biweekly'|'semimonthly'|'monthly')} payFrequency
 *  @property {string} startDate ISO date string marking the first period start for the plan year
 *  @property {number} [payDayOfWeek] 0-6 (Sun-Sat) for weekly/biweekly
 *  @property {number} [payDayOfMonth] 1-31 for monthly
 *  @property {number} yearStart Plan year start, e.g., 2024
 */

/**
 * Extract month (MM) integer from YYYYMM string.
 * @param {string} monthId
 * @returns {number}
 */
export function getMonthNumber(monthId) {
	if (typeof monthId !== 'string' || monthId.length !== 6) {
		throw new Error(`Invalid monthId '${monthId}'. Expected YYYYMM string.`);
	}
	const mm = Number(monthId.slice(4));
	if (!Number.isInteger(mm) || mm < 1 || mm > 99) {
		throw new Error(`Invalid MM in monthId '${monthId}'. MM must be 01-99.`);
	}
	return mm;
}

/**
 * Extract year (YYYY) integer from YYYYMM string.
 * @param {string} monthId
 * @returns {number}
 */
export function getYearNumber(monthId) {
	const yyyy = Number(monthId.slice(0, 4));
	if (!Number.isInteger(yyyy) || yyyy < 1) {
		throw new Error(`Invalid YYYY in monthId '${monthId}'.`);
	}
	return yyyy;
}

/**
 * Determine if the monthId refers to a calendar month (01-12).
 * @param {string} monthId
 * @returns {boolean}
 */
export function isCalendarMonth(monthId) {
	const mm = getMonthNumber(monthId);
	return mm >= 1 && mm <= 12;
}

/**
 * Determine if the monthId refers to a pay period bucket (13-99).
 * @param {string} monthId
 * @returns {boolean}
 */
export function isPayPeriod(monthId) {
	const mm = getMonthNumber(monthId);
	return mm >= 13 && mm <= 99;
}

/**
 * Validate pay period config object shape minimally.
 * @param {PayPeriodConfig|undefined|null} config
 */
export function validatePayPeriodConfig(config) {
	if (!config || config.enabled !== true) return;
	const { payFrequency, startDate, yearStart } = config;
	const validFreq = ['weekly', 'biweekly', 'semimonthly', 'monthly'];
	if (!validFreq.includes(payFrequency)) {
		throw new Error(`Invalid payFrequency '${payFrequency}'.`);
	}
	const start = parseISODateUTC(startDate);
	if (Number.isNaN(start.getTime())) {
		throw new Error(`Invalid startDate '${startDate}'. Expected ISO date.`);
	}
	if (!Number.isInteger(yearStart) || yearStart < 1) {
		throw new Error(`Invalid yearStart '${yearStart}'.`);
	}
}

/**
 * Convert calendar month YYYYMM to start Date.
 * @param {string} monthId
 * @returns {Date}
 */
export function getCalendarMonthStartDate(monthId) {
	const year = getYearNumber(monthId);
	const mm = getMonthNumber(monthId);
	const start = new Date(Date.UTC(year, mm - 1, 1));
	return start;
}

/**
 * Convert calendar month YYYYMM to end Date.
 * @param {string} monthId
 * @returns {Date}
 */
export function getCalendarMonthEndDate(monthId) {
	const year = getYearNumber(monthId);
	const mm = getMonthNumber(monthId);
	const end = new Date(Date.UTC(year, mm, 0));
	return end;
}

/**
 * Get label for calendar month, e.g., "January 2024".
 * @param {string} monthId
 * @returns {string}
 */
export function getCalendarMonthLabel(monthId) {
	const start = getCalendarMonthStartDate(monthId);
	return formatMonthYear(start);
}

/**
 * Resolve pay period N for a given monthId (YYYY[13-99]) relative to config.yearStart.
 * For simplicity, interpret MM as sequential index starting at 13 => period 1, 14 => period 2, etc., within that year.
 * @param {string} monthId
 * @param {PayPeriodConfig} config
 * @returns {number} 1-based period index within plan year
 */
export function getPeriodIndex(monthId, config) {
	const year = getYearNumber(monthId);
	if (year !== config.yearStart) {
		// For PoC we scope to single plan year. Could extend to multi-year later.
		throw new Error(`monthId '${monthId}' year ${year} does not match plan yearStart ${config.yearStart}.`);
	}
	const mm = getMonthNumber(monthId);
	if (mm < 13 || mm > 99) {
		throw new Error(`monthId '${monthId}' is not a pay period bucket.`);
	}
	return mm - 12; // 13 -> 1
}

/**
 * Compute start and end dates for a specific pay period index.
 * @param {number} periodIndex 1-based index within the plan year
 * @param {PayPeriodConfig} config
 * @returns {{ startDate: Date, endDate: Date, label: string }}
 */
export function computePayPeriodByIndex(periodIndex, config) {
	validatePayPeriodConfig(config);
	if (!config || !config.enabled) {
		throw new Error('Pay period config disabled or missing for pay period calculations.');
	}
	if (!Number.isInteger(periodIndex) || periodIndex < 1) {
		throw new Error(`Invalid periodIndex '${periodIndex}'.`);
	}
	const baseStart = parseISODateUTC(config.startDate);
	const freq = config.payFrequency;
	let startDate = baseStart;
	let endDate;
	let label;

	if (freq === 'weekly') {
		startDate = addDaysUTC(baseStart, (periodIndex - 1) * 7);
		endDate = addDaysUTC(startDate, 6);
		label = `Pay Period ${periodIndex}`;
	} else if (freq === 'biweekly') {
		startDate = addDaysUTC(baseStart, (periodIndex - 1) * 14);
		endDate = addDaysUTC(startDate, 13);
		label = `Pay Period ${periodIndex}`;
	} else if (freq === 'monthly') {
		// Monthly: periodIndex-th month of the plan year, starting at plan year start (January)
		const planYearStartDate = new Date(Date.UTC(config.yearStart, 0, 1));
		const anchorMonthStart = startOfMonthUTC(planYearStartDate);
		startDate = startOfMonthUTC(addMonthsUTC(anchorMonthStart, periodIndex - 1));
		endDate = endOfMonthUTC(startDate);
		label = `Month ${periodIndex}`;
	} else if (freq === 'semimonthly') {
		// Semimonthly: 24 periods per year; assume 1st-15th, 16th-end
		const planYearStartDate = new Date(Date.UTC(config.yearStart, 0, 1));
		const monthOffset = Math.floor((periodIndex - 1) / 2);
		const firstHalf = ((periodIndex - 1) % 2) === 0;
		const monthStart = startOfMonthUTC(addMonthsUTC(planYearStartDate, monthOffset));
		if (firstHalf) {
			startDate = monthStart;
			endDate = addDaysUTC(monthStart, 14);
		} else {
			const mid = addDaysUTC(monthStart, 15);
			const end = endOfMonthUTC(monthStart);
			startDate = mid;
			endDate = end;
		}
		label = `Pay Period ${periodIndex}`;
	} else {
		throw new Error(`Unsupported payFrequency '${freq}'.`);
	}

	return { startDate, endDate, label };
}

/**
 * Get start Date for any YYYYMM identifier, supporting pay periods 13-99.
 * @param {string} monthId
 * @param {PayPeriodConfig} [config]
 * @returns {Date}
 */
export function getMonthStartDate(monthId, config) {
	if (isCalendarMonth(monthId)) {
		return getCalendarMonthStartDate(monthId);
	}
	if (!config || !config.enabled) {
		throw new Error(`Pay period requested for '${monthId}' but config is missing/disabled.`);
	}
	const index = getPeriodIndex(monthId, config);
	return computePayPeriodByIndex(index, config).startDate;
}

/**
 * Get end Date for any YYYYMM identifier, supporting pay periods 13-99.
 * @param {string} monthId
 * @param {PayPeriodConfig} [config]
 * @returns {Date}
 */
export function getMonthEndDate(monthId, config) {
	if (isCalendarMonth(monthId)) {
		return getCalendarMonthEndDate(monthId);
	}
	if (!config || !config.enabled) {
		throw new Error(`Pay period requested for '${monthId}' but config is missing/disabled.`);
	}
	const index = getPeriodIndex(monthId, config);
	return computePayPeriodByIndex(index, config).endDate;
}

/**
 * Get label for any YYYYMM identifier.
 * @param {string} monthId
 * @param {PayPeriodConfig} [config]
 * @returns {string}
 */
export function getMonthLabel(monthId, config) {
	if (isCalendarMonth(monthId)) {
		return getCalendarMonthLabel(monthId);
	}
	if (!config || !config.enabled) {
		return `Period ${getMonthNumber(monthId) - 12}`;
	}
	const index = getPeriodIndex(monthId, config);
	return computePayPeriodByIndex(index, config).label;
}

/**
 * Convert a monthId into a { startDate, endDate, label } object for easier consumption.
 * @param {string} monthId
 * @param {PayPeriodConfig} [config]
 * @returns {{ startDate: Date, endDate: Date, label: string }}
 */
export function resolveMonthRange(monthId, config) {
	if (isCalendarMonth(monthId)) {
		return {
			startDate: getCalendarMonthStartDate(monthId),
			endDate: getCalendarMonthEndDate(monthId),
			label: getCalendarMonthLabel(monthId),
		};
	}
	const index = getPeriodIndex(monthId, config);
	const { startDate, endDate, label } = computePayPeriodByIndex(index, config);
	return { startDate, endDate, label };
}
