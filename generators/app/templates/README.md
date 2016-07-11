## ActiveLAMP.com - Drupal 8

### Local development setup

`git clone --recursive git@github.com:<username>/activelamp.com-in-d8.git`

This is tested in:

1. VirtualBox 5.0+
2. Vagrant 1.8.1

...although it could work on VirtualBox 4+ and Vagrant 1.7+, just have not tested it.

You will need to istall the [`vagrant-docker-compose`](https://github.com/leighmcculloch/vagrant-docker-compose) and the [`vagrant-gatling-rsync`](https://github.com/smerrill/vagrant-gatling-rsync) plugin before you can continue:

```bash
$ vagrant plugin install vagrant-docker-compose
$ vagrant plugin install vagrant-gatling-rsync
```

To bring the box up:

```bash
$ vagrant up
$ make init
```


Add `192.168.100.47 dev.activelamp.com` to `/etc/hosts`:

```bash
$ sudo bash -c 'echo 192.168.100.47 dev.activelamp.com >> /etc/hosts'
```

You should be able to access the Drupal site at http://dev.activelamp.com.

## Credentials

|          |          |
| -------- | -------- |
| Drupal admin    | _admin_    |
| Drupal password    | _admin_    |
| MySQL user    | _activelamp_    |
| MySQL password    | _activelamp_    |
| MySQL database    | _activelamp_    |



## Workflow

### Code-base

Run `make sync` when you want to start working on the project. Any changes you make on the project files will be synced up the the containers almost immediately. (See: [smerrill/vagrant-gatling-rsync](https://github.com/smerrill/vagrant-gatling-rsync))

Run `make sync-host` to grab code inside container into the host machine. <strong style="color: red;">You may potentially lose work when executing this command. Be careful.</strong>

### Composer

Run `make composer-install` to update all dependencies and scaffold the Drupal application if it hasn't been yet.

If you made modifications to `src/composer.json` file, run `make composer-install`.

__Important:__ Both these commands has the potential of removing/adding files into the code-base. You will need to `make sync-host` to pull the additions/removal up into your host machine so that subsequent `rsync` will not undo them within the containers.

To update the `src/composer.lock` file after running `make composer-install`, you can do `make lock-file > src/composer.lock` if you don't want to do a full `make sync-host`.

### Drush

You can execute command using the `bin/drush` executable in the root directory:

```bash
$ bin/drush cache-rebuild
```

__Note__: This Drush executable is simply passing the commands over the PHP container via `docker-compose run php ...` and _NOT_ via SSH. `bin/drush ssh` wouldn't work.

### SSH

SSH is not enabled on the Docker containers. If for whatever reason you really need to step into the container, follow these steps:

```bash
$ vagrant ssh

Welcome!

# Inside Vagrant machine:
$ docker exec -it $(docker ps | grep <service name> | awk '{print $1}') /bin/bash
```

Where `<service name>` is `php`, `nginx`, or `mysql`. (The code-base is mounted on both `php` and `nginx` only.)

### Database

```bash
$ bin/drush sql-cli
```

### Install/re-install fresh Drupal database with the correct config

```bash
$ make install-drupal
```

### Export _entire_ configuration

```bash
$ bin/drush config-export -y
$ make sync-host

```

### Deploy

The dev enviroment is at [http://master-jg6y2fhbfwjrq.us.platform.sh/](http://master-jg6y2fhbfwjrq.us.platform.sh/)

We are deploying to [Platform.sh](https://platform.sh/). For now, we'll use the bez@activelamp.com account which is on free-trial.

Deploying to Platform.sh is like deploying to [Heroku](heroku.com): you commit and push code to a branch (typically `master`) and Plaform.sh will take care of the build and the deployment to a container running a web-server.

To begin, add the corresponding Platform.sh project Git URL as a remote:

```sh
$ git remote add platform jg6y2fhbfwjrq@git.us.platform.sh:jg6y2fhbfwjrq.git
```
> You will need to register your public key to the bez@activelamp.com account before you could ever deploy.

To deploy:

```sh
$ git push platform master
```

### SSH into the dev server

To SSH into the dev server, run:

```sh
$ make platform-ssh
```

### Running Drush commands on dev server

You have to do it this way for now:
```sh
ssh jg6y2fhbfwjrq-master@ssh.us.platform.sh -- drush --root=web <command> [args...]
```

**@todo**: Wrap this in a Bash script. i.e. `bin/platform-drush ...`, or create a Drush alias.


## Troubleshooting

### GitHub API limitations

If you run into GitHub's API limit during `make init`, `make composer-install` or `make composer-update`:

1. [Generate a personal OAuth token from Github](https://github.com/settings/tokens/new).
2. Run `GITHUB_OAUTH_TOKEN=<token> vagrant provision`
3. Run `make vagrant-rebuild`
4. Verify that the correct token is registered in the PHP container:

```bash
vagrant ssh -- docker-compose -f /vagrant/docker-compose.yml run --rm --no-deps  php cat /root/.composer/auth.json
```

If that doesn't work, SSH into the Vagrant machine, edit `/etc/environment`, and add this line: `GITHUB_OAUTH_TOKEN=<token>`. Log-out, and do step 3 & 4.

