import { InstanceBase, runEntrypoint, InstanceStatus, SomeCompanionConfigField } from '@companion-module/base'
import { GetConfigFields, type ModuleConfig } from './config.js'
import { InitVariableDefinitions, UpdateVariableDefinitions } from './variables.js'
import { UpgradeScripts } from './upgrades.js'
import { UpdateActions } from './actions.js'
import { UpdateFeedbacks } from './feedbacks.js'
import { UpdatePresets } from './presets.js'

import * as os from 'os'
import { v4 as uuidv4 } from 'uuid'
import { SACNServer } from './lib/server.js'
import { SACNReceiver } from './lib/receiver.js'
import { Packet } from './lib/packet.js'

import { Transitions } from './lib/transitions.js'
import { TIMER_SLOW_DEFAULT, TIMER_FAST_DEFAULT, SACN_DEFAULT_PORT } from './constants.js'
import { calculateMulticastAddress } from './lib/utils.js'

export class SACNInstance extends InstanceBase<ModuleConfig> {
	config!: ModuleConfig // Setup in init()
	public localIPs: { id: string; label: string }[] = []
	private server?: SACNServer
	private receiver?: SACNReceiver
	private packet?: Packet
	public transitions?: Transitions
	public variable_status?: boolean[]
	public packetlist = new Array(512).fill(0)
	public data = new Array(512).fill(0)
	private connectionLostTimer?: NodeJS.Timeout
	public currentStatus: InstanceStatus = InstanceStatus.Ok

	constructor(internal: unknown) {
		super(internal)

		// Get local IPs for Config
		this.localIPs = [{ id: '0.0.0.0', label: `Default: 0.0.0.0` }]
		const interfaces = os.networkInterfaces()
		const interface_names = Object.keys(interfaces)
		interface_names.forEach((nic) => {
			const ips = interfaces[nic]
			if (ips) {
				ips.forEach((ip) => {
					if (ip.family == 'IPv4') {
						this.localIPs.push({ id: ip.address, label: `${nic}: ${ip.address}` })
					}
				})
			}
		})
	}

	async init(config: ModuleConfig): Promise<void> {
		this.config = config

		this.updateStatus(InstanceStatus.Connecting, 'Initializing sACN connection...')

		await this.init_sacn()

		this.updateActions() // export actions
		this.updateFeedbacks() // export feedbacks
		this.updatePresets() // export Presets
		this.updateVariableDefinitions() // export variable definitions
	}

	// When module gets deleted
	async destroy(): Promise<void> {
		await this.terminate()
		this.log('debug', 'destroy')
	}
	async configUpdated(config: ModuleConfig): Promise<void> {
		this.config = config
		await this.terminate()
		await this.init_sacn()

		this.updateActions() // export actions
		this.updateFeedbacks() // export feedbacks
		this.updatePresets() // export Presets
		this.updateVariableDefinitions() // export variable definitions
	}

	getConfigFields(): SomeCompanionConfigField[] {
		return GetConfigFields(this)
	}

	updateActions(): void {
		UpdateActions(this)
	}
	updatePresets(): void {
		UpdatePresets(this)
	}

	updateFeedbacks(): void {
		UpdateFeedbacks(this)
	}

	updateVariableDefinitions(): void {
		UpdateVariableDefinitions(this)
	}

	initVariableDefinitions(): void {
		InitVariableDefinitions(this)
	}

	keepAlive(): void {
		if (this.server && this.packet) {
			this.packet.setOption('TERMINATED', false)
			this.server.send(this.packet)
			this.updateVariableDefinitions()
			this.checkFeedbacks()
		}
	}

	async terminate(): Promise<void> {
		if (this.server && this.packet) {
			this.packet.setOption('TERMINATED', true)
			this.server.send(this.packet)
		}

		if (this.server) {
			this.server.close()
		}

		if (this.receiver) {
			this.receiver.close()
		}

		delete this.server
		delete this.receiver
		delete this.packet
		this.packetlist = []
		this.data = []

		if (this.connectionLostTimer) {
			clearInterval(this.connectionLostTimer)
			delete this.connectionLostTimer
		}

		this.updateStatus(InstanceStatus.Disconnected, 'Terminated sACN connection...')
	}

