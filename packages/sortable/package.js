Package.describe({
  name: 'blueoakinteractive:sortable',
  version: '0.0.1'
});

Package.onUse(function(api) {
  api.export('Sortable');
  api.add_files('Sortable.js', 'client');
});

