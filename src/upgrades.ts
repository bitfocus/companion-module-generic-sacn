import type {
	CompanionStaticUpgradeScript,
	CompanionUpgradeContext,
	CompanionStaticUpgradeProps,
	CompanionStaticUpgradeResult,
} from '@companion-module/base'
import type { ModuleConfig } from './config.js'

export const UpgradeScripts: CompanionStaticUpgradeScript<ModuleConfig>[] = [
	function (
		_context: CompanionUpgradeContext<ModuleConfig>,
		props: CompanionStaticUpgradeProps<ModuleConfig>,
	): CompanionStaticUpgradeResult<ModuleConfig> {
		const result: any = {
			updatedConfig: null,
			updatedActions: [],
			updatedFeedbacks: [],
		}

		for (const action of props.actions) {
			if (action.actionId === 'setValues') {
				action.actionId = 'fadeValues'
				action.options.duration = 0

				result.updatedActions.push(action)
			} else if (action.actionId === 'setValue' && !action.options.duration) {
				action.options.duration = 0

				result.updatedActions.push(action)
			}
		}

		return result
	},
]
