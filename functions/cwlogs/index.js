
const async = require('async');
const slack = require('./lib/slack');
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

    //JSON
    title = `*${logInfo.logGroup}/${logInfo.logStream} notification*`;
    if (msgObj[0] === '{') {
      msgObj = JSON.parse(msgObj);
      //check if hapi
      if (msgObj.tags && msgObj.message) {
        if (typeof msgObj.message === 'string') {
          title = msgObj.message;
        } else {
          message = `\`\`\`${JSON.stringify(msgObj.message, null, '  ')}\`\`\``;
        }
        if (msgObj.tags) {
          if (msgObj.tags.error) {
            color = 'danger';
          }

          title += ` (${Object.keys(msgObj.tags).join(', ')})`;
        }
      } else {
        message = `\`\`\`${JSON.stringify(msgObj, null, '  ')}\`\`\``;
      }
    } else { //STRING
      message = msgObj;
    }

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
  } else {
    console.log(event);
    context.done();
  }
};
