<?php

/**
 * The plugin bootstrap file
 *
 * This file is read by WordPress to generate the plugin information in the plugin
 * admin area. This file also includes all of the dependencies used by the plugin,
 * registers the activation and deactivation functions, and defines a function
 * that starts the plugin.
 *
 * @link              http://example.com
 * @since             1.0.0
 * @package           Plugin_Name
 *
 * @wordpress-plugin
 * Plugin Name:       AR Carbon Map
 * Plugin URI:        http://www.geovation.uk
 * Description:       The map element of the AR Carbon Site
 * Version:           0.0.1
 * Author:            James Milner
 * Author URI:        http://www.geovation.uk
 * License:           GPL-2.0+
 * License URI:       http://www.gnu.org/licenses/gpl-2.0.txt
 * Text Domain:       plugin-name
 * Domain Path:       /languages
 */

// If this file is called directly, abort.
if ( ! defined( 'WPINC' ) ) {
	die;
}

/**
 * The code that runs during plugin activation.
 * This action is documented in includes/arcarbon-map-name-activator.php
 */
function activate_plugin_name() {
	require_once plugin_dir_path( __FILE__ ) . 'includes/arcarbon-map-activator.php';
	Plugin_Name_Activator::activate();
}

/**
 * The code that runs during plugin deactivation.
 * This action is documented in includes/arcarbon-map-name-deactivator.php
 */
function deactivate_plugin_name() {
	require_once plugin_dir_path( __FILE__ ) . 'includes/arcarbon-map-deactivator.php';
	Plugin_Name_Deactivator::deactivate();
}

register_activation_hook( __FILE__, 'activate_plugin_name' );
register_deactivation_hook( __FILE__, 'deactivate_plugin_name' );

/**
 * The core plugin class that is used to define internationalization,
 * admin-specific hooks, and public-facing site hooks.
 */
require plugin_dir_path( __FILE__ ) . 'includes/arcarbon-map-name.php';

/**
 * Begins execution of the plugin.
 *
 * Since everything within the plugin is registered via hooks,
 * then kicking off the plugin from this point in the file does
 * not affect the page life cycle.
 *
 * @since    1.0.0
 */

