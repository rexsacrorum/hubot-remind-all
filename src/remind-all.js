'use strict'

// Description:
//   Simply channel reminder script
//
// Commands:
//   hubot remind #general at '0 10 * * 1-5' to Hello world! - prints 'Hello world!' at 10am on weekdays in #general
//   hubot rm|forget|remove reminder 1 - removes reminder with id 1
//   hubot reminders - displays all reminders.

const schedule = require('node-schedule');
const parser = require('cron-parser');
const moment = require('moment')

// Local jobs
var JOBS = {}
// Jobs from hubot brain.
var BRAIN_JOBS = []

function createNewJob(robot, pattern, room, text) {
  var keys = Object.keys(JOBS).map(k => +k)
  const id = Math.max(keys) + 1

  return registerNewJob(robot, id, pattern, room, text)
}


function registerNewJob(robot, id, pattern, room, message) {
  var job = new ScheduleJob(id, pattern, room, message)
  job.start(robot)

  JOBS[id] = job
  BRAIN_JOBS.push({
    id: id,
    pattern: pattern,
    room: room,
    message: message
  });

  return job
}

function unregisterJob(robot, id) {
  const job = JOBS[id]
  if (job) {
    job.stop()
    delete JOBS[id]

    const foundJobs = BRAIN_JOBS.filter(function (j) {
      return j.id === id;
    });
    if (foundJobs) {
      BRAIN_JOBS.splice(BRAIN_JOBS.indexOf(foundJobs), 1);
    }
    saveJobs(robot);
  }
}

function handleNewJob(robot, res, room, pattern, text) {
  var job = createNewJob(robot, pattern, room, text)
  saveJobs(robot)

  res.send(`I'll remind in #${room} to \"${job.message}\" at ${job.nextInvocation}`)
}

// Saves jobs in hubot brain.
function saveJobs(robot) {
  robot.brain.set('hubot-remind-reminders', BRAIN_JOBS);
  robot.brain.save();

  robot.logger.info(`${BRAIN_JOBS.length} jobs were saved`)
}

function remindBot(robot) {
  function respondToCommand(res, room, pattern, text) {
    // TODO: check channel name

    handleNewJob(robot, res, room, pattern, text)
  }

  // Lists reminders.
  robot.respond(/(reminders)/i, (res) => {
    var response = ''

    for (const id in JOBS) {
      const job = JOBS[id]

      response += `${job.id}: remind to \"${job.message}\" in #${job.room} at ${job.nextInvocation}(${job.pattern})\n`
    }

    if (response.length > 0)
      return res.send(`\`\`\`${response}\`\`\``)

    res.send("No reminders is set.")
  })

  // Remove reminder by id.
  robot.respond(/(rm|forget|remove) reminder (\d+)/i, (res) => {
    const jobId = res.match[2]
    if (!JOBS[jobId])
      return res.send(`Reminder with id '${jobId}' was not found`)

    unregisterJob(robot, jobId)
    res.send(`Reminder with id '${jobId}' removed.`)
  })

  // Sets reminder to a room at some time.
  robot.respond(/remind #(\S+) at '(.+)' to (.+)/i, (res) => {
    const room = res.match[1]
    const pattern = res.match[2] // cron-format
    const text = res.match[3]

    respondToCommand(res, room, pattern, text)
  })

  // Load jobs from brain.
  robot.brain.on("connected", () => {  
    const jobs = robot.brain.get('hubot-remind-reminders') || [];
    jobs.forEach(function (job) {
        return registerNewJob(robot, job.id, job.pattern, job.room, job.message);
    })

    robot.logger.info(`${jobs.length} jobs loaded from brain.`)
  })
}

class ScheduleJob {
  constructor(id, pattern, room, message) {
    // cron format
    this.pattern = pattern
    this.id = id
    this.room = room
    this.message = message
  }

  // Plans a new job.
  start(robot) {
    var _this = this
    schedule.scheduleJob(this.id.toString(), this.pattern, () => {
      _this.sendMessage(robot)
    })
  }

  stop() {
    this.scheduledJob.cancel(false)
  }

  // Sends message to a room.
  sendMessage(robot) {
    const envelope = {
      room: this.room,
      user: {}
    }

    robot.send(envelope, this.message)
  }

  serialize() {
    return [this.pattern, this.room, this.message];
  }

  // node-schedule job
  get scheduledJob() {
    return schedule.scheduledJobs[this.id]
  }

  // Returns next invocation of a job.
  get nextInvocation() {
    const interval = parser.parseExpression(this.pattern)

    const date = interval.next().toDate()
    const momentInstance = moment(date)

    return momentInstance.format('MMMM Do YYYY, hh:mm:ss')
  }

}

module.exports = remindBot