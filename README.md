# Accept-Bot
![Discord Shield](https://discord.com/api/guilds/514101346992128012/widget.png?style=shield)
![GitHub](https://img.shields.io/github/license/brockbreacher/Accept-Bot) ![Status](https://status.brbr.xyz/api/badge/16/status) ![24HourUptime](https://status.brbr.xyz/api/badge/16/uptime/24) ![30DayUptime](https://status.brbr.xyz/api/badge/16/uptime/720?label=30&labelSuffix=d) 

[Invite Me](https://discord.com/oauth2/authorize?client_id=1382111158546206720)  [Support Server](https://discord.gg/SWTseD7)


A simple Discord bot that automatically adds a configurable role to a server member upon accepting the rules.
## Rule-Gating Made Simple.

### Environment Variables:

`TOKEN` | Discord Bot Token

`ACTIVITY` | Bot Activity Message (EX, You Sleep)

`TYPE` | The Activity type (LISTENING, WATCHING, PLAYING)

### Required Permissions:
The bot requires the following permissions to function properly:
- Manage Roles
- View Messages
- Use Application Commands
- Send Messages

You can also use the [Cardboard Services Bot Invite Generator](https://jbinvite.cardboards.net/) to generate an invite link with these permissions automatically. 

Important: The bot's role must be positioned above any role it attempts to assign automatically.

### Command:
`/accept-role` [@role]: Sets the role assigned to a user automatically after they accept the rules.  (User running command must have Manage Server permissions and bot's role MUST be above the role being assigned!)

###### Created By brockbreacher
