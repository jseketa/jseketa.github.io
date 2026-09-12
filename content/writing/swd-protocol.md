+++
title = "How SWD actually works"
date = 2026-08-21
path = "swd-protocol"
description = "What the two wires between the J-Link and the blue pill are actually saying to each other."

[taxonomies]
tags = ["embedded", "stm32", "swd"]

[extra]
project = "stm32-bare-metal"
present = true
+++

In the first post I wired six pins between the J-Link and the blue pill, typed
`connect`, and the chip answered. That was enough to get a LED blinking, but
"it answered" is not an explanation. Two of those six wires do all the work,
and I wanted to know what they were actually saying.

## Why two wires and not five

JTAG wants TCK, TMS, TDI and TDO, and usually NJTRST as well. On a 48-pin part
that is a lot of pins to spend on something you only need while developing.

Serial Wire Debug does the same job with two: **SWDIO** for data and **SWCLK**
for the clock. On the STM32F103 the two protocols share pins, and the debug
block that arbitrates between them is called the SWJ-DP:

| Pin  | JTAG   | SWD      |
|------|--------|----------|
| PA13 | JTMS   | SWDIO    |
| PA14 | JTCK   | SWCLK    |
| PA15 | JTDI   | free     |
| PB3  | JTDO   | TRACESWO |
| PB4  | NJTRST | free     |

Choosing SWD hands PA15 and PB4 back to you as ordinary GPIO, and leaves PB3
available for trace output if you want it. There is a way to lose all of this
permanently, which I get to at the end.

## The wire protocol

SWCLK is always driven by the host. SWDIO is bidirectional, and both ends
follow the same rule: drive SWDIO on the falling edge of SWCLK, sample it on
the rising edge.

### Turnaround

Because one line carries both directions, there has to be a moment where
nobody drives it while ownership changes. That is the **turnaround** period,
one clock cycle by default, and it happens twice in every transaction: after
the host finishes its request, and again after the target finishes its reply.

Drawn out, one whole read looks like this:

```wave caption="A read transaction; P is the parity bit. The two z regions are the turnarounds: neither end is driving, which is what makes a single-wire bidirectional bus possible."
{ "signal": [
  { "name": "SWCLK",     "wave": "P.............|............" },
  { "name": "SWDIO",     "wave": "03.......z4..5|.......6z0..", "data": ["8-bit request", "ACK", "32-bit data", "P"] },
  {},
  { "name": "driven by", "wave": "5........z6...|........z5..", "data": ["host", "target", "host"] }
],
"config": { "skin": "narrow" }
}
```

### Bit-banging it

Two more line states matter:

- **Line reset** --- at least 50 clock cycles with SWDIO held high. This puts
  the debug port into a known state, and is how every session starts.
- **Idle** --- clocks with SWDIO low. The target needs these to finish posted
  work, which turns out to matter more than it sounds like it should.

Bit-banging the physical layer is two functions:

```c file=swd.c
static void swd_clock_out(int bit)
{
	swclk_low();          /* target samples on the rising edge, so set up now */
	swdio_write(bit);
	delay();
	swclk_high();
	delay();
}

static int swd_clock_in(void)
{
	int bit;

	swclk_low();          /* target drives SWDIO here */
	delay();
	swclk_high();
	bit = swdio_read();   /* sample on the rising edge */
	delay();

	return bit;
}
```

## Convincing the chip to speak SWD

After power-up the SWJ-DP may still be listening for JTAG. Switching it over
is a fixed incantation:

1. Line reset: 50 or more clocks, SWDIO high.
2. Send the 16-bit JTAG-to-SWD select sequence `0xE79E`, least significant bit
   first, so `0111 1001 1110 0111` goes out on the wire.
3. Line reset again.
4. Read the DP IDCODE register. A sane value back means you are in SWD.

```text
reset    1111111111 ... 1111111111    (>= 50 cycles, SWDIO high)
select   0111100111100111             (0xE79E, LSB first)
reset    1111111111 ... 1111111111    (>= 50 cycles)
read     DP register 0x00 (IDCODE)
```

The mirror-image sequence `0xE73C` switches back to JTAG, which I have never
had a reason to use.

## One transaction

Everything after the handshake has the same shape: an 8-bit request from the
host, a 3-bit acknowledgement from the target, and a 33-bit data phase, with a
turnaround cycle either side of the acknowledgement.

### The request

The request, again LSB first:

| Bit | Name   | Meaning                         |
|-----|--------|---------------------------------|
| 0   | Start  | always 1                        |
| 1   | APnDP  | 0 = debug port, 1 = access port |
| 2   | RnW    | 0 = write, 1 = read             |
| 3   | A[2]   | register address bit 2          |
| 4   | A[3]   | register address bit 3          |
| 5   | Parity | even parity over bits 1 to 4    |
| 6   | Stop   | always 0                        |
| 7   | Park   | always 1                        |

Or as it sits on the wire:

```bytefield src=swd-request caption="The 8-bit request, least significant bit first."
```

