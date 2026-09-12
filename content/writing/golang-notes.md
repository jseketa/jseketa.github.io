+++
title = "Golang notes"
date = 2022-10-16
path = "golang-notes"
description = "Taking notes while learning Go."

[taxonomies]
tags = ["golang"]

[extra]
project = "learning-go"
+++
## Introduction

Installing the Go environment has never been easier: download the executable,
run it, and you have a working installation.

Go is an open source programming language from Google, originally developed for
Google's own needs --- large codebases, many engineers, slow builds.

## First program

Every Go program starts in `package main`, with a `main` function as the entry
point. The `fmt` package (short for *formatting*) handles input and output.

```go file=hello.go
package main

import "fmt"

func main() {
	fmt.Println("Hello world!")
}
```

Run it directly with `go run hello.go`, or compile a binary with `go build`.

<!-- TODO(josip): pick this back up - next up was probably types and slices. -->

