
jQuery(document).ready(function($) {


    // Initialisation
    var boundingBox = L.latLngBounds(
        L.latLng({lat: 49.62, lng:-10.7}),
        L.latLng({lat: 62.52, lng :4.11})
    );
    var center = boundingBox.getCenter();
    var osmUrl = 'http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        osmAttrib = '&copy; <a href="http://openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        osm = L.tileLayer(osmUrl, {maxZoom: 18, attribution: osmAttrib}),
        map = new L.Map('arcarbon-map', {layers: [osm], center: center, zoom: 5}),
        drawnItems = new L.FeatureGroup(),
        saveArray = [],
        totalHectares = 0.0,
        userFarm = undefined,
        deleting = false,
        currentLayer;


    map.addLayer(drawnItems);

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
            featureGroup: drawnItems
        }
    });

    var disableControls = new L.Control.Draw({
        draw: false,
        edit : false
    });

    map.addControl(controls);
    L.control.locate().addTo(map);
    L.control.geocoder("search-sWC5vE4", {
      position: 'topright',
      expanded: true,
      bounds: boundingBox,
      autocomplete: false
    }).addTo(map);


    // Event Handlers

    map.on('draw:created', function(event) {
        var layer = event.layer;
        console.log(isPoint(layer), userFarmUndefined());
        if (isPolygon(layer)) {
            // Check for intersection of the drawn polygon
            if (checkIntersections(layer)) {
                return;
            }

            // Calculate area and add the label on the polygon
            var area = getArea(layer);
            layer._arcArea = area;
            addLabel(layer, area.toFixed(2));

            // Add DOM element to layer and DOM
            var _arcDomElement =
                $('<div class="mat-row ar-map-plot">'+
                    '<div class="mat-col mat-s12 ar-map-plot-title-holder">'+
                        '<b class="ar-map-plot-title mat-s12"> Boundary </b>'+
                    '</div>'+
                    '<div class="mat-col mat-s6"> Hectares </div>'+
                    '<div class="mat-col mat-s6 hectares">'+area.toFixed(2)+'</div>'+
                  '</div>');
            $(".ar-map-plots").append(_arcDomElement);
            layer._arcDomElement = _arcDomElement[0];

            // Set the colour and add the layer to the list of drawn layers
            layer.setStyle({fillColor: '#15693b', color: '#15693b'});
            drawnItems.addLayer(layer);

            // Add a click listner for the modal so when it gets clicked in the map it opens
            addLayerClickModal(layer);

            // Add the leaflet layer mouse over / dom layer highlight effect
            addMouseOver(layer, layer._arcDomElement);
            updateTotalArea();

            // If we didn't gove over the 50 ha limit then we can label it
            if (totalHectares < 50) {
                currentLayer = layer;
                populateFieldTextModal(layer);
                $("#field-text-edit").openModal();
            }
        }
        else if (isPoint(layer) && userFarmUndefined()) {
            console.log("POINTER", layer);
            userFarm = layer; // Set the user location
            drawnItems.addLayer(layer); // Add it to the map drawnItems so we can see it after editing
            layer.bindPopup("<b>Your Farms Location</b>").openPopup();
            $(".leaflet-draw-draw-marker").hide(); // Hide the add marker button
        }
        else {
            // We have already defined our farm location
            //  map.remove(layer);
        }



    });

    map.on('draw:edited', function (event) {

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
                addLabel(layer, area.toFixed(2));
                updateTotalArea();
            }
            else if (isPoint) {
                // The user has changed their farms location

                // Handle farm

                userFarm = layer;
            }
        });

    });

    map.on('draw:deleted', function (event) {
        event.layers.eachLayer(function (layer) {
            $(layer._arcDomElement).remove();
            removeLabel(layer);
        });
        updateTotalArea();
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
        var el = this;
        drawnItems.eachLayer(function(layer){
            if (isPolygon(layer) && el === layer._arcDomElement) { // If the dom element clicked matches the matching Leaflet layer
                console.log("deleting is false", deleting);
                populateFieldTextModal(layer);
            }
        });
    });

    $(document).on("mouseover", ".ar-map-plot", function() {
        changeLabelSize(this, 20);
    });

    $(document).on("mouseout", ".ar-map-plot", function() {
        changeLabelSize(this, 15);
    });

    function changeLabelSize(domElement, size) {
        var layer = layerFromDomEl(domElement);
        var label = getLabel(layer);
        label.css("font-size", size+"px");
        label.css("margin-left", (-15) - (size - 12) );
    }

    function addLayerClickModal(layer) {

        // On click on either the polygon or the label -- ugly but necessary
        layer.on("click", function (e) {
            populateFieldTextModal(layer);
        });
        $(layer.label._icon).click(function(){
            populateFieldTextModal(layer);
        });
    }

    function addMouseOver(layer, domElement) {
        // Show the layers in the sidebar when they get hovered over
        var labelElement = layer.label._icon;

        var hoverOn = function (toast) {
            $(domElement).css("background-color", "#daeac6");
            changeLabelSize(domElement, 16);
            //if (toast && layer._arcFieldTitle) { Materialize.toast(layer._arcFieldTitle, 1000);}
        };
        var hoverOff = function () {
            $(domElement).css("background-color", "#ffffff");
            changeLabelSize(domElement, 12);
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
        console.log($(currentLayer._arcDomElement));
        $(currentLayer._arcDomElement).find(".ar-map-plot-title").text(title);
        $("#field-title").val("");
        $("#field-description").val("");
    });

    // Helper Functions

    function layerFromDomEl(el) {
        var returnLayer;
        drawnItems.eachLayer(function(layer){
            if (isPolygon(layer) && el === layer._arcDomElement) { // If the dom element clicked matches the matching Leaflet layer
                returnLayer = layer;
            }
        });
        return returnLayer;
    }

    function getLabel(layer) {
        return $(layer.label._icon);
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

    // Label Related Functions

    function removeLabel(layer) {
        map.removeLayer(layer.label);
    }

    function addLabel(layer, text) {
        layer.label = L.marker(getCentroid(layer._latlngs), {
            icon: L.divIcon({
                className: 'field-div-icon',
                html: String(text),
                iconSize: [30, 30]
            })
        }).addTo(map);

    }

    // Update / UI Functions

    function populateFieldTextModal(layer) {
        if (!deleting) {
            var title = layer._arcFieldTitle || "Boundary";
            console.log(title);
            var description = layer._arcFieldDescription || "";
            $("#field-title").val(title);
            $("#field-description").val(description);

            currentLayer = layer;
            $("#field-text-edit").openModal();
        }
    }

    function updatePostData() {
        console.log(drawnItems);
        var geojson = JSON.stringify(drawnItems.toGeoJSON());
        $(".ar-map-submit").attr("data-geojson", geojson);
        $(".ar-map-submit").attr("data-area", totalHectares);
    }

    function updateTotalArea() {
        // Update the total area
        var area = 0.0;
        totalHectares = 0.0;


        if (getLayerCount(drawnItems)) {
            drawnItems.eachLayer(function(layer) {
                totalHectares += layer._arcArea;
            });
        }
        checkTotalHectares(totalHectares);
        $("#area-value").html("<h5>"+totalHectares.toFixed(2)+"</h2>");
        updatePostData();

    }

    function checkTotalHectares(totalHectares) {
        // Check if the total hectares is over 50

        if (totalHectares > 50.0) {
            $(".ar-map-total").css("background-color", "#ffc0c0");
            $(".ar-map-total").css("color", "#ff0000");
            $(".leaflet-draw-draw-polygon").hide();
            $(".ar-map-submit").prop('disabled',true);
            $('#overfifty').openModal();
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

    var getCentroid = function (arr) {
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
    };

    // FOR ALL LAYERS YOU NEED TO LOOP THROUGH DRAWN LAYERS!

});
