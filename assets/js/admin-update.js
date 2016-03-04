jQuery(document).ready(function($) {

    // Set modal options
    var modalOptions = {
        dismissible: true,
        opacity: 0.5,
        in_duration: 350,
        out_duration: 250,
        ready: undefined,
        complete: function() { $('.lean-overlay').remove(); } // Hack
     };


    function getChangedRows() {
        // Bring back a JSON object with all the cells with their changed values

        var rowsSelector = $("#admin > tbody > tr");
        var headerSelector = $("#admin > thead > tr > th");
        var masterHeaders = table.columns().data();
        var changedFields = {};
        var title;

        // Loop through all the rows and headers and create a object of our updated fields
        rowsSelector.each(function(i, row){
            headerSelector.each(function(j, column){
                var key = getCellKey(j);
                if (j === 0) {
                    title = getCellValue(i, j);
                    changedFields[title] = {};
                }
                else {
                    changedFields[title][key] = getCellValue(i, j);
                }
            });
        });

        return changedFields;
    }

    function getCellValue(i, j) {
        // Return a cells value based on it's row and column Number
        var node = $(table.cell({row : i, column : j}).node());
        var val = node.find("input").val() || node.text();
        return val;
    }

    function getCellKey(j) {
        // Return a headers true (master) key based on the column number
        var header = table.column(j).header();
        return $(header).data("header");
    }

    $( document ).on( 'click', '.admin-update-confirm', function() {
        // When the user confirms changes

        var button = $(".admin-update");
        var data = {
            action         : 'admin_update',
            changed_fields : getChangedRows(),
            farmer_id      : getFarmer()
        };

        console.log(getChangedRows());
        // Check that the data is no undefined etc
        if (data) {
            // Disable the button whilst the geojson is being submitted
            button.prop('disabled',true);
        	$.ajax({
        		url    : update.ajax_url,
                action : 'arcarbon_admin_update',
                type   : 'post',
                data   : data
            })
            .done(function(response) {

                lastLoadedData = JSON.parse(response);
                $(".admin-cancel").prop("disabled", true);
                $(".admin-update").prop("disabled", true);

    		})
            .fail(function() {
              $('#admin-error').openModal(modalOptions);
              button.prop('disabled',false); // Undo the button disabling
          });
        }
        else {
            $('#admin-error').openModal(modalOptions);
            button.prop('disabled',false); // Undo the button disabling
        }

        // Prevent being taken to another page - this is important!
        return false;
    });

    function getFarmer() {
        // Return the farmer ID which is stored as data in the HTML table #admin
        return $("#admin").data("farmerid");
   }

   function getObjectKey( obj, value ) {
       // Find out the key of a specific value - we need this to check master name for row headers
       for( var prop in obj ) {
           if( obj.hasOwnProperty( prop ) ) {
                if( obj[ prop ] === value )
                    return prop;
           }
       }
   }

});
