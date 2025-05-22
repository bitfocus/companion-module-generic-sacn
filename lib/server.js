// Extremely basic SACN server for sending SACN packets

const SACN_DEFAULT_PORT = 5568;

var packet = require('./packet.js').packet;
var dgram = require('dgram');
function server({target, port, localAddress}) {
    var self = this;

    if (self instanceof server === false) {
        return new server(target, port, localAddress);
    }

    self.port = port || SACN_DEFAULT_PORT;
    self.target = target;
    self.localAddress = localAddress || null;

    self.socket = dgram.createSocket('udp4');

    if (self.localAddress) {
        self.socket.bind({ address: self.localAddress }, () => {
            // Optional: Set multicast interface for outgoing packets
            self.socket.setMulticastInterface(self.localAddress);
        });
    }
}

server.prototype.createPacket = function(slots) {
    return new packet(slots);
}

server.prototype.send = function(packet) {
    var self = this;

    self.socket.send(packet.getBuf(), self.port, self.target, packet.incSeqNum());
};

exports.server = server;
