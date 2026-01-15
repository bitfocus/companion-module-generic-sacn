import { Buffer } from 'node:buffer'

interface SourceData {
	name: string
	uuid: string
	portPriority: number // Per-port (universe) priority from 0x00 packet
	addressPriorities: Buffer // Per-address priorities from 0xdd packet (if supported)
	lastPacketTime: number
	slots: Buffer // DMX slot values from 0x00 packet
	lastPriorityPacketTime: number // Timestamp of last 0xdd packet
	fps: number
	perAdressPriority: boolean
}

export class SourceManager {
	private sources: Map<string, SourceData> = new Map()
	private mergedSlots: Buffer
	private sourceTimeout: number

	constructor(numSlots: number = 512, sourceTimeout: number = 100) {
		this.mergedSlots = Buffer.alloc(numSlots, 0)
		this.sourceTimeout = sourceTimeout
	}

	updateSource(
		uuid: string,
		name: string,
		portPriority: number, // Priority from 0x00 packet
		slots: Buffer, // DMX data from 0x00 packet
		timestamp: number,
		addressPriorities?: Buffer, // Optional 0xdd packet priorities
		perAdressPriority?: boolean, // Optional Source uses per adress priority
	): void {
		let sourceData = this.sources.get(uuid)

		if (!sourceData) {
			sourceData = {
				name,
				uuid,
				portPriority,
				addressPriorities: Buffer.alloc(slots.length, portPriority),
				lastPacketTime: timestamp,
				lastPriorityPacketTime: 0,
				slots: Buffer.alloc(slots.length),
				fps: 0,
				perAdressPriority: false,
			}
			this.sources.set(uuid, sourceData)
		} else {
			// Calculate FPS based on last packet time before updating it
			sourceData.fps = this.calculateFPS(sourceData.lastPacketTime, timestamp)
		}

		// Always update name and lastPacketTime
		sourceData.name = name
		sourceData.lastPacketTime = timestamp
		if (typeof perAdressPriority === 'boolean' && !sourceData.perAdressPriority) {
			sourceData.perAdressPriority = perAdressPriority
		}

		// If this is a per-address priority packet (0xdd), upgrade mode and update priorities
		// If this is a per-address priority packet (0xdd), update per-address priorities
		if (addressPriorities && addressPriorities.length > 0) {
			sourceData.addressPriorities = Buffer.from(addressPriorities)
			sourceData.lastPriorityPacketTime = timestamp
			//console.log(`${JSON.stringify(sourceData.addressPriorities)}`)
		}

		// If this is a DMX data packet (0x00), update slots and portPriority
		if (slots && slots.length > 0) {
			sourceData.slots = Buffer.from(slots)
			sourceData.portPriority = portPriority
			// Ensure per-address priorities exist: initialize from portPriority if missing or size mismatch
			if (!sourceData.addressPriorities || sourceData.addressPriorities.length !== sourceData.slots.length) {
				sourceData.addressPriorities = Buffer.alloc(sourceData.slots.length, portPriority)
			}
		}

		this.sources.set(uuid, sourceData)
		this.updateMergedOutput()
	}

	private calculateFPS(lastTime: number, currentTime: number): number {
		const timeDiff = currentTime - lastTime
		if (timeDiff <= 0) return 0

		const fps = 1000 / timeDiff
		// Cap FPS at reasonable values (1-100 Hz) and round to nearest integer
		return Math.round(Math.min(Math.max(fps, 1), 100))
	}

	private updateMergedOutput(): void {
		// Reset merged output
		this.mergedSlots.fill(0)

		// For each slot, find all sources with the highest priority
		for (let i = 0; i < this.mergedSlots.length; i++) {
			let highestPriority = -1
			let valuesAtHighest: number[] = []

			for (const source of this.sources.values()) {
				const effectivePriority = source.addressPriorities[i]
				if (effectivePriority > highestPriority) {
					highestPriority = effectivePriority
					valuesAtHighest = [source.slots[i]]
				} else if (effectivePriority === highestPriority) {
					valuesAtHighest.push(source.slots[i])
				}
			}

			// If multiple sources share the highest, use HTP (max)
			this.mergedSlots[i] = valuesAtHighest.length > 0 ? Math.max(...valuesAtHighest) : 0
		}
	}

	getMergedOutput(): Buffer {
		return Buffer.from(this.mergedSlots)
	}

	removeStaleSourcesAndUpdate(currentTime: number): string[] {
		const removedSources: string[] = []

		for (const [uuid, source] of this.sources.entries()) {
			if (currentTime - source.lastPacketTime > this.sourceTimeout) {
				this.sources.delete(uuid)
				removedSources.push(uuid)
			}
		}

		if (removedSources.length > 0) {
			this.updateMergedOutput()
		}

		return removedSources
	}

	getActiveSources(): { name: string; uuid: string; priority: number; fps: number }[] {
		return Array.from(this.sources.values()).map((source) => ({
			name: source.name,
			uuid: source.uuid,
			priority: source.portPriority, // Use port priority for backwards compatibility
			fps: source.fps,
			perAdressPriority: source.perAdressPriority,
		}))
	}

	getSourceCount(): number {
		return this.sources.size
	}
}
