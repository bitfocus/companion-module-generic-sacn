// Extremely basic SACN server for sending SACN packets
const SACN_DEFAULT_PORT = 5568

import * as dgram from 'dgram'
import { Packet } from './packet.js'

class SACNServer implements SACNServer {
	socket: dgram.Socket
	seqNum: number
	port: number
	address: string
	localAddress: string
	universe: number

	constructor({
		address,
		port = SACN_DEFAULT_PORT,
		localAddress = '',
		universe = 1,
	}: {
		address: string
		port?: number
		localAddress?: string
		universe?: number
	}) {
		this.seqNum = 0
		this.port = port
		this.address = address
		this.localAddress = localAddress
		this.universe = universe

		this.socket = dgram.createSocket('udp4')

		if (this.localAddress) {
			this.socket.bind({ address: this.localAddress }, () => {
				// Optional: Set multicast interface for outgoing packets
				this.socket.setMulticastInterface(this.localAddress)
			})
			console.log(
				`info`,
				`Initializing Transmitting to ${this.address}:${this.port} on ${this.localAddress} for Universe ${this.universe}`,
			)
		}
	}

	createPacket(slots: number): Packet {
		return new Packet(slots)
	}

	send(packet: Packet): void {
		this.socket.send(packet.getBuf(), this.port, this.address, () => {
			packet.incSeqNum()
		})
	}
	close(): void {
		this.socket.close()
	}
}

export { SACNServer }
