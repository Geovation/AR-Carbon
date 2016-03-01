<link rel="stylesheet" type='text/css' href="<?php echo $css . "materialize.min.0.97.5.css" ?>">
<link rel="stylesheet" type='text/css' href="<?php echo $css . "jquery-ui.min.css" ?>">
<link rel="stylesheet" type='text/css' href="<?php echo $css . "jquery.dataTables.min.css" ?>">
<link rel="stylesheet" type='text/css' href="<?php echo $css . "admin.css" ?>">

<?php
    // If the carbon headers does not exist make them
    $headers = get_option( "arcarbon_headers");
    $default_headers = array(
        "arcarbon_field_name"       => "Field Name",
        "arcarbon_farm_name"        => "Farm Name",
        "arcarbon_designation"      => "Field designation",
        "arcarbon_area"             => "Field Size (ha)",
        "arcarbon_som"              => "Field SOM (%)",
        "arcarbon_bulk_density"     => "Bulk Density (g/l)",
        "arcarbon_percent_carbon"   => "Carbon (%)",
        "arcarbon_carbon_by_weight" => "Carbon by Weight (t/m³)",
        "arcarbon_total_carbon"     => "Total carbon for field (tonnes)",
        "arcarbon_accumulation"     => "Accumulation since last test (kg/ha)"
    );
    $mandatory_headers = array(
        "arcarbon_field_name" => "Field Name",
        "arcarbon_area"       => "Field Size (ha)"
    );

    // Handle the case that headers don't exist - use our default headers
    if (!$headers || $headers == "" || $headers == " ") {
        $headers = $default_headers;
        update_option( "arcarbon_headers", json_encode($headers)); // Convert to string
    }
    // Handle previously created data
    else if (gettype($headers) == "string" ) {
        $headers_array = json_decode($headers, true); // Convert to associative array
    }

    // Add mandatory if for some reason they don't exist
    foreach ($mandatory_headers as $key => $value) {
        if (!array_key_exists($key, $headers_array)) {
            $headers_array[$key] = $value;
        }
    }

    // Create return HTML
    $header = '<tr>';
    $footer = '<tr>';


    foreach ($headers_array as $key => $value) {
        if (!empty($key) && !empty($value)) {
            $header .= ('<th data-header="'.$key.'" >'.$value.'</th>');
            $footer .= ('<th><header class="change-headers">Change Header: </header>
                        <input class="edit-field-titles" value="'.$value.'">
                        <div class="hidden-footer">'.$value.'</div></th>');
        }
    }
    $header .= "</tr>";
    $footer .= "</tr>";

?>

<div class="row ar-map-full">
   <form class="search-farmers"  autocomplete="off" >
    <div class="row">
       <div class="input-field col s12 username-search-holder">
         <input id="username-search" class="validate typahead" type="text" data-provide="typeahead" autocomplete="off" disabled>
         <label for="username-search">Name, ID or Email</label>
       </div>
     </div>
   </div>
   </form>

    <div id="admin-holder" data-farmerid="">
        <div class="row">
            <h5 style="display: inline;"> Field Information </h5>
        </div>
        <div class="update-column-div">
            <div class="add-column-div row">
                <div class="add-column-text">Add a new column: </div>
                <input class="add-column-input" >
                <button class="btn-floating btn-large waves-effect waves-light add-column-holder" disabled>
                    <i class="material-icons add-column">add</i>
                </button>
            </div>
            <div class="remove-column-div row">
                <div class="remove-column-text"> Remove an existing column: </div>
                <select class="remove-column-input"></select>

                <button class="btn-floating btn-large waves-effect waves-light remove-column-holder" disabled>
                    <i class="remove-column">-</i>
                </button>

            </div>
        </div>
        <table id="admin" class="display nowrap" cellspacing="0" width="100%">
            <thead>
               <?php echo $header; ?>
            </thead>
            <tfoot>
               <?php echo $footer; ?>
            </tfoot>
            <tbody>
                <?php echo $body; ?>
            </tbody>
        </table>
        <button class="admin-update btn waves-effect waves-light" type="submit" name="action" disabled>
            Update! <i class="material-icons right">send</i>
        </button>
        <button class="admin-cancel btn waves-effect waves-light" type="submit" name="action" disabled>
            Cancel! <i class="material-icons right">stop</i>
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

<!-- Submit button confirm Modal Structure -->
<div id="cancel-submit" class="modal">
<div class="modal-content">
  <h4>Do you want to cancel your changes?</h4>
  <p>Cancelling your changes will revert the table back to how it was since your last save. Are you sure you want to do that?</p>
</div>
<div class="modal-footer">
  <a href="#!" class=" modal-action modal-close waves-effect waves-green btn-flat">No, I don't want to do that</a>
  <a href="#!" class=" admin-cancel-confirm modal-action modal-close waves-effect waves-green btn-flat">Yes, cancel my changes</a>
</div>
</div>

<!-- Submit button confirm Modal Structure -->
<div id="admin-error" class="modal">
<div class="modal-content">
  <h4>Oh No! Something has gone wrong!</h4>
  <p>Something didn't quite go to plan. One possible reason is your network connection is down.</p>
</div>
<div class="modal-footer">
  <a href="#!" class=" admin-cancel-confirm modal-action modal-close waves-effect waves-green btn-flat">Okay</a>
</div>
</div>

<!-- Confirm column delete Modal Structure -->
<div id="confirm-delete" class="modal">
<div class="modal-content">
  <h4>Are you sure you want to delete this column?</h4>
  <p>Deleting this column will remove all data for all users, are you sure this is something you want to do?</p>
</div>
<div class="modal-footer">
    <a href="#!" class=" modal-action modal-close waves-effect waves-green btn-flat">I don't want to do that</a>
    <a href="#!" class=" delete-column-confirm modal-action modal-close waves-effect waves-green btn-flat">Delete it!</a>
</div>
</div>

<!-- Confirm column add Modal Structure -->
<div id="confirm-add" class="modal">
<div class="modal-content">
  <h4>Are you sure you want to add a column?</h4>
  <p>Adding this column will add it for all users, are you sure this is something you want to do?</p>
</div>
<div class="modal-footer">
    <a href="#!" class=" modal-action modal-close waves-effect waves-green btn-flat">I don't want to do that</a>
    <a href="#!" class=" add-column-confirm modal-action modal-close waves-effect waves-green btn-flat">Add it!</a>
</div>
</div>


<?php
