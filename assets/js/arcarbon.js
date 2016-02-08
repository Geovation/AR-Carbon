
jQuery(document).ready(function($) {

    // Custom layer properties
    // _arcArea
    // _arcDomElement
    // _arcFieldTitle
    // _arcFieldDescription

    // Initialisation
    var boundingBox = L.latLngBounds(
            L.latLng({lat: 49.62, lng:-10.7}),
            L.latLng({lat: 62.52, lng :4.11})
        ),
        center = boundingBox.getCenter(),
        osmUrl = 'http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        osmAttrib = '&copy; <a href="http://openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        osm = L.tileLayer(osmUrl, {maxZoom: 18, attribution: osmAttrib}),
        map = new L.Map('arcarbon-map', {layers: [osm], center: center, zoom: 5}),
        drawnItems = new L.FeatureGroup().addTo(map),
        saveArray = [],
        totalHectares = 0.0,
        userFarm,
        deleting = false,
        currentLayer,
        boundaryNumber = 1;

    if (USER_GEOJSON) {
        console.log("Reinstantiating GeoJSON");
        reinstantiateData(USER_GEOJSON);
    }

    // Leaflet Control Setup
    var controls = new L.Control.Draw({
        draw: {
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
        edit: {
            featureGroup: drawnItems,
            poly : {
                allowIntersection : false
            }
        }
    });

    var disableControls = new L.Control.Draw({
        draw: false,
        edit : false
    });

    map.addControl(controls);
    L.control.locate({icon: 'fa fa-location-arrow'}).addTo(map);
    L.control.geocoder("search-sWC5vE4", {
      position: 'topright',
      expanded: true,
      bounds: boundingBox,
      autocomplete: false,
      markers: {
          icon: new L.icon({
              iconSize: [25, 41],
              popupAnchor: [-1, -1],
              iconUrl: '../wp-content/plugins/arcarbon-map/assets/js/images/marker-icon-locate.png'
      }) }
    }).addTo(map);


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
            if (checkIntersections(layer)) {
                return;
            }

            // Calculate area and add the label on the polygon
            var area = getArea(layer);
            layer._arcArea = area;

            // Add DOM element to layer and DOM
            fieldTitle = layer._arcFieldTitle || "";

            var _arcDomElement =
                $('<div class="mat-row ar-map-plot">'+
                    '<div class="mat-col mat-s12 ar-map-plot-title-holder">'+
                        '<b class="ar-map-plot-title mat-s12">' + fieldTitle + '</b>'+
                    '</div>'+
                    '<div class="mat-col mat-s6"> Hectares </div>'+
                    '<div class="mat-col mat-s6 hectares">'+area.toFixed(2)+'</div>'+
                  '</div>');
            $(".ar-map-plots").append(_arcDomElement);
            layer._arcDomElement = _arcDomElement[0];

            // Set the label
            layer._arcFieldTitle = fieldTitle;
            setLabel(layer, fieldTitle);

            // Set the colour and add the layer to the list of drawn layers
            layer.setStyle({fillColor: '#15693b', color: '#15693b'});
            drawnItems.addLayer(layer);

            // Add the leaflet layer mouse over / dom layer highlight effect
            addMouseOver(layer, layer._arcDomElement);
            updateTotalArea();

            // Add a click listner for the modal so when it gets clicked in the map it opens
            addLayerClickModal(layer);

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

        updatePostData(); // Make sure we update post data!
    }

    map.on('draw:edited', function (event) {
        // For all edited layers
        event.layers.eachLayer(function (layer) {

            if (isPolygon(layer)) {
                // Check for intersection of the drawn polygon
                if (checkIntersections(layer)) {
                    return;
                }

                var area = getArea(layer);
                layer._arcArea = area;
                $(layer._arcDomElement).find(".hectares").text(area.toFixed(2));
                removeLabel(layer);
                setLabel(layer, layer._arcFieldTitle);
                updateTotalArea();
                checkTotalHectares(totalHectares, true);
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
    map.on('draw:deletestart', function (event) {
        $(".field-div-icon").hide();
    });
    map.on('draw:deletestop', function (event) {
        $(".field-div-icon").show();
    });

    $(document).on("click", ".ar-map-plot", function() {
        // Modal popup for clicking on a layer in the side panel
        var el = this;
        drawnItems.eachLayer(function(layer){
            if (isPolygon(layer) && el === layer._arcDomElement) { // If the dom element clicked matches the matching Leaflet layer
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
            $("#confirm-submit").openModal();
        }
        else {
            $("#overfifty").openModal();
        }

    });

    //$(document).on("click", ar-over-fifty-ok

    function changeLabelSize(domElement, size, width) {
        // Change the label size
        var layer = layerFromDomEl(domElement);
        var label = getLabel(layer);
        label.css("font-size", size+"px");
        label.css("margin-left", (- width / 2 ) - (size - 8) );
    }

    function addLayerClickModal(layer) {

        // On click on either the polygon or the label -- ugly but necessary
        layer.on("click", function (e) {
            populateFieldTextModal(layer);
        });

        if (layer.label._icon) {
            $(layer.label._icon).unbind('click');
        }

        $(layer.label._icon).on("click", function(){
            console.log("label click");
            populateFieldTextModal(layer);
        });
    }

    function addMouseOver(layer, domElement) {
        // Show the layers in the sidebar when they get hovered over
        var labelElement = layer.label._icon;

        var hoverOn = function (toast) {
            $(domElement).css("background-color", "#daeac6");
            changeLabelSize(domElement, 16, 100);
        };
        var hoverOff = function () {
            $(domElement).css("background-color", "#ffffff");
            changeLabelSize(domElement, 12, 100);
         };

        // Have to do it for the label and the polgon layer (because leaflet)
        $(labelElement).mouseover(function() { hoverOn(); });
        $(domElement).mouseover(function() { hoverOn(); });
        $(labelElement).mouseout(function() { hoverOff(); });
        $(domElement).mouseout(function() { hoverOff(); });
        layer.on("mouseover", function(e) { hoverOn(true); });
        layer.on("mouseout", function(e) { hoverOff(); });
    }

    $(document).on("click", ".ar-carbon-save-description", function() {
        // Save the description to the layer when the user clicks save
        var title = $("#field-title").val();
        var description = $("#field-description").val();

        currentLayer._arcFieldTitle = title;
        currentLayer._arcFieldDescription = description;
        $(currentLayer._arcDomElement).find(".ar-map-plot-title").text(title);
        removeLabel(currentLayer);
        setLabel(currentLayer, title);
        $("#field-title").val("");
        $("#field-description").val("");
        updatePostData();

        // If we didn't gove over the 50 ha limit then we can label it
        checkTotalHectares(totalHectares, true);


    });

    // Handling user input for the field title
    $("#field-title").keyup(function(e) {
        handleTitle(this, false);
    });
    $("#field-title").focus(function(e) {
        handleTitle(this, true);
    });

    function handleTitle(context, focus) {
        // We want to prevent users from having blank or duplicate titles!
        var title = $(context).val();
        if ((!focus && duplicateTitles(title)) || title === "") {
            $(".ar-carbon-save-description").css("visibility", "hidden");
            $(".field-title-label").css("color", "#FF7272");
            $(".field-title-label").text("Blank or duplicate field name! Field names must be none blank and unique!");
        }
        else {
            $(".ar-carbon-save-description").css("visibility", "visible");
            $(".field-title-label").css("color", "#9e9e9e");
            $(".field-title-label").text("Give this area an identifier (a name or a Field Parcel Number)");
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

    function getLayerCount(layers) {
        // Returns the number of layers
        var count = 0;
        var layer;

        for (layer in layers) {
            if (layers.hasOwnProperty(layer)) {
                count++;
            }
        }
        return count;
    }

    function duplicateTitles(title) {
        var duplicate = false;
        drawnItems.eachLayer(function(layer){
            if (isPolygon(layer)) { // Make sure its just polygons
                console.log("check layer dupe", layer);
                if (title === layer._arcFieldTitle) { // if title matches (duplicate title)
                    console.log("duplicate");
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
        layer.label = L.marker(getCentroid(layer._latlngs), {
            icon: L.divIcon({
                className: 'field-div-icon',
                html: String(text),
                iconSize: [100, 30]
            })
        }).addTo(map);

        addLayerClickModal(layer); // We need to make sure something happens onclick
    }

    function getLabel(layer) {
        // Get a label DOM element from a layer
        return $(layer.label._icon);
    }

    function removeLabel(layer) {
        // Remove the layer label
        map.removeLayer(layer.label);
    }


    // Update / UI Functions

    function populateFieldTextModal(layer) {
        // Populate the modal for the layer
        console.log(layer);
        if (!deleting) {

            var title = layer._arcFieldTitle || "";
            var description = layer._arcFieldDescription || "";

            currentLayer = layer;
            $("#field-title").val(title);
            $("#field-description").val(description);
            $("#field-text-edit").openModal();
            $("#field-title").focus();
            $(".field-description-active").addClass("mat-active");

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
            console.log(layerjson);
            geojson.features.push(layerjson);
        });
        geojsonstr = JSON.stringify(geojson);
        console.log(geojsonstr);
        $(".ar-map-submit").attr("data-geojson", geojsonstr);
    }

    function reinstantiateData(geojson) {

        // Get the geojson from the WP database and then add it to drawnLayers
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

        console.log($(".field-description-active"));
        map.fitBounds(drawnItems.getBounds());

    }

    function updateTotalArea() {
        // Update the total area
        var area = 0.0;
        totalHectares = 0.0;

        if (getLayerCount(drawnItems)) {
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
            $(".ar-map-total").css("background-color", "#ffc0c0");
            $(".ar-map-total").css("color", "#ff0000");
            $(".leaflet-draw-draw-polygon").hide();
            $(".ar-map-submit").prop('disabled',true);
            if (openModal) {
                $('#overfifty').openModal();
            }
        }
        else {
            $(".ar-map-total").css("background-color", "#daeac6");
            $(".ar-map-total").css("color", "#15693b");
            $(".ar-map-submit").prop('disabled',false);
            $(".leaflet-draw-draw-polygon").show();
        }
    }



    // Geometry related functions

    function getArea(layer) {
        // Return the geodesic area of a polygon
        return L.GeometryUtil.geodesicArea(layer.getLatLngs()) / 10000.0;
    }

    function checkIntersections(layer1) {
        // Use turf to check intersections

        var inter = false;
        drawnItems.eachLayer( function(layer2) {
            console.log(layer1, layer2);
            if (layer1._leaflet_id !== layer2._leaflet_id) { // If they're not the same geometry
                if (turf.intersect(layer1.toGeoJSON(), layer2.toGeoJSON())) {
                    inter = true;
                    map.removeLayer(layer1);
                    $('#intersects').openModal();
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
        return  userFarm === undefined;
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
