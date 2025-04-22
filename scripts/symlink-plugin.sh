#!/bin/bash
echo "Symlinking plugin to WordPress container"
PLUGIN_NAME="miruni"
WORDPRESS_CONTAINER="wordpress-wordpress-1"

# Create the plugin directory if it doesn't exist
docker exec $WORDPRESS_CONTAINER mkdir -p /var/www/html/wp-content/plugins/$PLUGIN_NAME

docker cp ../../dist/apps/wordpress/. $WORDPRESS_CONTAINER:/var/www/html/wp-content/plugins/$PLUGIN_NAME/


