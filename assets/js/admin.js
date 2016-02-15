
jQuery(document).ready(function($) {

    var editableVars = "#admin tbody td input";

    // Initialise state
    if (!checkOneFarmer()) {
        console.log($(editableVars).prop("disabled"));
        $(editableVars).prop("disabled",true);
        $(".add-column-holder").hide();
    }
    $("#admin-filter").hide(); // We don't want the full search bar
    $(".admin-update").hide();


    // For Field ID and User name columns, add a column filter.
    $('#admin tfoot th').each( function () {
        if ($(this).hasClass("searchable")) {
            var title = $(this).text();
            $(this).html( '<input type="text" placeholder="Search '+title+'" />' );
        }
        else {
            $(this).html( '<p></p>' );
        }
    } );

    // Show the update button
    $(editableVars).on("change", function(){
        notOneFarmerHide(".admin-update");
    });

    var table = $('#admin').DataTable();

    // Appy the search
    table.columns().every( function () {
        var that = this;
        $( 'input', this.footer() ).on( 'keyup change', function () {
            if ( that.search() !== this.value ) {
                notOneFarmerHide(".add-column-holder");
                that.search( this.value ).draw();
                checkInputs();
            }
        } );
    } );

    function checkInputs() {
        if(!checkOneFarmer()) {
            $(editableVars).prop("disabled",true);
        }
        else {
            console.log("disabling");
            $(editableVars).prop("disabled",false);
        }
    }

    function notOneFarmerHide(cssClass) {
        if (checkOneFarmer()) {
            $(cssClass).show();
        }
        else {
            $(cssClass).hide();
        }
    }

    function checkOneFarmer() {
        farmers = [];
        if ($("tbody tr").length) {
            $("tbody tr").each(function(i, tr) {
                farmer = $(tr).find("td:nth-child(2)").text();
                if (farmer && farmers.indexOf(farmer) === -1) {
                    farmers.push(farmer);
                }
            });
        }
        else {
            return false;
        }
        if (farmers.length === 1) {
            return true;
        }
        return false;
    }

} );
