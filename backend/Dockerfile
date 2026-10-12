FROM php:8.2-apache

# Install required packages and PHP extensions
RUN apt-get update && apt-get install -y \
    libicu-dev \
    libzip-dev \
    libpng-dev \
    libjpeg62-turbo-dev \
    libfreetype6-dev \
    zip \
    unzip \
    && docker-php-ext-configure intl \
    && docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install intl mysqli pdo pdo_mysql zip gd

# Enable Apache mod_rewrite
RUN a2enmod rewrite

# No revelar la versión del servidor
RUN { echo 'ServerTokens Prod'; echo 'ServerSignature Off'; echo 'TraceEnable Off'; } > /etc/apache2/conf-available/seguridad.conf && a2enconf seguridad

# Install Composer
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

# Change DocumentRoot to public folder for CodeIgniter 4
ENV APACHE_DOCUMENT_ROOT /var/www/html/public
RUN sed -ri -e 's!/var/www/html!${APACHE_DOCUMENT_ROOT}!g' /etc/apache2/sites-available/*.conf
RUN sed -ri -e 's!/var/www/!${APACHE_DOCUMENT_ROOT}!g' /etc/apache2/apache2.conf /etc/apache2/conf-available/*.conf

RUN { \
      echo 'memory_limit=1024M'; \
      echo 'expose_php=Off'; \
      echo 'post_max_size=64M'; \
      echo 'max_execution_time=300'; \
      echo 'opcache.enable=1'; \
      echo 'opcache.memory_consumption=128'; \
      echo 'opcache.interned_strings_buffer=16'; \
      echo 'opcache.max_accelerated_files=20000'; \
      echo 'realpath_cache_size=4096K'; \
      echo 'realpath_cache_ttl=600'; \
    } > /usr/local/etc/php/conf.d/zz-performance.ini

# Copy application files (will be overridden by volume during dev, but good for prod)
COPY . /var/www/html
RUN composer install --optimize-autoloader --no-interaction --working-dir=/var/www/html

# Set permissions
RUN chown -R www-data:www-data /var/www/html/writable /var/www/html/public/uploads || true

EXPOSE 80
