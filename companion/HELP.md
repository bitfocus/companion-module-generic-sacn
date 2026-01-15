## Streaming ACN (sACN / E1.31) — Help

This module can transmit (send) or receive sACN (E1.31) DMX data. Use one module instance per universe (or one per target IP/universe combination).

---

## Config

- **universe**: sACN universe number to use for send/receive. (Range: 1–63999)

- **Interface**: the local network interface IP to bind to.

- **mode**: Choose the module mode. `send` Transmit sACN packets. `receive` Listen for sACN packets and expose them as variables/feedback.

- **name**: Source Name used when transmitting (visible to receivers).

- **uuid**: Source UUID used when transmitting. Defaults to a generated UUID. Should be unique for each transmitting instance.

- **priority**: sACN priority value (default 100, Range: 1–201) . Higher values take precedence when multiple sources send the same universe.

- **customIP**: If enabled, you can specify a custom target. If disabled the module calculates the multicast group from the Universe automatically (shown in the UI as Active Target Address).

- **host**: (IP) to send to (use for unicast or a custom multicast group).

- **variables**: A channel range string that controls which DMX channels are exposed as Companion variables. Example formats: `1-512`, `1-5,34,100-130`. The module uses this range to create `channel<n>_value` variables for each selected channel.

---

## Actions

All actions operate on DMX channels numbered 1–512 (start channel). Values are 8-bit (0–255) unless specified as 16-bit.

- **Set/Fade Value (single)**
  - Set or fade a single channel to a value.
- **Set/Fade Value (single) 16-bit**
  - Set/fade a 16-bit value for 16-bit channel.

- **Set/Fade Value (single) percentage (0–100%)**
  - Set/fade a value ranging from 0-100% to 8-bit or 16-bit channel.

- **Set/Fade Values (multiple)**
  - Set or fade multiple channels starting at a given channel with a space-separated list of values.

- **Offset Value (single)**
  - Add (+) or subtract (−) a number from a single channel's current value.

- **Offset Value (single) 16-bit**
  - Add/subtract a 16-bit offset to a 16-bit channel value.
- **Offset Value (multiple)**
  - Apply offsets (+/−) to a sequence of channels starting at `start` using a space-separated list of offsets.

---

## Feedbacks

The module exposes feedbacks you can use to change button colours or styles based on received/transmitted data.

- **Channel Intensity**
  - Returns dynamic style (bgcolor + color) based on channel brightness (0–255).

- **Channel RGB**
  - Changes the button's color according to the channel RGB Values (supports 8-bit and 16-bit mode)

- **When channel matches a value**
  - Returns true when the channel's current value equals the configured value.

- **When channel value is greater than**
  - Returns true when the channel value is greater than the threshold.

---

## Variables

The module exposes both status variables (source metadata) and per-channel variables depending on the `variables` range you configure.

Static/status variables (always available):

- `name` — Name of the Source
- `uuid` — UUID of the Source
- `fps` — Speed of the Source
- `priority` — Priority of the Source
- `lastpackage` — Last sACN packet (timestamp or sequence)
- `packet_rate` — Packets per second
- `universe` — Universe number
- `source_list` — JSON object of active sources seen (receive mode)

Channel variables (dynamic):

- `channel<n>_value` — Value (0–255) of channel `n` (only created if `variables` setting includes that channel). For example `channel1_value`, `channel404_value`.

How to expose channels:

- Set the `Variables to expose` field in the module config to a range string such as `1-512` or `1-5,34,100-130`. The module will parse that and create `channel<n>_value` variables for each included channel.

Updating variable values:

- The module will keep `channel<n>_value` updated with the current channel values (used by actions, other modules, or displayed in the Variables view).

---

## Tips and examples

- Sending to a multicast universe (automatic): set `mode` to `send`, set `universe` to 1. Leave `customIP` off and the UI will show the computed multicast target (239.255.x.x).
- Sending to a single receiver (unicast): enable `customIP` and set `host` to the receiver's IP.
- Expose only channels 1–100 as variables: set `variables` to `1-100` to reduce variable count.
- Fade channel 5 to 200 over 1 second using an action:
  - Action: `setValue` with `channel=5`, `value=200`, `duration=1000`.

If you need more universes, create additional module instances and set each to the required universe/target.

**Multicast**

- Sending to a multicast universe (automatic): set `mode` to `send`, set `universe` to 1. Leave `customIP` off and the UI will show the computed multicast target (239.255.x.x).

- or manually enter a multicast address in the range `239.255.0.0` to `239.255.255.255`.  
  All devices listening to that multicast group and universe will receive the data.

  **Examples**
  - For **Universe 1**: `239.255.0.1`
  - For **Universe 10**: `239.255.0.10`
  - For **Universe 256**: `239.255.1.0`
  - For **Universe 513**: `239.255.2.1`

  ***

### Notes

- If you want to send to multiple universes, create multiple module instances, each with its own universe and (optionally) multicast address.
- Make sure your network and receivers support multicast if you use it.
- The "Variables to expose" setting allows you to limit which DMX channels are available as variables for triggers or feedback in Companion.

---
