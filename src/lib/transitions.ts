class Transitions {
	transitions = new Map()

	tickInterval = undefined

	constructor(data, tickMs, sendFcn) {
		this.data = data
		this.tickMs = tickMs
		this.sendFcn = sendFcn
	}

	isRunning() {
		return this.transitions.size > 0
	}

	stopAll() {
		this.transitions.clear()

		if (this.tickInterval) {
			clearInterval(this.tickInterval)
			delete this.tickInterval
		}
	}

	runTick() {
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

	run(channel, to, duration) {
		const from = this.data[channel]
		// console.debug(`Run fade on "${channel}" from "${from}" to "${to}" over "${duration}"ms`)
		if (from === undefined) {
			// Not a valid channel, so ignore
			return
		}

		const stepCount = Math.ceil(duration / this.tickMs)

		if (stepCount <= 1) {
			// this.transitions.delete(channel)
			// this.data[channel] = to
			// Force a single step for the next tick
			this.transitions.set(channel, {
				steps: [to],
			})
		} else {
			const diff = to - from
			const steps = []
			const easing = (v) => v // aka Easing.Linear.None // TODO - dynamic
			for (let i = 1; i <= stepCount; i++) {
				const fraction = easing(i / stepCount)
				steps.push(from + diff * fraction)
			}

			this.transitions.set(channel, {
				steps,
			})
		}

		if (!this.tickInterval) {
			// Start the tick if not already running
			this.tickInterval = setInterval(() => this.runTick(), this.tickMs)
		}
	}
}

module.exports = {
	Transitions,
}
