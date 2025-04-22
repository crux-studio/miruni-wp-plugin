# Miruni Wordpress Plugin

Boilerplate for now, need to determine if this README is visible in Wordpress or just a development README.

### Development Server

We have a local Wordpress website which can be set up by navigating to this folder and running:

`% docker compose up --build`

Once the docker image has been built once, you can run the following to start the server and also the webpack build in watch mode:

`% nx run wordpress:dev`

This will automatically install the plugin into the Wordpress instance and watch for changes to the plugin files. You will need to reload the page to see the changes.

In order for Miruni cookies to be included in requests across domains, the dockerized Wordpress instance has been configured to run on a secure domain `https://wp.miruni.local'. `localhost`is not a secure domain and cookies are not shared across domains, even if the protocol is`https`.

In order for this to work, you will need to add the following line to your `/etc/hosts` file:

`echo "127.0.0.1 wp.miruni.local" | sudo tee -a /etc/hosts`

This will allow the browser to resolve the domain to the local Wordpress instance.

## Production Build

1. Build the plugin and write to `/dist`

`% npx nx build wordpress`

2. Build the language file(s)

`% npx nx pot wordpress`

> NOTE: The language files should be committed to the repo.

3. Zip the relevant files up into a Wordpress-compliant plugin structure.

`% npx nx package wordpress`

## Deploy

The zip file should be able to drop into the `/plugins/miruni` folder in the Wordpress instance.

> NOTE: Wordpress requires environment variables to enable plugins, so you will need to export the env var to match. Something like this:
>
> `export WORDPRESS_PLUGINS="${WORDPRESS_PLUGINS},miruni"`

