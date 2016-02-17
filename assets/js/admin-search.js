jQuery(document).ready(function($) {

    // Console fallback
    window.console = window.console || {
        log: function () {},
        error: function () {},
        debug: function () {},
        warn: function () {}
    };

    // Set modal options
    var modalOptions = {
            dismissible: false,
            opacity: 0.5,
            in_duration: 350,
            out_duration: 250,
            ready: undefined,
            complete: undefined,
     };

    var previousSearch;

     // Initialise
    var table;
    var editableVars = "#admin tbody td input";
    $("#content > h1").text("Admin Panel");

    $('.search-farmers').submit(function(e){
        e.preventDefault();
    });

    // Enable the update button on change to inputs
    $(document).on("change", editableVars, function(){
        $(".admin-update").prop("disabled", false);
    });

    // Open up the confirmation modal on click
    $(document).on("click", ".admin-update", function() {  // Add confirmation modal
        $("#update-submit").openModal(modalOptions);
    });

    $("#username-search").keypress(function(e) {
        var differentSearch = this.value != previousSearch;
        if(e.which == 13 && differentSearch) { // If user presses enter and not blank

        	$.ajax({
        		url: update.ajax_url,
                type : 'post',
                data : {
                    action   : 'arcarbon_admin_search',
                    username : $("#username-search").val()
                }
            })
            .done(function(data) {
                try {

                    data = JSON.parse(data);
                    if (!data.name || data.name == " ") {
                        throw("No user was found under that username. Please check spelling.");
                    }
                    else {
            			populateDataTables(data);
                    }
                }
                catch (e) {
                    handleFailure(e);
                }
    		})
            .fail(function() {
              //button.prop('disabled',false); // Undo the button disabling
          });
          previousSearch = this.value;
        }

    });

    function populateDataTables(data) {
        // Populate the tables with the Farmers field data and contact details

        hideError();
        showTable();

        var geojson = data.geojson;
        var headers = data.headers;
        var email   = data.email;
        var name    = data.name;
        var rows;

        // Loop through all fields and make a new row for each
        if (geojson.features) {
            for (var j =0; j < geojson.features.length; j++) {
                rows = '<tr>';
                $("thead th").each(handleFeatures);
                rows += '</tr>';
                $("#admin tbody").append(rows);
            }
        }

        // Setup the contact details table
        var contactDetails =
            "<div class='contact-details'>" +
                "<br><br><h5> Contact Details </h5>" +
                "<table class='contact'>" +
                    "<thead class='contact-head'>" +
                        "<th> Name </th>" +
                        "<th> Email </th>" +
                        "<th> Address </th>" +
                        "<th> Phone </th>" +
                    "</thead>" +
                    "<tbody>" +
                        "<td>" + name + "</td>" +
                        "<td>" + email+ "</td>" +
                        "<td>" + "</td>" +
                        "<td>" + "</td>" +
                    "</tbody>" +
                "<table>" +
            "</div>";

        // If contact details doesnt exist create else replace it
        if ($(".contact-details").length) {
            $(".contact-details").replaceWith(contactDetails);
        }
        else {
            $("#content-inner").append(contactDetails);
        }

        if (table) {
            table.destroy(); // If we had a previous table we must destroy it first
        }
        table = $('#admin').DataTable({ " scrollX" : true }); // Init the table

        function handleFeatures(i, th) {
            // Loop through all features and create the cells/rows for each

            var head = $(th).text();
            var key  = getObjectKey(headers, head);
            var feature = geojson.features[j];
            if (key && feature.properties[key]) { // If the text in the header matches a value in our headers
                rows += '<td><input type="text" value='+feature.properties[key]+'></td>';
            }
            else {
                rows += '<td><input type="text" value=""> </td>';
            }
        }

    }

    function handleFailure(error) {
        // Handle bad data or user not found

        hideTable(); // Hide the table
        showError(); // Show Error

        if (error.name === 'SyntaxError') {
            // If data (JSON) is invalid in some way
            if ($(".error-holder").length) {
                $(".error-holder").replaceWith("<h6>There was a problem with the user data: '"+error+"' <h6>");
            }
            else {
                $("#content-inner").append("<div class='error-holder'><h6>There was a problem with the user data: '"+error+"' <h6></div>");
            }
        }
        else {
            // If user is not found
            if ($(".error-holder").length) {
                $(".error-holder").replaceWith("<div class='error-holder'><h6>"+error+"<h6></div>");
            }
            else {

                $("#content-inner").append("<div class='error-holder'><h6>"+error+" <h6></div>");
            }
        }


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

    // Convience functions
    function hideError() {
        $(".error-holder").hide();
    }

    function showError() {
        $(".error-holder").hide();
    }

    function hideTable() {
        $("#admin-holder").hide();
        $(".contact-details").hide();
    }
    function showTable() {
        $("#admin-holder").show();
        $(".contact-details").show();
    }
});
