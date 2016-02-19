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
    $("#content > h1").text("Admin Panel"); // Replace the text content of the h1 tag. There is probably a better way with WP hooks that avoids content flash?
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
                    console.log(data);
                    data = JSON.parse(data);  // Parse the data
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

        headers = data.headers;
        var geojson = data.geojson;
        var email   = data.email;
        var name    = data.name;
        var rows;

        // Loop through all fields and make a new row for each
        if (geojson.features) {
            $("#admin tbody").remove();
            $("#admin thead").after("<tbody></tbody>");
            for (var j =0; j < geojson.features.length; j++) {
                rows = '<tr>';
                $("#admin thead th").each(handleFeatures);
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




        table = $('#admin').DataTable({
             " scrollX" : true,
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
                rows += '<td><input type="text" value="'+feature.properties[key]+'"></td>';
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
                console.log($('input', td).val());
                return $('input', td).val();
            } );
        };
    }

});
