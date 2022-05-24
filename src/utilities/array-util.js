/** Sort an array of objects by key in descending order.
 * @param {Array} arr - The array you want to sort.
 * @param {string} key - The key you want to sort by.
*/
export function sortByKey (arr, key) {
  return arr.sort((a, b) => (a[key] > b[key]) ? 1 : ((a[key] < b[key]) ? -1 : 0))
}
