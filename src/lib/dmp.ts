// Generate the dmp layer of a E1.31 packet

const SACN_DMP_FLAGS            = 0x7000;
const SACN_VECTOR_DMP           = 0x02;
const SACN_ADDRDATA_TYPE        = 0xa1;
const SACN_ADDR_INCREMENT       = 1;
const SACN_DMX_START_CODE       = { NULL: 0x00, ASCII: 0x17, TEST: 0x55, UTF8: 0x90, MFR: 0x91, INFO: 0xCF }

function dmpLayer(buffer) {
	var self = this;

	if(self instanceof dmpLayer === false) {
		return new dmpLayer(buffer);
	}

	self.buf = buffer;
};

dmpLayer.prototype.init = function() {
	var self = this;

	self.buf.fill(0x00);
	self.buf.writeUInt16BE(SACN_DMP_FLAGS | (self.buf.length & 0x0FFF), 0);
	self.buf.writeUInt8(SACN_VECTOR_DMP, 2);
	self.buf.writeUInt8(SACN_ADDRDATA_TYPE, 3);
	self.buf.writeUInt16BE(SACN_ADDR_INCREMENT, 6);
	self.buf.writeUInt16BE(self.buf.length - 10, 8);
	self.buf.writeUInt8(SACN_DMX_START_CODE.NULL, 10);
};

dmpLayer.prototype.validate = function() {
	var self = this;
	var valid = true;

	if ((self.buf.readUInt16BE(0) & 0xF000) !== SACN_DMP_FLAGS) {
		valid = false;
	}
	else if ((self.buf.readUInt16BE(0) & 0x0FFF) != self.buf.length) {
		valid = false;
	}
	else if (self.buf.readUInt8(2) != SACN_VECTOR_DMP) {
		valid = false;
	}
	else if (self.buf.readUInt8(3) != SACN_ADDRDATA_TYPE) {
		valid = false;
	}
	else if (self.buf.readUInt16BE(6) != SACN_ADDR_INCREMENT) {
		valid = false;
	}
	else if (self.buf.readUInt8(10) != SACN_DMX_START_CODE.NULL) {
		valid = false;
	}
	return valid;
};

dmpLayer.prototype.getLength = function() {
	var self = this;

	return self.buf.length;
};

dmpLayer.prototype.setPDULength = function(len) {
	var self = this;

	var newLen = len;
	if (len === undefined) {
		newLen = self.buf.length;
	}
	self.buf.writeUInt16BE(SACN_ROOT_FLAGS | (newLen & 0x0FFF), 0);
};

dmpLayer.prototype.getPDULength = function() {
	var self = this;

	return (self.buf.readUInt16BE(0) & 0x0FFF);
};

dmpLayer.prototype.getSlotsLength = function() {
	var self = this;

	return (self.buf.readUInt16BE(8) - 1);
};

dmpLayer.prototype.setSlotsLength = function(len) {
	var self = this;

	var newLen = len;
	if (newLen) {
		newLen = self.buf.length - 10;
	} else {
		newLen += 1;
	}
	self.buf.writeUInt16BE(newLen, 8);
};

dmpLayer.prototype.getSlots = function() {
	var self = this;

	return self.buf.slice(11);
};

dmpLayer.prototype.setSlots = function(slots) {
	var self = this;

	slots.copy(self.buf, 11, 0);
};

exports.dmpLayer = dmpLayer;
