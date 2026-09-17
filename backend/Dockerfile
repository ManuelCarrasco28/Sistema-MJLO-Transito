FROM php:8.2-apache

# Install required packages and PHP extensions
RUN apt-get update && apt-get install -y \
    libicu-dev \
    libzip-dev \
    zip \
    unzip \
    && docker-php-ext-configure intl \
    && docker-php-ext-install intl mysqli pdo pdo_mysql zip

# Enable Apache mod_rewrite
RUN a2enmod rewrite

# Change DocumentRoot to public folder for CodeIgniter 4
ENV APACHE_DOCUMENT_ROOT /var/www/html/public
RUN sed -ri -e 's!/var/www/html!${APACHE_DOCUMENT_ROOT}!g' /etc/apache2/sites-available/*.conf
RUN sed -ri -e 's!/var/www/!${APACHE_DOCUMENT_ROOT}!g' /etc/apache2/apache2.conf /etc/apache2/conf-available/*.conf

# Copy application files (will be overridden by volume during dev, but good for prod)
COPY . /var/www/html

# Set permissions
RUN chown -R www-data:www-data /var/www/html/writable /var/www/html/public/uploads || true

EXPOSE 80