### Building it

Only two address bits, because the register space is deliberately tiny. The
`SELECT` register does the rest of the addressing. Building a request is four
lines:

```c file=swd.c
static uint8_t swd_request(int ap, int read, uint8_t addr)
{
	int a2 = (addr >> 2) & 1;
	int a3 = (addr >> 3) & 1;
	int parity = ap ^ read ^ a2 ^ a3;

	return (1      << 0)   /* start */
	     | (ap     << 1)
	     | (read   << 2)
	     | (a2     << 3)
	     | (a3     << 4)
	     | (parity << 5)
	     | (0      << 6)   /* stop */
	     | (1      << 7);  /* park */
}
```

### The acknowledgement and the data

The acknowledgement is three bits, LSB first:

| Value   | Name  | What it means                                   |
|---------|-------|-------------------------------------------------|
| `0b001` | OK    | proceed to the data phase                       |
| `0b010` | WAIT  | busy, retry the same transaction                |
| `0b100` | FAULT | something is wrong; read CTRL/STAT and clear it |

Then 32 data bits, LSB first, followed by one even parity bit covering those
32. On a write the host sends them, on a read the target does. Get the parity
wrong and the target quietly ignores the write, which is a miserable bug to
find.

## Reading memory

Two register banks sit behind that interface. The **DP**, or Debug Port, is
the SWD end itself: IDCODE, ABORT, CTRL/STAT, SELECT, RDBUFF. The **AP**, or
Access Port, is the bridge onto the chip's bus. The one you want is the
MEM-AP, and three of its registers matter: CSW for configuration, TAR for the
target address, DRW for the data.

Reading a single word goes like this:

```text
1. write DP SELECT   choose AP 0, register bank 0
2. write AP CSW      32-bit access, auto-increment off
3. write AP TAR      0x08000000
4. read  AP DRW      returns the PREVIOUS result, not this one
5. read  DP RDBUFF   the word you actually asked for
```

Step 4 is the part that catches everyone. AP reads are posted: the transaction
kicks off the read and hands back whatever the last one produced. The value
you want arrives on the next read, or out of RDBUFF. Write a driver that reads
DRW once and trusts it, and you get a plausible-looking word belonging to the
previous operation. That is an evening gone.

## The number in the log

The first post has this line in it, straight out of J-Link Commander:

```text
Found SWD-DP with ID 0x1BA01477
```

At the time I copied past it. It decodes cleanly:

| Bits    | Value    | Meaning                      |
|---------|----------|------------------------------|
| 31 - 28 | `0x1`    | version 1                    |
| 27 - 12 | `0xBA01` | part number: Cortex-M3 SW-DP |
| 11 - 1  | `0x23B`  | designer: ARM (JEP106)       |
| 0       | `1`      | always 1                     |

`0xBA01` is the serial wire debug port; the JTAG one is `0xBA00`. So that line
is the chip confirming the protocol switch worked --- which is exactly the
thing I had assumed rather than checked.

## SWO, the optional third wire

The wiring list in the first post has SWCLK and SWDIO, and then SWO going to
PB3. That one is not part of SWD at all.

SWO is Serial Wire Output: a one-way trace channel from the ITM, through the
TPIU, out on PB3. It gives you a printf-shaped debug channel without spending
a USART on it, and without the timing damage a breakpoint does. It is
independent of the two-wire protocol above --- SWD runs perfectly well with
PB3 unconnected, which is how I had it for a long time before wiring it.

<!-- TODO(josip): if you ever captured SWO output, a screenshot would sit well here. -->

## How to lock yourself out

The SWJ-DP configuration lives in `AFIO_MAPR`, in the `SWJ_CFG[2:0]` field:

| Value | Effect                                              |
|-------|-----------------------------------------------------|
| `000` | full SWJ: JTAG and SWD both available (reset state) |
| `001` | full SWJ, but NJTRST released as GPIO               |
| `010` | JTAG disabled, SWD enabled: frees PA15, PB3, PB4    |
| `100` | JTAG **and** SWD both disabled                      |

`010` is the useful one. `100` is how you brick a development board: the
moment that write lands the debugger has no way in, and it lands again a few
milliseconds after every reset.

The way out is BOOT0. Pulling it high and resetting starts the factory
bootloader, which never touches `AFIO_MAPR`, so the debug port stays alive
long enough to erase the flash. Connect-under-reset does the same job by
grabbing the port in the gap before your code runs. Neither is enjoyable at
midnight, so it is worth knowing before you write to that field rather than
after.

## Where the real answers are

Two documents, and they disagree with nobody:

- **ARM Debug Interface Architecture Specification, ADIv5** (IHI0031) --- the
  protocol itself: framing, parity, and the DP and AP register maps.
- **RM0008**, the STM32F103 reference manual --- the chip-specific half: pin
  mapping, `AFIO_MAPR`, and what the trace hardware will do.

None of this is anything the datasheets do not already say. It just took me
longer than I expected to find where they said it.
