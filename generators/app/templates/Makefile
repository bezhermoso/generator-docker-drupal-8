
<% if(useVagrant) { %>
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
	vagrant ssh -- 'docker-compose -f /vagrant/docker-compose.yml run --no-deps --rm server composer --working-dir=/var/www update --no-interaction --prefer-dist'

# Use to update src/composer.lock if needed without `sync-host`
# i.e. `make lock-file > src/composer.lock`
lock-file:
	@vagrant ssh -- cat /mnt/code/composer.lock

install-drupal: composer-install
	vagrant ssh -- '[ -f /mnt/code/web/sites/default/settings.local.php ] && echo '' || cp /mnt/code/web/sites/default/settings.local.php.dist /mnt/code/web/sites/default/settings.local.php'
	-bin/drush si <%= installationProfile %> --account-pass=admin -y
	-bin/drush en config sync_uuids -y
	bin/drush sync-uuids -y
	[ $(ls -l src/web/sites/default/config/*.yml | wc -l) -gt 0  ] && bin/drush cim -y || echo "Config is empty. Skipping import..."

init: install-drupal
	yes | bin/sync-host --recursive --progress --verbose --delete-after --exclude='.git/' /mnt/code/ /vagrant/src/

<% } else { %>

docker-rebuild:
	docker-compose build

docker-restart:
	docker-compose  up -d

composer-install:
	docker-compose run --no-deps --rm server composer --working-dir=/var/www install

composer-update:
	docker-compose run --no-deps --rm server composer --working-dir=/var/www update --no-interaction --prefer-dist

install-drupal: composer-install
	[ -f src/web/sites/default/settings.local.php ] && : || cp src/web/sites/default/settings.local.php.dist src/web/sites/default/settings.local.php
	bin/drush si <%= installationProfile %> --account-pass=admin -y
	bin/drush en config sync_uuids -y
	bin/drush sync-uuids -y
	[ $(ls -l src/web/sites/default/config/*.yml | wc -l) -gt 0  ] && bin/drush cim -y || echo "Config is empty. Skipping import..."

init: install-drupal

<% } %>
