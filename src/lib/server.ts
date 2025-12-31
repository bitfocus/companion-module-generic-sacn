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
	private errorCallback?: (error: Error) => void

	constructor({
		address,
		port = SACN_DEFAULT_PORT,
		localAddress = '',
		universe = 1,
		onError,
	}: {
		address: string
		port?: number
		localAddress?: string
		universe?: number
		onError?: (error: Error) => void
	}) {
		this.seqNum = 0
		this.port = port
		this.address = address
		this.localAddress = localAddress
		this.universe = universe
		this.errorCallback = onError

		this.socket = dgram.createSocket('udp4')

		this.socket.on('error', (err) => {
			console.error('sACN Server socket error:', err)
			if (this.errorCallback) {
				this.errorCallback(err)
			}
		})

		if (this.localAddress) {
			this.socket.bind({ address: this.localAddress }, () => {
				try {
					// Set multicast interface for outgoing packets
					this.socket.setMulticastInterface(this.localAddress)
					console.log(
						`info`,
						`Initializing Transmitting to ${this.address}:${this.port} on ${this.localAddress} for Universe ${this.universe}`,
					)
				} catch (err) {
					const error = err as Error
					console.error('sACN Server socket setup error:', error.message)
					if (this.errorCallback) {
						this.errorCallback(error)
					}
				}
			})
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
