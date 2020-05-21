// Extremely basic SACN server for sending SACN packets

const SACN_DEFAULT_PORT = 5568;

var packet = require('./packet.js').packet;
var dgram = require('dgram');
function server(target,port) {
	var self = this;

	if (self instanceof server === false) {
		return new server(target, port);
	}

	self.port = port || SACN_DEFAULT_PORT;
	self.target = target;

	self.socket = dgram.createSocket('udp4');
};

server.prototype.createPacket = function(slots) {
	return new packet(slots);
}

server.prototype.send = function(packet) {
	var self = this;

	self.socket.send(packet.getBuf(), self.port, self.target, packet.incSeqNum());
};

exports.server = server;
