
jQuery(document).ready(function($) {

    if (!checkOneFarmer() || true) {
        console.log($("#example tbody td input").prop("disabled"));
        $("#example tbody td input").prop("disabled",true);
        $(".add-column-holder").hide();
    }
    $("#example-filter").hide(); // We don't want the full search bar
    $(".admin-update").hide();


    $('#example tfoot th').each( function () {
        if ($(this).hasClass("searchable")) {
            var title = $(this).text();
            $(this).html( '<input type="text" placeholder="Search '+title+'" />' );
        }
        else {
            $(this).html( '<p></p>' );
        }
    } );

    $("#example tbody td input").on("change", function(){
        notOneFarmerHide(".admin-update");
    });

    var table = $('#example').DataTable();

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
            $("#example tbody td input").prop("disabled",true);
        }
        else {
            console.log("disabling");
            $("#example tbody td input").prop("disabled",false);
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
