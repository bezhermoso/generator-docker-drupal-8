'use strict';
var yeoman = require('yeoman-generator');
var chalk = require('chalk');
var yosay = require('yosay');
var Promise = require('bluebird');
var fs = Promise.promisifyAll(require('fs'));
var merge = require('merge');

module.exports = yeoman.Base.extend({
  prompting: function () {

    this.props = {
      mountPath: './src'
    };

    // Have Yeoman greet the user.
    this.log(yosay(
      'Welcome to the gnarly ' + chalk.red('generator-docker-drupal-8') + ' generator!'
    ));

    var prompts = [{
      type: 'input',
      name: 'installationProfile',
      message: 'What is the name of the installation profile you wish to use?',
      default: this.appname.toLowerCase().replace(/[^a-zA-Z0-9_]/, '_')
    },
    {
      type: 'confirm',
      name: 'useVagrant',
      message: 'Are you going to use a Vagrant machine your Docker host?',
      default: true
    }];

    return this.prompt(prompts).then(function (props) {
      // To access props later use this.props.someAnswer;
      this.props = merge(this.props, props);
      if (this.props.useVagrant == true) {
        this.props.mountPath = '/mnt/code';
        return this.prompt([
          {
            type: 'input',
            name: 'vmHostname',
            message: 'Specify hostname for Vagrant machine:',
            default: this.appname.toLowerCase().replace(/[^a-zA-Z0-9-]/, '') + '.dev'
          },
          {
            type: 'input',
            name: 'machineName',
            message: 'Specify machine name:',
            default: this.appname + '-vm'
          }
        ]).then(function (props) {
          this.props = merge(this.props, props);
        }.bind(this));
      }
    }.bind(this));
  },

  writing: function () {

    ['.gitignore', 'environment',
    ].forEach(function (f) {
      this.fs.copy(
        this.templatePath(f),
        this.destinationPath(f)
      )
    }.bind(this));

    if (this.props.useVagrant) {
      ['Vagrantfile', 'Makefile', 'docker-compose.yml', 'bin', 'zsh'].forEach(function (f) {
        this.fs.copyTpl(
          this.templatePath(f),
          this.destinationPath(f),
          this.props
        );
      }.bind(this));
    } else {
      this.fs.copy(this.templatePath('src/bin/drush-portal'), this.destinationPath('bin/drush'));
      this.fs.copy(this.templatePath('src/bin/drupal-portal'), this.destinationPath('bin/drupal'));
    }
  },

  install: function () {

    return fs.statAsync(this.destinationPath('src'))
      .then(function (stat) {
        this.log('src/ already exists. Skipping...');
        return fs.readFileAsync(this.destinationPath('src/composer.json'), 'utf8').then(JSON.parse);
      }.bind(this), function () {
        return new Promise((resolve, reject) => {
          var proc = this.spawnCommand('composer', [
            'create-project',
            'drupal-composer/drupal-project:8.x-dev',
            this.destinationPath('src'),
            '--stability=dev',
            '--no-interaction'
          ]);
          proc.on('close', function (signal) {
            return fs.readFileAsync(this.destinationPath('src/composer.json'), 'utf8').then(JSON.parse).then(resolve);
          }.bind(this));
        })
      }.bind(this)).then(function (composerData) {
        composerData.require['wikimedia/composer-merge-plugin'] = "^1.3";
        composerData.require['activelamp/sync_uuids'] = 'dev-8.x-1.x';
        composerData.extra["merge-plugin"] = {
          include: [
            "web/profiles/" + this.props.installationProfile + "/composer.json",
            "web/profiles/" + this.props.installationProfile + "/modules/custom/*/composer.json"
          ]
        }
        return fs.writeFileAsync(
          this.destinationPath('src/composer.json'),
          JSON.stringify(composerData, null, 4),
          'utf8'
        );
      }.bind(this)).then(function () {
        if (this.props.useVagrant) {
          this.fs.copy(this.templatePath('src/bin'), this.destinationPath('src/bin'));
          [ 'src/bin', 'src/.platform.app.yaml', 'src/web/sites/default/settings.php',
            'src/web/sites/default/settings.platform.php', 'src/web/sites/default/settings.local.php.dist'
          ].forEach(function (f) {
            this.fs.copy(this.templatePath(f), this.destinationPath(f));
          }.bind(this));
        }
      }.bind(this));
  },
});
