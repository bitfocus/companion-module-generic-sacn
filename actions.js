function getActionDefinitions(self) {
	return {
		setValue: {
			name: 'Set Value',
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
			callback: (action) => {
				if (self.server) {
					self.data[action.options.channel - 1] = action.options.value
					self.keepAlive()
				}
			},
		},
		setValues: {
			name: 'Set Values',
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
			callback: (action) => {
				if (self.server) {
					const values = action.options.values.split(' ')
					for (i = 0; i < values.length; i++) {
						self.data[i + (action.options.start - 1)] = values[i]
					}

					self.keepAlive()
				}
			},
		},
		fadeValues: {
			name: 'Fade To Values',
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
			callback: (action) => {
				if (self.server) {
					const opts = action.options
					const values = opts.values.split(' ')

					self.fade(opts.steps, Math.floor(opts.duration / opts.steps), opts.start - 1, values)
				}
			},
		},
		setScene: {
			name: 'Set Active Scene',
			options: [
				{
					type: 'number',
					label: 'Scene Number',
					id: 'scene',
					min: 0,
					max: 1024,
				},
			],
			callback: (action) => {
				self.activeScene = action.options.scene
				self.checkFeedbacks('scene')
			},
		},
		terminate: {
			name: 'Terminate Stream',
			options: [],
			callback: () => {
				if (self.server) {
					self.terminate()
				}
			},
		},
	}
}

module.exports = {
	getActionDefinitions,
}
