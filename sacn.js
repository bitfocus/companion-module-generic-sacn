var sacnServer = require('./lib/server.js').server;
var instance_skel = require('../../instance_skel');
var log;


function instance(system, id, config) {
	var self = this;

	// super-constructor
	instance_skel.apply(this, arguments);

	self.actions(); // export actions

	return self;
}

instance.prototype.updateConfig = function(config) {
	var self = this;

	self.config = config;

	self.init_sacn();
};

instance.prototype.init = function() {
	var self = this;

	debug = self.debug;
	log = self.log;

	self.status(self.STATE_UNKNOWN);

	self.init_sacn();

	self.timer = setInterval(function () {
		if (self.server !== undefined && !self.packet.getOption(self.packet.Options.TERMINATED)) {
			self.server.send(self.packet);
		}
	}, 1000);

	self.init_feedbacks();
};

instance.prototype.terminate = function() {
	var self = this;

	if(self.server !== undefined) {
		self.packet.setOption(self.packet.Options.TERMINATED, true);
		self.server.send(self.packet);
	}
	delete self.activeScene;
};	

instance.prototype.genUUID = function() {
	// Crazy 1-liner UUIDv4 based on gist.github.com/jed/982883
	// Consider just importing the UUID v4 module

	function id(a) {return a?(a^Math.random()*16>>a/4).toString(16):([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g,id)};

	return id();
};

instance.prototype.init_sacn= function() {
	var self = this;

	self.status(self.STATE_UNKNOWN);

	if(self.server !== undefined) {
		self.terminate();
		delete self.server;
		delete self.packet;
		delete self.data;
	}

	if(self.config.host) {
		self.server = new sacnServer(self.config.host);
		self.packet = self.server.createPacket(512);
		self.data = self.packet.getSlots();

		self.packet.setSourceName(self.config.name || "Companion App");
		self.packet.setUUID(self.config.uuid || self.genUUID());
		self.packet.setUniverse(self.config.universe || 0x01);
		self.packet.setPriority(self.config.priority);
		self.packet.setOption(self.packet.Options.TERMINATED, true);

		for(var i=0; i<self.data.length; i++) {
			self.data[i] = 0x00;
		}
	}

	self.status(self.STATE_OK);
};

// Return config fields for web config
instance.prototype.config_fields = function () {

	var self = this;
	var fields = [
		{
			type: 'text',
			id: 'info',
			width: 12,
			label: 'Information',
			value: 'This module will transmit SACN packets to the ip and universe you specify below. If you need more universes, add multiple SACN instances.'
		},
		{
			type: 'textinput',
			id: 'name',
			width: 12,
			label: 'Source Name',
			default: 'Companion (' + self.id + ')'
		},
		{
			type: 'textinput',
			id: 'uuid',
			width: 12,
			label: 'Source UUID',
			default: self.genUUID()
		},
		{
			type: 'textinput',
			id: 'host',
			label: 'Receiver IP',
			width: 5,
			regex: self.REGEX_IP
		},
		{
			type: 'number',
			id: 'universe',
			label: 'Universe (1-63999)',
			width: 4,
			min: 1,
			max: 63999,
			default: 1
		},
		{
			type: 'number',
			id: 'priority',
			label: 'Priority (1-201)',
			width: 3,
			min: 1,
			max: 201,
			default: 100
		}
	];
	return fields;
};

// When module gets deleted
instance.prototype.destroy = function() {
	var self = this;

	if (self.server !== undefined) {
		self.terminate();
		delete self.server;
		delete self.packet;
		delete self.data;
	}

	if (self.timer) {
		clearInterval(self.timer);
		self.timer = undefined;
	}

	if (self.server !== undefined) {
		self.terminate();
	}

};


instance.prototype.actions = function(system) {
	var self = this;
	self.system.emit('instance_actions', self.id, {

		'setValue': {
			label:'Set Value',
			options: [
				{
					type: 'number',
					label: 'Channel (1-512)',
					id: 'channel',
					min: 1,
					max: 512,
					default: 1
				},
				{
					type: 'number',
					label: 'Value (0-255)',
					id: 'value',
					min: 0,
					max: 255,
					default: 0
				}
			]
		},
		'setScene': {
			label: 'Set Active Scene',
			options: [
				{
					type: 'number',
					label: 'Scene Number',
					id: 'scene',
					min: 0,
					max: 1024
				}
			]
		},
		'terminate': {
			label:'Terminate Stream'
		}

	});
}

instance.prototype.action = function(action) {
	var self = this;


	switch (action.action) {

		case 'setValue':
			if (self.server !== undefined) {
				self.packet.setOption(self.packet.Options.TERMINATED, false);
				self.data[action.options.channel-1] = action.options.value;
				self.server.send(self.packet);
			}
			break;
		case 'setScene':
			self.activeScene = action.options.scene;
			break;
		case 'terminate':
			if (self.server !== undefined) {
				self.terminate();
			}
			break;

	}
	self.checkFeedbacks('status');

}

instance.prototype.init_feedbacks = function() {
	var self = this;
	const feedbacks = {}
	
	feedbacks['status'] = {
		label: 'Status of the sACN stream',
		description: 'Set the button background based on the status of the sACN stream.',
		options: [
			{
				type: 'colorpicker',
				label: 'Background color (Terminated)',
				id: 'bg_terminated',
				default: this.rgb(0, 0, 0)
			}, 
			{
				type: 'colorpicker',
				label: 'Background color (Scene Active)',
				id: 'bg_scene',
				default: this.rgb(0, 222, 0)
			},
			{
				type: 'colorpicker',
				label: 'Background color (Active)',
				id: 'bg_active',
				default: this.rgb(0, 20, 208)
			},
			{
				type: 'number',
				label: 'Scene',
				id: 'scene',
				min: 0,
				max: 1024
			}
		]
	}
	self.setFeedbackDefinitions(feedbacks);
};

instance.prototype.feedback = function(feedback) {
	var self = this;
	var opts = feedback.options;
	
	if (feedback.type == 'status') {
		if (self.packet === undefined || self.packet.getOption(self.packet.Options.TERMINATED)) {
			return { bgcolor: opts.bg_terminated }
		}
		else if (self.activeScene !== undefined && self.activeScene == opts.scene) {
			return { bgcolor: opts.bg_scene }
		}
		else {
			return { bgcolor: opts.bg_active }
		}
	}
	return {}
};

instance_skel.extendedBy(instance);
exports = module.exports = instance;
