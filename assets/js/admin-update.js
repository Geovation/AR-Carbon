jQuery(document).ready(function($) {
    $( document ).on( 'click', '.admin-update-confirm', function() {

        window.console = window.console || {
            log: function () {},
            error: function () {},
            debug: function () {},
            warn: function () {}
        };

        var modalOptions = {
                dismissible: false,
                opacity: 0.5,
                in_duration: 350,
                out_duration: 250,
                ready: undefined,
                complete: undefined,
         };

         function getFarmer() {
             var farmers = [];
             var farmer;
             if ($("tbody tr").length) {
                 $("tbody tr").each(function(i, tr) {
                     farmer = $(tr).find("td:nth-child(3)").text();
                     if (farmer && farmers.indexOf(farmer) === -1) {
                         farmers.push(farmer);
                     }
                 });
             }
             else {
                 return false;
             }
             if (farmers.length === 1) {
                 return farmers[0];
             }
             return false;
        }

        var button       = $(".admin-update");
        var changed_fields= {};
        var farmer_id    = getFarmer();
        var url          = update.ajax_url;

        var data = {
            action  : 'admin_update',
            farmer_id :  farmer_id
        };

        // Check that the data is no undefined etc
        if (data && checkData(data)) {
            // Disable the button whilst the geojson is being submitted
            button.prop('disabled',true);

            console.debug("Valid: ", data);
        	$.ajax({
        		url: url,
                type : 'post',
                data : data
            })
            .done(function(response) {
                console.debug("Data posted");
    			console.debug(response);
                button.prop('disabled', false ); // Undo the button disabling
                //$('#submit').openModal();
                // Give user feedback;
    		})
            .fail(function() {
              //$('#submit-error').openModal(modalOptions);
              console.log("something went wrong L o L");
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
    function checkData(data) {
        // Check that all object values are valid
        var valid = true;
        for (var key in data) {
            if (Object.prototype.hasOwnProperty.call(data, key)) {
                var val = data[key];
                if (!val) {
                    valid = false; // If the value is undefined / null etc set the data to invalid
                }
            }
        }
        return valid; // Return if it's a valid object (i.e. all keys are not undefined/null etc)
    }
});
