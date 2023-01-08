var sacnServer = require('./lib/server.js').server
const { InstanceBase } = require('@companion-module/base')
const { v4: uuidv4 } = require('uuid')
const { getActionDefinitions } = require('./actions.js')
const { getConfigFields } = require('./config.js')

class SAcnInstance extends InstanceBase {
	async init() {
		this.setActionDefinitions(getActionDefinitions(this))

		this.init_sacn()
	}

	async updateConfig(config) {
		this.config = config

		this.init_sacn()
	}

	keepAlive() {
		if (this.server && this.packet) {
			this.packet.setOption(this.packet.Options.TERMINATED, false)
			this.server.send(this.packet)
		}
		if (this.server && !this.timer) {
			this.timer = setInterval(() => {
				if (this.server !== undefined) {
					this.server.send(this.packet)
				}
			}, 1000)
		}
	}
	terminate() {
		if (this.server !== undefined) {
			this.packet.setOption(this.packet.Options.TERMINATED, true)
			this.server.send(this.packet)
		}

		if (this.timer) {
			clearInterval(this.timer)
			delete this.timer
		}
	}
	fade(steps, delay, offset, targets) {
		if (steps) {
			this.server.send(this.packet)
			for (i = 0; i < targets.length; i++) {
				var delta = targets[i + offset] - this.data[i + offset]
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
		this.status(this.STATE_UNKNOWN)

		if (this.server !== undefined) {
			this.terminate()
			delete this.server
			delete this.packet
			delete this.data
		}

		if (this.config.host) {
			this.server = new sacnServer(this.config.host)
			this.packet = this.server.createPacket(512)
			this.data = this.packet.getSlots()

			this.packet.setSourceName(this.config.name || 'Companion App')
			this.packet.setUUID(this.config.uuid || uuidv4())
			this.packet.setUniverse(this.config.universe || 0x01)
			this.packet.setPriority(this.config.priority)
			this.packet.setOption(this.packet.Options.TERMINATED, true)

			for (var i = 0; i < this.data.length; i++) {
				this.data[i] = 0x00
			}
		}

		this.status(this.STATE_OK)
	}

	// Return config fields for web config
	config_fields() {
		return getConfigFields()
	}

	// When module gets deleted
	async destroy() {
		if (this.server !== undefined) {
			this.terminate()
			delete this.server
			delete this.packet
			delete this.data
		}
	}
}

exports = module.exports = SAcnInstance
