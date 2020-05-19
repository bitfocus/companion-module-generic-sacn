var sacnClient = require('./lib/client.js').client;
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
		if (self.client !== undefined && !self.packet.getOption(self.packet.Options.TERMINATED)) {
			self.client.send(self.packet);
		}
	}, 1000);
};

instance.prototype.terminate = function() {
	var self = this;

	if(self.client !== undefined) {
		self.packet.setOption(self.packet.Options.TERMINATED, true);
		self.client.send(self.packet);
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

	if(self.client !== undefined) {
		self.terminate();
		delete self.client;
		delete self.packet;
		delete self.data;
	}

	if(self.config.host) {
		self.client = new sacnClient(self.config.host);
		self.packet = self.client.createPacket(512);
		self.data = self.packet.getSlots();

		self.packet.setSourceName(self.config.name || "Companion App");
		self.packet.setUUID(self.config.uuid || self.genUUID());
		self.packet.setUniverse(self.config.universe || 0x01);
		self.packet.setPriority(self.config.priority);

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
			label: 'Source name',
			default: 'Companion ' + self.id
		},
		{
			type: 'textinput',
			id: 'uuid',
			label: 'Source UUID',
			default: self.genUUID()
		},
		{
			type: 'textinput',
			id: 'host',
			label: 'Receiver IP',
			width: 6,
			regex: self.REGEX_IP
		},
		{
			type: 'number',
			id: 'priority',
			label: 'Priority (1-201)',
			min: 1,
			max: 201,
			default: 100
		},
		{
			type: 'number',
			id: 'universe',
			label: 'Universe number (1-63999)',
			width: 6,
			min: 1,
			max: 63999,
			default: 1
		}
	];
	return fields;
};

// When module gets deleted
instance.prototype.destroy = function() {
	var self = this;

	if (self.client !== undefined) {
		self.terminate();
		delete self.client;
		delete self.packet;
		delete self.data;
	}

	if (self.timer) {
		clearInterval(self.timer);
		self.timer = undefined;
	}

	if (self.client !== undefined) {
		self.terminate();
	}

};


instance.prototype.actions = function(system) {
	var self = this;
	self.system.emit('instance_actions', self.id, {

		'set': {
			label:'Set value',
			options: [
				{
					 type: 'textinput',
					 label: 'Channel (Range 1-512)',
					 id: 'channel',
					 default: '1',
					 regex: '/^0*([1-9]|[1-8][0-9]|9[0-9]|[1-4][0-9]{2}|50[0-9]|51[012])$/' // 1-512
				},
				{
					 type: 'textinput',
					 label: 'Value (Range 0-255)',
					 id: 'value',
					 default: '0',
					 regex: '/^0*([0-9]|[1-8][0-9]|9[0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])$/' // 0-255
				}
			]
		},
		'close': {
			label:'Close SACN'
		}

	});
}

instance.prototype.action = function(action) {
	var self = this;


	switch (action.action) {

		case 'set':
			if (self.client !== undefined) {
				self.packet.setOption(self.packet.Options.TERMINATED, false);
				self.data[action.options.channel-1] = action.options.value;
				self.client.send(self.packet);
			}
			break;
		case 'close':
			if (self.client !== undefined) {
				self.terminate();
			}
			break;

	}

};

instance_skel.extendedBy(instance);
exports = module.exports = instance;
