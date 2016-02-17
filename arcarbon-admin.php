
<?php
    // If the carbon headers does not exist make them
    $headers = get_option( "arcarbon_headers");

    if (!$headers) {
        $headers = '{
            "arcarbon_farm_name" : "Farm Name",
            "arcarbon_designation" : "Field designation",
            "arcarbon_area" : "Field size in ha",
            "arcarbon_som" : "Field SOM",
            "arcarbon_bulk_density" : "Bulk Density",
            "arcarbon_percent_carbon" : "% Carbon",
            "arcarbon_carbon_by_weight" : "Carbon by Weight",
            "arcarbon_total_carbon" : "Total carbon for field",
            "arcarbon_accumulation" : "Accumulation since last test kg/ha"
        }';
        update_option( "arcarbon_headers", $headers);
    }

    $headers_array = json_decode($headers, true); // Get as an array instead of object
    $header = '<tr>';
    foreach ($headers_array as $key => $value) {
        $header .= ('<th>'.$value.'</th>');
    }
    $header .= "</tr>";

    // Make the body element
?>

<div class="row ar-map-full">
   <form class="search-farmers">
    <div class="row">
       <div class="input-field col s12 ">
         <input id="username-search" type="text" class="validate">
         <label for="username-search">Username</label>
       </div>
     </div>
   </div>
   </form>

    <div id="admin-holder">
        <h5> Field Information </h5>
        <table id="admin" class="display" cellspacing="0" width="100%">
            <thead>
               <?php echo $header; ?>
            </thead>
            <tfoot>
               <?php echo $header; ?>
            </tfoot>
            <tbody>
                <?php echo $body; ?>
            </tbody>
        </table>
        <button class="admin-update btn waves-effect waves-light" type="submit" name="action" disabled>Update!
            <i class="material-icons right">send</i>
        </button>
    </div>

</div>

<!-- Submit button confirm Modal Structure -->
<div id="update-submit" class="modal">
<div class="modal-content">
  <h4>Are you sure you want to update these fields?</h4>
  <p>Are you sure that you want to confirm these changes? This will confirm your changes.</p>
</div>
<div class="modal-footer">
  <a href="#!" class=" modal-action modal-close waves-effect waves-green btn-flat">Wait, I want to change something</a>
  <a href="#!" class=" admin-update-confirm modal-action modal-close waves-effect waves-green btn-flat">Confirm</a>
</div>
</div>
<?php