function run_arcarbon_map() {

	add_action( 'wp_enqueue_scripts', 'enqueue_scripts' );
	function enqueue_scripts() {
		$user_id = get_current_user_id();
		wp_enqueue_script( 'arcarbon-map', plugins_url( '/public/js/arcarbon-map.js', __FILE__ ),  array( 'jquery' ), 1.0, true );
		wp_enqueue_script( 'arcarbon_map_update', plugins_url( '/public/js/arcarbon-map-update.js', __FILE__ ), array('jquery'), 1.0, true );
		wp_localize_script( 'arcarbon_map_update', 'update', array(
			'ajax_url' => admin_url( 'admin-ajax.php' ),
			'user_id'  => $user_id
		));
	}

	add_action( 'wp_ajax_nopriv_arcarbon_map_update', 'arcarbon_map_update' );
	add_action( 'wp_ajax_arcarbon_map_update', 'arcarbon_map_update' );
	function arcarbon_map_update() {
		if ( defined( 'DOING_AJAX' ) && DOING_AJAX ) {


			$user_id = $_POST['user_id'];
			$geojson = strval($_POST['geojson']);
			$area    = strval($_POST['area']);

			$geojson_meta = "arcarbon_map_geojson";
			$area_meta    = "arcarbon_map_area";

			$updateGeojson = update_user_meta( $user_id, $geojson_meta, $geojson );
			$updateArea    = update_user_meta( $user_id, $area_meta, $area);

			$updateGeojsonStr = ($updateGeojson)  ? 'true' : 'false';
			$updateAreaStr    = ($updateArea)     ? 'true' : 'false';

			$areaCheck    = (get_user_meta($user_id,  $area_meta ) == $area);
			$geojsonCheck = (get_user_meta($user_id,  $geojson_meta ) == $geojson);
			$bothCheck    = ($geojsonCheck && $areaCheck);

			if ( !$bothCheck ) {
				echo "{'error': 'Request did not update user's geojson and area data', 'code', 'Area : $area, GeoJSON : $geojson'}";
				die();
			}
			if ( !$areaCheck) {
				echo "{'error' : 'Request did not update area data'}";
				die();
			}
			if ( !$geojsonCheck ) {
				echo "{'error' : 'Request did not update user's geojson data', 'code': '' }";
				die();
			}
			if ($bothCheck) {
				echo "{'success' : 'Request was successful, meta data updated'}";
			}


			die();
		}

		//
		else {
			echo "{'error', 'Something went wrong'}";
		}
		die();
	}

	add_action( 'the_content', 'arcarbon_map' );
	function arcarbon_map($content) {
		$current_user = wp_get_current_user();

		if ( is_page( 'Populate Map' )  && in_the_loop()  ) {
			// IN THE LOOP NECESSARY! IT MAKES SURE THIS DOESNT FIRE 3 TIMEs.

			$css = plugin_dir_url( __FILE__ ) . "public/css/arcarbon-map.css";
			$js  = plugin_dir_url( __FILE__ ) . "public/js/arcarbon-map.js";
			?>
			<link rel="stylesheet" type='text/css' href="//maxcdn.bootstrapcdn.com/font-awesome/4.5.0/css/font-awesome.min.css">
			<link rel="stylesheet" type='text/css' href="https://fonts.googleapis.com/icon?family=Material+Icons">
			<link rel="stylesheet" type='text/css' href="<?php echo $css ?>">

			<div class="mat-row ar-map-full">
			    <div class="mat-col mat-s3 ar-map-full">
			        <div>
			            <div class="mat-row">
			                <div class="mat-col mat-s12">
			                    <h6> Welcome back </h6>
			                    <h5> <?php echo $current_user->user_firstname; echo $current_user->user_lastname; ?> </h5>
			                </div>
			            </div>

			            <div class="mat-divider"></div>

			            <div class="mat-row ar-map-total ar-map-pad-top ar-map-unmargin-bot-row ">

			                <div class="mat-col mat-s6">
			                    <h6> Total Hectares</h6>
			                </div>

			                <div class="mat-col mat-s6" id="area-value"> </div>

			            </div>

			            <div class="mat-divider"></div>
			        </div>
			        <div class="mat-row ar-map-pad-top ar-map-plots-holder">
			            <div class="mat-col mat-s12 ar-map-plots">
			                <!-- Fields go here -->
			            </div>
			        </div>
			        <div class="mat-row ">
			            <button class="ar-map-submit ar-map-dark-green mat-btn mat-waves-effect mat-waves-light" type="submit" name="action" autofocus=""
							href="<?php echo admin_url( 'admin-ajax.php?action=arcarbon_map_update' ) ?>"
							data-geojson="<?php handleGeojson(get_user_meta(get_current_user_id(), "arcabon-map-geojson", true)); ?>" >
							Submit
			                <i class="material-icons mat-right">send</i>
			            </button>
			        </div>
			    </div>
			    <div class="mat-col mat-s9 ar-map-full" >

			        <div id="arcarbon-map" class="ar-map-full"></div>

			    </div>

				<!-- Intersects Modal Structure -->
				<div id="intersects" class="mat-modal">
				  <div class="mat-modal-content">
					<h4>Your fields can not overlap!</h4>
					<p>Please review your selections and make sure that it does not overlap with your current selected areas.</p>
				  </div>
				  <div class="mat-modal-footer">
					<a href="#!" class=" mat-modal-action mat-modal-close mat-waves-effect mat-waves-green mat-btn-flat">Ok, got it</a>
				  </div>
				</div>

				<!-- Over 50 Hectares Modal Modal Structure -->
				<div id="overfifty" class="mat-modal">
				  <div class="mat-modal-content">
					<h4>Your total hectares has exceeded 50!</h4>
					<p>Please review your drawings to stay within the limit.</p>
				  </div>
				  <div class="mat-modal-footer">
					<a href="#!" class=" mat-modal-action mat-modal-close mat-waves-effect mat-waves-green mat-btn-flat">Ok, got it</a>
				  </div>
				</div>

				<!-- Modal Structure -->
			  <div id="submit" class="mat-modal">
			    <div class="mat-modal-content">
			      <h4>Your new plots have been submitted</h4>
			      <p>Thank you for your submission</p>
			    </div>
			    <div class="mat-modal-footer">
			      <a href="#!" class=" mat-modal-action mat-modal-close mat-waves-effect mat-waves-green mat-btn-flat">Ok, got it</a>
			    </div>
			  </div>

			</div>
			<?php
		}

	}

	function handleGeojson($geojson) {

		if ($geojson == false) {
			return "";
		}
		else if ( is_string($geojson) ) {
			return $geojson;
		}
	}

}


run_arcarbon_map(); ?>
