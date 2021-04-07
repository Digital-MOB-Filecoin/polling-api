import { registerAs } from '@nestjs/config';

export default registerAs('config', () => {
  return {
    database: {
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT, 10),
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_DATABASE_NAME,
    },
    app: {
      port: parseInt(process.env.APP_PORT, 10),
    },
    lotus: {
      url: process.env.LOTUS_RPC_URL,
      wsUrl: process.env.LOTUS_WS_URL,
      token: process.env.LOTUS_TOKEN
    },
    github: {
      repo : process.env.GH_REPO,
      user : process.env.GH_USER,
      token : process.env.GH_TOKEN
    },
    textile: {
      key : process.env.TEXTILE_KEY,
      secret : process.env.TEXTILE_SECRET,
      identity : process.env.TEXTILE_IDENTITY
    },
    rabbitmq: {
      hostname: process.env.RABBITMQ_HOST,
      username: process.env.RABBITMQ_USER,
      password: process.env.RABBITMQ_PASSWORD,
    },
    issueParser: {
       sectionSeparator : "---",

       optionLabelPrefix : "\\*\\*<",
       optionLabelSufix : ">\\*\\*",
       optionDescriptionPrefix : ">\\*\\*\\: <",
       optionDescriptionSufix : ">",

       startDatePrefix : "start\\:",
       endDatePrefix : "end\\:",
       constituentsPrefix : "constituents\\:",
       authorPrefix : "author\\:",
       discussionPrefix : "discussion\\:",


       approveLabel : "fip",
       voteClosedLabel : "fipVoteClosed",
    }
  };
});
