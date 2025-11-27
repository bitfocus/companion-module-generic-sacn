// Generate the root layer of a E1.31 packet

const SACN_PREAMBLE_SIZE        = 0x0010;
const SACN_POSTAMBLE_SIZE       = 0x0000;
const SACN_PACKET_ID            = [ 0x41, 0x53, 0x43, 0x2d, 0x45, 0x31, 0x2e, 0x31, 0x37, 0x00, 0x00, 0x00 ];
const SACN_ROOT_FLAGS           = 0x7000;
const SACN_VECTOR_ROOT          = { DATA: 0x00000004, EXTENDED: 0x00000008 };


function rootLayer(buffer) {
	var self = this;

	if(this instanceof rootLayer === false) {
		return new rootLayer(buffer);
	}

	self.buf = buffer;
};

rootLayer.prototype.init = function(len = 0) {
	var self = this;

	self.buf.fill(0x00);
	self.buf.writeUInt16BE(SACN_PREAMBLE_SIZE, 0);
	self.buf.writeUInt16BE(SACN_POSTAMBLE_SIZE, 2);
	Buffer.from(SACN_PACKET_ID).copy(self.buf, 4);
	self.buf.writeUInt16BE(SACN_ROOT_FLAGS | (len & 0x0FFF), 16);
	self.buf.writeUInt32BE(SACN_VECTOR_ROOT.DATA, 18);
};

rootLayer.prototype.validate = function() {
	var self = this;
	var valid = true;

	if (self.buf.readUInt16BE(0) !== SACN_PREAMBLE_SIZE) {
		valid = false;
	}
	else if (self.buf.readUInt16BE(2) !== SACN_POSTAMBLE_SIZE) {
		valid = false;
	}
	else if (self.buf.slice(4,15).equals(Buffer.from(SACN_PACKET_ID))) {
		valid = false;
	}
	else if ((self.buf.readUInt16BE(16) & 0xF000) !== 0x7000) {
		valid = false;
	}
	else if ((self.buf.readUInt16BE(16) & 0x0FFF) < 109) {
		valid = false;
	}
	else if (self.buf.readUInt16BE !== SACN_VECTOR_ROOT.DATA) {
		valid = false;
	}
	return valid;
};

rootLayer.prototype.getLength = function() {
	var self = this;

	return self.buf.length;
};

rootLayer.prototype.setUUID = function(id) {
	var self = this;
	
	var array = id.replace('-','').match(/[0-9a-fA-F]{1,2}/g);
	
	for(i=0; i < 16; i++) {
		self.buf.writeUInt8(parseInt(array[i], 16), i+22);
	}
};

rootLayer.prototype.getUUID = function() {
	var self = this;
	
	var str;
	for(i=0; i < 16; i++) {
		if (i == 3 || i == 8 || i == 8 || i == 10) {
			str += '-';
		}
		str += self.buf.readUInt8(i+22).toString(16);
	}
	return str;
};

rootLayer.prototype.setPDULength = function(len) {
	var self = this;

	self.buf.writeUInt16BE(SACN_ROOT_FLAGS | (len & 0x0FFF), 16);
};

rootLayer.prototype.getPDULength = function() {
	var self = this;

	return (self.buf.readUInt16BE(16) & 0x0FFF);
};

rootLayer.prototype.getVector = function() {
	var self = this;

	return self.buf.readUInt32BE(18);
};

rootLayer.prototype.setVector = function(vec) {
	var self = this;

	self.buf.writeUInt32BE(vec, 18);
};

exports.rootLayer = rootLayer;
