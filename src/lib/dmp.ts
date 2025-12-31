import { Buffer } from 'node:buffer'

export const SACN_DMP_FLAGS = 0x7000
export const SACN_VECTOR_DMP = 0x02
export const SACN_ADDRDATA_TYPE = 0xa1
export const SACN_ADDR_INCREMENT = 1
export const SACN_DMX_START_CODE = {
	NULL: 0x00,
	ASCII: 0x17,
	TEST: 0x55,
	UTF8: 0x90,
	MFR: 0x91,
	INFO: 0xcf,
	PRIORITY: 0xdd,
} as const
// Startcodes: https://tsp.esta.org/tsp/working_groups/CP/DMXAlternateCodes.php

class DMPLayer {
	private buf: Buffer

	constructor(buffer: Buffer) {
		this.buf = buffer
	}

	public init(): void {
		this.buf.fill(0x00)
		this.buf.writeUInt16BE(SACN_DMP_FLAGS | (this.buf.length & 0x0fff), 0)
		this.buf.writeUInt8(SACN_VECTOR_DMP, 2)
		this.buf.writeUInt8(SACN_ADDRDATA_TYPE, 3)
		this.buf.writeUInt16BE(SACN_ADDR_INCREMENT, 6)
		this.buf.writeUInt16BE(this.buf.length - 10, 8)
		this.buf.writeUInt8(SACN_DMX_START_CODE.NULL, 10)
	}

	validate(): boolean {
		let valid = true

		if ((this.buf.readUInt16BE(0) & 0xf000) !== SACN_DMP_FLAGS) {
			valid = false
		} else if ((this.buf.readUInt16BE(0) & 0x0fff) !== this.buf.length) {
			valid = false
		} else if (this.buf.readUInt8(2) !== SACN_VECTOR_DMP) {
			valid = false
		} else if (this.buf.readUInt8(3) !== SACN_ADDRDATA_TYPE) {
			valid = false
		} else if (this.buf.readUInt16BE(6) !== SACN_ADDR_INCREMENT) {
			valid = false
		} else if (this.buf.readUInt8(10) !== SACN_DMX_START_CODE.NULL) {
			//valid = false
			// for per-adress priority
		}
		return valid
	}

	public getLength(): number {
		return this.buf.length
	}

	public setPDULength(len: number): void {
		let newLen = len
		if (len === undefined) {
			newLen = this.buf.length
		}
		this.buf.writeUInt16BE(SACN_DMP_FLAGS | (newLen & 0x0fff), 0)
	}

	public getPDULength(): number {
		return this.buf.readUInt16BE(0) & 0x0fff
	}

	public getSlotsLength(): number {
		return this.buf.readUInt16BE(8) - 1
	}

	public setSlotsLength(len: number): void {
		let newLen = len
		if (newLen) {
			newLen = this.buf.length - 10
		} else {
			newLen += 1
		}
		this.buf.writeUInt16BE(newLen, 8)
	}

	public getStartCode(): number {
		return this.buf.readUInt8(10)
	}

	public getSlots(): Buffer {
		return this.buf.slice(11)
	}

	public setSlots(slots: Buffer): void {
		slots.copy(this.buf, 11, 0)
	}
}

export { DMPLayer }
