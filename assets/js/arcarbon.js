jQuery(document).ready(function($) {
    //console.log(USER_LOGGED_IN, typeof USER_LOGGED_IN);
    // Needed to allow for editing polygon intersection checking and preventing console error
    L.EditToolbar = L.EditToolbar.extend({
        _save: function () {
            if (this._activeMode !== null) {
                this._activeMode.handler.save();
                try {
                    this._activeMode.handler.disable();
                }
                catch(e) {

                }
            }
       }
    });



    // Custom layer properties
    // _arcArea
    // _arcDomElement
    // _arcFieldTitle
    // _arcFieldDescription


    var USER_GEOJSON = update.USER_GEOJSON;
    var USER_LOGGED_IN = update.USER_LOGGED_IN;

    // Development environment
    var DEVELOPMENT = false;
    if (localStorage && localStorage.getItem("arc-debug")) {
        DEVELOPMENT = true;
    }

    // Initialisation
    var boundingBox = L.latLngBounds(
            L.latLng({lat: 49.62, lng:-10.7}),
            L.latLng({lat: 62.52, lng :4.11})
        ),
        center = boundingBox.getCenter(),
        map = L.map('arcarbon-map', {maxBounds: boundingBox}).setView(center, 5),
        drawnItems = new L.FeatureGroup().addTo(map),
        saveArray = [],
        totalHectares = 0.0,
        userFarm,
        deleting = false,
        submitted = false,
        currentLayer,
        enableDraw = {
            polyline  : false,
            circle    : false,
            rectangle : false,
            marker    : true,
            polygon  : {
                allowIntersection: false,
                drawError: {
                   color: '#e1e100', // Color the shape will turn when intersects
                   message: '<strong>Oh snap!<strong> you can\'t draw that!' // Message that will show when intersect
                },
                weight: 12
            }
        },
        enableEdit = {
            featureGroup: drawnItems,
            poly : {
                allowIntersection : false
            }
        },
        modalOptions = {
            dismissible: true,
            opacity: 0.5,
            in_duration: 350,
            out_duration: 250,
            ready: undefined,
            complete: function() { $('.lean-overlay').remove(); } // Hack
         };

    // Esri Base Map
    L.esri.basemapLayer("Imagery", {maxZoom: 18}).addTo(map); // 19 produces 'no map tiles available'

    // Esri Geocoder
    var searchControl = new L.esri.Geocoding.Controls.Geosearch({
        useMapBounds: false
    }).addTo(map);

    // If user has previous polygons saved and we're not in developement, or the user is not logged in
    //console.log(USER_LOGGED_IN)
    if ((USER_GEOJSON && !DEVELOPMENT) || !USER_LOGGED_IN) {
        enableDraw = false;
        enableEdit = false;
    }

    // Leaflet Draw Control Setup
    var controls = new L.Control.Draw({
        draw : enableDraw,
        edit : enableEdit
    });
    map.addControl(controls);

    // Locate User Control
    L.control.locate({icon: 'fa fa-location-arrow'}).addTo(map);

    // If they have previous outlines, reinstatiate those

    if (USER_LOGGED_IN && USER_GEOJSON && USER_GEOJSON != "null") { // We also check it's not a null field
        reinstantiateData(USER_GEOJSON);
    }

    // Check if they can submit
    checkCanSubmit();

    // EVENT HANDLERS
    // Lets handle all of the many events that we will get from users

    map.on('draw:created', function(event) {
        // For all created layers
        var layer = event.layer;
        handleCreate(layer, false); // reinstantiate is false as we don't want to do that
    });

    function handleCreate(layer, reinstantiate) {
        var fieldTitle;

        if (isPolygon(layer)) {
            // Check for intersection of the drawn polygon
            if (checkIntersections(layer, true)) {
                return;
            }

            // Calculate area and add the label on the polygon
            var area = getArea(layer);
            layer._arcArea = area;

            // Add DOM element to layer and DOM
            fieldTitle = layer._arcFieldTitle || "";

            var _arcDomElement =
                $('<div class="row ar-map-plot">'+
                    '<div class="col s12 ar-map-plot-title-holder">'+
                        '<b class="ar-map-plot-title s12">' + fieldTitle + '</b>'+
                    '</div>'+
                    '<div class="col s6"> Hectares </div>'+
                    '<div class="col s6 hectares">'+area.toFixed(2)+'</div>'+
                  '</div>');
            $(".ar-map-plots").append(_arcDomElement);
            layer._arcDomElement = _arcDomElement[0];

            // Set the label
            layer._arcFieldTitle = fieldTitle;
            setLabel(layer, fieldTitle); // Also adds click and mouseover listners

            // Set the colour and add the layer to the list of drawn layers
            layer.setStyle({fillColor: '#86bd44', color: '#15693b'});
            drawnItems.addLayer(layer);

            addLayerMouseOver(layer, layer._arcDomElement); // Add the leaflet layer mouse over / dom layer highlight effect

            if (!reinstantiate) {
                addLayerClickModal(layer); // Add a click listner for the modal so when it gets clicked in the map it opens
                populateFieldTextModal(layer);
            }

            updateTotalArea();

        }
        else if (isPoint(layer) && userFarmUndefined()) {
            userFarm = layer; // Set the user location
            drawnItems.addLayer(layer); // Add it to the map drawnItems so we can see it after editing
            layer.bindPopup("<b>Your Farms Location</b>").openPopup();
            $(".leaflet-draw-draw-marker").hide(); // Hide the add marker button
        }
        else {
            // We have already defined our farm location, maybe we want to thow a modal error?
            // map.remove(layer);
        }

        checkCanSubmit();
        updatePostData(); // Make sure we update post data!
    }



    map.on('draw:edited', function (event) {
        // For all edited layers

        event.layers.eachLayer(function (layer) {

            if (isPolygon(layer)) {
                // Check for intersection of the drawn polygon
                if (checkIntersections(layer, false)) {
                    try {
                        controls._toolbars.edit.disable();
                    }
                    catch(e) {
                        // This will
                    }

                    return; // End if it intersects
                }
                else {
                    var area = getArea(layer);
                    layer._arcArea = area;
                    $(layer._arcDomElement).find(".hectares").text(area.toFixed(2));
                    removeLabel(layer);
                    setLabel(layer, layer._arcFieldTitle);
                    updateTotalArea();
                    checkTotalHectares(totalHectares, true);
                }

            }
            else if (isPoint) {
                // The user has changed their farms location
                userFarm = layer;
            }

        });

        updatePostData(); // Make sure we update the post data!

    });

    map.on('draw:deleted', function (event) {
        // For all deleted layers

        if (event.layers) {
            event.layers.eachLayer(function (layer) {
                if (isPolygon(layer)) {
                    $(layer._arcDomElement).remove();
                    removeLabel(layer);
                }
                else if (isPoint(layer)) {
                    userFarm = undefined;
                    $(".leaflet-draw-draw-marker").show();
                }
            });
            updateTotalArea();
            checkTotalHectares(totalHectares, true);
            updatePostData();
            checkCanSubmit();
            deleting = false;
        }

    });

    map.on('draw:deletestart', function (event) {
        deleting = true;
    });
    map.on('draw:deletestop', function(e){
        drawnItems.eachLayer(function(layer){
            if (layer && layer.label) {
                getLabel(layer).show();
            }
        });
        deleting = false;
    });
    map.on('draw:editstart', function (event) {
        $(".field-div-icon").hide();
    });
    map.on('draw:editstop', function (event) {
        $(".field-div-icon").show();
    });


    $(document).on("click", ".ar-map-plot", function() {
        // Modal popup for clicking on a layer in the side panel
        var el = this;
        drawnItems.eachLayer(function(layer){
            if (isPolygon(layer) && el === layer._arcDomElement) { // If the dom element clicked matches the matching Leaflet layer
                map.fitBounds(layer.getBounds());
                if(!USER_GEOJSON) {
                    populateFieldTextModal(layer); // Show popup on click if we're not reinstantiating
                }
            }
        });
    });

    $(document).on("mouseover", ".ar-map-plot", function() {
        // On mouse over make font larger
        changeLabelSize(this, 20);
    });

    $(document).on("mouseout", ".ar-map-plot", function() {
        // On mouse over make font normal size
        changeLabelSize(this, 15);
    });

    $(document).on("click", ".ar-map-submit", function() {
        if (totalHectares < 50.0) {
            $("#confirm-submit").openModal(modalOptions);
        }
        else {
            $("#overfifty").openModal(modalOptions);
        }

    });

    _removeListners = function() {
        drawnItems.eachLayer(function(layer){
            if (isPolygon(layer)) { // If the dom element clicked matches the matching Leaflet layer
                layer.off("click", function(){});
                $(layer._arcDomElement).off();
            }
        });
    };

    function changeLabelSize(domElement, size, width) {


        // Change the label size
        var layer = layerFromDomEl(domElement);
        if (layer) {
            var label = getLabel(layer);
            label.css("font-size", size+"px");
            label.css("margin-left", (- width / 2 ) - (size - 8) );
        }
    }

    function addLayerClickModal(layer) {
        var label = layer.label;
        // Disable layer modals

        // On click on either the polygon or the label -- ugly but necessary as label overlays layer
        layer.on("click", function (e) {


            if (deleting) {
                // If deleting
                getLabel(layer).hide();
            }
            else if (!USER_GEOJSON) {
                // Normal interaction
                populateFieldTextModal(layer);
            }

        });

    }

    function hoverOn(domElement) {
        $(domElement).css("background-color", "#daeac6");
        changeLabelSize(domElement, 16, 100);
    }

    function hoverOff(domElement) {
        $(domElement).css("background-color", "#ffffff");
        changeLabelSize(domElement, 12, 100);
     }

    function addLayerMouseOver(layer) {
        // Show the layers in the sidebar when they get hovered over
        var label = layer.label;
        var domElement = layer._arcDomElement;
        layer.on("mouseover", function(e) { hoverOn(domElement); });
        layer.on("mouseout", function(e) { hoverOff(domElement); });
    }

    $(document).on("click", ".ar-carbon-save-description", function() {
        // Save the description to the layer when the user clicks save

        var title = $("#field-title").val().trim();
        var description = $("#field-description").val().trim();
        var domElement = currentLayer._arcDomElement;
        currentLayer._arcFieldTitle = title;
        currentLayer._arcFieldDescription = description;
        $(domElement).find(".ar-map-plot-title").text(title);
        removeLabel(currentLayer);
        setLabel(currentLayer, title);
        $("#field-title").val("");
        $("#field-description").val("");
        updatePostData();

        // Renable the user interactions
        checkCanSubmit();

        // Reset because modal will mean we never recieve mouseout event
        $(domElement).css("background-color", "#ffffff");
        changeLabelSize(domElement, 12, 100);

        // If we didn't go over the 50 ha limit then we can label it
        checkTotalHectares(totalHectares, true);

    });


    function checkCanSubmit(){
        // If no layers OR they have previously submitted
        if ((!USER_LOGGED_IN) || !drawnItems.getLayers().length || (USER_GEOJSON && !DEVELOPMENT)) {
            disableSubmit();
        }
        else if (drawnItems.getLayers().length) {
            if (hasPolygons(drawnItems)) {
                enableSubmit();
            }
            else {
                disableSubmit();
            }
        }
    }

    function disableSubmit() {
        $(".ar-map-submit").prop('disabled', true);
    }
    function enableSubmit() {
        $(".ar-map-submit").prop('disabled', false);
    }

    // Handling user input for the field title
    $("#field-title").keyup(function(e) {
        handleTitle(false);
    });

    function handleTitle(focus) {
        // We want to prevent users from having blank or duplicate titles!
        var msg;
        var title = $("#field-title").val();
        if ((!focus && duplicateTitles(title)) || title === "") {
            msg = "Blank or duplicate field name! Field names must be none blank and unique!";
            $(".ar-carbon-save-description").css("visibility", "hidden");
            $(".field-title-label").css("color", "#FF7272");
            $(".field-title-label").text(msg);
        }
        else {
            msg = "Give this area an identifier (a name or a Field Parcel Number)";
            $(".ar-carbon-save-description").css("visibility", "visible");
            $(".field-title-label").css("color", "#9e9e9e");
            $(".field-title-label").text(msg);
        }
    }

    // HELPER FUNCTIONS
    // These let us be more more productive throughout our code

    function layerFromDomEl(el) {
        // Get the layer of the corresponding DOM element
        var returnLayer;
        drawnItems.eachLayer(function(layer){
            if (isPolygon(layer) && el === layer._arcDomElement) { // If the dom element clicked matches the matching Leaflet layer
                returnLayer = layer;
            }
        });
        return returnLayer;
    }

    function duplicateTitles(title) {
        var duplicate = false;
        drawnItems.eachLayer(function(layer){
            if (isPolygon(layer)) { // Make sure its just polygons
                if (title.trim().toLowerCase() === layer._arcFieldTitle.toLowerCase() ) { // if title matches (duplicate title)
                    duplicate = true;
                }
            }
        });
        return duplicate;
    }

    // LABEL RELATED FUNCTIONS
    // These are responsible for dealing with our label related activities

    function setLabel(layer, text) {
        // Set the label name
        var domElement = layer._arcDomElement;
        layer.label = L.marker(getCentroid(layer._latlngs), {
            icon: L.divIcon({
                className: 'field-div-icon',
                html: "<p class='label-text'>"+String(text)+"</p>",
                iconSize: [110, 1]
            })
        }).addTo(map);

    }

    function getLabel(layer) {
        // Get a label DOM element from a layer
        return $(layer.label._icon).find("p");
    }

    function removeLabel(layer) {
        // Remove the layer label
        map.removeLayer(layer.label);
    }


    // Update / UI Functions

    function populateFieldTextModal(layer) {
        // Populate the modal for the layer

        if (!deleting) {

            var title = layer._arcFieldTitle || "";
            var description = layer._arcFieldDescription || "";

            currentLayer = layer;
            $("#field-title").val(title);
            $("#field-description").val(description);
            $("#field-text-edit").openModal(modalOptions);

            // Prevent the user from interacting
            $(".ar-map-submit").prop('disabled',true);
            $(layer._arcDomElement).css("background-color", "#daeac6");

            $("#field-title").focus();
            if (title === "") {
                $(".ar-carbon-save-description").css("visibility", "hidden");
            }
            $(".field-description-active").addClass("active");

        }
    }

    function updatePostData() {
        var geojson = {
          "type": "FeatureCollection",
          "features": []
        };
        var layerjson;
        drawnItems.eachLayer(function(layer) {
            layerjson = layer.toGeoJSON();
            layerjson.properties.arcarbon_field_name = layer._arcFieldTitle;
            layerjson.properties.arcarbon_area = layer._arcArea;
            layerjson.properties.arcarbon_description = layer._arcFieldDescription;
            geojson.features.push(layerjson);
        });
        geojsonstr = JSON.stringify(geojson);

        $(".ar-map-submit").attr("data-geojson", geojsonstr);
    }

    function reinstantiateData(geojson) {

        // Get the geojson from the WP database and then add it to drawnLayers
        try {
            geojson = JSON.parse(geojson);
            if (geojson && geojson.features) {
                L.geoJson(geojson, {
                    onEachFeature: function(feature, layer) {
                        if (feature.properties) {
                            var properties = feature.properties;
                            layer._arcArea = properties.arcarbon_area;
                            layer._arcFieldTitle = properties.arcarbon_field_name;
                            layer._arcFieldDescription = properties.arcarbon_description;
                        }
                        if (feature.type == "Point") {
                            layer._arcIsFarmHome = true;
                        }
                    }
                }).eachLayer(function(layer){
                    drawnItems.addLayer(layer);

                    if (layer._arcIsFarmHome) {
                        userFarm = layer;
                    }
                    else {
                        handleCreate(layer, true);
                    }
                });
            }
            map.fitBounds(drawnItems.getBounds());
        }
        catch(e) {
            $("#geojson-error").openModal(modalOptions);
            console.debug("Something went wrong processing GeoJSON: ", e);
        }
    }

    function updateTotalArea() {
        // Update the total area
        totalHectares = 0.0;

        if (drawnItems.getLayers().length) {
            drawnItems.eachLayer(function(layer) {
                if (isPolygon(layer)) {
                    totalHectares += layer._arcArea;
                }
            });
        }
        $("#area-value").html("<h5 class='total-hectares-text'>"+totalHectares.toFixed(2)+"</h2>");

    }

    function checkTotalHectares(totalHectares, openModal) {
        // Check if the total hectares is over 50
        if (totalHectares > 50.0) {
            areaOverFifty("#ffc0c0", "#ff0000", true);
        }
        else {
            areaOverFifty("#daeac6", "#15693b", false);
        }
    }

    function areaOverFifty(backgroundColor, textColor, disabled) {
        $(".ar-map-total").css("background-color", backgroundColor);
        $(".ar-map-total").css("color", textColor);
        $(".leaflet-draw-draw-polygon").toggle(!disabled);
        $(".ar-map-submit").prop('disabled', disabled);
        if (disabled) {
            $('#overfifty').openModal(modalOptions);
        }
    }


    // Geometry related functions

    function getArea(layer) {
        // Return the geodesic area of a polygon
        return L.GeometryUtil.geodesicArea(layer.getLatLngs()) / 10000.0;
    }

    function checkIntersections(layer1, remove) {
        // Use turf to check intersections

        var inter = false;
        drawnItems.eachLayer( function(layer2) {
            if ( (layer1._leaflet_id !== layer2._leaflet_id) && isPolygon(layer2)) { // If they're not the same geometry
                if (turf.intersect(layer1.toGeoJSON(), layer2.toGeoJSON())) {
                    inter = true;
                    if (remove) {
                        map.removeLayer(layer1);
                    }
                    $('#intersects').openModal(modalOptions);
                }
            }
        });
        return inter;
    }

    function isPoint(layer) {
        return (layer.hasOwnProperty("_latlng") === true);
    }
    function isPolygon(layer) {
        return (layer.hasOwnProperty("_latlngs") === true);
    }
    function hasPolygons(layers){
        var polygons = false;
        layers.eachLayer(function(layer){
            if (isPolygon(layer)) { // Lets make sure there are actual fields
                polygons = true;
            }
        });
        return polygons;
    }

    function userFarmUndefined() {
        return userFarm === undefined;
    }

    function getCentroid(arr) {
        // Allows us to have more central labels
        var twoTimesSignedArea = 0;
        var cxTimes6SignedArea = 0;
        var cyTimes6SignedArea = 0;

        var length = arr.length;

        var x = function (i) { return arr[i % length].lng; };
        var y = function (i) { return arr[i % length].lat; };

        for ( var i = 0; i < length; i++) {
            var twoSA = x(i)*y(i+1) - x(i+1)*y(i);
            twoTimesSignedArea += twoSA;
            cxTimes6SignedArea += (x(i) + x(i+1)) * twoSA;
            cyTimes6SignedArea += (y(i) + y(i+1)) * twoSA;
        }
        var sixSignedArea = 3 * twoTimesSignedArea;
        return [ cyTimes6SignedArea / sixSignedArea, cxTimes6SignedArea / sixSignedArea ];
    }


    var homeControl = L.Control.extend({
        // Create our own home control button
      options: {
        position: 'topleft'
        //control position - allowed: 'topleft', 'topright', 'bottomleft', 'bottomright'
      },
      onAdd: function (map) {
          var container = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-custom fa fa-home');

          container.style.backgroundColor = 'white';
          container.style.width = '27px';
          container.style.height = '27px';
          container.style.pointer= 'cursor';
          container.title = "Take me to my fields";

          container.onclick = function(){
              if (!userFarmUndefined()) {
                  map.setView(userFarm.getLatLng(), 16);
              }
              else {
                  map.eachLayer(function(layer) {
                      if (layer.getBounds && isPolygon(layer)){
                          map.fitBounds(layer.getBounds());
                          return;
                      }

                  });
              }
          };
       return container;
      }
    });

    // Add it to the map
    map.addControl(new homeControl());


    // UPDATE

    $( document ).on( 'click', '.ar-map-submit-confirm', function() {

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
            complete: undefined
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
            //console.debug("Valid: ", data);
        	$.ajax({
        		url: url,
                type : 'post',
                data : data
            })
            .done(function() {
                button.prop('disabled',true ); // Undo the button disabling
                $('#submit').openModal();
                USER_GEOJSON = geojson;
                $('.leaflet-draw').hide();
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
