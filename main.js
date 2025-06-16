const sacnServer = require('./lib/server.js').server
const { InstanceBase, InstanceStatus, runEntrypoint } = require('@companion-module/base')
const { v4: uuidv4 } = require('uuid')
const { getActionDefinitions } = require('./actions.js')
const { getConfigFields } = require('./config.js')
const { init_variables, update_variables } = require('./variables.js')
const { Transitions } = require('./transitions.js')
const { TIMER_SLOW_DEFAULT, TIMER_FAST_DEFAULT } = require('./constants.js')
const { UpgradeScripts } = require('./upgrades.js')

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
			update_variables(this)
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

		if (this.slow_send_timer) {
			clearInterval(this.slow_send_timer)
			delete this.slow_send_timer
		}
	}

	init_sacn() {
		this.terminate()

		if (this.config.host) {
			this.server = new sacnServer({
				target: this.config.host, 
				localAddress: this.config.localAddress,
			})
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

			this.transitions = new Transitions(
				this.data,
				this.config.timer_fast || TIMER_FAST_DEFAULT,
				this.keepAlive.bind(this)
			)

			this.slow_send_timer = setInterval(() => {
				// Skip the slow poll if a transition is running
				if (!this.transitions || !this.transitions.isRunning()) {
					this.keepAlive()
				}
			}, this.config.timer_slow || TIMER_SLOW_DEFAULT)
			init_variables(this)

			this.updateStatus(InstanceStatus.Ok)
		} else {
			this.updateStatus(InstanceStatus.BadConfig, 'Missing hosts')
		}
	}
}

runEntrypoint(SAcnInstance, UpgradeScripts)
