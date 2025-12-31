import { combineRgb } from '@companion-module/base'
import type { SACNInstance } from './main.js'

export function UpdateFeedbacks(self: SACNInstance): void {
	self.setFeedbackDefinitions({
		chan_matches_value: {
			type: 'boolean',
			name: 'When channel matches a value',
			description: "Changes the button's style when the value matches",
			defaultStyle: {
				bgcolor: combineRgb(0, 153, 0),
				color: combineRgb(255, 255, 255),
			},
			options: [
				{
					id: 'channel',
					type: 'textinput',
					label: 'Channel',
					default: '1',
					useVariables: true,
				},
				{
					id: 'value',
					type: 'textinput',
					label: 'Value',
					default: '1',
				},
			],
			callback: (feedback) => {
				const chan = Number(feedback.options.channel)
				const val = Number(feedback.options.value)
				const isval = Number(self.data[chan - 1])

				return isval === val
			},
		},
		chan_greater_than: {
			type: 'boolean',
			name: 'When channel value is greater than',
			description: "Changes the button's style when the value is greater than",
			defaultStyle: {
				bgcolor: combineRgb(0, 153, 0),
				color: combineRgb(255, 255, 255),
			},
			options: [
				{
					id: 'channel',
					type: 'textinput',
					label: 'Channel',
					default: '1',
					useVariables: true,
				},
				{
					id: 'value',
					type: 'textinput',
					label: 'Threshold',
					default: '128',
				},
			],
			callback: (feedback) => {
				const chan = Number(feedback.options.channel)
				const val = Number(feedback.options.value)
				const isval = Number(self.data[chan - 1])
				return isval > val
			},
		},
		chan_intensity: {
			type: 'advanced',
			name: 'Channel Intensity',
			description: "Changes the button's style according to the channel brigthness",

			options: [
				{
					id: 'channel',
					type: 'textinput',
					label: 'Channel',
					default: '1',
					useVariables: true,
				},
			],
			callback: (feedback) => {
				const chan = Number(feedback.options.channel)
				const isval = Number(self.data[chan - 1])
				const isval_inv = 255 - isval

				return {
					color: combineRgb(isval_inv, isval_inv, isval_inv),
					bgcolor: combineRgb(isval, isval, isval),
				}
			},
		},
		chan_rgb: {
			type: 'advanced',
			name: 'Channel RGB',
			description: "Changes the button's color according to the channel RGB Values",

			options: [
				{
					id: 'channel',
					type: 'textinput',
					label: 'Startchannel',
					default: '1',
					useVariables: true,
				},
				{
					id: 'resolution16',
					type: 'checkbox',
					label: '16-Bit',
					default: false,
				},
			],
			callback: (feedback) => {
				const res16 = feedback.options.resolution16
				const chan = Number(feedback.options.channel)
				let r
				let g
				let b
				if (!res16) {
					r = Number(self.data[chan - 1])
					g = Number(self.data[chan - 1 + 1])
					b = Number(self.data[chan - 1 + 2])
				} else {
					// Only use the High values
					r = Number(self.data[chan - 1])
					g = Number(self.data[chan + 1])
					b = Number(self.data[chan + 3])
				}
				const r_i = 255 - r
				const g_i = 255 - g
				const b_i = 255 - b
				return {
					color: combineRgb(r_i, g_i, b_i),
					bgcolor: combineRgb(r, g, b),
				}
			},
		},
	})
}
