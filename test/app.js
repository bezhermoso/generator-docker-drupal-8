'use strict';
var path = require('path');
var assert = require('yeoman-assert');
var helpers = require('yeoman-test');

describe('generator-docker-drupal-8:app', function () {
  before(function () {
    return helpers.run(path.join(__dirname, '../generators/app'))
      .withPrompts({
        installationProfile: 'my_profile',
        useVagrant: true
      })
      .toPromise();
  });
  it('creates files', function () {
    assert.file([
      'src/web/profiles/my_profile',
      'Vagrantfile'
    ]);
  });
});
