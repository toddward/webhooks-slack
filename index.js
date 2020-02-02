const express = require('express');
//const sharp = require('sharp');
const morgan = require('morgan');
//const multer = require('multer');
//const Redis = require('ioredis');
const request = require('request-promise-native');
const sha1 = require('sha1');
const Slack = require('slack-node');
//const bodyParser = require('body-parser');
// const upload = multer({ storage: multer.memoryStorage() });
const Busboy = require('busboy');

const SEVEN_DAYS = 7 * 24 * 60 * 60; // in seconds

//
// setup

const channel = process.env.SLACK_CHANNEL;
const appURL = process.env.APP_URL;
//const redis = new Redis(process.env.REDIS_URL);

//
// slack

const slack = new Slack();
slack.setWebhook(process.env.SLACK_URL);

//
// express

const app = express();
const port = process.env.PORT || 11000;

app.use(morgan('dev'));
//app.use(bodyParser.json());
app.listen(port, () => {
  console.log(`Express app running at http://localhost:${port}`);
});

//
// routes

app.post('/', async function(req, res, next) {
    const busboy = new Busboy({ headers: req.headers });
    let payload = null;
    busboy.on('file', function(fieldname, file, filename, encoding, mimetype) {
        file.resume(); // don't care about saving the poster
    });
    busboy.on('field', function(fieldname, val, fieldnameTruncated, valTruncated, encoding, mimetype) {
        if (fieldname === 'payload') {
            try {
                payload = JSON.parse(val);
            } catch (e) {
                console.log(e);
            }
        }
    });
    busboy.on('finish', async function() {
        if (payload) {
          console.log(JSON.stringify(payload));
            if (payload.event === 'media.play'){
                console.log(`sent a message to slack!:${msg}`);
            } else if(payload.event === 'library.new') {
                //console.log(`noop for ${payload.event}`);
                notifySlack(payload, "Manassas, VA", "New Media Added");
            } else {
                console.log(`noop for ${payload.event}`);
            }
        }
        res.writeHead(303, { Connection: 'close', Location: '/' });
        res.end();
    });

    return req.pipe(busboy);
});

// app.post('/', async (req, res, next) => {
//   //console.log(req.body);
//   const payload = req;
//   //return res.status(200).json(req.body);
//   //console.log(payload);

//   console.log(payload);

//   const isVideo = (['movie', 'episode'].includes(payload.Metadata.type));
//   const isAudio = (payload.Metadata.type === 'track');
//   // const key = sha1(payload.Server.uuid + payload.Metadata.ratingKey);

//   // missing required properties
//   if (!payload.user || !payload.Metadata || !(isAudio || isVideo)) {
//     return res.sendStatus(400);
//   }

//   // retrieve cached image
//   // let image = await redis.getBuffer(key);

//   if (payload.event === 'library.new') {
//     // I'm only concerned with what's new right now.
//     //const location = await getLocation(payload.Player.publicAddress);

//     console.log('Adding new media as part of the webhook: %s', payload);
//     notifySlack(payload, 'Manassas', 'New Media');
//   }

//   // // save new image
//   // if (payload.event === 'media.play' || payload.event === 'media.rate') {
//   //   if (image) {
//   //     console.log('[REDIS]', `Using cached image ${key}`);
//   //   } else {
//   //     let buffer;
//   //     if (req.file && req.file.buffer) {
//   //       buffer = req.file.buffer;
//   //     } else if (payload.thumb) {
//   //       console.log('[REDIS]', `Retrieving image from  ${payload.thumb}`);
//   //       buffer = await request.get({
//   //         uri: payload.thumb,
//   //         encoding: null
//   //       });
//   //     }
//   //     if (buffer) {
//   //       image = await sharp(buffer)
//   //         .resize({
//   //           height: 75,
//   //           width: 75,
//   //           fit: 'contain',
//   //           background: 'white'
//   //         })
//   //         .toBuffer();

//   //       console.log('[REDIS]', `Saving new image ${key}`);
//   //       redis.set(key, image, 'EX', SEVEN_DAYS);
//   //     }
//   //   }
//   // }

//   // post to slack
//   // if ((payload.event === 'media.scrobble' && isVideo) || payload.event === 'media.rate') {
//     // const location = await getLocation(payload.Player.publicAddress);

//     // let action;

//     // if (payload.event === 'media.scrobble') {
//     //   action = 'played';
//     // } else if (payload.rating > 0) {
//     //   action = 'rated ';
//     //   for (var i = 0; i < payload.rating / 2; i++) {
//     //     action += ':star:';
//     //   }
//     // } else {
//     //   action = 'unrated';
//     // }

//     // if (image) {
//     //   console.log('[SLACK]', `Sending ${key} with image`);
//     //   notifySlack(appURL + '/images/' + key, payload, location, action);
//     // } else {
//     //   console.log('[SLACK]', `Sending ${key} without image`);
//     //   notifySlack(null, payload, location, action);
//     // }
//   // }

//   res.sendStatus(200);

// });

// app.get('/images/:key', async (req, res, next) => {
//   const exists = await redis.exists(req.params.key);

//   if (!exists) {
//     return next();
//   }

//   const image = await redis.getBuffer(req.params.key);
//   sharp(image).jpeg().pipe(res);
// });

//
// error handlers

app.use((req, res, next) => {
  const err = new Error('Not Found');
  err.status = 404;
  next(err);
});

app.use((err, req, res, next) => {
  res.status(err.status || 500);
  res.send(err.message);
});

//
// helpers

// function getLocation(ip) {
//   return request.get(`http://api.ipstack.com/${ip}?access_key=${process.env.IPSTACK_KEY}`, { json: true });
// }

function formatTitle(metadata) {
  let mediaTypeString = '';
  if (metadata.type) {
    if (metadata.type === 'movie') {
      mediaTypeString = 'New Movie Added: ';
    }else if(metadata.type === 'episode'){
      mediaTypeString = 'New TV Show Added: ';
    }else{
      mediaTypeString = 'New Media: ';
    }
  }else{
    mediaTypeString = 'New Media: ';
  }

  if (metadata.grandparentTitle) {
    return mediaTypeString + metadata.grandparentTitle;
  } else {
    let ret = metadata.title;
    if (metadata.year) {
      ret += ` (${metadata.year})`;
    }
    return mediaTypeString + ret;
  }
}

function formatSubtitle(metadata) {
  let ret = '';

  if (metadata.grandparentTitle) {
    if (metadata.type === 'track') {
      ret = metadata.parentTitle;
    } else if (metadata.index && metadata.parentIndex) {
      ret = `S${metadata.parentIndex} E${metadata.index}`;
    } else if (metadata.originallyAvailableAt) {
      ret = metadata.originallyAvailableAt;
    }

    if (metadata.title) {
      ret += ' - ' + metadata.title;
    }
  } else if (metadata.type === 'movie') {
    ret = metadata.tagline;
  }

  return ret;
}

function notifySlack(payload, location, action) {
  let locationText = '';

  if (location) {
    // const state = location.country_code === 'US' ? location.region_name : location.country_name;
    locationText = `near ` + location;
  }

  slack.webhook({
    channel,
    username: 'DockeredPlex',
    icon_emoji: ':plex:',
    attachments: [{
      fallback: 'Required plain-text summary of the attachment.',
      color: '#a67a2d',
      title: formatTitle(payload.Metadata),
      text: formatSubtitle(payload.Metadata),
      footer: `${action} by ${payload.Account.title} on ${payload.Server.title} ${locationText}`,
      footer_icon: payload.Account.thumb
    }]
  }, () => {});
}
