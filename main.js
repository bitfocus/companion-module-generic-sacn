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

	self.init_feedbacks();
};

instance.prototype.keepAlive = function () {
	var self = this;

	if (self.server && self.packet) {
		self.packet.setOption(self.packet.Options.TERMINATED, false);
		self.server.send(self.packet);
	}
	if (self.server && !self.timer) {
		self.timer = setInterval(function () {
			if (self.server !== undefined) {
				self.server.send(self.packet);
			}
		}, 1000);
	}
	self.checkFeedbacks('status');
};

instance.prototype.terminate = function() {
	var self = this;

	if(self.server !== undefined) {
		self.packet.setOption(self.packet.Options.TERMINATED, true);
		self.server.send(self.packet);
	}
	delete self.activeScene;
	if (self.timer) {
		clearInterval(self.timer);
		delete self.timer;
	}
	self.checkFeedbacks('status');
	self.checkFeedbacks('scene');
};	

instance.prototype.fade = function(steps, delay, offset, targets) {
	var self = this;

	if ( steps ) {
		self.server.send(self.packet);
		for ( i=0; i < targets.length; i++ ) {
			var delta = targets[i] - self.data[i+offset];
			self.data[i+offset] += Math.round(delta/steps) & 0xff;
		}
		setTimeout(function() {self.fade(--steps, delay, offset, targets);}, delay);
	} else {
		for ( i=0; i < targets.length; i++ ) {
			self.data[i+offset] = targets[i];
		}
		self.keepAlive();
	}
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
};


instance.prototype.actions = function(system) {
	var self = this;
	self.setActions({

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
		'setValues': {
			label: 'Set Values',
			options: [
				{
					type: 'number',
					label: 'Starting Channel (1-512)',
					id: 'start',
					min: 1,
					max: 512,
					default: 1
				},
				{
					type: 'textinput',
					label: 'Values (space-separated list)',
					id: 'values',
					regex: '/((^| )([1-9]?[0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])){1,512}$/',
					default: '0 1 255'
				}
			]
		},
		'fadeValues': {
			label: 'Fade To Values',
			options: [
				{
					type: 'number',
					label: 'Fade steps',
					id: 'steps',
					min: 0,
					max: 100,
					default: 30
				},
				{
					type: 'number',
					label: 'Fade duration (ms)',
					id: 'duration',
					min: 30,
					max: 10000,
					default: 1000
				},
				{
					type: 'number',
					label: 'Starting Channel (1-512)',
					id: 'start',
					min: 1,
					max: 512,
					default: 1
				},
				{
					type: 'textinput',
					label: 'Values (space-separated list)',
					id: 'values',
					regex: '/((^| )([1-9]?[0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])){1,512}$/',
					default: '0 1 255'
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
				self.data[action.options.channel-1] = action.options.value;
				self.keepAlive();
			}
			break;
		case 'setValues':
			if (self.server !== undefined) {
				var values = action.options.values.split(' ');
				for (i=0; i < values.length; i++) {
					self.data[i + (action.options.start - 1)] = values[i];
				}
				self.keepAlive();
			}
			break;
		case 'fadeValues':
			if (self.server !== undefined) {
				var opts = action.options;
				var values = opts.values.split(' ');

				self.fade(opts.steps, Math.floor(opts.duration/opts.steps), (opts.start - 1), values);
			}
			break;
		case 'setScene':
			self.activeScene = action.options.scene;
			self.checkFeedbacks('scene');
			break;
		case 'terminate':
			if (self.server !== undefined) {
				self.terminate();
			}
			break;

	}

}

instance.prototype.init_feedbacks = function() {
	var self = this;
	const feedbacks = {}
	
	feedbacks['status'] = {
		label: 'Stream status',
		description: 'Set the button background based on the status of the sACN stream.',
		options: [
			{
				type: 'colorpicker',
				label: 'Background color',
				id: 'bg_color',
				default: this.rgb(0, 0, 0)
			},
			{
				type: 'colorpicker',
				label: 'Foreground color',
				id: 'fg_color',
				default: this.rgb(255,255,255)
			},
			{
				type: 'dropdown',
				label: 'Status',
				id: 'status',
				default: 1,
				choices: [ {id: '1', label: 'Active'}, {id: '0', label: 'Terminated'} ]
			}
		]
	}
	feedbacks['scene'] = {
		label: 'Active scene',
		description: 'Set the button colors based on the active scene.',
		options: [
			{
				type: 'colorpicker',
				label: 'Background color',
				id: 'bg_color',
				default: this.rgb(0, 20, 208)
			},
			{
				type: 'colorpicker',
				label: 'Foreground color',
				id: 'fg_color',
				default: this.rgb(255, 255, 255)
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
	
	if (self.packet === undefined) {
		return {};
	}
	else if (feedback.type == 'status') {
		if (opts.status == 0 && self.packet.getOption(self.packet.Options.TERMINATED)) {
			return { bgcolor: opts.bg_color, color: opts.fg_color }
		}
		else if (opts.status == 1 && !self.packet.getOption(self.packet.Options.TERMINATED)) {
			return { bgcolor: opts.bg_color, color: opts.fg_color }
		}
	}
	else if (feedback.type == 'scene') {
		if (self.activeScene && opts.scene == self.activeScene) {
			return { bgcolor: opts.bg_color, color: opts.fg_color }
		}
	}
	return {}
};

instance_skel.extendedBy(instance);
exports = module.exports = instance;
