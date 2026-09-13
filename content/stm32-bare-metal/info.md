+++
title = "STM32 Bare Metal"
weight = 4
description = "Driving an STM32F103 \"blue pill\" with no HAL, no IDE, and no libraries - just C, ARM assembly, a linker script, and a Makefile."

[extra]
year = "2018"
status = "Archived"
stack = ["C", "ARM asm", "GNU ld", "J-Link"]
+++
An exercise in removing abstraction. I started this on an IDE and moved to
command-line compiling and linking specifically to understand what the IDE had
been doing for me.

The target is the **STM32F103C8** --- the "blue pill", named for its board size
and PCB colour. The toolchain is deliberately boring and open source: `gcc` for
ARM, GNU `ld` for linking, and a Segger J-Link flashing over SWD.

Working at this level means the reference manual is the API. Turning on a single
LED requires enabling the clock for port C, configuring PC13 as a push-pull
output, and toggling the pin --- each one a specific bit in a specific register,
looked up by page number in RM0008.

```note title="Learned the hard way"
A raw binary pads with blank space all the way up to any variable placed at a
fixed address, which turned a few-KB program into a ~1 GB file. Intel HEX solves
this, which is why everything here targets `.hex`.
```

Credit where it's due --- [dwelch67's STM32 samples](https://github.com/dwelch67/stm32_samples/tree/master/STM32F103C8T6)
got me on the right track, and much of the early code here is that work,
simplified and modified.

