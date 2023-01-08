const { Regex } = require('@companion-module/base')
const { v4: uuidv4 } = require('uuid')

function getConfigFields(id) {
	return [
		{
			type: 'static-text',
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
			default: `Companion (${id})`,
		},
		{
			type: 'textinput',
			id: 'uuid',
			width: 12,
			label: 'Source UUID',
			default: uuidv4(),
		},
		{
			type: 'textinput',
			id: 'host',
			label: 'Receiver IP',
			width: 5,
			regex: Regex.IP,
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
}

module.exports = {
	getConfigFields,
}
