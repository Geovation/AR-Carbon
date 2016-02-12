<?php

/**

 * @wordpress-plugin
 * Plugin Name:       AR Carbon Map
 * Plugin URI:        http://www.geovation.uk
 * Description:       The map element of the AR Carbon Site
 * Version:           1.0.11
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

	add_action( 'wp_enqueue_scripts', 'enqueue_scripts', 0 );
	function enqueue_scripts() {
		$user_id = get_current_user_id();
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
			'user_id'  => $user_id
		));
	}


	add_action( 'wp_ajax_nopriv_arcarbon_map_update', 'arcarbon_map_update' );
	add_action( 'wp_ajax_arcarbon_map_update', 'arcarbon_map_update' );
	function arcarbon_map_update() {
		if ( defined( 'DOING_AJAX' ) && DOING_AJAX ) {

			$user_id = $_POST['user_id'];
			$geojson = stripslashes($_POST['geojson']);

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

	add_action( 'the_content', 'arcarbon_map' );
	function arcarbon_map($content) {
		$current_user = wp_get_current_user();
		$user_id = get_current_user_id();
		$is_logged_in = (is_user_logged_in()) ? 'true' : 'false';

		if ( is_page( 'Populate Map' )  && in_the_loop()  ) {
			// IN THE LOOP NECESSARY! IT MAKES SURE THIS DOESNT FIRE 3 TIMEs.
			$css = plugin_dir_url( __FILE__ ) . "assets/css/"

			?>

			<script type="text/javascript">
				var USER_LOGGED_IN = ("<?php echo $is_logged_in ?>" === 'true');
   				var USER_GEOJSON = "<?php echo addslashes(get_user_meta( get_current_user_id(), "arcarbon_map_geojson", true)); ?>";
			</script>

			<link rel="stylesheet" type='text/css' href="//maxcdn.bootstrapcdn.com/font-awesome/4.5.0/css/font-awesome.min.css">
			<link rel="stylesheet" type='text/css' href="https://fonts.googleapis.com/icon?family=Material+Icons">
			<link rel="stylesheet" type='text/css' href="<?php echo $css . "materialize.min.0.97.5.css" ?>">
			<link rel="stylesheet" type='text/css' href="<?php echo $css . "leaflet.css"  ?>">
			<link rel="stylesheet" type='text/css' href="<?php echo $css . "leaflet.draw.css"  ?>">
			<link rel="stylesheet" type='text/css' href="<?php echo $css . "L.Control.Locate.min.css"  ?>">
			<link rel="stylesheet" type='text/css' href="<?php echo $css . "esri-leaflet-geocoder.css"  ?>">
			<link rel="stylesheet" type='text/css' href="<?php echo $css . "main.css"  ?>">

			<div class="row ar-map-full ar-map-container">
			    <div class="col s3 ar-map-full">
			        <div>
			            <div class="row">
			                <div class="col s12">
								<?php
									if (is_user_logged_in()) {
    									echo "<h6> Welcome back  </h6>";
										echo "<h5>" . $current_user->user_firstname . " " . $current_user->user_lastname . "</h5>";
									}
									else {
										echo "<h6><h6><h5>Please Log In</h5>";
									}
								?>

			                </div>
			            </div>

			            <div class="divider"></div>

			            <div class="row ar-map-total ar-map-pad-top ar-map-unmargin-bot-row ">

			                <div class="col s6">
			                    <h6> Total Hectares</h6>
			                </div>

			                <div class="col s6" id="area-value"> </div>

			            </div>

			            <div class="divider"></div>
			        </div>
			        <div class="row ar-map-pad-top ar-map-plots-holder">
			            <div class="col s12 ar-map-plots">
			                <!-- Fields go here -->
			            </div>
			        </div>
			        <div class="row ar-map-submit-holder">
			            <button class="ar-map-submit ar-map-dark-green btn waves-effect waves-light" type="submit" name="action" autofocus=""
							href="<?php echo admin_url( 'admin-ajax.php?action=arcarbon_map_update' ) ?>" disabled
							data-geojson="<?php handleGeojson(get_user_meta(get_current_user_id(), "arcabon-map-geojson", true)); ?>" >
							Submit
			                <i class="material-icons right">send</i>
			            </button>
			        </div>
			    </div>
			    <div class="col s9 ar-map-full" >

			        <div id="arcarbon-map" class="ar-map-full"></div>

			    </div>

				<!-- Intersects Modal Structure -->
				<div id="intersects" class="modal">
				  <div class="modal-content">
					<h4>Your fields can not overlap!</h4>
					<p>Please review your selections and make sure that it does not overlap with your current selected areas.</p>
				  </div>
				  <div class="modal-footer">
					<a href="#!" class=" modal-action modal-close waves-effect waves-green btn-flat">Ok, got it</a>
				  </div>
				</div>

				<!-- Over 50 Hectares Modal Modal Structure -->
				<div id="overfifty" class="modal">
				  <div class="modal-content">
					<h4>Your total hectares has exceeded 50!</h4>
					<p>Please review your drawings to stay within the limit. If you want to add any information to this field, please click on it's boundary.</p>
				  </div>
				  <div class="modal-footer">
					<a href="#!" class="ar-over-fifty-ok modal-action modal-close waves-effect waves-green btn-flat">Ok, got it</a>
				  </div>
				</div>

				<!-- Submit button succesful Modal Structure -->
			  <div id="submit" class="modal">
			    <div class="modal-content">
			      <h4>Your new plots have been submitted</h4>
			      <p>Thank you for your submission</p>
			    </div>
			    <div class="modal-footer">
			      <a href="#!" class=" modal-action modal-close waves-effect waves-green btn-flat">Ok, got it</a>
			    </div>
			  </div>

			  <!-- Submit button confirm Modal Structure -->
			<div id="confirm-submit" class="modal">
			  <div class="modal-content">
				<h4>Once you have submitted you can not change your drawings</h4>
				<p>Are you sure that you want to confirm these drawings? Upon submission they can not be changed.</p>
			  </div>
			  <div class="modal-footer">
				<a href="#!" class=" modal-action modal-close waves-effect waves-green btn-flat">I want to change something</a>
				<a href="#!" class=" ar-map-submit-confirm modal-action modal-close waves-effect waves-green btn-flat">Confirm</a>
			  </div>
			</div>

		   <!-- Submit button confirm Modal Structure -->
		   <div id="submit-error" class="modal">
			<div class="modal-content">
			  <h4>Something appears to have gone wrong</h4>
			  <p>It looks like something has gone wrong. It may have been a network error, so please try again.</p>
			</div>
			<div class="modal-footer">
			  <a href="#!" class="modal-close waves-effect waves-green btn-flat">Ok, got it</a>
			</div>
		   </div>

		   <!-- Submit button confirm Modal Structure -->
		   <div id="geojson-error" class="modal">
			<div class="modal-content">
			  <h4>Something appears to have gone wrong</h4>
			  <p>It looks like your drawing data has corrupted. Please contact your AR Carbon point of contact. </p>
			</div>
			<div class="modal-footer">
			  <a href="#!" class="modal-close waves-effect waves-green btn-flat">Ok, got it</a>
			</div>
		   </div>

			  <!-- Add farmer information Modal Structure -->
		     <div id="field-text-edit" class="modal" data-keyboard="false">
				 <div class="modal-content">
	  				 <h4>Tell us a little about this plot...</h4>
					 <br>
					 <div class="input-field col s12">
						 <i class="material-icons prefix">mode_edit</i>
						 <input placeholder="Give this a title!" id="field-title" type="text" class="validate">
	   		 			 <label class="field-title-label" for="field-title">Give this area an identifier (a name or a Field Parcel Number)</label>
					</div>
					<div class="input-field col s12">
						 <i class="material-icons prefix">mode_edit</i>
						 <textarea id="field-description" class="materialize-textarea"></textarea>
						 <label class="active field-description-active" for="field-description">Please give an indication of field use</label>
				    </div>
  			   </div>
  			   <div class="modal-footer">
				   <div class="row ar-button-holder">
	  				   <a href="#!" class="ar-carbon-save-description modal-action modal-close waves-effect waves-green btn-flat">Save Info</a>
				   </div>
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
