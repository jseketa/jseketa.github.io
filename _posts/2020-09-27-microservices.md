---
published: true
title: Microservices
layout: post
ribbon-text: Nodejs
tags: 
  - nodejs
  - microservices
excerpt: "Documenting the microservice for listing the existing universes"
---

# Microservices

Checking if the universe exists with test cases and code coverage.

**ROUTE:** /universe/exists

**METHOD:** POST

**NAME:** Universe exists

**PORT:** 4000

**Description:** 

- accepted arguments
	- name
	- language
- returns
	- if server exists return server data as json
	- if server does not exist return error message

**ERRORS:**

- server not reachable
- server not found

Example server data:
```json
{
"language":"ar",
"number":117,
"name":"Quantum",
"playerCount":1005,
"playersOnline":20,
"opened":"2016-05-06T11:15:08+0000",
"startDate":"2016-05-06T11:15:08+0000",
"endDate":null,
"serverClosed":0,
"prefered":0,
"signupClosed":0,
"settings":{
	"aks":1,
	"fleetSpeed":2,
	"wreckField":1,
	"serverLabel":"empty",
	"economySpeed":7,
	"planetFields":30,
	"universeSize":6,
	"serverCategory":"miner",
	"espionageProbeRaids":0,
	"premiumValidationGift":8000,
	"debrisFieldFactorShips":50,
	"researchDurationDivisor":2,
	"debrisFieldFactorDefence":0
	}
}
```

Allowing only the POST method in expressjs:
```js
app.route('/universe/exists')
.post(function(req, res) {
	if (req.headers['content-type'] === 'application/json') {
		queryObj = {
			name: req.body.name,
			language: req.body.language,
		};

		universe.exists(queryObj)
		.then(result => res.status(result.status).send(result.body));	
	};
	if (req.headers['content-type'] !== 'application/json') {
		res.status(400).send('Only accepting Content-Type: application/json');
	};
	
})
.all(function(req, res) {
	res.header('Access-Control-Allow-Methods', 'POST');
	res.status(405).send();
});
```
