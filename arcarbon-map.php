<?php

/**

 * @wordpress-plugin
 * Plugin Name:       AR Carbon Map
 * Plugin URI:        http://www.geovation.uk
 * Description:       The map element of the AR Carbon Site
 * Version:           1.1.1
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
include 'map-options.php'; // We don't use an API Key any more with Esri


function run_arcarbon_map() {
	// SCRIPT ENQUEUING AND LOCALIZATION

	// Localize a AJAX Script
	function localize_js($service, $admin_ajax_url) {
		wp_localize_script( $service, 'update', $admin_ajax_url);
	}

	// Enqueue our JavaScript a little more cleanly
	function enqueue_js($script, $file) {
		// Enqueue an AJAX script
		wp_enqueue_script( $script, plugins_url( "/assets/js/" . $file, __FILE__ ), array('jquery') );
	}

	// Enqueue our CSS a little more cleanly
	function enqueue_css($style, $file) {
		if (starts_with($file, "//")) {
			wp_enqueue_style( $style, $file ); // If file is http or https ... use agnostic //
		}
		else {
			wp_enqueue_style( $style, plugins_url( '/assets/css/'. $file, __FILE__) );
		}
	}

	function enquque_remote_css($style, $file) {
		wp_enqueue_style( $style, $file );
	}

	// Load in all the necessary JavaScript
	add_action( 'wp_enqueue_scripts', 'enqueue_scripts_and_styles', 1000);
	function enqueue_scripts_and_styles() {

		$admin_ajax_url = array( 'ajax_url' => admin_url( 'admin-ajax.php' ));
		if (is_map_page()) { // Make sure we are on the right page

			enqueue_js('console', 'console.js');
			enqueue_css('font-awesome', '//maxcdn.bootstrapcdn.com/font-awesome/4.5.0/css/font-awesome.min.css');
			enqueue_css('material-icons', '//fonts.googleapis.com/icon?family=Material+Icons');

			// If the user is an administrator
			if (current_user_can( 'administrator' )) {

				// Vendor JavaScript
				enqueue_js('materialize', 'materialize.min.0.97.5.js');
				enqueue_js('tables', 'jquery.dataTables.min.js');
				enqueue_js('typeahead', 'jquery-ui.min.js');

				// Searching and table functionality
				enqueue_js('arcarbon_admin_search', 'admin-search.js');
				localize_js( 'arcarbon_admin_typeahead', $admin_ajax_url);
				localize_js( 'arcarbon_admin_retrieve', $admin_ajax_url);
				localize_js( 'arcarbon_admin_add_column', $admin_ajax_url);
				localize_js( 'arcarbon_admin_update_headers', $admin_ajax_url);

				// Update variables in the table
				enqueue_js('arcarbon_admin_update', 'admin-update.js');
				localize_js( 'arcarbon_admin_update', $admin_ajax_url);

				enqueue_css('materialize', 'materialize-custom.css');
				enqueue_css('jquery-ui', 'jquery-ui.min.css');
				enqueue_css('datatables', 'jquery.dataTables.min.css');
				enqueue_css('admin', 'admin.css');

			}
			// If they are a user
			else {
				enqueue_js( 'leaflet','leaflet.js');
				enqueue_js( 'esri-leaflet','esri-leaflet.js');
				enqueue_js( 'leaflet-draw','leaflet.draw.js');
				enqueue_js( 'leaflet-locate', 'L.Control.Locate.min.js');
				enqueue_js( 'esri-leaflet-geocoder',  'esri-leaflet-geocoder.js');
				enqueue_js( 'turf', 'turf.min.js');
				enqueue_js( 'materialize', 'materialize.min.0.97.5.js');

				enqueue_js( 'arcarbon', 'arcarbon.js');
				localize_js( 'arcarbon', array(
					'USER_LOGGED_IN' => (is_user_logged_in()) ? 'true' : 'false',
					'USER_GEOJSON'   => cleanse_user_geojson(get_user_meta( get_current_user_id(), "arcarbon_map_geojson", true)),
					'user_id'  => get_current_user_id(),
					'ajax_url' => admin_url( 'admin-ajax.php' )
				));

				enqueue_css('materialize', 'materialize-custom.css');
				enqueue_css('leaflet', 'leaflet.css');
				enqueue_css('leaflet-draw', 'leaflet.draw.css');
				enqueue_css('leaflet-locate', 'L.Control.Locate.min.css');
				enqueue_css('esri-leafet', 'esri-leaflet-geocoder.css');
				enqueue_css('farmer', 'farmer.css');

			}
		}
	}

	// Reusable JSON AJAX messages
	$error_message = json_encode(array("error" => "Something went wrong"));
	$success_message = json_encode(array("success" => "Everything went as expected"));

	// Overwrite the title for our page
	add_filter('the_title', arcarbon_admin_title, 100);
	function arcarbon_admin_title($title) {
	  if( current_user_can( 'administrator' ) && is_map_page() && in_the_loop() ){
		return "Admin Panel";
	  }
	  else {
		  return $title;
	  }
	}

	add_filter('the_content', arcarbon_content);

	// Overwrite the content for our page
	function arcarbon_content($content) {

		if ( is_map_page() && in_the_loop() ) {
			// IN THE LOOP NECESSARY! IT MAKES SURE THIS DOESNT FIRE 3 TIMEs.
			$admin = current_user_can( 'administrator' );
			$current_user = wp_get_current_user();
			$user_id = get_current_user_id();

			if (!$admin) {
				include_once 'arcarbon-farmer.php'; // Include the farmer view of the app
			}
			else {
				include_once 'arcarbon-admin.php'; // Include the admin view of the app
			}
		}
		else if (in_the_loop()) {
			echo do_shortcode($content);
		}

	}

	function is_map_page() {
		$is_map = false;

		$page_to_use = get_option("arcarbon_map_page_to_use");
		if (!empty($page_to_use) && is_page($page_to_use) ) {
			$is_map = true;
		}

		return $is_map;

	}

	add_action( 'wp_ajax_arcarbon_admin_retrieve', 'arcarbon_admin_retrieve' );
	function arcarbon_admin_retrieve() {

		if ( defined( 'DOING_AJAX' ) && DOING_AJAX && current_user_can( 'administrator' )) {

			$id = $_POST['id'];
			$geojson = get_user_meta($id, "arcarbon_map_geojson", true );
			$headers = get_option("arcarbon_headers");
			if (gettype($geojson) == boolean ) {
				$geojson = "false"; // If it doesn't exist just make it false
			}

			echo get_user_data($id, $geojson); // Return the JSON

		}
		else {
			echo $error_message;
		}
		die();
	}

	add_action( 'wp_ajax_arcarbon_admin_add_column', 'arcarbon_admin_add_column' );
	function arcarbon_admin_add_column() {

		if ( defined( 'DOING_AJAX' ) && DOING_AJAX && current_user_can( 'administrator' )) {

			if ($_POST['header_action'] == "add") {
				// Add a header

				$new_col_key = $_POST['new_col_key'];
				$new_col_value = $_POST['new_col_value'];

				$headers = json_decode(get_option("arcarbon_headers"), true);
				$headers[$new_col_key] = $new_col_value;

				$new_headers = json_encode($headers);
				update_option("arcarbon_headers", $new_headers);

				echo $success_message;
			}
			else if ($_POST['header_action'] == "remove") {
				// Delete a header

				$old_col_key = $_POST['old_col_key'];
				$headers = json_decode(get_option("arcarbon_headers"), true);
				unset($headers[$old_col_key]);
				$new_headers = json_encode($headers);
				update_option("arcarbon_headers", $new_headers);
			}

		}
		else {
			echo $error_message;
		}
		die();
	}


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
			update_geojson($farmer_id, $returnGeojson); // Take the updated geojson and replace it with the old geojson

		}
		else {
			echo $error_message;
		}
		die();
	}

	// Update a users GeoJSON
	add_action( 'wp_ajax_arcarbon_map_update', 'arcarbon_map_update' );
	function arcarbon_map_update() {

		if ( defined( 'DOING_AJAX' ) && DOING_AJAX && is_user_logged_in() ) {

			$user_id = get_current_user_id();
			$geojson = stripslashes($_POST['geojson']);

			// REPLACE THIS WITH UPDATE GEOJSON WHEN YOU HAVE TIME TO TEST
			$updateGeojson = update_user_meta( $user_id, "arcarbon_map_geojson", $geojson );
			$updateGeojsonStr = ($updateGeojson)  ? 'true' : 'false';
			$checkGeojson = get_user_meta($user_id,  "arcarbon_map_geojson", true );
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
				echo $success_message;
			}
		}
		else {
			echo $error_message;
		}
		die();
	}

	// Update the users GeoJSON
	function update_geojson($farmer_id, $geojson) {

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
			echo get_user_data($farmer_id, $geojson);
		}
	}

	// Return the headers, user geojson and the user details as JSON
	function get_user_data($farmer_id, $geojson) {
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

    // Handle geojson that is passed to our farmer when they load the map
    function handle_geojson($geojson) {

        if ($geojson == false) {
            return "";
        }
        else if ( is_string($geojson) ) {
            return $geojson;
        }
    }


	// Check that the geojson isn't null/empty etc
	function cleanse_user_geojson($geojson) {

		if ( !empty($geojson) ) {
			return $geojson;
		}
		else {
			return "";
		}

	}

	// Search backwards starting from haystack length characters from the end
	function starts_with($haystack, $needle) {
    	return $needle === "" || strrpos($haystack, $needle, -strlen($haystack)) !== false;
	}

}

run_arcarbon_map();
?>
