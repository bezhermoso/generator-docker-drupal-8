'use strict';
var path = require('path');
var assert = require('yeoman-assert');
var helpers = require('yeoman-test');

describe('generator-docker-drupal-8:app', function () {
  before(function () {
    this.timeout(1000 * 60 * 30);
    return helpers.run(path.join(__dirname, '../generators/app'))
      .withPrompts({
        installationProfile: 'my_profile',
        useVagrant: true,
        salt: 'abc123',
        vmHostname: 'test.dev',
        machineName: 'test'
      })
      .toPromise();
  });
  it('creates files', function () {
    assert.file([
      'src/web/profiles/my_profile/my_profile.info.yml',
      'Vagrantfile',
      'Makefile',
      'src/Dockerfile',
      'docker-compose.yml'
    ]);
  });
});
