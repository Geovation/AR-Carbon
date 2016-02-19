jQuery(document).ready(function($) {

    // Console fallback
    window.console = window.console || {
        log: function () {},
        error: function () {},
        debug: function () {},
        warn: function () {}
    };

    // Modal Options for the modal popup
    var modalOptions = {
            dismissible: false,
            opacity: 0.5,
            in_duration: 350,
            out_duration: 250,
            ready: undefined,
            complete: undefined,
     };

    function getChangedRows() {
        // Bring back a JSON object with all the cells with their changed values

        var rowsSelector = $("#admin > tbody > tr");
        var headerSelector = $("#admin > thead > tr > th");
        var masterHeaders = table.columns().data();
        var changedFields = {};
        var title;

        // Loop throw all the rows and headers and create a object of our updated fields
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
        return $(table.cell({row : i, column : j}).node()).find("input").val();
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
                //console.log(response);
                lastLoadedData = JSON.parse(response);
                console.log("After update lastLoadedData", lastLoadedData);
                $(".admin-cancel").prop("disabled", true);
                $(".admin-update").prop("disabled", true);
                //button.prop('disabled', false ); // Undo the button disabling
                // Give user feedback ?
    		})
            .fail(function() {
              //$('#submit-error').openModal(modalOptions);
              button.prop('disabled',false); // Undo the button disabling
          });
        }
        else {
            console.log("something went wrong L o L b");
            //$('#submit-error').openModal(modalOptions); // Show an error messag
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
