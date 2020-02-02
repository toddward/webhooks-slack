In order to run this app:
 
- Linux is king...use `nvm` to install latest node binary (or of your choosing).
- Sign up for a free [ipstack API key](https://ipstack.com/signup/free).
- Clone the repository.
- Install dependencies using `yarn` or `npm`.
- Make a Slack webhook for a slack-channel and note the URL, add them as config vars named SLACK_URL & SLACK_CHANNEL.

You'll be asked to complete these config vars
```
SLACK_URL      # your slack webhook URL
SLACK_CHANNEL  # the slack #channel-name to post messages
APP_URL        # the App URL ({app_name}.herokuapp.com)
(opt)IPSTACK_KEY    # your ipstack API key
```

To run in Docker:
```
docker build . -t <<your_tag_name>>
docker run --restart always --name SlackPlexWebhooks -p 11000:11000 -e SLACK_URL='<<hooks.slack.com full address>>' -e SLACK_CHANNEL='<<channel you want to post in>>' -d plexupdates:latest
```