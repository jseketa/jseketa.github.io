+++
title = "OGame Scraper"
weight = 3
description = "Reverse-engineering a browser game's login flow and wrapping it in small Node.js services - auth tokens, cookie jars, and a universe lookup API."

[extra]
year = "2020"
status = "Archived"
stack = ["Node.js", "Express", "REST"]
+++
A scraper for [OGame](https://en.wikipedia.org/wiki/OGame), built to pull account
and universe data out of a game that offers no public API.

The interesting part was never the scraping --- it was the **two-stage login**.
Authentication happens against the Gameforge platform first, which returns a
bearer token, and only then can you enumerate the game accounts bound to that
player. Working that out meant recording the flow in Chrome DevTools and
replaying it by hand until the requests came back clean.

From there it grew into a set of small services, each with a single job and its
own test coverage --- starting with universe lookup.

## What I'd do differently

`request-promise` was deprecated within months of my writing this; today it would
be `fetch` or `undici`. The credentials in the original post were also inlined
directly in the source --- they should have been environment variables from day
one, and the post has since been corrected to show that.

