const express = require("express");
const morgan = require("morgan");
const Slack = require("slack-node");
const Busboy = require("busboy");

const channel = process.env.SLACK_CHANNEL;

const slack = new Slack();
slack.setWebhook(process.env.SLACK_URL);

const app = express();
const port = process.env.PORT || 11000;

app.use(morgan("dev"));
app.listen(port, () => {
  console.log(`Express app running at http://localhost:${port}`);
});

app.post("/", async function(req, res, next) {
  // We need to handle multipart returns...so...busboy to the rescue.
  const busboy = new Busboy({ headers: req.headers });

  let payload = null;
  busboy.on("file", function(fieldname, file, filename, encoding, mimetype) {
    file.resume(); // don't care about saving the poster
  });

  busboy.on("field", function(
    fieldname,
    val,
    fieldnameTruncated,
    valTruncated,
    encoding,
    mimetype
  ) {
    if (fieldname === "payload") {
      try {
        payload = JSON.parse(val);
      } catch (e) {
        console.log(e);
      }
    }
  });

  busboy.on("finish", async function() {
    if (payload) {
      console.log(JSON.stringify(payload));
      if (payload.event === "library.new") {
        notifySlack(payload, "Manassas, VA", "New Media Added");
      }
    }
    res.writeHead(303, { Connection: "close", Location: "/" });
    res.end();
  });

  return req.pipe(busboy);
});

app.use((req, res, next) => {
  const err = new Error("Not Found");
  err.status = 404;
  next(err);
});

app.use((err, req, res, next) => {
  res.status(err.status || 500);
  res.send(err.message);
});

// function getLocation(ip) {
//   return request.get(`http://api.ipstack.com/${ip}?access_key=${process.env.IPSTACK_KEY}`, { json: true });
// }

function formatTitle(metadata) {
  let mediaTypeString = "";

  if (metadata.type) {
    if (metadata.type === "movie") {
      mediaTypeString = "New Movie Added: ";
    } else if (metadata.type === "episode") {
      mediaTypeString = "New TV Show Added: ";
    }
  } else {
    return "";
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
  let ret = "";

  if (metadata.grandparentTitle) {
    if (metadata.type === "track") {
      ret = metadata.parentTitle;
    } else if (metadata.index && metadata.parentIndex) {
      ret = `S${metadata.parentIndex} E${metadata.index}`;
    } else if (metadata.originallyAvailableAt) {
      ret = metadata.originallyAvailableAt;
    }

    if (metadata.title) {
      ret += " - " + metadata.title;
    }
  } else if (metadata.type === "movie") {
    ret = metadata.tagline;
  }

  return ret;
}

function notifySlack(payload, location, action) {
  let locationText = "";

  if (location) {
    // const state = location.country_code === 'US' ? location.region_name : location.country_name;
    locationText = `near ` + location;
  }

  slack.webhook(
    {
      channel,
      username: "DockeredPlex",
      icon_emoji: ":plex:",
      attachments: [
        {
          fallback: "Required plain-text summary of the attachment.",
          color: "#a67a2d",
          title: formatTitle(payload.Metadata),
          text: formatSubtitle(payload.Metadata),
          footer: `${action} by ${payload.Account.title} on ${payload.Server.title} ${locationText}`,
          footer_icon: payload.Account.thumb
        }
      ]
    },
    () => {}
  );
}
