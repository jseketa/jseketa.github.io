---
published: true
title: Initial design
layout: post
tags: 
  - nodejs
  - scraping
excerpt: "Initial ponderings, decisions and abstractions."
---

# Initial design

![alt text](/assets//images/boring_writer.gif "Boring writer")
![alt text](/assets/images/concept_level.gif "Concept level")

I would like the take the very first paragraph to get the logical basics down. Programming implementation down the road is "just" a question of a language syntax.

Before I wrote anything there was reconnaisance to be made.
With the help of the Chrome Developer tools I recorded the steps needed to login to the overview page (automatic redirect).

Login consists of the two levels:
1. Login with the e-mail which takes us to the overview of servers and already active accounts
2. Login to the specific account


Firstly I needed to set the minimum goal. The goal was to successfully login to the game and just output the pure html; if successful I would get the wall of text in the console, otherwise just a short piece of redirect code (HTTP 301[^1]).

Using apitester.com for quick and dirty test.

![alt text](/assets/images/first_post.png "Title")

If successful, the post request should return the token, among other things.

**Request url**:

https://gameforge.com/api/v1/auth/thin/sessions

**Request method**:

POST

**Request body**:

identity=en.GB.scraper@gmail.com&password=Scraper12345&locale=de_DE&gfLang=de&platformGameId=1dfd8e7e-6e1a-4eb1-8c64-03c3b62efd2f&gameEnvironmentId=0a31d605-ffaf-43e7-aa02-d06df7116fc8&autoGameAccountCreation=false

**Request valid response body**: 

``` json
{"token":"e9f942cc-b714-462b-91bb-ef91b40f08d1",
"isPlatformLogin":true,
"isGameAccountMigrated":false,
"platformUserId":"95ddac3a-d1b6-4160-9a5b-2a623f8d94de",
"isGameAccountCreated":false,
"hasUnmigratedGameAccounts":false}
```

**Request invalid response body**:

``` json
{"error":{"message":"Forbidden"}}
```

![alt text](/assets/images/first_post_token.png "Title")

Process diagram:
POST form data --> receive valid response
				--> receive invalid response



Let's see how the first step looks like.
Used library: request-promise [^2]
Success criteria: fetch all the accounts bound to the user/player

```javascript
const rp = require('request-promise')
var user_agent = 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.132 Safari/537.36';
const tough = require('tough-cookie');
var jar = rp.jar();

var links = {
	post: 'https://gameforge.com/api/v1/auth/thin/sessions',
	accounts: 'https://lobby.ogame.gameforge.com/api/users/me/accounts'
};

login_post_options = {
			method: 'POST',
			uri: links.post,
			headers: {'User-Agent': user_agent},
			form: {				
				'identity': 'en.gb.scraper@gmail.com',
				'password': 'Scraper12345',
				'locale': 'de_DE',
				'gfLang': 'de',
				'platformGameId': '1dfd8e7e-6e1a-4eb1-8c64-03c3b62efd2f',
				'gameEnvironmentId': '0a31d605-ffaf-43e7-aa02-d06df7116fc8',
				'autoGameAccountCreation': 'false'
			},
			jar: jar,
			resolveWithFullResponse: true,
			json: true
};

get_options = {
	accounts: {
		method: 'GET',
		uri: links.accounts,
		headers: {
			'User-Agent': user_agent,
			'Authorization': null
			},
		followAllRedirects: false,
		jar: jar,
		resolveWithFullResponse: true,
		json: true
	}
};

async function set_authorization_token(token) {
	get_options.accounts.headers.Authorization = 'Bearer ' + token;
};

async function get_accounts () {
try {
	//first post request - 1st step login
	let post = await rp(login_post_options)
	set_authorization_token(post.body.token);
	//get all the accounts
	let account = await rp(get_options.accounts);
	return account.body;
	}
	catch (error) {
		console.log(error);
	};
};

get_accounts().then(result => console.dir(result,{depth: null}));

```

[^1]: More on HTTP codes: https://en.wikipedia.org/wiki/List_of_HTTP_status_codes
[^2]: https://github.com/request/request-promise, deprecated as of 1st of April 2020
