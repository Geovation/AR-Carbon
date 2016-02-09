<?php
// create custom plugin settings menu
add_action('admin_menu', 'ar_carbon_map_create_menu');

function ar_carbon_map_create_menu() {

    //create new top-level menu
    add_menu_page('AR Carbon Map', 'Map Settings', 'administrator', __FILE__, 'ar_carbon_map_settings_page' , plugins_url('/assets/images/map.png', __FILE__) );

    //call register settings function
    add_action( 'admin_init', 'register_ar_carbon_map_settings' );
}

function register_ar_carbon_map_settings() {
    //register our settings
    register_setting( 'ar-carbon-map-settings-group', 'map_api_key' );
}

function ar_carbon_map_settings_page() { ?>

    <div class="wrap">
    <h2>AR Carbon Map</h2>

    <form method="post" action="options.php">
        <?php settings_fields( 'ar-carbon-map-settings-group' ); ?>
        <?php do_settings_sections( 'ar-carbon-map-settings-group' ); ?>
        <table class="form-table">
            <tr valign="top">
            <th scope="row">Map API Key</th>
            <td><input type="text" name="map_api_key" value="<?php echo esc_attr( get_option('map_api_key') ); ?>" /></td>
            </tr>
        </table>

        <?php submit_button(); ?>

    </form>
    </div>
<?php } ?>
