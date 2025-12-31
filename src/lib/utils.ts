/**
 * Calculates a multicast address based on a DMX universe number.
 *
 * @param {number} universe - The DMX universe number (1-63999).
 * @returns {string} The multicast address.
 */
export function calculateMulticastAddress(universe: number): string {
	if (universe < 1 || universe > 63999) {
		throw new Error('Universe must be between 1 and 63999')
	}

	const high = Math.floor(universe / 256)
	const low = universe % 256
	const address = `239.255.${high}.${low}`
	//console.log('calculateMulticastAddress U: ' + universe + ' IP: ' + address )
	return address
}

/**
 * Creates a boolean array representing a range specification.
 * @param {string} input - Range specification string (e.g., "1,3-5,7")
 * @param {number} length - Total length of the resulting boolean array
 * @returns {boolean[]} An array where true indicates inclusion in the specified ranges
 */
export function parseRange(input: string, length: number): boolean[] {
	let result = []
	if (input) {
		for (let i = 0; i < length; i++) {
			result[i] = false
		}

		const parts = input.split(',')
		parts.forEach((part) => {
			//console.log(part)
			if (Number(part)) {
				// single number
				;(result ??= [])[Number(part) - 1] = true
			} else {
				// some range <start>-<stop>
				const p = part.split('-')
				for (let i = Number(p[0]) - 1; i < Number(p[1]); i++) {
					;(result ??= [])[i] = true
				}
			}
		})
	}
	return result
}

/**
 * Converts a single 16-bit DMX value into two 8-bit values
 * @param value The 16-bit DMX value (0-65535)
 * @returns Array containing [MSB (Coarse), LSB (Fine)]
 */
export function conv_16bit_to_2_8bit(value: number): [number, number] {
	const clampedValue = Math.max(0, Math.min(65535, value))

	const MSB = Math.trunc(Math.floor(clampedValue / 256))
	const LSB = Math.trunc(clampedValue % 256)

	return [MSB, LSB]
}

/**
 * Combines two 8-bit DMX values into a single 16-bit value
 * @param MSB Coarse 8-bit value (0-255)
 * @param LSB Fine 8-bit value (0-255)
 * @returns Combined 8-bit value (0-255)
 */
export function conv_2x_8bit_to_16bit(MSB: number, LSB: number): number {
	const clampedHigh = Math.trunc(Math.max(0, Math.min(255, MSB)))
	const clampedLow = Math.trunc(Math.max(0, Math.min(255, LSB)))

	return clampedHigh * 256 + clampedLow
}
