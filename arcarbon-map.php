<?php

/**

 * @wordpress-plugin
 * Plugin Name:       AR Carbon Map
 * Plugin URI:        http://www.geovation.uk
 * Description:       The map element of the AR Carbon Site
 * Version:           1.0.17
 * Author:            James Milner
 * Author URI:        http://www.geovation.uk
 * License:           GPL-2.0+
 * License URI:       http://www.gnu.org/licenses/gpl-2.0.txt
 * Text Domain:       arcarbon-map
 * Domain Path:       /languages
 */

// If this file is called directly, abort.
if ( ! defined( 'WPINC' ) ) {
	die;
}

/**
 * Begins execution of the plugin.
 *
 * Since everything within the plugin is registered via hooks,
 * then kicking off the plugin from this point in the file does
 * not affect the page life cycle.
 *
 * @since    1.0.0
 */

// Include our options file for setting up plugin settings like API keys
include 'map-options.php';


function run_arcarbon_map() {


	// Load in all the necessary JavaScript
	add_action( 'wp_enqueue_scripts', 'enqueue_scripts');
	function enqueue_scripts() {
		if (is_page( 'Populate Map' )) { // Make sure we are on the right page

			// If the user is an administrator
			if (current_user_can( 'administrator' )) {
				wp_enqueue_script( 'materialize', plugins_url( '/assets/js/materialize.min.0.97.5.js', __FILE__ ), array('jquery') );
				wp_enqueue_script( 'tables', plugins_url( '/assets/js/jquery.dataTables.min.js', __FILE__ ), array('jquery') );
				wp_enqueue_script( 'typeahead', plugins_url( '/assets/js/jquery-ui.min.js', __FILE__ ), array('jquery') );

				wp_enqueue_script( 'arcarbon_admin_typeahead',  plugins_url( '/assets/js/admin-search.js', __FILE__ ), array('jquery') );
				wp_localize_script( 'arcarbon_admin_typeahead', 'update', array(
					'ajax_url' => admin_url( 'admin-ajax.php' )
				));

				wp_enqueue_script( 'arcarbon_admin_retrieve',  plugins_url( '/assets/js/admin-search.js', __FILE__ ), array('jquery') );
				wp_localize_script( 'arcarbon_admin_retrieve', 'update', array(
					'ajax_url' => admin_url( 'admin-ajax.php' )
				));

				wp_enqueue_script( 'arcarbon_admin_update',  plugins_url( '/assets/js/admin-update.js', __FILE__ ), array('jquery') );
				wp_localize_script( 'arcarbon_admin_update', 'update', array(
					'ajax_url' => admin_url( 'admin-ajax.php' )
				));
			}
			// If they are a user
			else {
				wp_enqueue_script( 'leaflet', plugins_url( '/assets/js/leaflet.js', __FILE__ ) );
				wp_enqueue_script( 'esri-leaflet', plugins_url( '/assets/js/esri-leaflet.js', __FILE__ ) );
				wp_enqueue_script( 'leaflet-draw', plugins_url( '/assets/js/leaflet.draw.js', __FILE__ ));
				wp_enqueue_script( 'leaflet-locate', plugins_url( '/assets/js/L.Control.Locate.min.js', __FILE__ ));
				wp_enqueue_script( 'esri-leaflet-geocoder', plugins_url( '/assets/js/esri-leaflet-geocoder.js', __FILE__ ));
				wp_enqueue_script( 'turf', plugins_url( '/assets/js/turf.min.js', __FILE__));
				wp_enqueue_script( 'materialize', plugins_url( '/assets/js/materialize.min.0.97.5.js', __FILE__ ), array('jquery') );
				wp_enqueue_script( 'arcarbon', plugins_url( '/assets/js/arcarbon.js', __FILE__ ), array( 'jquery' ));
				wp_enqueue_script( 'arcarbon_map_update', plugins_url( '/assets/js/arcarbon-map-update.js', __FILE__ ), array( 'jquery' ));
				wp_localize_script( 'arcarbon_map_update', 'update', array(
					'ajax_url' => admin_url( 'admin-ajax.php' ),
					'user_id'  => get_current_user_id()
				));
			}
		}
	}


	// Overwrite the title for our page
	add_filter('the_title', arcarbon_admin_title, 100);
	function arcarbon_admin_title($title) {
	  if( current_user_can( 'administrator' ) && $title == 'Populate Map' ){
		return "Admin Panel";
	  }
	  else {
		  return $title;
	  }
	}

	// Overwrite the content for our page
	add_action( 'the_content', 'arcarbon_map');
	function arcarbon_map($content) {
		$admin = current_user_can( 'administrator' );
		$current_user = wp_get_current_user();
		$user_id = get_current_user_id();
		$is_logged_in = (is_user_logged_in()) ? 'true' : 'false';

		if ( is_page( 'Populate Map' )  && in_the_loop() ) {
			// IN THE LOOP NECESSARY! IT MAKES SURE THIS DOESNT FIRE 3 TIMEs.
			?>
			<script type="text/javascript">
				<?php $g = get_user_meta( get_current_user_id(), "arcarbon_map_geojson", true); ?>
				var USER_LOGGED_IN = ("<?php echo $is_logged_in ?>" === 'true');
				var USER_GEOJSON = <?php echo "'$g'"; ?>;

			</script>

			<link rel="stylesheet" type='text/css' href="//maxcdn.bootstrapcdn.com/font-awesome/4.5.0/css/font-awesome.min.css">
			<link rel="stylesheet" type='text/css' href="https://fonts.googleapis.com/icon?family=Material+Icons">

			<?php
			$css = plugin_dir_url( __FILE__ ) . "assets/css/";

			if (!$admin) {
				include_once 'arcarbon-farmer.php'; // Include the admin part of the app
			}
			else {

				include_once 'arcarbon-admin.php'; // Include the admin part of the app
			}
		}
	}

	//add_action( 'wp_ajax_nopriv_arcarbon_admin_retrieve', 'arcarbon_admin_retrieve' );
	add_action( 'wp_ajax_arcarbon_admin_retrieve', 'arcarbon_admin_retrieve' );
	function arcarbon_admin_retrieve() {

		if ( defined( 'DOING_AJAX' ) && DOING_AJAX && current_user_can( 'administrator' )) {

			$id = $_POST['id'];
			$geojson = get_user_meta($id, "arcarbon_map_geojson", true );
			$headers = get_option("arcarbon_headers");
			if (gettype($geojson) == boolean ) {
				$geojson = "false"; // If it doesn't exist just make it false
			}

			echo getUserData($id, $geojson); // Return the JSON

		}
		else {
			echo "{'error', 'Something went wrong'}";
		}
		die();
	}

	add_action( 'wp_ajax_nopriv_arcarbon_admin_typeahead', 'arcarbon_admin_typeahead' );
	add_action( 'wp_ajax_arcarbon_admin_typeahead', 'arcarbon_admin_typeahead' );
	function arcarbon_admin_typeahead() {

		if ( defined( 'DOING_AJAX' ) && DOING_AJAX && current_user_can( 'administrator' )) {

			echo json_encode(get_users(array('fields'=>'all')));

		}
		else {
			echo "{'error', 'Something went wrong'}";
		}
		die();
	}

	add_action( 'wp_ajax_nopriv_arcarbon_map_update', 'arcarbon_map_update' );
	add_action( 'wp_ajax_arcarbon_map_update', 'arcarbon_map_update' );
	function arcarbon_map_update() {

		if ( defined( 'DOING_AJAX' ) && DOING_AJAX ) {

			$user_id = $_POST['user_id'];
			$geojson = stripslashes($_POST['geojson']);

			// REPLACE THIS WITH UPDATE GEOJSON WHEN YOU HAVE TIME TO TEST
			$updateGeojson = update_user_meta( $user_id, "arcarbon_map_geojson", $geojson );
			$updateGeojsonStr = ($updateGeojson)  ? 'true' : 'false';
			$checkGeojson = get_user_meta($user_id,  "arcarbon_map_geojson", true );
			$geojsonCheck = ( $checkGeojson == $geojson);

			if ( !$geojsonCheck ) {
				echo "{'error' : 'Request did not update user's geojson data', 'code': '$updateGeojson', 'return': '$checkGeojson', 'update' : '$geojson'}";
			}
			else {
				echo "{'success': 'Data posted to WP!'}";
			}
		}
		else {
			echo "{'error', 'Something went wrong'}";
		}
		die();
	}

	add_action( 'wp_ajax_nopriv_admin_update', 'arcarbon_admin_update' );
	add_action( 'wp_ajax_admin_update', 'arcarbon_admin_update' );
	function arcarbon_admin_update() {

		if ( defined( 'DOING_AJAX' ) && DOING_AJAX && current_user_can( 'administrator' )) {

			$farmer_id = $_POST['farmer_id'];
			$changed_fields = $_POST['changed_fields'];
			$geojson = json_decode(get_user_meta($farmer_id, "arcarbon_map_geojson", true ), true); // as associative array
			$returnGeojson = $geojson;

			foreach ($geojson["features"] as $key => $field) {

				$field_name = $field["properties"]["arcarbon_field_name"];
				$changed_field = $changed_fields[$field_name]; // Get the update properties assoc array
				foreach ($changed_field as $changed_key => $changed_val) {
					$returnGeojson["features"][$key]["properties"][$changed_key] = $changed_val; // Take the geojson assoc array and replace the necessary val
				}
			}

			$returnGeojson = json_encode($returnGeojson);
			updateGeojson($farmer_id, $returnGeojson); // Take the updated geojson and replace it with the old geojson

		}
		else {
			echo "{'error', 'Something went wrong'}";
		}
		die();
	}

	function updateGeojson($farmer_id, $geojson) {

		$updateGeojson = update_user_meta( $farmer_id, "arcarbon_map_geojson", $geojson );
		$updateGeojsonStr = ($updateGeojson)  ? 'true' : 'false';
		$checkGeojson = get_user_meta($farmer_id,  "arcarbon_map_geojson", true );
		$geojsonCheck = ( $checkGeojson == $geojson);

		if ( !$geojsonCheck ) {
			echo "{'error' : 'Request did not update user's geojson data', 'code': '$updateGeojson', 'return': '$checkGeojson', 'update' : '$geojson'}";
		}
		else {
			echo getUserData($farmer_id, $geojson);
		}
	}

	function getUserData($farmer_id, $geojson) {
		$headers = json_decode(get_option("arcarbon_headers"));
		$geojson = json_decode($geojson);
		$user = get_user_by("ID", $farmer_id);
		return json_encode(
				array(
					"headers" => $headers,
					"geojson" => $geojson,
					"id"	  => $farmer_id,
					"email"   => $user->user_email,
					"name"    => $user->first_name . " " . $user->last_name
				)
			 );
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
