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
        dismissible: true,
        opacity: 0.5,
        in_duration: 350,
        out_duration: 250,
        ready: undefined,
        complete: function() { $('.lean-overlay').remove(); } // Hack
     };

    // Initialise
    var previousSearch; // Variable to store previous search
    var editableVars = "#admin tbody td input"; // Store the selector of our inputs that can change
    $('.search-farmers').submit(function(e){ e.preventDefault(); }); // Prevent the page from refreshing
    addInputDataSorting(); // Inputs need to be sorted too!

    // Get hold of all the user (non meta) data so we can do an autocomplete against it
    $.ajax({
         url: update.ajax_url,
         type : 'post',
         data : {
             action   : 'arcarbon_admin_typeahead',
             username : $("#username-search").val()
         }
    })
    .done(function(data) {

        var userData = JSON.parse(data);  // Parse the data

        $('#username-search').autocomplete({
            minLength: 1, // This shows the min length of charcters that must be typed before the autocomplete looks for a match.
            source: typeaheadSource,
            focus: function(event, ui) {
                $('#username-search').val(ui.item.label);
                return false;
            },
            select: function(event, ui) {   // Once a value in the drop down list is selected, do the following:
                var id = ui.item.value;
                getUserData(id);
                return false;
            }
        });

        function typeaheadSource(request, response) {
            // Turns object into array for autocomplete to use (autocomplete only accepts arrays)
            var term = request.term;
            var uniqueIds = [];
            var matching = [];
            $.each(userData, function(i, farmer){
                $.each(farmer, function(key, val) {
                    if (strContains(val, term) && uniqueIds.indexOf(farmer.ID) === -1) {
                        matching.push({
                            "label" : farmer.Name + " ( " + key + " : " + val + " )",
                            "value" : farmer.ID
                        });
                        uniqueIds.push(farmer.ID);
                    }
                });
            });
            response(matching);
        }

        function strContains(val, term) {
            // Check if a string is within another in a case insensitive way
            return (val.toLowerCase().indexOf(term.toLowerCase()) !== -1);
        }

        $("#username-search").prop("disabled", false); // Enable input after the data has loaded :)

     })
     .fail(function() {
         $('#admin-error').openModal(modalOptions);
     });

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
        populateDataTables(lastLoadedData);
        $(".admin-cancel").prop("disabled", true);
        $(".admin-update").prop("disabled", true);
    });

    // Open up the confirmation modal on click
    $(document).on("click", ".admin-update", function() {  // Add confirmation modal
        $("#update-submit").openModal(modalOptions);
    });
    // Update confirm handler is in admin-update.js

     function getUserData(id) {
         // Get the user data from their ID
         $.ajax({
             url: update.ajax_url,
             type : 'post',
             data : {
                 action : 'arcarbon_admin_retrieve',
                 id     : id
             }
         })
         .done(function(data) {
             try {
                 data = JSON.parse(data);
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
           $('#admin-error').openModal(modalOptions);
         });
    }

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
                    $("#admin thead th").each(handleFeatures); // Does this need to be in a function?
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
