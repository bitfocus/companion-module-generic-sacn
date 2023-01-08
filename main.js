const sacnServer = require('./lib/server.js').server
const { InstanceBase, InstanceStatus, runEntrypoint } = require('@companion-module/base')
const { v4: uuidv4 } = require('uuid')
const { getActionDefinitions } = require('./actions.js')
const { getConfigFields } = require('./config.js')

class SAcnInstance extends InstanceBase {
	async init(config) {
		this.config = config

		this.setActionDefinitions(getActionDefinitions(this))

		await this.configUpdated(config)
	}

	async configUpdated(config) {
		this.config = config

		this.init_sacn()
	}

	// When module gets deleted
	async destroy() {
		this.terminate()
	}

	// Return config fields for web config
	getConfigFields() {
		return getConfigFields(this.id)
	}

	keepAlive() {
		if (this.server && this.packet) {
			this.packet.setOption(this.packet.Options.TERMINATED, false)
			this.server.send(this.packet)
		}
	}
	terminate() {
		if (this.server && this.packet) {
			this.packet.setOption(this.packet.Options.TERMINATED, true)
			this.server.send(this.packet)
		}

		delete this.server
		delete this.packet
		delete this.data

		if (this.timer) {
			clearInterval(this.timer)
			delete this.timer
		}
	}
	fade(steps, delay, offset, targets) {
		if (steps) {
			this.server.send(this.packet)
			for (i = 0; i < targets.length; i++) {
				let delta = targets[i + offset] - this.data[i + offset]
				this.data[i + offset] += Math.round(delta / steps) & 0xff
			}
			setTimeout(() => {
				this.fade(--steps, delay, offset, targets)
			}, delay)
		} else {
			for (i = 0; i < targets.length; i++) {
				this.data[i + offset] = targets[i + offset]
			}
			this.keepAlive()
		}
	}

	init_sacn() {
		this.terminate()

		if (this.config.host) {
			this.server = new sacnServer(this.config.host)
			this.packet = this.server.createPacket(512)
			this.data = this.packet.getSlots()

			this.packet.setSourceName(this.config.name || 'Companion App')
			this.packet.setUUID(this.config.uuid || uuidv4())
			this.packet.setUniverse(this.config.universe || 0x01)
			this.packet.setPriority(this.config.priority)
			this.packet.setOption(this.packet.Options.TERMINATED, true)

			for (let i = 0; i < this.data.length; i++) {
				this.data[i] = 0x00
			}

			this.timer = setInterval(() => {
				if (this.server && this.packet) {
					this.server.send(this.packet)
				}
			}, 1000)

			this.updateStatus(InstanceStatus.Ok)
		} else {
			this.updateStatus(InstanceStatus.BadConfig, 'Missing host')
		}
	}
}

runEntrypoint(SAcnInstance, [])
