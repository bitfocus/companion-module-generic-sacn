import { Regex, type SomeCompanionConfigField } from '@companion-module/base'
import type { SACNInstance } from './main.js'

import { v4 as uuidv4 } from 'uuid'

import { TIMER_SLOW_DEFAULT, TIMER_FAST_DEFAULT } from './constants.js'
import { calculateMulticastAddress } from './lib/utils.js'

export interface ModuleConfig {
	universe: number
	localAddress: string
	customIP: string
	host: string
	hostText: string
	mode: string
	enableSender: boolean
	enableReceiver: boolean
	name: string
	uuid: string
	priority: number
	timer_slow: number
	timer_fast: number
	variables: string
}

export function GetConfigFields(self: SACNInstance): SomeCompanionConfigField[] {
	return [
		{
			type: 'static-text',
			id: 'info',
			width: 12,
			label: 'Information',
			value:
				'This module will receive or transmit SACN packets. If you need more universes, add multiple SACN instances.',
		},
		{
			type: 'number',
			id: 'universe',
			label: 'Universe (1-63999)',
			width: 6,
			min: 1,
			max: 63999,
			default: 1,
		},
		{
			type: 'dropdown',
			id: 'localAddress',
			label: 'Bind to specific IP (optional)',
			tooltip: 'the IP address of the network interface to bind to. default is $(internal:bind_ip)',
			width: 6,
			choices: self.localIPs,
			allowCustom: true,
			regex: Regex.HOSTNAME,
			default: '0.0.0.0',
		},
		{
			type: 'dropdown',
			id: 'mode',
			width: 12,
			label: 'Mode',
			choices: [
				{ id: 'none', label: 'None' },
				{ id: 'send', label: 'Transmit' },
				{ id: 'receive', label: 'Receive' },
			],
			default: 'none',
		},
		{
			type: 'static-text',
			id: 'info',
			width: 10,
			label: 'Transmit',
			value: 'Transmit SACN packets to the ip and universe you specify.',
			isVisible: (options) => options.mode === 'send',
		},
		{
			type: 'checkbox',
			id: 'enableSender',
			label: 'Transmit',
			width: 2,
			default: false,
			//isVisible: (options) => options.enableReceiver === false,
			isVisible: () => false,
		},
		{
			type: 'static-text',
			id: 'info',
			width: 10,
			label: 'Receive',
			value: 'Receive SACN packets at the interface and universe you specify. Use them as Feedback.',
			isVisible: (options) => options.mode === 'receive',
		},
		{
			type: 'checkbox',
			id: 'enableReceiver',
			label: 'Receive',
			width: 2,
			default: false,
			//isVisible: (options) => options.enableSender === false,
			isVisible: () => false,
		},
		{
			type: 'textinput',
			id: 'name',
			width: 12,
			label: 'Source Name',
			default: `Companion (${self.id})`,
			isVisible: (options) => options.mode === 'send',
		},
		{
			type: 'textinput',
			id: 'uuid',
			width: 12,
			label: 'Source UUID',
			default: uuidv4(),
			isVisible: (options) => options.mode === 'send',
		},
		{
			type: 'number',
			id: 'priority',
			label: 'Priority (1-201)',
			width: 3,
			min: 1,
			max: 201,
			default: 100,
			isVisible: (options) => options.mode === 'send',
		},
		{
			type: 'checkbox',
			id: 'customIP',
			label: 'Use Custom Target IP',
			tooltip: 'the default calculates Multicast from Universe',
			width: 4,
			default: false,
			isVisible: (options) => options.mode === 'send',
		},
		{
			type: 'textinput',
			id: 'host',
			label: 'Target Address',
			tooltip: 'for Multicast, use 239.255.0.XXX',
			width: 5,
			regex: Regex.IP,
			default: '',
			isVisible: (options) => options.mode === 'send' && options.customIP === true,
		},
		{
			type: 'static-text',
			id: 'hostText',
			label: 'Active Target Address',
			value: calculateMulticastAddress(self.config?.universe ?? 1),
			width: 5,
			isVisible: (options) => options.mode === 'send' && options.customIP === false,
		},

		{
			type: 'static-text',
			id: 'info3',
			width: 12,
			label: 'Update interval / Timing Settings',
			value: 'Change the timing settings to adjust how often the module sends updates.',
			isVisible: () => false,
		},
		{
			type: 'number',
			id: 'timer_slow',
			label: `Update interval when no fades are running (ms)`,
			tooltip: 'Default: 800ms (1.25Hz)',
			width: 5,
			default: TIMER_SLOW_DEFAULT,
			min: 10,
			max: 10000,
			step: 1,
			isVisible: () => false,
		},
		{
			type: 'number',
			id: 'timer_fast',
			label: `Update interval for fades (ms)`,
			tooltip: 'Default: 40ms (25Hz)',
			width: 5,
			default: TIMER_FAST_DEFAULT,
			min: 5,
			max: 1000,
			step: 1,
			isVisible: () => false,
		},

		{
			type: 'textinput',
			id: 'variables',
			label: `Variables to expose, channel range (e.g. "1-5,34,100-130")`,
			width: 12,
			default: '1-512',
			regex: '/^(([0-9]+(-[0-9]+){0,1}),{0,1}){1,}$/',
			isVisible: (options) => options.mode === 'send' || options.mode === 'receive',
		},
	]
}
