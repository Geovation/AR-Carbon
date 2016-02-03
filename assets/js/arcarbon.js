
jQuery(document).ready(function($) {

    // Initialisation
    var osmUrl = 'http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        osmAttrib = '&copy; <a href="http://openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        osm = L.tileLayer(osmUrl, {maxZoom: 18, attribution: osmAttrib}),
        map = new L.Map('arcarbon-map', {layers: [osm], center: new L.LatLng(51.505, -0.04), zoom: 15}),
        drawnItems = new L.FeatureGroup(),
        saveArray = [],
        totalHectares = 0.0,
        currentLayer;

    map.addLayer(drawnItems);

    // Leaflet Control Setup
    var controls = new L.Control.Draw({
        draw: {
            polyline  : false,
            circle    : false,
            rectangle : false,
            marker    : false,
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
    var disableControls = new L.Control.Draw({ draw: false, edit : false});
    map.addControl(controls);
    L.control.locate().addTo(map);


    // Event Handlers

    map.on('draw:created', function(event) {
        var layer = event.layer;

        // Check for intersection of the drawn polygon
        intersects = checkIntersections(layer);
        if (intersects) {
            map.removeLayer(layer);
            $('#intersects').openModal();
            return;
        }

        // Calculate area and add the label on the polygon
        var area = getArea(layer);
        layer._arcArea = area;
        addLabel(layer, area.toFixed(2));

        // Add DOM element to layer and DOM
        var _arcDomElement =
            $('<div class="mat-row ar-map-plot">'+
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

        currentLayer = layer;
        $("#field-text-edit").openModal();

        // Add the leaflet layer mouse over / dom layer highlight effect
        addMouseOver(layer, _arcDomElement);
        updateTotalArea();
    });

    map.on('draw:edited', function (event) {

        event.layers.eachLayer(function (layer) {
            var area = getArea(layer);
            layer._arcArea = area;
            $(layer._arcDomElement).find(".hectares").text(area.toFixed(2));
            removeLabel(layer);
            addLabel(layer, area);
            console.log("label added", layer.label);
        });

        updateTotalArea();

    });

    map.on('draw:deleted', function (event) {
        console.log("Deleting...");
        event.layers.eachLayer(function (layer) {
            $(layer._arcDomElement).remove();
            removeLabel(layer);
        });
        updateTotalArea();

    });

    function addMouseOver(layer, _arcDomElement) {
        // Show the layers in the sidebar when they get hovered over
        layer.on("mouseover", function (e) {
            $(_arcDomElement).css("background-color", "#daeac6");
        });
        layer.on("mouseout", function (e) {
            $(_arcDomElement).css("background-color", "#ffffff");
        });
    }

    $(document).on("click", ".ar-map-plot", function() {
        var el = this;
        drawnItems.eachLayer(function(layer){
            if (el === layer._arcDomElement) { // If the dom element clicked matches the matching Leaflet layer
                populateFieldTextModal(layer);
            }
        });
    });

    function addLayerClickModal(layer) {
        layer.on("click", function (e) {
            populateFieldTextModal(layer);
        });
    }

    function populateFieldTextModal(layer) {
        var title = layer._arcFieldTitle || "";
        var description = layer._arcFieldDescription || "";
        $("#field-title").val(title);
        $("#field-description").val(description);

        currentLayer = layer;
        $("#field-text-edit").openModal();
    }

    $(document).on("click", ".ar-carbon-save-description", function() {
        // Save the description to the layer when the user clicks save
        currentLayer._arcFieldTitle = $("#field-title").val();
        currentLayer._arcFieldDescription = $("#field-description").val();
        $("#field-title").val("");
        $("#field-description").val("");
    });

    // Label Related Functions

    function removeLabel(layer) {
        map.removeLayer(layer.label);
    }

    function addLabel(layer, text) {
        layer.label = L.marker(getCentroid(layer._latlngs), {
            icon: L.divIcon({
                className: 'field-div-icon',
                html: String(text),
                iconSize: [100, 40]
            })
        }).addTo(map);
    }


    // Update / UI Functions

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
            if (turf.intersect(layer1.toGeoJSON(), layer2.toGeoJSON())) {
                inter = true;
            }
        });
        return inter;
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
