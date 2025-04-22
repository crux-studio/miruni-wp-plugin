FROM wordpress:latest

# Install required dependencies
RUN apt-get update && apt-get install -y \
    libzip-dev \
    zip \
    && rm -rf /var/lib/apt/lists/*

# Configure PHP settings for uploads
RUN { \
    echo 'upload_max_filesize = 64M'; \
    echo 'post_max_size = 64M'; \
    echo 'memory_limit = 256M'; \
    echo 'max_execution_time = 300'; \
    echo 'max_input_time = 300'; \
} > /usr/local/etc/php/conf.d/uploads.ini