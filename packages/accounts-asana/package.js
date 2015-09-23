Package.describe({
  name: 'blueoakinteractive:accounts-asana',
  version: '0.0.1',
  summary: 'Asana OAuth2 login service that uses official Asana NPM library',
  git: 'https://github.com/blueoakinteractive/meteor-accounts-asana',
  documentation: 'README.md'
});

Package.onUse(function(api) {
  // Specify allowed meteor versions.
  api.versionsFrom('1.1.0.3');

  // Define dependencies.
  api.use('blueoakinteractive:asana@0.0.1', ['client', 'server']);
  api.use('accounts-base', ['client', 'server']);
  api.imply('accounts-base', ['client', 'server']);
  api.use('accounts-oauth', ['client', 'server']);
  api.use('underscore', 'server');

  // Add CSS Files
  api.addFiles('login-button.css', 'client');

  // Add JS Files.
  api.addFiles('common.js', ['client', 'server']);
  api.addFiles('server.js', 'server');
  api.addFiles('client.js', 'client');
});
