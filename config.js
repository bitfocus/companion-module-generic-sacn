const { Regex } = require('@companion-module/base')
const { v4: uuidv4 } = require('uuid')
const { TIMER_SLOW_DEFAULT, TIMER_FAST_DEFAULT } = require('./constants')

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
			tooltip: 'For Multicast, use 239.255.0.XXX',
			width: 5,
			regex: Regex.IP,
		},
		{
			type: 'textinput',
			id: 'localAddress',
			label: 'Bind localAddress IP',
			width: 5,
			regex: Regex.IP,
			default: '',
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
		{
			type: 'number',
			id: 'timer_slow',
			label: `Update interval when no fades are running (ms)`,
			width: 6,
			default: TIMER_SLOW_DEFAULT,
			min: 10,
			step: 1,
		},
		{
			type: 'number',
			id: 'timer_fast',
			label: `Update interval for fades (ms)`,
			width: 6,
			default: TIMER_FAST_DEFAULT,
			min: 5,
			step: 1,
		},
		{
			type: 'textinput',
			id: 'variables',
			label: `Variables to expose, channel range (e.g. "1-5,34,100-130")`,
			width: 6,
			default: '1-512',
			regex: '/^(([0-9]+(-[0-9]+){0,1}),{0,1}){1,}$/',
		},
	]
}

module.exports = {
	getConfigFields,
}
