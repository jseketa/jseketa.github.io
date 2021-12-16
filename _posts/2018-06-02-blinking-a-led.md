---
published: true
title: Setting it all up
ribbon-text: STM32
layout: post
tags: 
  - STM32F103
  - embedded
  - blue pill
excerpt: "Setting up the necessary tools, writing a simple program to blink a led."
---

# Introduction
After some time sifting through code and making/breaking things, I decided to put stuff in writing.

Beginning was with an IDE. I migrated since to command line compiling and linking tools to better understand the background and how the things work.

Chip of choice is STM32F103C8 commonly known as the blue pill, named so after a size factor and PCB color.

Tools of choice: open source and widely used. GNU gcc for ARM microcontroller and GNU ld linker. For flashing the chip I use JLink for uploading the hex file.

Why does binary file format suck? When you need to put variables at exact memory address in address space, binary file format fills everything with blank space up until the declared variable,
and that can grow to a quite big size. When I discovered this, I was perplexed why my binary file was cca 1 GB in size, instead of a few KBs. That's why I switched to Intel hex format, or
more popularly called just hex. JLink flash utility supports binary AND hex formats, amongst others.

A little background about the tools needed. Compiler transforms source code to object files, and linker pieces the bits together to produce one ouput file, which is then ready to be uploaded
to the chip with a flash tool.

We're going to start with the simplest possible example. Blinking the led inaccurately and with an uninitialized clock source, which defaults to 8 MHz internal RC clock.

What does it tell us? That the linker, compiler and uploader work correctly. With a proper stepping stone, we are always free to break and make things, for example "code refactoring",
fancy name for rewriting code because you don't like it, think it's ugly or it's a depressing Saturday afternoon.

# Entry to the main program
After compiler and linker together make a salad, where does it start? Does it start in a random chunk of memory, and if not, how can I tell them where to exactly start?

For that we have a global start function as an entry to the program.
If a global directive is missing for a symbol, that symbol will not be placed in the object code's export table, so linker has no way of knowing about the symbol. 
We also need to put the address of the stacktop right at the beginning of memory space. After that comes the reset address, where the microcontroller ALWAYS ends up first after resetting.

