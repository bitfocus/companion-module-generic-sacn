import type { SACNInstance } from './main.js'
import { conv_2x_8bit_to_16bit } from './lib/utils.js'

export function UpdateActions(self: SACNInstance): void {
	self.setActionDefinitions({
		setValue: {
			name: 'Set/Fade Value (single)',
			description: 'Set/Fade the output of one channel',
			options: [
				{
					type: 'textinput',
					label: 'Fade duration (ms)',
					id: 'duration',
					default: '1',
					useVariables: true,
				},
				{
					type: 'textinput',
					label: 'Channel (1-512)',
					id: 'channel',
					default: '1',
					useVariables: true,
				},
				{
					type: 'textinput',
					label: 'Value (0-255)',
					id: 'value',
					default: '0',
					useVariables: true,
				},
			],
			callback: async (action) => {
				const [channel, val, duration] = await Promise.all([
					self.parseVariablesInString(String(action.options.channel)),
					self.parseVariablesInString(String(action.options.value)),
					self.parseVariablesInString(String(action.options.duration)),
				])
				self.transitions?.run(Number(channel), Number(val), Number(duration))
			},
		},
		fadeValues: {
			name: 'Set/Fade Values (multiple)',
			description: 'Set/Fade the output of multiple channels',
			options: [
				{
					type: 'textinput',
					label: 'Fade duration (ms)',
					id: 'duration',
					default: '0',
					useVariables: true,
				},
				{
					type: 'textinput',
					label: 'Starting Channel (1-512)',
					id: 'start',
					default: '1',
					useVariables: true,
				},
				{
					type: 'textinput',
					label: 'Values (space/colon-separated list)',
					id: 'values',
					regex: '/((^| )([1-9]?[0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])){1,512}$/',
					default: '0 1 255',
					useVariables: true,
				},
			],
			callback: async (action) => {
				const [valuesRaw, start, duration] = await Promise.all([
					self.parseVariablesInString(String(action.options.values)),
					self.parseVariablesInString(String(action.options.start)),
					self.parseVariablesInString(String(action.options.duration)),
				])
				const values = valuesRaw.replaceAll(':', ' ').split(' ')
				console.log(values)
				for (let i = 0; i < values.length; i++) {
					self.transitions?.run(i + Number(start), Number(values[i]), Number(duration))
				}
			},
		},
		offset_single: {
			name: 'Offset Value (single)',
			description: 'Change the output of one channel with + or -',
			options: [
				{
					type: 'textinput',
					label: 'Fade duration (ms)',
					id: 'duration',
					default: '0',
					useVariables: true,
				},
				{
					type: 'textinput',
					label: 'Channel (1-512)',
					id: 'channel',
					default: '1',
					useVariables: true,
				},
				{
					type: 'textinput',
					label: `Value change + or -`,
					id: 'value',
					default: '1',
					useVariables: true,
				},
			],
			callback: async (action) => {
				const [channel, val, duration] = await Promise.all([
					self.parseVariablesInString(String(action.options.channel)),
					self.parseVariablesInString(String(action.options.value)),
					self.parseVariablesInString(String(action.options.duration)),
				])

				const newval = Math.min(255, Math.max(0, self.data[Number(channel) - 1] + Number(val)))

				self.transitions?.run(Number(channel), Number(newval), Number(duration))
			},
		},
		offset_multiple: {
			name: 'Offset Value (multiple)',
			description: 'Change the output of multiple channels with + or -',
			options: [
				{
					type: 'textinput',
					label: 'Fade duration (ms)',
					id: 'duration',
					default: '0',
					useVariables: true,
				},
				{
					type: 'textinput',
					label: 'Starting Channel (1-512)',
					id: 'start',
					default: '1',
					useVariables: true,
				},
				{
					type: 'textinput',
					label: 'Values to change + or - (space/colon-separated list) ',
					id: 'values',
					regex: '/((^| )([1-9]?[0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])){1,512}$/',
					default: '0 1 255',
					useVariables: true,
				},
			],
			callback: async (action) => {
				const [start, valuesRaw, duration] = await Promise.all([
					self.parseVariablesInString(String(action.options.start)),
					self.parseVariablesInString(String(action.options.values)),
					self.parseVariablesInString(String(action.options.duration)),
				])
				const values = valuesRaw.replaceAll(':', ' ').split(' ')
				for (let i = 0; i < values.length; i++) {
					const newval = Math.min(255, Math.max(0, self.data[i + (Number(start) - 1)] + Number(values[i])))

					self.transitions?.run(i + Number(start), Number(newval), Number(duration))
				}
			},
		},

		setValue16: {
			name: 'Set/Fade Value (single) 16-bit',
			description: 'Set/Fade the output of one 16-bit channel',
			options: [
				{
					type: 'textinput',
					label: 'Fade duration (ms)',
					id: 'duration',
					default: '1',
					useVariables: true,
				},
				{
					type: 'textinput',
					label: 'Start Channel (1-512)',
					id: 'channel',
					default: '1',
					useVariables: true,
				},
				{
					type: 'textinput',
					label: 'Value (0-65535)',
					id: 'value',
					default: '0',
					useVariables: true,
				},
			],
			callback: async (action) => {
				const [channel, val, duration] = await Promise.all([
					self.parseVariablesInString(String(action.options.channel)),
					self.parseVariablesInString(String(action.options.value)),
					self.parseVariablesInString(String(action.options.duration)),
				])
				self.transitions?.run16(Number(channel), Number(val), Number(duration))
			},
		},
		offset_single_16: {
			name: 'Offset Value (single) 16-bit',
			description: 'Change the output of one 16-bit channel with + or -',
			options: [
				{
					type: 'textinput',
					label: 'Fade duration (ms)',
					id: 'duration',
					default: '0',
					useVariables: true,
				},
				{
					type: 'textinput',
					label: 'Start Channel (1-512)',
					id: 'channel',
					default: '1',
					useVariables: true,
				},
				{
					type: 'textinput',
					label: `Value change + or -`,
					id: 'value',
					default: '1',
					useVariables: true,
				},
			],
			callback: async (action) => {
				const [channel, val, duration] = await Promise.all([
					self.parseVariablesInString(String(action.options.channel)),
					self.parseVariablesInString(String(action.options.value)),
					self.parseVariablesInString(String(action.options.duration)),
				])

				const currentMSB = self.data[Number(channel) - 1]
				const currentLSB = self.data[Number(channel)]

				const newval = conv_2x_8bit_to_16bit(currentMSB, currentLSB) + Number(val)

				self.transitions?.run16(Number(channel), Number(newval), Number(duration))
			},
		},
		percent_single_flex: {
			name: 'Set/Fade Value (single) percentage (0–100%)',
			description: 'Change the output of one channel from 0-100%',
			options: [
				{
					type: 'textinput',
					label: 'Fade duration (ms)',
					id: 'duration',
					default: '0',
					useVariables: true,
				},
				{
					type: 'textinput',
					label: 'Channel (1-512)',
					id: 'channel',
					default: '1',
					useVariables: true,
				},
				{
					type: 'textinput',
					label: `Value in Percent`,
					id: 'percent',
					default: '1',
					useVariables: true,
				},
				{
					type: 'checkbox',
					label: 'Use offset',
					tooltip: 'Offset current value + or -',
					id: 'relative',
					default: false,
				},
				{
					type: 'checkbox',
					label: '16-Bit Value',
					id: 'resolution',
					default: false,
				},
			],
			callback: async (action) => {
				const [channel, percent, duration] = await Promise.all([
					self.parseVariablesInString(String(action.options.channel)),
					self.parseVariablesInString(String(action.options.percent)),
					self.parseVariablesInString(String(action.options.duration)),
				])

				if (!action.options.resolution) {
					const val = Math.round((Number(percent) / 100) * 255)
					const newval = action.options.relative
						? Math.min(255, Math.max(0, self.data[Number(channel) - 1] + val))
						: val

					self.transitions?.run(Number(channel), newval, Number(duration))
				} else {
					const val = Math.round((Number(percent) / 100) * 65535)
					const currentMSB = self.data[Number(channel) - 1]
					const currentLSB = self.data[Number(channel)]

					const newval = action.options.relative ? conv_2x_8bit_to_16bit(currentMSB, currentLSB) + val : val

					self.transitions?.run16(Number(channel), newval, Number(duration))
				}
			},
		},
	})
}
