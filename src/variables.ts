import type { SACNInstance } from './main.js'
import { parseRange } from './lib/utils.js'

export const VariableMapping = {
	name: 'Name of the Source',
	uuid: 'UUID of the Source',
	fps: 'Speed of the Source',
	priority: 'Priority of the Source',
	lastpackage: 'Last sACN packet',
	packet_rate: 'Packets per Second',
	universe: 'Universe',
	source_list: 'JSON Object of active sources',
}

export function InitVariableDefinitions(self: SACNInstance): void {
	self.variable_status = parseRange(self.config.variables, self.data.length)

	const variables = Object.entries(VariableMapping).map(([variableId, name]) => ({
		name,
		variableId,
	}))

	for (let i = 0; i < self.data.length; i++) {
		if (self.variable_status?.[i]) {
			//variables.push({ name: `Value of channel ${i + 1}`, variableId: `value_chan_${i + 1}` })
			variables.push({ name: `Value of channel ${i + 1}`, variableId: `channel${i + 1}_value` })
		}
	}
	self.setVariableDefinitions(variables)
}

export function UpdateVariableDefinitions(self: SACNInstance): void {
	const values: { [key: string]: any } = {}

	for (let i = 0; i < self.data.length; i++) {
		if (self.variable_status?.[i]) {
			//values[`value_chan_${i + 1}`] = self.data[i]
			values[`channel${i + 1}_value`] = self.data[i]
		}
	}
	self.setVariableValues(values)
}
