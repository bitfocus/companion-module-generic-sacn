// Generate the framing layer of a E1.31 packet

//  Octets |            Fields             |
//         | 31-24 | 23-16 | 15-8  |  7-0  |
//  ========================================       
//  38-39  | Flags |       Length          |
//  ----------------------------------------
//         |                               |
//  40-44  |           Vector              |
//  ----------------------------------------
//         |                               |
//           ...
//  44-107 |        Source Name            |
//  ----------------------------------------
//  108                     |   Priority   |              
//  ----------------------------------------
//  109-110|         Sync Address          |
//  ----------------------------------------
//  111                     | Seq Num      |
//  ----------------------------------------
//  112                     | Options      |
//  ----------------------------------------
//  113-114|         Universe              |
//  ----------------------------------------


const SACN_FRAME_FLAGS          = 0x7000;
const SACN_VECTOR_FRAME         = { DATA: 0x00000002 };
const SACN_FRAME_OPTIONS        = { PREVIEW: 7, TERMINATED: 6, FORCE_SYNC: 5 };
const SACN_DEFAULT_PRIORITY     = 100;
const SACN_DEFAULT_UNIVERSE     = 1;

function frameLayer(buffer) {
	var self = this;

	if(self instanceof frameLayer === false) {
		return new frameLayer(buffer);
	}

	self.buf = buffer;
};

frameLayer.prototype.init = function(len = 0) {
	var self = this;

	self.buf.fill(0x00);
	self.buf.writeUInt16BE(SACN_FRAME_FLAGS | (len & 0x0FFF), 0);
	self.buf.writeUInt32BE(SACN_VECTOR_FRAME.DATA, 2);
	self.buf.writeUInt8(SACN_DEFAULT_PRIORITY, 70);
	self.buf.writeUInt16BE(SACN_DEFAULT_UNIVERSE, 75);
};

frameLayer.prototype.validate = function() {
	var self = this;
	var valid = true;

	if ((self.buf.readUInt16BE(0) & 0xF000) !== SACN_FRAME_FLAGS) {
		valid = false;
	}
	else if (self.buf.readUInt32BE(2) !== SACN_VECTOR_FRAME.DATA) {
		valid = false;
	}
	else if (self.buf.readUInt8(69) !== 0x00) {
		valid = false;
	}
	else if (self.buf.readUInt8(70) > 200) {
		valid = false;
	}
	else if (self.buf.readUInt16BE(71) !== 0x0000) {
		// No sync packet support
		valid = false;
	}
	else if ((self.buf.readUInt8(73) & 0x1F) != 0x00) {
		// Unrecognized options
		valid = false;
	}
	return valid;
};


frameLayer.prototype.getLength = function() {
	var self = this;

	return self.buf.length;
};

frameLayer.prototype.getVector = function() {
	var self = this;

	return self.buf.readUInt32BE(2);
};

frameLayer.prototype.setVector = function(vec) {
	var self = this;

	self.buf.writeUInt32BE(vec, 2);
};

frameLayer.prototype.getSourceName = function() {
	var self = this;

	return self.buf.toString('ascii', 6, 70);
};

frameLayer.prototype.setSourceName = function(name) {
	var self = this;

	var strbuf = new Buffer.from(name);
	strbuf.copy(self.buf,6,0,64);
};

frameLayer.prototype.getPriority = function() {
	var self = this;
	
	return self.buf.readUInt8(70);
};

frameLayer.prototype.setPriority = function(priority) {
	var self = this;

	if (priority < 0 || priority > 200) {
		throw new RangeError('Priority "'+priority+'" out of bounds (0-200)');
	}
	else {
		self.buf.writeUInt8(priority, 70);
	}
};

// Synchronized frames are not supported (71-72)
//frameLayer.prototype.getSyncAddr 
//frameLayer.prototype.setSyncAddr 

frameLayer.prototype.setSeqNum = function(num) {
	var self = this;
	var newNum = num;
	// Increment if num isn't passed in
	if (newNum === undefined) {
		newNum = (self.buf.readUInt8(73) + 1);
	}

	self.buf.writeUInt8((newNum & 0xFF), 73);
};

frameLayer.prototype.getSeqNum = function() {
	var self = this;

	return self.buf.readUInt8(73);
}

frameLayer.prototype.Options = SACN_FRAME_OPTIONS;

frameLayer.prototype.getOption = function(opt) {
	var self = this;

	return Boolean(self.buf.readUInt8(74) & (1 << opt));
};

frameLayer.prototype.setOption = function(opt, val) {
	var self = this;

	var newOpts = self.buf.readUInt8(74);
	if (val === true) {
		newOpts |= (1 << opt);
	} else {
		newOpts &= ~(1 << opt);
	}
	self.buf.writeUInt8(newOpts, 74);
};

frameLayer.prototype.getUniverse = function() {
	var self = this;

	return self.buf.readUInt16BE(75);
};

frameLayer.prototype.setUniverse = function(univ) {
	var self = this;

	if (univ < 1 || univ > 63999) {
		throw new RangeError('Universe "'+univ.toString()+'" out of bounds (1-63999)');
	}
	else {
		self.buf.writeUInt16BE(univ, 75);
	}
};

exports.frameLayer = frameLayer;
