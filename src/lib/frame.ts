// Generate the framing layer of a E1.31 packet

//  Octets |            Fields             |
//         | 31-24 | 23-16 | 15-8  |  7-0  |
//  ========================================
//  38-39  | Flags |       Length          |
//  ----------------------------------------
//         |                               |
//  40-43  |           Vector              |
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

const SACN_FRAME_FLAGS = 0x7000
const SACN_VECTOR_FRAME = { DATA: 0x00000002 }
const SACN_FRAME_OPTIONS = {
	PREVIEW: 7,
	TERMINATED: 6,
	FORCE_SYNC: 5,
}
const SACN_DEFAULT_PRIORITY = 100
const SACN_DEFAULT_UNIVERSE = 1

class FrameLayer {
	buf: Buffer

	constructor(buffer: Buffer) {
		this.buf = buffer
	}

	init(len: number = 0): void {
		this.buf.fill(0x00)
		this.buf.writeUInt16BE(SACN_FRAME_FLAGS | (len & 0x0fff), 0)
		this.buf.writeUInt32BE(SACN_VECTOR_FRAME.DATA, 2)
		this.buf.writeUInt8(SACN_DEFAULT_PRIORITY, 70)
		this.buf.writeUInt16BE(SACN_DEFAULT_UNIVERSE, 75)
	}

	validate(): boolean {
		let valid = true

		if ((this.buf.readUInt16BE(0) & 0xf000) !== SACN_FRAME_FLAGS) {
			valid = false
		} else if (this.buf.readUInt32BE(2) !== SACN_VECTOR_FRAME.DATA) {
			valid = false
		} else if (this.buf.readUInt8(69) !== 0x00) {
			valid = false
		} else if (this.buf.readUInt8(70) > 200) {
			valid = false
		} else if (this.buf.readUInt16BE(71) !== 0x0000) {
			valid = false
		} else if ((this.buf.readUInt8(73) & 0x1f) != 0x00) {
			//valid = false
		}

		return valid
	}

	getLength(): number {
		return this.buf.length
	}

	getVector(): number {
		return this.buf.readUInt32BE(2)
	}

	setVector(vec: number): void {
		this.buf.writeUInt32BE(vec, 2)
	}

	getSourceName(): string {
		const name = this.buf.toString('ascii', 6, 70).replace(/\0/g, '')
		// Remove trailing spaces and null characters
		return name
	}

	setSourceName(name: string): void {
		const strbuf = Buffer.from(name)
		strbuf.copy(this.buf, 6, 0, 64)
	}

	getPriority(): number {
		return this.buf.readUInt8(70)
	}

	setPriority(priority: number): void {
		if (priority < 0 || priority > 200) {
			throw new RangeError(`Priority "${priority}" out of bounds (0-200)`)
		}
		this.buf.writeUInt8(priority, 70)
	}

	// Synchronized frames are not supported (71-72)
	//frameLayer.prototype.getSyncAddr
	//frameLayer.prototype.setSyncAddr

	setSeqNum(num?: number): void {
		let newNum = num
		// Increment if num isn't passed in
		if (newNum === undefined) {
			newNum = this.buf.readUInt8(73) + 1
		}

		this.buf.writeUInt8(newNum & 0xff, 73)
	}

	getSeqNum(): number {
		return this.buf.readUInt8(73)
	}

	static readonly Options = SACN_FRAME_OPTIONS

	getOption(opt: keyof typeof SACN_FRAME_OPTIONS): boolean {
		return Boolean(this.buf.readUInt8(74) & (1 << SACN_FRAME_OPTIONS[opt]))
	}

	setOption(opt: keyof typeof SACN_FRAME_OPTIONS, val: boolean): void {
		let newOpts = this.buf.readUInt8(74)
		if (val) {
			newOpts |= 1 << SACN_FRAME_OPTIONS[opt]
		} else {
			newOpts &= ~(1 << SACN_FRAME_OPTIONS[opt])
		}
		this.buf.writeUInt8(newOpts, 74)
	}

	getUniverse(): number {
		return this.buf.readUInt16BE(75)
	}

	setUniverse(univ: number): void {
		if (univ < 1 || univ > 63999) {
			throw new RangeError(`Universe "${univ.toString()}" out of bounds (1-63999)`)
		}
		this.buf.writeUInt16BE(univ, 75)
	}
}

export { FrameLayer }
