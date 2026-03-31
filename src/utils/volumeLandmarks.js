/**
 * Volume Landmarks par groupe musculaire — basés sur les recommandations RP (Renaissance Periodization)
 * MEV = Minimum Effective Volume (sets/semaine)
 * MAV = Maximum Adaptive Volume (plage optimale)
 * MRV = Maximum Recoverable Volume (seuil de surentraînement)
 */

const LANDMARKS = {
  CHEST: { mev: 10, mavLow: 12, mavHigh: 20, mrv: 22 },
  BACK: { mev: 10, mavLow: 14, mavHigh: 22, mrv: 25 },
  UPPER_LEGS: { mev: 6, mavLow: 12, mavHigh: 18, mrv: 20 },
  LOWER_LEGS: { mev: 6, mavLow: 8, mavHigh: 16, mrv: 18 },
  SHOULDERS: { mev: 8, mavLow: 16, mavHigh: 22, mrv: 26 },
  UPPER_ARMS: { mev: 6, mavLow: 10, mavHigh: 18, mrv: 20 },
  LOWER_ARMS: { mev: 4, mavLow: 8, mavHigh: 14, mrv: 16 },
  WAIST: { mev: 4, mavLow: 8, mavHigh: 16, mrv: 20 },
};

/**
 * Détermine la zone de volume par rapport aux landmarks.
 * @param {number} weeklyAvgSets
 * @param {{ mev, mavLow, mavHigh, mrv }} landmarks
 * @returns {'below_mev' | 'mev_to_mav' | 'mav' | 'mav_to_mrv' | 'above_mrv'}
 */
export function getZone(weeklyAvgSets, landmarks) {
  return getVolumeZone(weeklyAvgSets, landmarks);
}

export function getVolumeZone(weeklyAvgSets, landmarks) {
  const { mev, mavLow, mavHigh, mrv } = landmarks;
  if (weeklyAvgSets < mev) return 'below_mev';
  if (weeklyAvgSets < mavLow) return 'mev_to_mav';
  if (weeklyAvgSets <= mavHigh) return 'mav';
  if (weeklyAvgSets <= mrv) return 'mav_to_mrv';
  return 'above_mrv';
}

/**
 * Retourne les landmarks pour un groupe musculaire donné.
 * @param {string} bodyPart - ex: 'CHEST', 'BACK', 'UPPER_LEGS'
 * @returns {{ mev, mavLow, mavHigh, mrv } | null}
 */
export function getLandmarks(bodyPart) {
  return LANDMARKS[bodyPart] || null;
}

export const volumeLandmarks = { getLandmarks, getVolumeZone, getZone, LANDMARKS };
