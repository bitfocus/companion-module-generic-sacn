// Extremely basic SACN client for sending SACN packets

const SACN_DEFAULT_PORT = 5568;

var packet = require('./packet.js').packet;
var dgram = require('dgram');
function client(target,port) {
	var self = this;

	if (self instanceof client === false) {
		return new client(target, port);
	}

	self.port = port || SACN_DEFAULT_PORT;
	self.target = target;

	self.socket = dgram.createSocket('udp4');
};

client.prototype.createPacket = function(slots) {
	return new packet(slots);
}

client.prototype.send = function(packet) {
	var self = this;

	self.socket.send(packet.getBuf(), self.port, self.target, packet.incSeqNum());
};

exports.client = client;
