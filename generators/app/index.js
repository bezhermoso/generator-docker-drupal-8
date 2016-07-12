'use strict';

var yeoman = require('yeoman-generator');
var chalk = require('chalk');
var yosay = require('yosay');
var Promise = require('bluebird');
var fs = Promise.promisifyAll(require('fs'));
var merge = require('merge');

module.exports = yeoman.Base.extend({
  prompting: function () {
    this.props = merge({
      mountPath: './src'
    }, this.config.getAll());

    // Have Yeoman greet the user.
    this.log(yosay(
      'Welcome to the gnarly ' + chalk.red('docker-drupal-8') + ' generator!'
    ));

    var prompts = [
      {
        type: 'input',
        name: 'installationProfile',
        message: 'What is the name of the installation profile you wish to use?',
        default: this.appname.toLowerCase().replace(/[^a-zA-Z0-9_]/, '_')
      },
      {
        type: 'input',
        name: 'salt',
        message: 'Setup hash salt to use: ',
        default: 'R@nD0M!'
      },
      {
        type: 'confirm',
        name: 'useVagrant',
        message: 'Are you going to use a Vagrant machine your Docker host?',
        default: true
      }
    ];

    return this.prompt(prompts).then(function (props) {
      // To access props later use this.props.someAnswer;
      this.props = merge(this.props, props);
      if (this.props.useVagrant === true) {
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
          this.config.set(this.props);
          this.config.save();
        }.bind(this));
      }
    }.bind(this));
  },

  writing: function () {
    ['.gitignore', 'environment'].forEach(function (f) {
      this.fs.copy(
        this.templatePath(f),
        this.destinationPath(f)
      );
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
      this.fs.copyTpl(this.templatePath('src/bin/drush-portal'), this.destinationPath('bin/drush'), this.props);
      this.fs.copyTpl(this.templatePath('src/bin/drupal-portal'), this.destinationPath('bin/drupal'), this.props);
    }
  },

  install: function () {
    return fs.statAsync(this.destinationPath('src'))
      .then(function () {
        this.log('src/ already exists. Skipping...');
        return fs.readFileAsync(this.destinationPath('src/composer.json'), 'utf8').then(JSON.parse);
      }.bind(this), function () {
        return new Promise(function (resolve) {
          var proc = this.spawnCommand('composer', [
            'create-project',
            'drupal-composer/drupal-project:8.x-dev',
            this.destinationPath('src'),
            '--stability=dev',
            '--no-interaction'
          ]);
          proc.on('close', function () {
            return fs.readFileAsync(this.destinationPath('src/composer.json'), 'utf8').then(JSON.parse).then(resolve);
          }.bind(this));
        }.bind(this));
      }.bind(this)).then(function (composerData) {
        composerData.require['wikimedia/composer-merge-plugin'] = '^1.3';
        composerData.require['activelamp/sync_uuids'] = 'dev-8.x-1.x';
        composerData.extra['merge-plugin'] = {
          include: [
            'web/profiles/' + this.props.installationProfile + '/composer.json',
            'web/profiles/' + this.props.installationProfile + '/modules/custom/*/composer.json'
          ]
        };
        delete composerData.require['drush/drush'];
        delete composerData.require['drupal/console'];

        return fs.writeFileAsync(
          this.destinationPath('src/composer.json'),
          JSON.stringify(composerData, null, 4),
          'utf8'
        );
      }.bind(this)).then(function () {
        return new Promise(function (resolve) {
          var proc = this.spawnCommand('composer', [
            '--working-dir=' + this.destinationPath('src'),
            'update',
            '--no-interaction',
            '--prefer-dist'
          ]);
          proc.on('close', resolve);
        }.bind(this));
      }.bind(this)).then(function () {
        if (this.props.installationProfile === 'standard' || this.props.installationProfile === 'minimal') {
          return;
        }
        this.fs.copyTpl(
          this.templatePath('src/web/profiles/profile/profile.info.yml'),
          this.destinationPath('src/web/profiles/' + this.props.installationProfile + '/' + this.props.installationProfile + '.info.yml'),
          this.props
        );
      }.bind(this)).then(function () {
        if (this.props.useVagrant) {
          this.fs.copy(this.templatePath('src/bin'), this.destinationPath('src/bin'));
          ['src/bin', 'src/.platform.app.yaml', 'src/web/sites/default/settings.php', 'src/web/sites/default/settings.platform.php', 'src/web/sites/default/settings.local.php.dist', 'src/Dockerfile'].forEach(function (f) {
            this.fs.copyTpl(this.templatePath(f), this.destinationPath(f), this.props);
          }.bind(this));
        }
      }.bind(this));
  },
  end: function () {
    this.log(yosay(chalk.green('All done!')));
    if (this.props.useVagrant) {
      this.log('Run ' + chalk.green('`vagrant up && make docker-restart`') + ' to boot up the virtual machine and to get Drupal 8 up and running!');
      this.log('To sync files from your machine to the container, run ' + chalk.green('`make sync`') + '. Any changes will be synced up to the container in seconds.');
      this.log('Run ' + chalk.green('`make sync-host`') + ' to sync changes in the container back into your machine i.e. after scaffolding code via DrupalConsole, after running `composer update`, etc.');
    } else {
      this.log('Run ' + chalk.green('`docker-compose build && docker-compose up -d`') + ' to get Drupal 8 up and running!');
    }
  }
});
