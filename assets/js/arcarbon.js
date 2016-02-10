
jQuery(document).ready(function($) {


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

    // Development environment
    var DEVELOPMENT = false;
    if (localStorage && localStorage.getItem("arc-debug")) {
        DEVELOPMENT = true;
    }

    // Console polyfill for non supporting browsers
    window.console = window.console || {
        log: function () {},
        error: function () {},
        debug: function () {},
        warn: function () {}
    };

    // Setup the MAPBOX API KEY
    L.mapbox.accessToken = MAPBOX_API_KEY;
    MAPBOX_API_KEY = "";

    // Initialisation
    var boundingBox = L.latLngBounds(
            L.latLng({lat: 49.62, lng:-10.7}),
            L.latLng({lat: 62.52, lng :4.11})
        ),
        center = boundingBox.getCenter(),
        //osm = L.tileLayer(osmUrl, {maxZoom: 18, attribution: osmAttrib}),
        map = new L.mapbox.map('arcarbon-map', null, { maxZoom: 18 }).setView(center, 5),
        drawnItems = new L.FeatureGroup().addTo(map),
        saveArray = [],
        totalHectares = 0.0,
        userFarm,
        deleting = false,
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
            dismissible: false,
            opacity: 0.5,
            in_duration: 350,
            out_duration: 250,
            ready: undefined,
            complete: undefined,
        };

        var layers = {
          Satellite: L.mapbox.tileLayer('mapbox.satellite'),
          Streets: L.mapbox.tileLayer('mapbox.streets'),
          Outdoors: L.mapbox.tileLayer('mapbox.outdoors')
        };

        layers.Satellite.addTo(map);
        L.control.layers(layers).addTo(map);


    if (USER_GEOJSON && !DEVELOPMENT) {
        enableDraw = false;
        enableEdit = false;
    }

    // Leaflet Draw Control Setup
    var controls = new L.Control.Draw({
        draw : enableDraw,
        edit : enableEdit
    });
    map.addControl(controls);
    map.addControl(L.mapbox.geocoderControl('mapbox.places', {
        keepOpen : false,
        autocomplete: true,
        position: 'topleft'

    }));
    $(".mapbox-icon-geocoder").text(""); // Removes random text in the geocoder

    // Locate User Control
    L.control.locate({icon: 'fa fa-location-arrow'}).addTo(map);

    // If they have previous outlines, reinstatiate those
    if (USER_GEOJSON) {
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
            layer.setStyle({fillColor: '#15693b', color: '#15693b'});
            drawnItems.addLayer(layer);

            addLayerMouseOver(layer, layer._arcDomElement); // Add the leaflet layer mouse over / dom layer highlight effect
            addLayerClickModal(layer); // Add a click listner for the modal so when it gets clicked in the map it opens
            updateTotalArea();

            if (!reinstantiate) {
                populateFieldTextModal(layer);
            }

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

    map.on('draw:editstop', function(e){
        console.log("stop", controls);
    });

    map.on('draw:edited', function (event) {
        // For all edited layers
        console.log(event);
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
        console.log("Delete", event);
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

    });

    map.on('draw:deletestart', function (event) {
        deleting = true;
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
                populateFieldTextModal(layer);
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
            populateFieldTextModal(layer);
        });

    }

    function hoverOn(domElement) {
        //$(domElement).css("background-color", "#daeac6");
        changeLabelSize(domElement, 16, 100);
    }

    function hoverOff(domElement) {
        //$(domElement).css("background-color", "#ffffff");
        changeLabelSize(domElement, 12, 100);
     }

    function addLayerMouseOver(layer) {
        // Show the layers in the sidebar when they get hovered over
        var label = layer.label;
        var domElement = layer._arcDomElement;

        // Have to do it for the label and the polgon layer (because leaflet)
        $(domElement).on("mouseover", function() { hoverOn(domElement); });
        layer.on("mouseover", function(e) { hoverOn(domElement); });

        $(domElement).on("mouseout",  function() { hoverOff(domElement); });
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

        // If we didn't gove over the 50 ha limit then we can label it
        checkTotalHectares(totalHectares, true);


    });


    function checkCanSubmit(){
        // If no layers OR they have previously submitted
        if (!drawnItems.getLayers().length || (USER_GEOJSON && !DEVELOPMENT) ) {
            disableSubmit();
        }
        else if (drawnItems.getLayers().length) {
            enableSubmit();
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
        handleTitle(this, false);
    });
    $("#field-title").focus(function(e) {
        if ($(this).val() !== "") {
            handleTitle(this, true);
        }
    });

    function handleTitle(context, focus) {
        // We want to prevent users from having blank or duplicate titles!
        var msg;
        var title = $(context).val();
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
        }).addTo(map)
        .on("mouseover", function() { hoverOn(domElement);})  //We need to do these here so we can do mouserover/clicking of labels
        .on("click", function(){ populateFieldTextModal(layer); });
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
            //$(".ar-carbon-save-description").css("visibility", "hidden");
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
            layerjson.properties.area = layer._arcArea;
            layerjson.properties.title = layer._arcFieldTitle;
            layerjson.properties.description = layer._arcFieldDescription;
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
                            layer._arcArea = feature.properties.area;
                            layer._arcFieldTitle = feature.properties.title;
                            layer._arcFieldDescription = feature.properties.description;
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
        $("#area-value").html("<h5>"+totalHectares.toFixed(2)+"</h2>");

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

          container.onclick = function(){
              if (!userFarmUndefined()) {
                  map.setView(userFarm.getLatLng(), 12);
              }
          };
       return container;
      }
    });

    // Add it to the map
    map.addControl(new homeControl());

});