	handleIncomingData(data: {
		sourceName: string[]
		sourceUUID: string[]
		fps: number[]
		priority: number[]
		timestamp: number
		packetsPerSecond: number
		slots: unknown[]
		activeSources?: { name: string; uuid: string; priority: number; fps: number }[]
	}): void {
		const values: any = {
			name: data.sourceName,
			uuid: data.sourceUUID,
			fps: data.fps,
			priority: data.priority,
			lastpackage: new Date(data.timestamp).toISOString(),
			packet_rate: data.packetsPerSecond,
			universe: this.config.universe,
			source_list: data.activeSources,
		}

		for (let i = 0; i < data.slots.length && i < this.data?.length; i++) {
			if (this.variable_status?.[i]) {
				// values[`value_chan_${i + 1}`] = data.slots[i]
				values[`channel${i + 1}_value`] = data.slots[i]
				this.data[i] = data.slots[i]
			}
		}

		this.setVariableValues(values)
		this.checkFeedbacks()
	}

	private async init_sacn(): Promise<void> {
		this.updateStatus(InstanceStatus.Connecting, 'Initializing sACN connection...')
		this.packetlist = new Array(512).fill(0)
		this.data = new Array(512).fill(0)

		if (!this.config.customIP) {
			this.config.host = calculateMulticastAddress(this.config.universe)
		}

		if (this.config.enableSender && !this.config.host) {
			this.updateStatus(InstanceStatus.BadConfig, 'Missing host for sender')
			return
		}

		let initialized = false

		if (this.config.mode === 'send') {
			if (this.config.host) {
				try {
					interface SACNServerOptions {
						address: string
						localAddress: string
						universe: number
						onError?: (error: Error) => void
					}

					this.server = new SACNServer({
						address: this.config.host,
						localAddress: this.config.localAddress,
						universe: this.config.universe || 0x01,
						onError: (error: Error) => {
							this.log('error', `sACN Server error: ${error.message}`)
							this.updateStatus(InstanceStatus.BadConfig, `Server error: ${error.message}`)
						},
					} as SACNServerOptions)

					this.packet = this.server.createPacket(512)
					this.data = this.packet.getSlots()

					this.packet.setSourceName(this.config.name || 'Companion App')
					this.packet.setUUID(this.config.uuid || uuidv4())
					this.packet.setUniverse(this.config.universe || 0x01)
					this.packet.setPriority(this.config.priority)
					this.packet.setOption('TERMINATED', true)

					for (let i = 0; i < this.data.length; i++) {
						this.data[i] = 0x00
					}

					this.transitions = new Transitions(
						this.data,
						this.config.timer_fast || TIMER_FAST_DEFAULT,
						this.keepAlive.bind(this),
					)

					this.connectionLostTimer = setInterval(() => {
						if (!this.transitions || !this.transitions.isRunning()) {
							this.keepAlive()
						}
					}, this.config.timer_slow || TIMER_SLOW_DEFAULT)

					initialized = true
					this.log(
						'info',
						`Transmitting to ${this.config.host}:${SACN_DEFAULT_PORT} on ${this.config.localAddress} for Universe ${this.config.universe}`,
					)
				} catch (error) {
					const err = error as Error
					this.log('error', `Failed to initialize sACN Server: ${err.message}`)
					this.updateStatus(InstanceStatus.BadConfig, `Server setup failed: ${err.message}`)
					return
				}
			} else {
				this.updateStatus(InstanceStatus.BadConfig, 'Missing host for sender')
			}
		}

		if (this.config.mode === 'receive') {
			try {
				this.receiver = new SACNReceiver({
					universe: this.config.universe,
					localAddress: this.config.localAddress,
					onError: (error: Error) => {
						this.updateStatus(InstanceStatus.BadConfig, `Receiver error: ${error.message}`)
					},
				})

				this.receiver.addListener((data) => {
					this.handleIncomingData(data)
				})

				initialized = true
				this.log(
					'info',
					`Listening on ${this.config.host}:${SACN_DEFAULT_PORT} on ${this.config.localAddress} for Universe ${this.config.universe}`,
				)
			} catch (error) {
				const err = error as Error
				this.log('error', `Failed to initialize sACN Receiver: ${err.message}`)
				this.updateStatus(InstanceStatus.BadConfig, `Receiver setup failed: ${err.message}`)
				return
			}
		}

		if (this.config.mode === 'none') {
			this.updateStatus(InstanceStatus.BadConfig, 'Missing mode')
		}

		if (initialized) {
			this.initVariableDefinitions()
			this.updateVariableDefinitions()
			this.updatePresets()
			this.updateFeedbacks()
			this.updateStatus(InstanceStatus.Ok)
		}
	}
}

runEntrypoint(SACNInstance, UpgradeScripts)
