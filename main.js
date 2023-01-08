var sacnServer = require('./lib/server.js').server
var instance_skel = require('../../instance_skel')

class SAcnInstance extends instance_skel {
	constructor(system, id, config) {
		super(system, id, config)

		this.actions() // export actions
	}

	init() {
		this.status(this.STATE_UNKNOWN)

		this.init_sacn()

		this.init_feedbacks()
	}

	updateConfig(config) {
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
		this.checkFeedbacks('status')
	}
	terminate() {
		if (this.server !== undefined) {
			this.packet.setOption(this.packet.Options.TERMINATED, true)
			this.server.send(this.packet)
		}
		delete this.activeScene
		if (this.timer) {
			clearInterval(this.timer)
			delete this.timer
		}
		this.checkFeedbacks('status')
		this.checkFeedbacks('scene')
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
	genUUID() {
		// Crazy 1-liner UUIDv4 based on gist.github.com/jed/982883
		// Consider just importing the UUID v4 module
		function id(a) {
			return a
				? (a ^ ((Math.random() * 16) >> (a / 4))).toString(16)
				: ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, id)
		}

		return id()
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
			this.packet.setUUID(this.config.uuid || this.genUUID())
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
		var fields = [
			{
				type: 'text',
				id: 'info',
				width: 12,
				label: 'Information',
				value:
					'This module will transmit SACN packets to the ip and universe you specify below. If you need more universes, add multiple SACN instances.',
			},
			{
				type: 'textinput',
				id: 'name',
				width: 12,
				label: 'Source Name',
				default: 'Companion (' + this.id + ')',
			},
			{
				type: 'textinput',
				id: 'uuid',
				width: 12,
				label: 'Source UUID',
				default: this.genUUID(),
			},
			{
				type: 'textinput',
				id: 'host',
				label: 'Receiver IP',
				width: 5,
				regex: this.REGEX_IP,
			},
			{
				type: 'number',
				id: 'universe',
				label: 'Universe (1-63999)',
				width: 4,
				min: 1,
				max: 63999,
				default: 1,
			},
			{
				type: 'number',
				id: 'priority',
				label: 'Priority (1-201)',
				width: 3,
				min: 1,
				max: 201,
				default: 100,
			},
		]
		return fields
	}
	// When module gets deleted
	destroy() {
		if (this.server !== undefined) {
			this.terminate()
			delete this.server
			delete this.packet
			delete this.data
		}
	}
	actions() {
		this.setActions({
			setValue: {
				label: 'Set Value',
				options: [
					{
						type: 'number',
						label: 'Channel (1-512)',
						id: 'channel',
						min: 1,
						max: 512,
						default: 1,
					},
					{
						type: 'number',
						label: 'Value (0-255)',
						id: 'value',
						min: 0,
						max: 255,
						default: 0,
					},
				],
			},
			setValues: {
				label: 'Set Values',
				options: [
					{
						type: 'number',
						label: 'Starting Channel (1-512)',
						id: 'start',
						min: 1,
						max: 512,
						default: 1,
					},
					{
						type: 'textinput',
						label: 'Values (space-separated list)',
						id: 'values',
						regex: '/((^| )([1-9]?[0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])){1,512}$/',
						default: '0 1 255',
					},
				],
			},
			fadeValues: {
				label: 'Fade To Values',
				options: [
					{
						type: 'number',
						label: 'Fade steps',
						id: 'steps',
						min: 0,
						max: 100,
						default: 30,
					},
					{
						type: 'number',
						label: 'Fade duration (ms)',
						id: 'duration',
						min: 30,
						max: 10000,
						default: 1000,
					},
					{
						type: 'number',
						label: 'Starting Channel (1-512)',
						id: 'start',
						min: 1,
						max: 512,
						default: 1,
					},
					{
						type: 'textinput',
						label: 'Values (space-separated list)',
						id: 'values',
						regex: '/((^| )([1-9]?[0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])){1,512}$/',
						default: '0 1 255',
					},
				],
			},
			setScene: {
				label: 'Set Active Scene',
				options: [
					{
						type: 'number',
						label: 'Scene Number',
						id: 'scene',
						min: 0,
						max: 1024,
					},
				],
			},
			terminate: {
				label: 'Terminate Stream',
			},
		})
	}
	action(action) {
		switch (action.action) {
			case 'setValue':
				if (this.server !== undefined) {
					this.data[action.options.channel - 1] = action.options.value
					this.keepAlive()
				}
				break
			case 'setValues':
				if (this.server !== undefined) {
					var values = action.options.values.split(' ')
					for (i = 0; i < values.length; i++) {
						this.data[i + (action.options.start - 1)] = values[i]
					}
					this.keepAlive()
				}
				break
			case 'fadeValues':
				if (this.server !== undefined) {
					var opts = action.options
					var values = opts.values.split(' ')

					this.fade(opts.steps, Math.floor(opts.duration / opts.steps), opts.start - 1, values)
				}
				break
			case 'setScene':
				this.activeScene = action.options.scene
				this.checkFeedbacks('scene')
				break
			case 'terminate':
				if (this.server !== undefined) {
					this.terminate()
				}
				break
		}
	}
	init_feedbacks() {
		const feedbacks = {}

		feedbacks['status'] = {
			label: 'Stream status',
			description: 'Set the button background based on the status of the sACN stream.',
			options: [
				{
					type: 'colorpicker',
					label: 'Background color',
					id: 'bg_color',
					default: this.rgb(0, 0, 0),
				},
				{
					type: 'colorpicker',
					label: 'Foreground color',
					id: 'fg_color',
					default: this.rgb(255, 255, 255),
				},
				{
					type: 'dropdown',
					label: 'Status',
					id: 'status',
					default: 1,
					choices: [
						{ id: '1', label: 'Active' },
						{ id: '0', label: 'Terminated' },
					],
				},
			],
		}
		feedbacks['scene'] = {
			label: 'Active scene',
			description: 'Set the button colors based on the active scene.',
			options: [
				{
					type: 'colorpicker',
					label: 'Background color',
					id: 'bg_color',
					default: this.rgb(0, 20, 208),
				},
				{
					type: 'colorpicker',
					label: 'Foreground color',
					id: 'fg_color',
					default: this.rgb(255, 255, 255),
				},
				{
					type: 'number',
					label: 'Scene',
					id: 'scene',
					min: 0,
					max: 1024,
				},
			],
		}
		this.setFeedbackDefinitions(feedbacks)
	}
	feedback(feedback) {
		var opts = feedback.options

		if (this.packet === undefined) {
			return {}
		} else if (feedback.type == 'status') {
			if (opts.status == 0 && this.packet.getOption(this.packet.Options.TERMINATED)) {
				return { bgcolor: opts.bg_color, color: opts.fg_color }
			} else if (opts.status == 1 && !this.packet.getOption(this.packet.Options.TERMINATED)) {
				return { bgcolor: opts.bg_color, color: opts.fg_color }
			}
		} else if (feedback.type == 'scene') {
			if (this.activeScene && opts.scene == this.activeScene) {
				return { bgcolor: opts.bg_color, color: opts.fg_color }
			}
		}
		return {}
	}
}

exports = module.exports = SAcnInstance
