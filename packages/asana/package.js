Package.describe({
  name: 'blueoakinteractive:asana',
  version: '0.0.1',
  summary: 'Asana client implementation that uses official Asana NPM library',
  git: 'https://github.com/blueoakinteractive/meteor-asana',
  documentation: 'README.md'
});

Npm.depends({
  "asana" : "0.9.6"
});

Package.onUse(function(api) {
  api.versionsFrom('1.1.0.3');

  api.imply('meteorhacks:async@1.0.0');

  api.use('oauth2', ['client', 'server']);
  api.use('oauth', ['client', 'server']);
  api.use('http', ['server']);
  api.use('templating', 'client');
  api.use('underscore', 'server');
  api.use('random', 'client');
  api.use('service-configuration', ['client', 'server']);

  api.export('Asana');

  api.addFiles(
    ['configure.html', 'configure.js'],
    'client');

  api.addFiles('asana.js', 'server');

  api.addFiles('common.js', ['client', 'server']);
  api.addFiles('server.js', 'server');
  api.addFiles('client.js', 'client');
});

Package.onTest(function(api) {
  api.use('tinytest');
  api.use('blueoakinteractive:asana');
  api.addFiles('asana-tests.js');
});
