/**
/**
 * Extracts the payee name from the unstructured remittance information string based on pattern detection.
 *
 * This function scans the `remittanceInformationUnstructured` string for the presence of
 * any of the specified patterns and removes the substring from the position of the last
 * occurrence of the most relevant pattern. If no patterns are found, it returns the original string.
 *
 * @param {string} [remittanceInformationUnstructured=''] - The unstructured remittance information from which to extract the payee name.
 * @param {string[]} [patterns=[]] - An array of patterns to look for within the remittance information.
 *                                   These patterns are used to identify and remove unwanted parts of the remittance information.
 * @returns {string} - The extracted payee name, cleaned of any matched patterns, or the original
 *                     remittance information if no patterns are found.
 *
 * @example
 * const remittanceInfo = 'John Doe Paiement Maestro par Carte de débit CBC 05-09-2024 à 15.43 heures 6703 19XX XXXX X...';
 * const patterns = ['Paiement', 'Domiciliation', 'Transfert', 'Ordre permanent'];
 * const payeeName = extractPayeeNameFromRemittanceInfo(remittanceInfo, patterns); // --> 'John Doe'
 */
export function extractPayeeNameFromRemittanceInfo(
  remittanceInformationUnstructured,
  patterns,
) {
  if (!remittanceInformationUnstructured || !patterns.length) {
    return remittanceInformationUnstructured;
  }

  const indexForRemoval = patterns.reduce((maxIndex, pattern) => {
    const index = remittanceInformationUnstructured.lastIndexOf(pattern);
    return index > maxIndex ? index : maxIndex;
  }, -1);

  return indexForRemoval > -1
    ? remittanceInformationUnstructured.substring(0, indexForRemoval).trim()
    : remittanceInformationUnstructured;
}
