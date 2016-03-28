'use strict';
const https = require('https');
const util = require('util');

module.exports = (data, done) => {
  const postData = {
    channel: data.channel,
    username: data.username,
    text: data.title,
    icon_emoji: data.icon,
    attachments: [
      {
        color: data.color,
        text: data.message,
        pretext: data.pretext,
        mrkdwn_in: ['text', 'pretext']
      }
    ]
  };

  const options = {
    method: 'POST',
    hostname: 'hooks.slack.com',
    port: 443,
    path: data.webhook
  };

  if (process.env.SLACK_TEST === '1') {
    console.log(JSON.stringify(postData, null, '  '));
    return done();
  }

  const req = https.request(options, (res) => {
    res.setEncoding('utf8');
    res.on('data', (chunk) => {
      done(null);
    });
  });

  req.on('error', (e) => {
    done(e);
  });

  req.write(util.format('%j', postData));
  req.end();
};
