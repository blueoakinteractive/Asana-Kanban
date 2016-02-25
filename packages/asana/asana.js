Asana = Npm.require("asana");

// Initailizes an asana api oauth connection.
Asana.asanaClient = function () {
  var user = Meteor.user();
  var asanaService = ServiceConfiguration.configurations.findOne({service: 'asana'});
  if (user && asanaService) {
      var client = Asana.Client.create({
          clientId: asanaService.clientId,
          clientSecret: asanaService.secret,
          redirectUri: Meteor.absoluteUrl("_oauth/asana")
      });


      client.useOauth({
          credentials: {
              // access_token: user.services.asana.accessToken,
              refresh_token: user.services.asana.refreshToken
          }
      });

      return client;
  }
  return null;
}
