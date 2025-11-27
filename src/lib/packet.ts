// Wrap root frame and dmp layers into a single sacn packet buffer

const SACN_MIN_PACKET_SIZE = 126;
const SACN_MAX_PACKET_SIZE = 638;

var rootLayer  = require('./root.js').rootLayer;
var frameLayer = require('./frame.js').frameLayer;
var dmpLayer   = require('./dmp.js').dmpLayer;

function packet(opt) {
	var self = this;
	
	// make sure we are a packet
	if (self instanceof packet === false) {
		return new packet(opt);
	}

	// make a max size buffer by default
	if (opt === undefined) {
		self.buf = Buffer.alloc(SACN_MAX_PACKET_SIZE);
	} 
	else if (Number.isInteger(opt) && opt <= 512) {
		self.buf = Buffer.alloc(SACN_MIN_PACKET_SIZE + opt);
	} 
	else if (Buffer.isBuffer(opt) && opt.length >= SACN_MIN_PACKET_SIZE && opt.length <= SACN_MAX_PACKET_SIZE) {
		self.buf = opt;
	}

	self.root  = rootLayer(self.buf.slice(0,38));
	self.frame = frameLayer(self.buf.slice(38,115));
	self.dmp   = dmpLayer(self.buf.slice(115));

	if (!Buffer.isBuffer(opt)) {
		self.init();
	}
}

packet.prototype.init = function() {
	var self = this;
	
	self.root.init((self.buf.length - 16));
	self.frame.init((self.buf.length - 37));
	self.dmp.init();
};

packet.prototype.validate = function() {
	var self = this;

	return self.root.validate() && self.frame.validate() && self.dmp.validate();
};

packet.prototype.getSlots = function() {
	var self = this;
	
	return self.dmp.getSlots();
};

packet.prototype.setUniverse = function(universe) {
	var self = this;

	self.frame.setUniverse(universe);
};

packet.prototype.setPriority = function(priority) {
	var self = this;

	self.frame.setPriority(priority);
};

packet.prototype.setSourceName = function(name) {
	var self = this;

	self.frame.setSourceName(name);
};

packet.prototype.incSeqNum = function() {
	var self = this;

	self.frame.setSeqNum();
};

packet.prototype.Options = frameLayer.prototype.Options;
packet.prototype.setOption = function(opt, val) {
	var self = this;

	self.frame.setOption(opt, val);
};

packet.prototype.getOption = function(opt) {
	var self = this;

	return self.frame.getOption(opt);
};

packet.prototype.setUUID = function(id) {
	var self = this;

	self.root.setUUID(id);
};

packet.prototype.getUUID = function() {
	var self = this;

	return self.root.getUUID();
};

packet.prototype.getBuf = function() {
	var self = this;

	return self.buf;
};

exports.packet = packet;
