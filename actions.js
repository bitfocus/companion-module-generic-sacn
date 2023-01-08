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
				self.transitions.run(action.options.channel - 1, Number(action.options.value), 0)
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
					for (let i = 0; i < values.length; i++) {
						self.transitions.run(i + (action.options.start - 1), Number(values[i]), 0)
					}
				}
			},
		},
		fadeValues: {
			name: 'Fade To Values',
			options: [
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
					const values = action.options.values.split(' ')
					for (let i = 0; i < values.length; i++) {
						self.transitions.run(
							i + (action.options.start - 1),
							Number(values[i]),
							Number(action.options.duration) || 0
						)
					}
				}
			},
		},
	}
}

module.exports = {
	getActionDefinitions,
}
