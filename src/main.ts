import { InstanceBase, runEntrypoint, InstanceStatus, SomeCompanionConfigField } from '@companion-module/base'
import { GetConfigFields, type ModuleConfig } from './config.js'
import { InitVariableDefinitions, UpdateVariableDefinitions } from './variables.js'
import { UpgradeScripts } from './upgrades.js'
import { UpdateActions } from './actions.js'
import { UpdateFeedbacks } from './feedbacks.js'
import { UpdatePresets } from './presets.js'

import { v4 as uuidv4 } from 'uuid'
import { SACNServer } from './lib/server.js'
import { SACNReceiver } from './lib/receiver.js'
import { Packet } from './lib/packet.js'

import { Transitions } from './lib/transitions.js'
import { TIMER_SLOW_DEFAULT, TIMER_FAST_DEFAULT, SACN_DEFAULT_PORT } from './constants.js'
import { calculateMulticastAddress, getLocalIPs } from './lib/utils.js'

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
	private reconnectTimer?: NodeJS.Timeout
	public currentStatus: InstanceStatus = InstanceStatus.Ok

	constructor(internal: unknown) {
		super(internal)

		// Get local IPs for Config-Dropdown
		this.localIPs = getLocalIPs()
	}

	async init(config: ModuleConfig): Promise<void> {
		this.config = config

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
		this.clearReconnectTimer()
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

		this.log('info', `Terminated sACN connection...`)
		//this.updateStatus(InstanceStatus.Disconnected, 'Terminated sACN connection...')
	}

	private isRecoverableSocketError(error: unknown): boolean {
		let code = ''
		if (typeof error === 'object' && error !== null && 'code' in error) {
			code = String((error as { code?: unknown }).code)
		}
		return code === 'EADDRNOTAVAIL' || code === 'ENODEV'
	}

	private handleSocketError(error: unknown, mode_text = 'sACN'): void {
		const err = error as Error
		this.log('error', `sACN ${mode_text} error: ${err.message}`)
		//this.updateStatus(InstanceStatus.BadConfig, `${mode_text} error: ${err.message}`)
		if (this.isRecoverableSocketError(err)) {
			this.scheduleReconnect(err.message)
			return
		}
		void this.terminate()
	}

	private clearReconnectTimer(): void {
		if (this.reconnectTimer) {
			clearTimeout(this.reconnectTimer)
			delete this.reconnectTimer
		}
	}

	private scheduleReconnect(reason: string): void {
		this.log('warn', `${reason} - retrying in 5 seconds`)
		this.updateStatus(InstanceStatus.ConnectionFailure, reason)

		if (this.reconnectTimer) return

		void this.terminate()
		this.reconnectTimer = setTimeout(() => {
			this.reconnectTimer = undefined
			void this.init_sacn()
		}, 5000)
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
		let initialized = false
		let mode_text = ''

		try {
			this.clearReconnectTimer()

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

			if (this.config.mode === 'send') {
				mode_text = 'Server'
				this.server = new SACNServer({
					address: this.config.host,
					localAddress: this.config.localAddress,
					universe: this.config.universe || 0x01,
					onError: (error: Error) => {
						this.handleSocketError(error, mode_text)
					},
				})

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
			}

			if (this.config.mode === 'receive') {
				mode_text = 'Receiver'
				this.receiver = new SACNReceiver({
					universe: this.config.universe,
					localAddress: this.config.localAddress,
					onError: (error: Error) => {
						this.handleSocketError(error, mode_text)
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
			}

			if (this.config.mode === 'none') {
				this.updateStatus(InstanceStatus.BadConfig, 'Missing mode')
			}

			if (initialized) {
				this.initVariableDefinitions()
				this.updateVariableDefinitions()
				this.updatePresets()
				this.updateFeedbacks()

				this.updateStatus(InstanceStatus.Ok, `${mode_text} running`)
			}
		} catch (error) {
			const err = error as Error
			//this.log('error', `Failed to initialize sACN ${mode_text}: ${err.message}`)
			if (this.isRecoverableSocketError(err)) {
				this.scheduleReconnect(err.message)
				return
			}
			this.updateStatus(InstanceStatus.BadConfig, `${mode_text} error: ${err.message}`)
			return
		}
	}
}

runEntrypoint(SACNInstance, UpgradeScripts)
