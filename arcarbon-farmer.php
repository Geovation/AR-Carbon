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
