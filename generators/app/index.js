'use strict';

var yeoman = require('yeoman-generator');
var chalk = require('chalk');
var yosay = require('yosay');
var Promise = require('bluebird');
var fs = Promise.promisifyAll(require('fs'));
var merge = require('merge');

module.exports = yeoman.Base.extend({

  _promptVagrant: function (props) {
    props.mountPath = '/mnt/code';
    return this.prompt([
      {
        type: 'input',
        name: 'vmHostname',
        message: 'Specify hostname for Vagrant machine:',
        default: props.vmHostname || this.appname.toLowerCase().replace(/[^a-zA-Z0-9-]/, '') + '.dev'
      },
      {
        type: 'input',
        name: 'machineName',
        message: 'Specify machine name:',
        default: props.machineName || this.appname + '-vm'
      }
    ]).then(vprops => {
      return merge(props, vprops);
    });
  },

  prompting: function () {

    var props = merge({
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
        default: props.installationProfile || this.appname.toLowerCase().replace(/[^a-zA-Z0-9_]/, '_')
      },
      {
        type: 'input',
        name: 'salt',
        message: 'Setup hash salt to use: ',
        default: props.salt || 'R@nD0M!'
      },
      {
        type: 'confirm',
        name: 'useVagrant',
        message: 'Are you going to use a Vagrant machine your Docker host?',
        default: props.hasOwnProperty('useVagrant') ? props.useVagrant : true
      }
    ];

    return this.prompt(prompts).then(iprops => {
      props = merge(props, iprops);
      if (iprops.useVagrant === true) {
        return this._promptVagrant(props);
      }
      return props;
    }).then(finalProps => {
      this.props = finalProps;
      this.config.set(finalProps);
      this.config.save();
    });
  },


  writing: function () {
    this._copy(['.gitignore', 'environment'])
    if (this.props.useVagrant) {
      this._copy(['Vagrantfile', 'bin', 'zsh'], null, this.props);
    } else {
      var files = ['src/bin/drush-portal', 'src/bin/drupal-portal'];
      this._copy(
        files,
        files.map(s => {
          return s.replace(/^src\/bin/, '').replace(/-portal$/, '');
        }),
        this.props);
    } 
    this._copy(['docker-compose.yml', 'Makefile'], null, this.props);
  },
  
  install: function () {
    return fs.statAsync(this.destinationPath('src/composer.json'))
      .then(() => {
        this.log('Looks like `src/` contains a Composer project. Just gonna assume its a Drupal project...');
      }, this._installDrupalProject.bind(this))
      .then(this._alterComposer.bind(this))
      .then(this._composerUpdate.bind(this))
      .then(this._prepareInstallationProfile.bind(this))
      .then(() => {
        if (this.props.useVagrant) {
          this.fs.copy(this.templatePath('src/bin'), this.destinationPath('src/bin'));
        }
        this._copy([
          'src/.platform.app.yaml',
          'src/web/sites/default/settings.php',
          'src/web/sites/default/settings.platform.php',
          'src/web/sites/default/settings.local.php.dist',
          'src/Dockerfile'
        ], null, this.props);
      });
  },
  end: function () {
    this.log(yosay(chalk.green('All done!')));
    var msgs = [];
    if (this.props.useVagrant) {
      msgs= [
        'Run ' + chalk.green('`vagrant up && make docker-restart && make init`') + ' to boot up the virtual machine and to get Drupal 8 up and running!',
        'To sync files from your machine to the container, run ' + chalk.green('`make sync`') + '. Any changes will be synced up to the container in seconds.',
        'Run ' + chalk.green('`make sync-host`') + ' to sync changes in the container back into your machine i.e. after scaffolding code via DrupalConsole, `composer update`'
      ];
    } else {
      msgs = ['Run ' + chalk.green('`docker-compose build && docker-compose up -d`') + ' to get Drupal 8 up and running!'];
    }

    msgs.map(m => {
      this.log(m);
    });
  },

  // Helper functions
  _copy: function (from, to, vars) {
    if (typeof to == 'array' && from.length !== to.length) {
      throw new Error('`from` and `to` length are not equal.');
    }

    var copyFunc = arguments.length > 2 ? this.fs.copyTpl : this.fs.copy;
    copyFunc = copyFunc.bind(this.fs);

    var args = Array.prototype.slice.call(arguments, 0);

    for (let i = 0; i < from.length; i++) {
      args[0] = this.templatePath(from[i]);
      args[1] = this.destinationPath(typeof to == 'array' ? to[i] : from[i]);
      copyFunc.apply(null, args);
    }
  },

  _execute: function () {
    var args = Array.prototype.slice.call(arguments, 0);
    return new Promise(resolve => {
      this.spawnCommand.apply(this, args).on('close', resolve);
    });
  },

  _modifyComposerData: function (composerData) {
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
    return composerData;
  },

  _installDrupalProject: function () {
    return this._execute('composer', [
      'create-project',
      'drupal-composer/drupal-project:8.x-dev',
      this.destinationPath('src'),
      '--stability=dev',
      '--no-interaction'
    ]);
  },

  _alterComposer: function () {
    return fs.readFileAsync(this.destinationPath('src/composer.json'), 'utf8')
      .then(JSON.parse)
      .then(this._modifyComposerData.bind(this))
      .then(data => {
        return fs.writeFileAsync(
          this.destinationPath('src/composer.json'),
          JSON.stringify(data, null, 4),
          'utf8'
        );
      });
  },

  _composerUpdate: function () {
    return this._execute('composer', [
      '--working-dir=' + this.destinationPath('src'),
      'update',
      '--no-interaction',
      '--prefer-dist'
    ])
  },

  _prepareInstallationProfile: function () {
    if (this.props.installationProfile.match(/(standard|minimal)/)) {
      return;
    }
    this.fs.copyTpl(
      this.templatePath('src/web/profiles/profile/profile.info.yml'),
      this.destinationPath('src/web/profiles/' + this.props.installationProfile + '/' + this.props.installationProfile + '.info.yml'),
      this.props
    );
  },

});
