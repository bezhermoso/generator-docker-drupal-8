FROM php:7.0-apache

RUN apt-get update && apt-get install -y \
  vim \
  git \
  unzip \
  wget \
  curl \
  libmcrypt-dev \
  libgd2-dev \
  libgd2-xpm-dev \
  libcurl4-openssl-dev \
  mysql-client

ENV PHP_TIMEZONE America/Los_Angeles

# Install extensions
RUN docker-php-ext-install -j$(nproc) iconv mcrypt \
&& docker-php-ext-configure gd --with-freetype-dir=/usr/include/ --with-jpeg-dir=/usr/include/ \
 && docker-php-ext-install -j$(nproc) gd pdo_mysql curl mbstring opcache

# Install Composer & add global vendor bin dir to $PATH
RUN curl -SS http://getcomposer.org/installer | php
RUN mv composer.phar /usr/local/bin/composer
RUN echo 'export PATH="$PATH:/root/.composer/vendor/bin"' >> $HOME/.bashrc

# Install global Composer dependencies
RUN composer global require drush/drush:8.1.2 drupal/console:0.11.3
RUN $HOME/.composer/vendor/bin/drupal init
RUN echo source '$HOME/.console/console.rc' >> $HOME/.bashrc

RUN echo "date.timezone = \"$PHP_TIMEZONE\"" > /usr/local/etc/php/conf.d/timezone.ini
ARG github_oauth_token
# Register a GitHub OAuth token if present in build args.
RUN [ -n $github_oauth_token ] && composer config -g github-oauth.github.com $github_oauth_token || echo ''

# Set timezone.

RUN sed -i -e "s/\/var\/www\/html/\/var\/www\/web/" /etc/apache2/apache2.conf

# Copy scripts used by pass-through bin/drush and bin/drupal
COPY bin/drush-portal /usr/bin/drush-portal
COPY bin/drupal-portal /usr/bin/drupal-portal

COPY . /var/www/
WORKDIR /var/www/

RUN composer --working-dir=/var/www install

