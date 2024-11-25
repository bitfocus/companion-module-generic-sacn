## Streaming ACN Sender

This module will transmit SACN packets to the ip and universe you specify below. If you need more universes, add multiple sACN instances.

For multicast traffic, set the "Receiver IP" to the correct multicast address for the target universe:

 For Example:
 Universe 1: 239.255.0.1
 Universe 2: 239.255.0.1
 ...
 Universe 255: 239.255.0.255
 Universe 256: 239.255.1.0
 Universe 257: 239.255.1.1
 and so on.
