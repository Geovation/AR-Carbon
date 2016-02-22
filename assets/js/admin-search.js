var table;
var lastLoadedData;

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

    // Initialise
    var previousSearch; // Variable to store previous search
    var editableVars = "#admin tbody td input"; // Store the selector of our inputs that can change
    $('.search-farmers').submit(function(e){ e.preventDefault(); }); // Prevent the page from refreshing
    addInputDataSorting(); // Inputs need to be sorted too!

    // Enable the update button on change to inputs
    $(document).on("change", editableVars, function(){
        $(this).val(this.value);
        $(".admin-update").prop("disabled", false);
        $(".admin-cancel").prop("disabled", false);
    });

    // Open up the confirmation modal on click
    $(document).on("click", ".admin-cancel", function() {  // Add confirmation modal
        $("#cancel-submit").openModal(modalOptions);
    });
    // On confirm reload the table to it's previous state
    $( document ).on( 'click', '.admin-cancel-confirm', function() {
        console.log("onClick lastloaded data", lastLoadedData);
        populateDataTables(lastLoadedData);
        $(".admin-cancel").prop("disabled", true);
        $(".admin-update").prop("disabled", true);
    });

    // Open up the confirmation modal on click
    $(document).on("click", ".admin-update", function() {  // Add confirmation modal
        $("#update-submit").openModal(modalOptions);
    });
    // Update confirm handler is in admin-update.js

    // Handle the user searching for farmers
    $("#username-search").keypress(function(e) {
        var differentSearch = this.value != previousSearch; // Lets check to see if it's the same search
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
                    data = JSON.parse(data);  // Parse the data
                    console.log(data);
                    if (!data.name || data.name == " ") {
                        throw("No user was found under that username. Please check spelling.");
                    }
                    else {
                        lastLoadedData = data;
                        setFarmerId(data.id);
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

        var headers = data.headers;
        var geojson = data.geojson;
        var email   = data.email;
        var name    = data.name;
        var rows;

        // Loop through all fields and make a new row for each
        if (geojson.features) {
            $("#admin tbody").remove();
            $("#admin thead").after("<tbody></tbody>");
            for (var j =0; j < geojson.features.length; j++) {
                if (geojson.features[j].geometry.type === "Polygon") { // Make sure it's a field polygon
                    rows = '<tr>';
                    $("#admin thead th").each(handleFeatures);
                    rows += '</tr>';
                    $("#admin tbody").append(rows);
                }
            }
        }

        // Setup the contact details table
        var contactDetails =
            "<div class='contact-details'>" +
                "<br><br><h5> Contact Details </h5>" +
                "<table class='contact'>" +
                    "<thead class='contact-head'>" +
                        "<th><b> Name </b></th>" +
                        "<th><b> Email </b></th>" +
                        "<th><b> Address </b></th>" +
                        "<th><b> Phone </b></th>" +
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

        table = $('#admin').DataTable({
             //"scrollX" : true,
             "columnDefs": [
                {
                    "orderDataType": "dom-input",
                    "type": 'string',
                    "targets": '_all'
                }
            ]
        }); // Init the table

        showTable(); // Show the finished table

        function handleFeatures(i, th) {
            // Loop through all features and create the cells/rows for each
            var head = $(th).text();
            var key  = getObjectKey(headers, head);
            var feature = geojson.features[j];

            if (key && feature.properties[key]) { // If the text in the header matches a value in our headers
                if (key === "arcarbon_field_name") {
                    rows += '<td class="field-name-col">'+feature.properties[key]+'</td>';
                }
                else {
                    rows += '<td><input type="text" value="'+feature.properties[key]+'"></td>';
                }

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

        var msg1 = "<h6><b>There was a problem with the user data</b>: No fields exist for this user yet.</h6>";
        var msg2 = "<h6><b>There was a problem with the user data</b>: User was not found.</h6>";

        if (error.name === 'SyntaxError' || error.name === 'TypeError' ) {
            _appendError(msg1); // If data (JSON) is invalid in some way
        }
        else {
            _appendError(msg2); // If user is not found
        }

        function _appendError(msg) {
            if ($(".error-holder").length) {
                $(".error-holder").replaceWith("<div class='error-holder'>"+msg+"</div>");
            }
            else {

                $("#content-inner").append("<div class='error-holder'>"+msg+"</div>");
            }
        }
    }

    // Convenience functions

    function setFarmerId(id) {
        // Set the farmers ID in the #admin data
        $("#admin").data("farmerid", id);
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

    function addInputDataSorting() {
        $.fn.dataTable.ext.order['dom-input'] = function (settings, col) {
            return this.api().column( col, {order:'index'} ).nodes().map( function ( td, i ) {
                var val = $('input', td).val() || $(td).text();
                return val;
            } );
        };
    }

});
