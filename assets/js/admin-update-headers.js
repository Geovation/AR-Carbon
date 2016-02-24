jQuery(document).ready(function($) {
    $(".edit-field-titles").change(function(){

        changedVal = this.value;

        var th = $(this).closest("th")[0];
        var index = $(".dataTables_scrollFootInner table tfoot tr th").index(th);
        var hidden = $(this).siblings("div");
        var header = $(".dataTables_scrollHeadInner table thead tr th")[index];
        var changedKey = $(header).data("header");
        $(header).text(changedVal);

        hidden.text(changedVal);
        table.columns.adjust().draw();
        console.debug(changedVal, changedKey);

        var data = {
            changed_key   : changedKey,
            changed_value : changedVal,
            action        : 'arcarbon_admin_update_headers'
        };

        $.ajax({
            url    : update.ajax_url,
            type   : 'post',
            data   : data
        })
        .done(function(response) {
            console.log(response);
            //console.log("that worked ok");

        })
        .fail(function() {
          $('#admin-error').openModal(modalOptions);
          //button.prop('disabled',false); // Undo the button disabling
      });

    });
});