After we have defined global entry in the program (for the linker) and reset entry, we can add a path that leads to our main function (entry to our c part of the program).
```asm
.global _start
_start:
stacktop: .word 0x20001000
.word reset
.word hang

reset:
	bl notmain
	b hang
.thumb_func
hang:   b .
```
# Recommendation
I can also recommend a really good github repository from dwelch67 that got me on the right track.
[dwelch67's repository](https://github.com/dwelch67/stm32_samples/tree/master/STM32F103C8T6)

Majority of code during this post will be explaining the code that can be found in the link above, with simplifications and modifications.

I am not going to say to copy all from somebody else. But for the beginning I recommend it because they made it work, and it should also work when compiled and flashed.
After we have that working base example, then comes the creativity and design choices in question.

# Functions for direct register access
We are going to need a function to directly access registers and also fill them with data. Functions used are assembler functions PUT32 and GET32.
Assembler functions can be used directly in C program code and first four registers are filled with function paramaters. That means that the r0 registers will be filled with the first function
parameter up until r3. Square brackets signify that the value in the register is meant as an address. .globl keyword signifies that the function is global and accessible anywhere.
```asm
.globl PUT32
PUT32:
	str r1,[r0]
	bx lr

.globl GET32
GET32:
	ldr r0,[r0]
	bx lr
	
.globl dummy
	dummy:
	bx lr
```
# Getting the led up and running
Bluepill board has a led light connected to the PC13 pin. We need to enable clock for port C, initialize the pin as a push pull output, then toggle the pin.
```c
void PUT32 ( unsigned int, unsigned int );
unsigned int GET32 ( unsigned int );
void dummy ( unsigned int );

//define address base for port C
#define GPIOCBASE 0x40011000
//define address base for clock control
#define RCCBASE 0x40021000

//our entry point into the program, defined in our assembler file
int notmain ( void )
{
	unsigned int ra;
	unsigned int rx;

	ra=GET32(RCCBASE+0x18);
	ra|=1<<4; //enable port c
	PUT32(RCCBASE+0x18,ra);
	//config
	ra=GET32(GPIOCBASE+0x04);
	ra&=~(3<<20);   //PC13
	ra|=1<<20;      //PC13
	ra&=~(3<<22);   //PC13
	ra|=0<<22;      //PC13
	PUT32(GPIOCBASE+0x04,ra);

	for(rx=0;;rx++)
	{
		PUT32(GPIOCBASE+0x10,1<<(13+0));
		for(ra=0;ra<200000;ra++) dummy(ra);
		PUT32(GPIOCBASE+0x10,1<<(13+16));
		for(ra=0;ra<200000;ra++) dummy(ra);
	}
	return(0);
}
```
Bits that interest us:

| RCC_APB2ENR  | ... | bit 4  | ... |
|--------------|-----|--------|-----|
| 0x018 offset | ... | IOPCEN | ... |

Taken from page 153 of the manual. We are putting 1 into the bit 4 of the APB2 clock enable register to turn on the clock for the port C peripherals.

Link for creating the tables: https://ozh.github.io/ascii-tables/

GPIO configuration registers are split into two registers: Low and High. Low register contain the pins from 0 to 7 and High contain pins from 8 to 15. 

Bits that interest us:

|  GPIOx_CRH  | ... | Bits 23-22 | Bits 21-20  | ... |
|-------------|-----|------------|-------------|-----|
| 0x04 offset | ... | CNF13[1:0] | MODE13[1:0] | ... |

Taken from page 188 of the manual. We are setting the values in the bits 20-21 for the pin mode and 22-23 for the configuration mode of the pin.

On the page 167 we may read about valid bit combos for those four bits.

| CNFy[1:0]  |    In input mode (MODE[1:0]=00)    |       In output mode(MODE[1:0]>00)       |
|------------|------------------------------------|------------------------------------------|
| for CRH    | 00: Analog mode                    | 00: General purpose output Push-pull     |
| y = 8...15 | 01: Floating input                 | 01: General purpose output Open-drain    |
| for CRL    | 10: Input with pull-up / pull-down | 10: Alternate function output Push-pull  |
| y = 0...7  | 11: Reserved state                 | 11: Alternate function output Open-drain |


| MODEy[1:0] |                                   |
|------------|-----------------------------------|
| for CRH    | 00: Input mode (reset state)      |
| y = 8...15 | 01: Output mode, max speed 10 MHz |
| for CRL    | 10: Output mode, max speed 2 MHz  |
| y = 0...7  | 11: Output mode, max speed 50 MHz |



For writing your own library, you will need to familiarize yourself with the datashet of the microcontroller, in this case STM32F103C8 RM0008 Reference Manual. The datasheet will be
extensively used throughout the posts.

Up until now we have two files: startup.s and programentry.c. Now we need to setup an environment for compiling, linking and flashing.

# Linker file
Linker file looks like this:
```
	MEMORY
	{
		rom : ORIGIN = 0x08000000, LENGTH = 0x1000
		ram : ORIGIN = 0x20000000, LENGTH = 0x1000
	}

	SECTIONS
	{
		.text : { *(.text*) } > rom
		.rodata : { *(.rodata*) } > rom
		.bss : { *(.bss*) } > ram
	}
```
MEMORY keyword tells us how the memory is organized and how big it is. SECTIONS keyword defines where the types of program data should go. In this example we tell the linker that
.text and .rodata should go in ROM part of the memory, and .bss data in the RAM part of the memory.
 (.bss) => segment for uninitialized data. 
 (.data) => segment for initialized data here by default.
 (.rodata) => segment for constant data.
 
I am using GNU ld linker, as a good open source choice widely used. I am not trying to use black magic or obscure tools.

# Makefile
Minimum unix tools required are make and rm, both used in the makefile.

Let's go through the makefile.
Here, we are just declaring some variables to make the makefile more readable.
```
ARMGNU = arm-none-eabi

AOPS = --warn --fatal-warnings -mcpu=cortex-m3
COPS = -Wall -Werror -O2 -nostdlib -nostartfiles -ffreestanding -mcpu=cortex-m0
```
Here is the first "recipe" in linker terminology, that can be invoked with "make all" or just "make". Invoking only "make" will execute the first found recipe.
```
	all : output.hex
```
Here is the second recipe which is used for a cleanup of produced files, leaving only the source files intact.
```
clean:
	rm -f *.bin
	rm -f *.o
	rm -f *.elf
	rm -f *.list
	rm -f *.bc
	rm -f *.opt.s
	rm -f *.norm.s
	rm -f *.hex
```
We are defining rules for compilation of our two source files. startup.o needs startup.s and that's why we are declaring .s file on the right side as a dependency, and building the
file with an assembler (-as, or full blown command arm-linux-gnueabi-as)
```
startup.o : startup.s
	$(ARMGNU)-as $(AOPS) startup.s -o startup.o
```
File programentry.c is being compiled here with a gcc compiler. It is also being specified that we are using thumb instruction set (-mthumb), cpu Cortex-M3 (-mcpu=cortex-m3), architecture
ARMv7 (armv7-m), that the input file is programentry.c and output file should be programentry.o.
```
programentry.o : programentry.c	
	$(ARMGNU)-gcc $(COPS) -mthumb -mcpu=cortex-m3 -march=armv7-m -c programentry.c -o programentry.o
```

Here is the build of the final output file that is going to be flashed on the chip. Our final output file depends on three files. Linker file linker.ld and two object files startup.o and
programentry.o compiled from the source files.
the source files	
```
	output.hex : linker.ld startup.o programentry.o
```
Here are the objects linked according to linker file linker.ld and output is an elf file.
```
		$(ARMGNU)-ld -o output.elf -T linker.ld startup.o programentry.o
```
Object dump (objdump) is used to dump the contents from an .elf file to the .list file.
```
		$(ARMGNU)-objdump -D output.elf > output.list
```
Finally, from the .elf file we get the final output file with objcopy.
```
		$(ARMGNU)-objcopy output.elf output.hex -O ihex
```

# Hardware used for flashing the chip
I am using Segger's J-link to flash the chip via the SWD (Single Wire Debugging) interface and am also using JLink v5.10u, an older version of the flashing software. If it works, there's no
reason to continuously update.

Hardware connections are as follows:

	J-link Pin 1 = VCCref => Pin 1 SWD Connector
	J-link Pin 7 = SWDIO => SWDIO Pin
	J-link Pin 9 = SWCLK => SWCLK Pin
	J-link Pin 13 = SWO => PB3 Pin
	J-link Pin 19 = Target power supply => 3v3 pin of the microcontroller
	J-link Pin 4 = Ground Pin => connect to any GND pin of the microcontroller

To enable the J-link to power the target, the following command must be input through the J-link command line: "power on perm".

To connect to the microcontroller, I run the J-link flash program through the command line. Here is the output.
```bat
	Microsoft Windows [Version 6.1.7601]
	Copyright (c) 2009 Microsoft Corporation.  All rights reserved.

	C:\Users\Bunny>jlink
	SEGGER J-Link Commander V5.10u (Compiled Mar 17 2016 18:57:13)
	DLL version V5.10u, compiled Mar 17 2016 18:56:47

	Connecting to J-Link via USB...O.K.
	Firmware: J-Link ARM V8 compiled Nov 28 2014 13:44:46
	Hardware version: V8.00
	S/N: 58001139
	License(s): RDI,FlashDL,FlashBP,JFlash
	VTref = 4.801V


	Type "connect" to establish a target connection, '?' for help
	J-Link>connect
	Please specify device / core. <Default>: STM32F103C8
	Type '?' for selection dialog
	Device>
	Please specify target interface:
	  J) JTAG (Default)
	  S) SWD
	TIF>s
	Specify target interface speed [kHz]. <Default>: 4000 kHz
	Speed>
	Device "STM32F103C8" selected.


	Found SWD-DP with ID 0x1BA01477
	Found SWD-DP with ID 0x1BA01477
	Found Cortex-M3 r1p1, Little endian.
	FPUnit: 6 code (BP) slots and 2 literal slots
	CoreSight components:
	ROMTbl 0 @ E00FF000
	ROMTbl 0 [0]: FFF0F000, CID: B105E00D, PID: 001BB000 SCS
	ROMTbl 0 [1]: FFF02000, CID: B105E00D, PID: 001BB002 DWT
	ROMTbl 0 [2]: FFF03000, CID: B105E00D, PID: 000BB003 FPB
	ROMTbl 0 [3]: FFF01000, CID: B105E00D, PID: 001BB001 ITM
	ROMTbl 0 [4]: FFF41000, CID: B105900D, PID: 001BB923 TPIU-Lite
	Cortex-M3 identified.
	J-Link>power on perm
	J-Link>
```
We are using the "loadfile" command to load the hex file onto the chip. After flashing the chip, we issue "r" for reset and "g" for go command. The led should inaccurately, but happily blink.

