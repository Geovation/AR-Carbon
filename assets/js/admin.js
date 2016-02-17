
jQuery(document).ready(function($) {

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

    var editableVars = "#admin tbody td input";
    //
    // // Initialise state
    // $(document).on("click", ".admin-update", function() {  // Add confirmation modal
    //     $("#update-submit").openModal(modalOptions);
    // });
    // if (!checkOneFarmer()) {
    //     $(editableVars).prop("disabled",true);
    //     $(".add-column-holder").hide();
    // }
    // $("#admin-filter").hide(); // We don't want the full search bar
    // $(".admin-update").hide();
    // $('#admin tfoot th').each( function () {
    //     // For Field ID and User name columns, add a column filter.
    //     if ($(this).hasClass("searchable")) {
    //         var title = $(this).text();
    //         $(this).html( '<input type="text" placeholder="Search '+title+'" />' );
    //     }
    //     else {
    //         $(this).html( '<p></p>' );
    //     }
    // } );

    // Show the update button
    // $(editableVars).on("change", function(){
    //     console.log("td changed");
    //     hideNotOneFarmer(".admin-update");
    // });

    // var table = $('#admin').DataTable();
    //
    // // Appy the search
    // table.columns().every( function () {
    //     var that = this;
    //     $( 'input', this.footer() ).on( 'keyup change focus', function () {
    //         hideNotOneFarmer(".add-column-holder");
    //         checkInputs();
    //         if ( that.search() !== this.value ) {
    //             that.search( this.value ).draw();
    //         }
    //     } );
    // } );
    //
    // function checkInputs() {
    //     if(!checkOneFarmer()) {
    //         $(editableVars).prop("disabled",true);
    //     }
    //     else {
    //         console.log("disabling");
    //         $(editableVars).prop("disabled",false);
    //     }
    // }
    //
    // function hideNotOneFarmer(cssClass) {
    //     if (checkOneFarmer()) {
    //         $(cssClass).show();
    //     }
    //     else {
    //         $(cssClass).hide();
    //     }
    // }
    //
    // function checkOneFarmer() {
    //     var farmers = [];
    //     var farmer;
    //     if ($("tbody tr").length) {
    //         $("tbody tr").each(function(i, tr) {
    //             farmer = $(tr).find("td:nth-child(2)").text();
    //             if (farmer && farmers.indexOf(farmer) === -1) {
    //                 farmers.push(farmer);
    //             }
    //         });
    //     }
    //     else {
    //         return false;
    //     }
    //     if (farmers.length === 1) {
    //         return true;
    //     }
    //     return false;
    // }


} );
