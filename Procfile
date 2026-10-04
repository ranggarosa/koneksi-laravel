web: vendor/bin/heroku-php-apache2 public/
worker: php artisan queue:work --tries=3 --timeout=90
release: php artisan migrate --force
