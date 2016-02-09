jQuery(document).ready(function($) {
    $( document ).on( 'click', '.ar-map-submit-confirm', function() {

        var modalOptions = {
                dismissible: false,
                opacity: 0.5,
                in_duration: 350,
                out_duration: 250,
                ready: undefined,
                complete: undefined,
         };


        var button  = $(".ar-map-submit");
        var geojson = button.attr("data-geojson");
        var url     = update.ajax_url;
        var user_id = update.user_id;

        var data = {
            action : 'arcarbon_map_update',
            user_id : user_id,
            geojson : geojson
        };

        // Disable the button whilst the geojson is being submitted
        button.prop('disabled',true);

        // Check that the data is no undefined etc
        if (data && checkData(data)) {
            console.log("Valid: ", data);
        	$.ajax({
        		url: url,
                type : 'post',
                data : data
            })
            .done(function() {
                console.log("Data posted");
    			console.log(data);
                button.prop('disabled',false); // Undo the button disabling
                $('#submit').openModal();
                // Give user feedback;
    		})
            .fail(function() {
              $('#submit-error').openModal(modalOptions);
              button.prop('disabled',false); // Undo the button disabling
            });
        }
        else {
            $('#submit-error').openModal(modalOptions); // Show an error messag
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
