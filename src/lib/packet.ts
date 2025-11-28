// Constants
const SACN_MIN_PACKET_SIZE = 126
const SACN_MAX_PACKET_SIZE = 638

import { RootLayer } from './root.js'
import { FrameLayer } from './frame.js'
import { DMPLayer } from './dmp.js'

class Packet {
	private buf!: Buffer
	public root!: RootLayer
	public frame!: FrameLayer
	public dmp!: DMPLayer

	constructor(opt?: any | Buffer) {
		// make sure we are a packet
		if (this instanceof Packet === false) {
			return new Packet(opt)
		}

		if (opt === undefined) {
			this.buf = Buffer.alloc(SACN_MAX_PACKET_SIZE)
		} else if (Number.isInteger(opt) && opt <= 512) {
			this.buf = Buffer.alloc(SACN_MIN_PACKET_SIZE + opt)
		} else if (Buffer.isBuffer(opt) && opt.length >= SACN_MIN_PACKET_SIZE && opt.length <= SACN_MAX_PACKET_SIZE) {
			this.buf = opt
		}

		this.root = new RootLayer(this.buf.slice(0, 38))
		this.frame = new FrameLayer(this.buf.slice(38, 115))
		this.dmp = new DMPLayer(this.buf.slice(115))

		if (!Buffer.isBuffer(opt)) {
			this.init()
		}
	}

	init(): void {
		this.root.init(this.buf.length - 16)
		this.frame.init(this.buf.length - 37)
		this.dmp.init()
	}

	validate(): boolean {
		/*
		console.debug(
			'debug: packet.validate()\t\t',
			`root: ${this.root.validate()}\t\t`,
			`frame: ${this.frame.validate()}\t\t`,
			`dmp: ${this.dmp.validate()}`,
		)
			*/
		return this.root.validate() && this.frame.validate() && this.dmp.validate()
	}

	getSlots(): any {
		return this.dmp.getSlots()
	}

	setUniverse(universe: number): void {
		this.frame.setUniverse(universe)
	}

	setPriority(priority: number): void {
		this.frame.setPriority(priority)
	}

	setSourceName(name: string): void {
		this.frame.setSourceName(name)
	}

	incSeqNum(): void {
		this.frame.setSeqNum()
	}

	static readonly Options = FrameLayer.Options

	setOption(opt: keyof typeof FrameLayer.Options, val: boolean): void {
		this.frame.setOption(opt, val)
	}

	getOption(opt: keyof typeof FrameLayer.Options): boolean {
		return this.frame.getOption(opt)
	}

	setUUID(id: string): void {
		this.root.setUUID(id)
	}

	getUUID(): string {
		return this.root.getUUID()
	}

	getBuf(): Buffer {
		return this.buf
	}
}

export { Packet }
