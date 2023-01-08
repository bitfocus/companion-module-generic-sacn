function getActionDefinitions(self) {
	return {
		setValue: {
			name: 'Set/Fade Value',
			options: [
				{
					type: 'number',
					label: 'Fade duration (ms)',
					id: 'duration',
					min: 0,
					max: 10000,
					default: 0,
				},
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
				self.transitions.run(
					action.options.channel - 1,
					Number(action.options.value),
					Number(action.options.duration) || 0
				)
			},
		},
		fadeValues: {
			name: 'Set/Fade To Values',
			options: [
				{
					type: 'number',
					label: 'Fade duration (ms)',
					id: 'duration',
					min: 0,
					max: 10000,
					default: 0,
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
					useVariables: true,
				},
			],
			callback: async (action) => {
				const valuesRaw = await self.parseVariablesInString(action.options.values)
				const values = valuesRaw.split(' ')
				for (let i = 0; i < values.length; i++) {
					self.transitions.run(i + (action.options.start - 1), Number(values[i]), Number(action.options.duration) || 0)
				}
			},
		},
	}
}

module.exports = {
	getActionDefinitions,
}
