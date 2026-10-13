# Install Opla Demo from the Opla marketplace

The marketplace is intended for private onboarding tests in ChatGPT Desktop and
Codex. It installs the plugin and its hosted MCP connection together.

## Add the marketplace

~~~sh
codex plugin marketplace add Opla/opla
~~~

Restart ChatGPT Desktop after adding the marketplace.

## Install and test

1. Open **Plugins** and select the **Opla** marketplace.
2. Open **Opla Demo** and select **Install**.
3. Start a new Work chat.
4. Invoke **Opla Demo**.
5. When the protected action runs, enter an email address and then the six-digit
   passcode delivered by Opla.

Authentication is configured as `ON_USE`, so installation should not require
sign-in. The hosted MCP endpoint is `https://mcp.opla.fr/mcp`.

To refresh the marketplace after an update:

~~~sh
codex plugin marketplace update opla
~~~
