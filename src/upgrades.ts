const UpgradeScripts = [
	function (_context, props) {
		const result = {
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

module.exports = {
	UpgradeScripts,
}
