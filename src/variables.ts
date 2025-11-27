
function parse_variable_config(self) {
    self.variable_status = []
    for (let i = 0; i < self.data.length; i++) {
        self.variable_status[i] = false
    }

    if (!self.config.variables) {
        // no variables to enable
        return
    }

    let parts = self.config.variables.split(',')
    parts.forEach(part => {
        console.log(part)
        if (Number(part)) { // single number
            self.variable_status[Number(part) - 1] = true
        } else {
            // some range <start>-<stop>
            let p = part.split('-')
            for (let i = Number(p[0]) - 1; i < Number(p[1]); i++) {
                self.variable_status[i] = true
            }
        }
    })
}

function init_variables(self) {
    parse_variable_config(self)
    let variables = []
    for (let i = 0; i < self.data.length; i++) {
        if (self.variable_status[i]) {
            variables.push({
                name: `Value of channel ${i + 1}`,
                variableId: `channel${i + 1}_value`,
            })
        }
    }
    self.setVariableDefinitions(variables)
    update_variables(self)
}

function update_variables(self) {
    let values = []
    for (let i = 0; i < self.data.length; i++) {
        if (self.variable_status[i]) {
            values[`channel${i + 1}_value`] = self.data[i]
        }
    }
    self.setVariableValues(values)
}

module.exports = {
    init_variables,
    update_variables,
}
