<?php

/**

 * @wordpress-plugin
 * Plugin Name:       AR Carbon Map
 * Plugin URI:        http://www.geovation.uk
 * Description:       The map element of the AR Carbon Site
 * Version:           1.0.19
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

				enqueue('materialize', 'materialize.min.0.97.5.js');
				enqueue('tables', 'jquery.dataTables.min.js');
				enqueue('typeahead', 'jquery-ui.min.js');

				enqueue('arcarbon_admin_typeahead', 'admin-search.js');
				localize( 'arcarbon_admin_typeahead');

				enqueue('arcarbon_admin_retrieve', 'admin-search.js');
				localize( 'arcarbon_admin_retrieve');

				enqueue('arcarbon_admin_update', 'admin-update.js');
				localize( 'arcarbon_admin_update');

				enqueue('arcarbon_admin_update_headers', 'admin-update-headers.js');
				localize( 'arcarbon_admin_update_headers');

			}
			// If they are a user
			else {
				enqueue( 'leaflet','leaflet.js');
				enqueue( 'esri-leaflet','esri-leaflet.js');
				enqueue( 'leaflet-draw','leaflet.draw.js');
				enqueue( 'leaflet-locate', 'L.Control.Locate.min.js');
				enqueue( 'esri-leaflet-geocoder',  'esri-leaflet-geocoder.js');
				enqueue( 'turf', 'turf.min.js');
				enqueue( 'materialize', 'materialize.min.0.97.5.js');
				enqueue( 'arcarbon', 'arcarbon.js');

				enqueue( 'arcarbon_map_update', 'arcarbon-map-update.js');
				wp_localize_script( 'arcarbon_map_update', 'update', array(
					'ajax_url' => admin_url( 'admin-ajax.php' ),
					'user_id'  => get_current_user_id()
				));
			}
		}


	}

	function localize($service) {
		// Localize a AJAX Script
		$admin_ajax_url = array( 'ajax_url' => admin_url( 'admin-ajax.php' ));
		wp_localize_script( $service, 'update', $admin_ajax_url);
	}

	function enqueue($script, $file) {
		// Enqueue an AJAX script
		wp_enqueue_script( $script, plugins_url( "/assets/js/" . $file, __FILE__ ), array('jquery') );
	}

	$error_message = json_encode(array("error" => "Something went wrong"));

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
			echo $error_message;
		}
		die();
	}

	//add_action( 'wp_ajax_nopriv_arcarbon_admin_typeahead', 'arcarbon_admin_typeahead' );
	add_action( 'wp_ajax_arcarbon_admin_typeahead', 'arcarbon_admin_typeahead' );
	function arcarbon_admin_typeahead() {

		if ( defined( 'DOING_AJAX' ) && DOING_AJAX && current_user_can( 'administrator' )) {
			$users = get_users(array('fields'=>'all'));
			$farmers = array();
			foreach ($users as $key=>$farmer ) {
				$farmers[$key]["Name"]  = $farmer->data->display_name;
	            $farmers[$key]["ID"]    = $farmer->data->ID;
	            $farmers[$key]["Email"] = $farmer->data->user_email;
			}
			echo json_encode($farmers);
		}
		else {
			echo $error_message;
		}
		die();
	}

	//add_action( 'wp_ajax_nopriv_arcarbon_admin_update_headers', 'arcarbon_admin_update_headers' );
	add_action( 'wp_ajax_arcarbon_admin_update_headers', 'arcarbon_admin_update_headers' );
	function arcarbon_admin_update_headers() {

		if ( defined( 'DOING_AJAX' ) && DOING_AJAX && current_user_can( 'administrator' )) {

			$changed_key = $_POST['changed_key'];     // i.e. arcarbon_field_name
			$changed_value = $_POST['changed_value']; // Field Name -> Farmers Field Name
			$headers = json_decode(get_option("arcarbon_headers"), true); // Get the headers object
			$headers[$changed_key] = $changed_value;
			$changedHeaders = json_encode($headers);
			update_option( 'arcarbon_headers', $changedHeaders );
		}
		else {
			echo $error_message;
		}
		die();
	}


	//add_action( 'wp_ajax_nopriv_arcarbon_map_update', 'arcarbon_map_update' );
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
			echo $error_message;
		}
		die();
	}

	//add_action( 'wp_ajax_nopriv_admin_update', 'arcarbon_admin_update' );
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
				if (is_array($changed_field) || is_object($changed_field)) {
					foreach ($changed_field as $changed_key => $changed_val) {
						$returnGeojson["features"][$key]["properties"][$changed_key] = $changed_val; // Take the geojson assoc array and replace the necessary val
					}
				}
			}

			$returnGeojson = json_encode($returnGeojson);
			updateGeojson($farmer_id, $returnGeojson); // Take the updated geojson and replace it with the old geojson

		}
		else {
			echo $error_message;
		}
		die();
	}

	function updateGeojson($farmer_id, $geojson) {

		$updateGeojson = update_user_meta( $farmer_id, "arcarbon_map_geojson", $geojson );
		$updateGeojsonStr = ($updateGeojson)  ? 'true' : 'false';
		$checkGeojson = get_user_meta($farmer_id,  "arcarbon_map_geojson", true );
		$geojsonCheck = ( $checkGeojson == $geojson);

		if ( !$geojsonCheck ) {

			$geojson_error = json_encode(array(
				"error" => "Request did not update user's geojson data",
	            "code"  => $updateGeojson,
			    "return"=> $checkGeojson,
			    "update"=> $geojson
		    ));

			echo $geojson_error;
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
