
# Sync files back to host machine (See Vagrantfile synced folder config)
sync-host:
	bin/sync-host --recursive --progress --verbose --delete-after --exclude='.git/' /mnt/code/ /vagrant/src/

sync:
	vagrant rsync-auto

sync-once:
	vagrant rsync

docker-rebuild:
	vagrant ssh -- 'docker-compose -f /vagrant/docker-compose.yml build'

docker-restart:
	vagrant ssh -- 'docker-compose -f /vagrant/docker-compose.yml up -d'

composer-install:
	vagrant ssh -- 'docker-compose -f /vagrant/docker-compose.yml run --no-deps --rm server composer --working-dir=/var/www install'

composer-update:
	vagrant ssh -- 'docker-compose -f /vagrant/docker-compose.yml run --no-deps --rm server composer --working-dir=/var/www update'

# Use to update src/composer.lock if needed without `sync-host`
# i.e. `make lock-file > src/composer.lock`
lock-file:
	@vagrant ssh -- cat /mnt/code/composer.lock

install-drupal: composer-install
	vagrant ssh -- '[ -f /mnt/code/web/sites/default/settings.local.php ] && echo '' || cp /mnt/code/web/sites/default/settings.local.php.dist /mnt/code/web/sites/default/settings.local.php'
	-bin/drush si <%= installationProfile %> --account-pass=admin -y
	-bin/drush en config sync_uuids -y
	bin/drush sync-uuids -y
	bin/drush cim -y

init: install-drupal
	yes | bin/sync-host --recursive --progress --verbose --delete-after --exclude='.git/' /mnt/code/ /vagrant/src/

