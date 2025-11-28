import { conv_16bit_to_2_8bit, conv_2x_8bit_to_16bit } from './utils.js'

class Transitions {
	transitions = new Map()

	tickInterval: NodeJS.Timeout | undefined = undefined
	data: number[]
	tickMs: number
	sendFcn: () => void

	constructor(data: number[], tickMs: number, sendFcn: () => void) {
		this.data = data
		this.tickMs = tickMs
		this.sendFcn = sendFcn
	}

	isRunning(): boolean {
		return this.transitions.size > 0
	}

	stopAll(): void {
		this.transitions.clear()

		if (this.tickInterval) {
			clearInterval(this.tickInterval)
			delete this.tickInterval
		}
	}

	runTick(): void {
		const completedChannels = []
		for (const [channel, info] of this.transitions.entries()) {
			const newValue = info.steps.shift()
			if (newValue !== undefined) {
				this.data[channel] = newValue
			}
			if (info.steps.length === 0) {
				completedChannels.push(channel)
			}
		}

		// Remove any completed transitions
		for (const path of completedChannels) {
			this.transitions.delete(path)
		}
		// If nothing is left, stop the timer
		if (this.transitions.size === 0) {
			this.stopAll()
		}

		this.sendFcn()
	}

	easing(t: number): number {
		// aka Easing.Linear.None // TODO - dynamic
		return t
	}

	run(channel: number, to: number, duration: number): void {
		const chan = channel - 1
		const from = this.data[chan]
		to = Math.min(255, Math.max(0, to))
		//console.debug(`Run fade on ${channel+1} from ${from} to ${to} over ${duration}ms`)
		if (from === undefined) {
			return // Not a valid channel, so ignore
		}

		const stepCount = Math.ceil((duration || 0) / this.tickMs)
		if (stepCount <= 1) {
			this.transitions.set(chan, {
				steps: [to],
			})
		} else {
			const diff = to - from
			const steps = []

			for (let i = 1; i <= stepCount; i++) {
				const fraction = this.easing(i / stepCount)
				steps.push(from + diff * fraction)
			}
			this.transitions.set(chan, {
				steps,
			})
		}

		if (!this.tickInterval) {
			this.tickInterval = setInterval(() => this.runTick(), this.tickMs)
		}
	}

	run16(channel: number, to: number, duration: number = 1000): void {
		const chanMSB = channel - 1
		const chanLSB = channel

		const currentMSB = this.data[chanMSB]
		const currentLSB = this.data[chanLSB]
		const from = conv_2x_8bit_to_16bit(currentMSB, currentLSB)
		to = Math.min(65535, Math.max(0, to))

		if (currentMSB === undefined || currentLSB === undefined) {
			return
		}

		const [targetMSB, targetLSB] = conv_16bit_to_2_8bit(to)

		const stepCount = Math.ceil((duration || 0) / this.tickMs)

		//console.debug(`Run 16-bit fade on ${chanMSB + 1} + ${chanLSB + 1} from ${from} to ${to} over ${duration}ms stepcount ${stepCount}`,)
		// Handle immediate transitions
		if (stepCount <= 1) {
			this.transitions.set(chanMSB, { steps: [targetMSB] })
			this.transitions.set(chanLSB, { steps: [targetLSB] })
			return
		} else {
			const diff = to - from

			const msbSteps: number[] = []
			const lsbSteps: number[] = []

			for (let i = 1; i <= stepCount; i++) {
				const fraction = this.easing(i / stepCount)

				const [newMSB, newLSB] = conv_16bit_to_2_8bit(from + diff * fraction)
				//console.log(`newMSB: ${newMSB}\t\t ${newLSB}`)
				msbSteps.push(newMSB)
				lsbSteps.push(newLSB)
			}

			this.transitions.set(chanMSB, { steps: msbSteps })
			this.transitions.set(chanLSB, { steps: lsbSteps })
		}
		// Initialize interval if needed
		if (!this.tickInterval) {
			this.tickInterval = setInterval(() => this.runTick(), this.tickMs)
		}
	}
}

export { Transitions }
