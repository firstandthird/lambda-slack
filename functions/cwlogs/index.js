
const async = require('async');
const slack = require('../../lib/slack');
const zlib = require('zlib');

module.exports.handler = (event, context) => {
  const sendToSlack = (data, done) => {
    const slackData = {
      channel: process.env.SLACK_CHANNEL,
      webhook: process.env.SLACK_WEBHOOK,
      username: process.env.SLACK_NAME,
      icon: process.env.SLACK_ICON,
      title: data.title,
      message: data.message,
      pretext: data.pretext,
      color: data.color
    };
    slack(slackData, (err) => {
      done(err);
    });
  };

  const processLogEntry = (logInfo, log, done) => {
    let msgObj = log.message;
    let title = '';
    let message = '';
    let color = 'good';
    let logType = 'notification';
    let tagString = '';

    //JSON
    if (msgObj[0] === '{') {
      msgObj = JSON.parse(msgObj);

      message = `\`\`\`${JSON.stringify(msgObj, null, '  ')}\`\`\``;
      //if log has a tags object (logr, hapi)
      if (msgObj.tags) {
        if (msgObj.tags.error) {
          color = 'danger';
          logType = 'error';
        }
        tagString = `(${Object.keys(msgObj.tags).join(', ')})`;
      }
    } else { //STRING
      message = msgObj;
      if (message.match(/[warn]|[error]|[emerg]/)) {
        logType = 'error';
        color = 'danger';
      }
    }

    title = `*${logInfo.logGroup}/${logInfo.logStream} ${logType}* ${tagString}`;

    const data = {
      title,
      message,
      color
    };
    sendToSlack(data, done);
  };

  if (event.awslogs) {
    const payload = new Buffer(event.awslogs.data, 'base64');
    zlib.gunzip(payload, (e, result) => {
      if (e) {
        context.fail(e);
        return;
      }
      result = JSON.parse(result.toString('utf8'));
      async.each(result.logEvents, (log, done) => {
        processLogEntry(result, log, done);
      }, (err) => {
        context.done(err);
      });
    });
  } else if (event.logs) {
    //for testing
    async.each(event.logs, (log, done) => {
      processLogEntry(event, log, done);
    }, (err) => {
      context.done(err);
    });
  }
};
