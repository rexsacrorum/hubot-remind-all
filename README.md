Hubot Remind Script
===================

A hubot script to set channel reminders.

See [`src/remind-all.js`](src/remind-all.js) for full documentation.

Installation
-----------------

In hubot project repo, run:

`yan add hubot-remind-all`

Then add **hubot-remind-all** to your `external-scripts.json`:

```json
["hubot-remind-all"]
```

Commands
--------

* reminders - displays all reminders.
* rm|forget|remove reminder 1 - removes reminder with id 1
* remind #general at '0 10 * * 1-5' to Hello world! - prints 'Hello world!' at 10am on weekdays in #general
