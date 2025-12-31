import type { SACNInstance } from './main.js'
import { combineRgb } from '@companion-module/base'
import { type CompanionPresetDefinitions } from '@companion-module/base'
import { VariableMapping } from './variables.js'

export function UpdatePresets(self: SACNInstance): void {
	const presets: CompanionPresetDefinitions = {}
	const keys = [...Array(512).keys()]

	for (const i of keys) {
		if (self.variable_status?.[i]) {
			presets[`input_ch_${i + 1}`] = {
				type: 'button',
				category: `Channel Values`,
				name: `Channel ${i + 1}`,
				style: {
					text: `Ch: ${i + 1}\nValue:\n$(SACN:channel${i + 1}_value)`,
					size: '14',
					color: combineRgb(255, 255, 255),
					bgcolor: combineRgb(0, 0, 0),
					show_topbar: false,
				},
				steps: [],
				feedbacks: [
					{
						feedbackId: 'chan_intensity',
						options: {
							channel: `${i + 1}`,
						},
					},
				],
			}
		}
	}
	for (const [variableId, name] of Object.entries(VariableMapping)) {
		presets[`${variableId}`] = {
			type: 'button',
			category: `Status`,
			name: `${name}`,
			style: {
				text: `${variableId}:\n$(SACN:${variableId})`,
				size: '14',
				color: combineRgb(255, 255, 255),
				bgcolor: combineRgb(0, 0, 0),
				show_topbar: false,
			},
			steps: [],
			feedbacks: [],
		}
	}
	self.setPresetDefinitions(presets)
}
