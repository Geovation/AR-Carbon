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

    $(".edit-field-titles").change(function(){

        var th = $(this).closest("th")[0];
        var index = $(".dataTables_scrollFootInner table tfoot tr th").index(th);
        var hidden = $(this).siblings("div");
        var header = $(".dataTables_scrollHeadInner table thead tr th")[index];

        $(header).text(this.value);
        hidden.text(this.value);
        table.columns.adjust().draw();

    });

    $(document).on("keyup", ".add-column-input", function(){
        if ($(this).val()) {
            $(".add-column-holder").prop("disabled", false);
            $(".add-column").css("background-color", "#0E6939 !important");
        }
        else {
            $(".add-column-holder").prop("disabled", true);
            $(".add-column").css("background-color", "#808080 !important");
        }
    });

    $(document).on("focus", ".remove-column-input", function(){
        console.log("focus");

        $(".remove-column-holder").prop("disabled", false);
        $(".remove-column").css("background-color", "#FF4C4C !important");

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
                 console.error(e);
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
        console.log(data.headers);

        var headers = data.headers;
        var geojson = data.geojson;
        var email   = data.email;
        var name    = data.name;
        var rows;

        if (headers) {
            populateDeleteFields(headers);
        }

        if (table) {
            table.destroy(); // If we had a previous table we must destroy it first
            if (("#admin").length) {
                $("#admin").remove();
                $(".update-column-div").after($(generateTable(headers))); // Create the new table
                setFarmerId(data.id); // Make sure the farmers ID is set on the table
            }
        }

        // Loop through all fields and make a new row for each
        if (geojson.features) {
            console.log($("#admin tbody"));
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

        console.log("\n ", isWellFormedTable($('#admin')[0]));
        console.log("Inner", $("#admin").html());

        table = $('#admin').DataTable({
             "scrollX" : true,
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

    function populateDeleteFields(cols) {
        var select = $(".remove-column-input");
        // Remove
        select
            .find('option')
            .remove();

        // Repopulate
        $.each(cols, function(key, value) {
             select
                 .append($("<option></option>")
                 .attr("value", key)
                 .text(value));
        });
    }

    function isWellFormedTable(table){
        // Determines whethere the table is well formed and can be used with DataTables (jQuery)

        var isWellFormed = false;
        table = $(table);

        if(table.is("table")) { // Is table
            if ( table.has("thead").length && table.has("tfoot").length && table.has("tbody") ) { // Has head and foot
                var numRows = table.find("tbody").find("tr").length;
                var numCells = table.find("tbody").find("td").length;
                var tableHead = table.find("thead").find("th");
                var tableFoot = table.find("tfoot").find("th");
                var cols =  numCells / numRows;
                if (tableHead.length === tableFoot.length) { // Number of column headings equals number of footers
                    if (cols === tableHead.length && cols === tableHead.length) { // Number of cols equals to headers and footers");
                        isWellFormed = true;
                    }
                }
            }
        }
        return isWellFormed;
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


    $(".add-column-holder").on("click", function(){
        var button = $(".add-column-input");
        console.log("clicks");
        var newColumn = $(".add-column-input").val();
        console.log(newColumn, keyifyNewColumn(newColumn));
        var data = {
            new_col_value   : newColumn,
            new_col_key     : keyifyNewColumn(newColumn),
            header_action   : "add",
            action          : 'arcarbon_admin_add_column'
        };

        $.ajax({
            url    : update.ajax_url,
            type   : 'post',
            data   : data
        })
        .done(function(response) {
            var id = getFarmerId();
            getUserData(id);
            button.val(""); // Set new column input to blank
        })
        .fail(function() {
          $('#admin-error').openModal(modalOptions);
          //button.prop('disabled',false); // Undo the button disabling
      });

      function keyifyNewColumn(header) {
          var key = "arcarbon_" + header.toLowerCase();
          var re = new RegExp(" ", "g");
          key = key.replace(/[^\w\s]/gi, '').trim().replace(re, '_');
          return key;
      }

    });

    $(".remove-column-holder").on("click", function(){
        console.log("clicks");
        var oldColumn = $(".remove-column-input").val();

        var data = {
            old_col_key   : oldColumn,
            header_action : "remove",
            action        : 'arcarbon_admin_add_column'
        };

        $.ajax({
            url    : update.ajax_url,
            type   : 'post',
            data   : data
        })
        .done(function(response) {
            var id = getFarmerId();
            getUserData(id);
        })
        .fail(function() {
          $('#admin-error').openModal(modalOptions);
      });

    });


    // Convenience functions

    function generateTable(headers) {
        //console.log(headers);
        var newHeader = '<tr>';
        var newFooter = '<tr>';

        for (var key in headers) {

            var value = headers[key];

            newHeader += '<th data-header="'+key+'" >'+value+'</th>';
            newFooter += '<th><header class="change-headers">Change Header: </header><input class="edit-field-titles" value="'+value+'"><div class="hidden-footer">'+value+'</div></th>';
        }
        newHeader += '</tr>';
        newFooter += '</tr>';

        var newTable = '<table id="admin" class="display nowrap" cellspacing="0" width="100%">'+
            '<thead>'+
                newHeader+
            '</thead>'+
            '<tfoot>'+
                newFooter+
            '</tfoot>'+
            '<tbody>'+
            '</tbody>'+
        '</table>';
        return newTable;
    }

    function setFarmerId(id) {
        // Set the farmers ID in the #admin data
        $("#admin").data("farmerid", id);
    }

    function getFarmerId() {
        // Set the farmers ID in the #admin data
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
